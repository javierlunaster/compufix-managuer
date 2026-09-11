import { useState } from "react";
import { api, ApiError, resolvePhotoUrl } from "@/lib/api";
import type { Attachment } from "@/lib/types";
import { Button, ErrorBanner } from "@/components/ui";

/**
 * Sube y muestra fotos contra cualquier endpoint que acepte multipart con
 * el campo "files" (ver backend: POST /repair-orders/:id/photos y
 * POST /repair-orders/:id/logs/:logId/photos comparten esta misma forma).
 * Por eso un solo componente sirve para las fotos generales de la orden
 * (sección 6/22 del brief — evidencia del estado al recibir el equipo) y
 * para las fotos de una entrada puntual de la bitácora.
 */
export function PhotoGallery({
  photos,
  uploadUrl,
  onChanged,
  compact,
  category,
}: {
  photos: Attachment[];
  uploadUrl: string;
  onChanged: () => void;
  compact?: boolean;
  // "equipo_recibido" | "resultado_final" | undefined — deja que el mismo
  // Attachment.category (existía desde la Fase 15, sin usar hasta ahora)
  // distinga estado de ingreso vs. estado de entrega dentro de la misma
  // "bolsa" de fotos generales de la orden. Sin esto, la foto queda sin
  // categoría (comportamiento de siempre).
  category?: string;
}) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      if (category) {
        formData.append("category", category);
      }
      await api.postForm(uploadUrl, formData);
      setFiles(null);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron subir las fotos");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta foto? No se puede deshacer.")) return;
    try {
      await api.delete(`/attachments/${id}`);
      onChanged();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo eliminar la foto");
    }
  }

  const thumbSize = compact ? "h-14 w-14" : "h-20 w-20";

  return (
    <div className="space-y-2">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <div key={p.id} className="group relative">
              <a href={resolvePhotoUrl(p.fileUrl)} target="_blank" rel="noreferrer">
                <img
                  src={resolvePhotoUrl(p.fileUrl)}
                  alt={p.description ?? "Evidencia fotográfica"}
                  className={`${thumbSize} rounded border border-border object-cover`}
                />
              </a>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                title="Eliminar foto"
                className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-danger text-xs font-bold text-bg group-hover:flex"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="text-xs text-ink-muted file:mr-2 file:rounded file:border file:border-border file:bg-surface-raised file:px-2 file:py-1 file:text-xs file:text-ink"
        />
        {files && files.length > 0 && (
          <Button type="button" variant="secondary" onClick={handleUpload} disabled={uploading}>
            {uploading ? "Subiendo…" : `Subir ${files.length} foto${files.length > 1 ? "s" : ""}`}
          </Button>
        )}
      </div>
    </div>
  );
}

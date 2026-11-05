import { useState } from "react";
import { api, ApiError, resolvePhotoUrl } from "@/lib/api";
import type { ScrapBoardFile } from "@/lib/types";
import { Button, ErrorBanner, Select } from "@/components/ui";

const CATEGORY_LABELS: Record<string, string> = {
  foto: "Foto",
  esquematico: "Esquemático",
  boardview: "Boardview",
};

/**
 * Fotos, esquemáticos y archivos de boardview de una placa SCRAP — a
 * diferencia de PhotoGallery (solo imágenes), estos archivos pueden ser
 * PDF o binarios de formato propietario (.fz, .bvr, .bvm...), así que no
 * se intentan previsualizar: solo se listan por categoría y se descargan
 * para abrirlos en el programa correspondiente (ver scrapBoardFileUploadOptions
 * en el backend).
 */
export function ScrapBoardFiles({
  boardId,
  files,
  onChanged,
}: {
  boardId: number;
  files: ScrapBoardFile[];
  onChanged: () => void;
}) {
  const [category, setCategory] = useState<"foto" | "esquematico" | "boardview">("foto");
  const [fileList, setFileList] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(fileList).forEach((f) => formData.append("files", f));
      formData.append("category", category);
      await api.postForm(`/scrap-boards/${boardId}/files`, formData);
      setFileList(null);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron subir los archivos");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(fileId: number) {
    if (!confirm("¿Eliminar este archivo? No se puede deshacer.")) return;
    try {
      await api.delete(`/scrap-board-files/${fileId}`);
      onChanged();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo eliminar el archivo");
    }
  }

  const byCategory = (cat: string) => files.filter((f) => f.category === cat);

  return (
    <div className="space-y-4">
      {(["foto", "esquematico", "boardview"] as const).map((cat) => {
        const items = byCategory(cat);
        if (items.length === 0) return null;
        return (
          <div key={cat}>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
              {CATEGORY_LABELS[cat]}
            </p>
            {cat === "foto" ? (
              <div className="flex flex-wrap gap-2">
                {items.map((f) => (
                  <div key={f.id} className="group relative">
                    <a href={resolvePhotoUrl(f.fileUrl)} target="_blank" rel="noreferrer">
                      <img
                        src={resolvePhotoUrl(f.fileUrl)}
                        alt="Foto de la placa"
                        className="h-20 w-20 rounded border border-border object-cover"
                      />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(f.id)}
                      title="Eliminar"
                      className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-danger text-xs font-bold text-bg group-hover:flex"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-border rounded border border-border">
                {items.map((f) => (
                  <li key={f.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <a
                      href={resolvePhotoUrl(f.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline"
                    >
                      {f.description || `Archivo ${f.id}`}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(f.id)}
                      className="text-xs text-danger hover:underline"
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {error && <ErrorBanner message={error} />}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
          className="w-40"
        >
          <option value="foto">Foto</option>
          <option value="esquematico">Esquemático</option>
          <option value="boardview">Boardview</option>
        </Select>
        <input
          type="file"
          multiple
          onChange={(e) => setFileList(e.target.files)}
          className="text-xs text-ink-muted file:mr-2 file:rounded file:border file:border-border file:bg-surface-raised file:px-2 file:py-1 file:text-xs file:text-ink"
        />
        {fileList && fileList.length > 0 && (
          <Button type="button" variant="secondary" onClick={handleUpload} disabled={uploading}>
            {uploading ? "Subiendo…" : `Subir ${fileList.length} archivo${fileList.length > 1 ? "s" : ""}`}
          </Button>
        )}
      </div>
    </div>
  );
}

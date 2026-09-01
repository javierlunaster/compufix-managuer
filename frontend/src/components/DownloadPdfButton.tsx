import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui";

export function DownloadPdfButton({
  path,
  filename,
  label,
}: {
  path: string;
  filename: string;
  label: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setDownloading(true);
    try {
      await api.download(path, filename);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo descargar el documento");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button type="button" variant="secondary" onClick={handleClick} disabled={downloading}>
        {downloading ? "Generando…" : label}
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

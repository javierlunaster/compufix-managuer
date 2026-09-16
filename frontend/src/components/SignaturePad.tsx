import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button, ErrorBanner } from "@/components/ui";

/**
 * Captura de firma en pantalla (tableta/mouse/dedo) al momento de la
 * entrega — reemplaza la línea en blanco que había que imprimir y firmar
 * a mano (ver comprobante de entrega). Usa Pointer Events (no mouse/touch
 * por separado) para que funcione igual con mouse, dedo o lápiz óptico
 * con un solo set de handlers.
 */
export function SignaturePad({
  orderId,
  onSaved,
}: {
  orderId: number;
  onSaved: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getContext() {
    const canvas = canvasRef.current;
    return canvas?.getContext("2d") ?? null;
  }

  // Fondo blanco desde el inicio — el canvas nace transparente, y sin
  // esto la firma exportada como PNG quedaría con fondo transparente en
  // vez de blanco (se ve mal si algo la muestra sobre un fondo oscuro,
  // como el resto de esta interfaz).
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    // El canvas se dibuja a su resolución real (canvas.width/height) pero
    // puede mostrarse escalado en pantalla (CSS) — sin este factor, en un
    // celular/tableta la línea quedaría desalineada del dedo.
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = getContext();
    if (!ctx) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawing.current = true;
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = getContext();
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    setHasStroke(true);
  }

  function handlePointerUp() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
  }

  async function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError(null);
    setSaving(true);
    try {
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("No se pudo generar la imagen de la firma");
      const formData = new FormData();
      formData.append("file", blob, "firma.png");
      await api.postForm(`/repair-orders/${orderId}/signature`, formData);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la firma");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && <ErrorBanner message={error} />}
      <p className="text-xs text-ink-muted">
        Pide al cliente que firme aquí con el dedo, mouse o lápiz óptico.
      </p>
      <canvas
        ref={canvasRef}
        width={600}
        height={220}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full touch-none rounded border border-border bg-white"
        style={{ aspectRatio: "600 / 220" }}
      />
      <div className="flex gap-2">
        <Button type="button" variant="primary" onClick={handleSave} disabled={saving || !hasStroke}>
          {saving ? "Guardando…" : "Guardar firma"}
        </Button>
        <Button type="button" variant="ghost" onClick={clear} disabled={saving || !hasStroke}>
          Limpiar
        </Button>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type {
  HardwareTestCategory,
  HardwareTestResult,
  HardwareTestStatus,
  RepairOrderDetail,
} from "@/lib/types";
import { HARDWARE_TEST_STATUS_LABELS } from "@/lib/types";
import { PhotoGallery } from "@/components/PhotoGallery";
import { Button, Card, CardHeader, ErrorBanner, Input, Select } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

const KEYBOARD_TEST_NAME = "Teclado completo";
const CAMERA_TEST_NAME = "Cámara";
const SOUND_TEST_NAME = "Audio (bocinas y micrófono)";

type SaveResultFn = (
  category: HardwareTestCategory,
  testName: string,
  status: HardwareTestStatus,
  notes: string,
) => Promise<void>;

/**
 * Pestaña de pruebas de hardware antes de la entrega. Teclado, cámara y
 * sonido se verifican con una herramienta interactiva real — pensada para
 * abrirse en el navegador DEL EQUIPO que se va a entregar, así el técnico
 * usa el teclado/cámara/bocinas físicos de ese equipo, no los de la
 * computadora del taller. Disco y periféricos no se pueden probar
 * automáticamente por seguridad del navegador (sin acceso a SMART, USB,
 * etc.), así que son un checklist guiado, oculto por defecto para no
 * bloquear la entrega si el técnico no alcanza a revisarlos todos.
 */
export function HardwareTestsTab({
  order,
  onChanged,
}: {
  order: RepairOrderDetail;
  onChanged: () => void;
}) {
  const saveResult: SaveResultFn = async (category, testName, status, notes) => {
    const existing = order.hardwareTestResults.find(
      (r) => r.category === category && r.testName === testName,
    );
    if (existing) {
      await api.patch(`/hardware-tests/${existing.id}`, { status, notes: notes || undefined });
    } else {
      await api.post(`/repair-orders/${order.id}/hardware-tests`, {
        category,
        testName,
        status,
        notes: notes || undefined,
      });
    }
    onChanged();
  };

  async function removeResult(id: number) {
    await api.delete(`/hardware-tests/${id}`);
    onChanged();
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="text-sm text-ink-muted">
          Abre esta pestaña desde el navegador instalado en el equipo que vas a entregar, para
          poder usar su teclado, cámara y bocinas directamente. Los resultados quedan como
          evidencia y se incluyen en el comprobante de entrega.
        </p>
      </Card>

      <KeyboardTestCard order={order} onSave={saveResult} />
      <CameraTestCard order={order} onSave={saveResult} onChanged={onChanged} />
      <SoundTestCard order={order} onSave={saveResult} />

      <ChecklistSection
        order={order}
        category="DISK"
        title="Disco"
        subtitle="No se puede probar automáticamente desde el navegador — checklist guiado"
        suggestions={[
          "Funcionamiento general",
          "Ruido o vibración anormal",
          "Velocidad percibida al abrir programas",
        ]}
        onSave={saveResult}
        onRemove={removeResult}
      />
      <ChecklistSection
        order={order}
        category="PERIPHERALS"
        title="Periféricos"
        subtitle="Mouse, puertos, conectividad, batería — agrega los puntos que apliquen a este equipo"
        suggestions={["Mouse / Touchpad", "Puertos USB", "WiFi", "Ethernet", "Batería", "Lector de tarjetas"]}
        onSave={saveResult}
        onRemove={removeResult}
      />
    </div>
  );
}

function TestStatusBadge({ status }: { status: HardwareTestStatus }) {
  const cls =
    status === "PASSED" ? "text-success" : status === "FAILED" ? "text-danger" : "text-ink-muted";
  return (
    <span className={`text-xs font-semibold uppercase tracking-wide ${cls}`}>
      {HARDWARE_TEST_STATUS_LABELS[status]}
    </span>
  );
}

function ResultSummary({ result }: { result: HardwareTestResult }) {
  return (
    <div className="rounded border border-border bg-bg p-3 text-sm">
      <TestStatusBadge status={result.status} />
      {result.notes && <p className="mt-1 text-ink-muted">{result.notes}</p>}
      <p className="mt-1 text-xs text-ink-muted">
        {formatDateTime(result.testedAt)}
        {result.testedBy ? ` · ${result.testedBy.fullName}` : ""}
      </p>
    </div>
  );
}

function SaveResultBar({
  defaultStatus = "PASSED",
  onSave,
  onCancel,
}: {
  defaultStatus?: HardwareTestStatus;
  onSave: (status: HardwareTestStatus, notes: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const [status, setStatus] = useState<HardwareTestStatus>(defaultStatus);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      await onSave(status, notes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el resultado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 rounded border border-border bg-bg p-3">
      {error && <ErrorBanner message={error} />}
      <div className="grid grid-cols-[140px_1fr] gap-2">
        <Select value={status} onChange={(e) => setStatus(e.target.value as HardwareTestStatus)}>
          <option value="PASSED">Aprobado</option>
          <option value="FAILED">Falla</option>
          <option value="NOT_APPLICABLE">No aplica</option>
        </Select>
        <Input placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Guardando…" : "Guardar resultado"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}

// --- Teclado: mapa interactivo por posición física de tecla (KeyboardEvent.code) ---

type KeyDef = { code: string; label: string; width?: number };

const KEYBOARD_ROWS: KeyDef[][] = [
  [
    { code: "Escape", label: "Esc" },
    { code: "F1", label: "F1" },
    { code: "F2", label: "F2" },
    { code: "F3", label: "F3" },
    { code: "F4", label: "F4" },
    { code: "F5", label: "F5" },
    { code: "F6", label: "F6" },
    { code: "F7", label: "F7" },
    { code: "F8", label: "F8" },
    { code: "F9", label: "F9" },
    { code: "F10", label: "F10" },
    { code: "F11", label: "F11" },
    { code: "F12", label: "F12" },
  ],
  [
    { code: "Backquote", label: "`" },
    { code: "Digit1", label: "1" },
    { code: "Digit2", label: "2" },
    { code: "Digit3", label: "3" },
    { code: "Digit4", label: "4" },
    { code: "Digit5", label: "5" },
    { code: "Digit6", label: "6" },
    { code: "Digit7", label: "7" },
    { code: "Digit8", label: "8" },
    { code: "Digit9", label: "9" },
    { code: "Digit0", label: "0" },
    { code: "Minus", label: "-" },
    { code: "Equal", label: "=" },
    { code: "Backspace", label: "Backspace", width: 2 },
  ],
  [
    { code: "Tab", label: "Tab", width: 1.5 },
    { code: "KeyQ", label: "Q" },
    { code: "KeyW", label: "W" },
    { code: "KeyE", label: "E" },
    { code: "KeyR", label: "R" },
    { code: "KeyT", label: "T" },
    { code: "KeyY", label: "Y" },
    { code: "KeyU", label: "U" },
    { code: "KeyI", label: "I" },
    { code: "KeyO", label: "O" },
    { code: "KeyP", label: "P" },
    { code: "BracketLeft", label: "[" },
    { code: "BracketRight", label: "]" },
    { code: "Backslash", label: "\\", width: 1.5 },
  ],
  [
    { code: "CapsLock", label: "Caps", width: 1.75 },
    { code: "KeyA", label: "A" },
    { code: "KeyS", label: "S" },
    { code: "KeyD", label: "D" },
    { code: "KeyF", label: "F" },
    { code: "KeyG", label: "G" },
    { code: "KeyH", label: "H" },
    { code: "KeyJ", label: "J" },
    { code: "KeyK", label: "K" },
    { code: "KeyL", label: "L" },
    { code: "Semicolon", label: "; / Ñ" },
    { code: "Quote", label: "'" },
    { code: "Enter", label: "Enter", width: 2.25 },
  ],
  [
    { code: "ShiftLeft", label: "Shift", width: 2.25 },
    { code: "KeyZ", label: "Z" },
    { code: "KeyX", label: "X" },
    { code: "KeyC", label: "C" },
    { code: "KeyV", label: "V" },
    { code: "KeyB", label: "B" },
    { code: "KeyN", label: "N" },
    { code: "KeyM", label: "M" },
    { code: "Comma", label: "," },
    { code: "Period", label: "." },
    { code: "Slash", label: "/" },
    { code: "ShiftRight", label: "Shift", width: 2.75 },
  ],
  [
    { code: "ControlLeft", label: "Ctrl", width: 1.25 },
    { code: "MetaLeft", label: "Win", width: 1.25 },
    { code: "AltLeft", label: "Alt", width: 1.25 },
    { code: "Space", label: "Espacio", width: 6.25 },
    { code: "AltRight", label: "Alt", width: 1.25 },
    { code: "MetaRight", label: "Win", width: 1.25 },
    { code: "ControlRight", label: "Ctrl", width: 1.25 },
  ],
];

const ARROW_KEYS: KeyDef[] = [
  { code: "ArrowUp", label: "↑" },
  { code: "ArrowLeft", label: "←" },
  { code: "ArrowDown", label: "↓" },
  { code: "ArrowRight", label: "→" },
];

const TOTAL_KEYS = KEYBOARD_ROWS.flat().length + ARROW_KEYS.length;

function KeyCap({ k, active, tested }: { k: KeyDef; active: boolean; tested: boolean }) {
  return (
    <div
      style={{ width: `${(k.width ?? 1) * 2}rem` }}
      className={`flex h-8 shrink-0 items-center justify-center rounded border text-[10px] font-mono transition-colors ${
        active
          ? "border-accent bg-accent text-bg"
          : tested
            ? "border-success/50 bg-success/10 text-success"
            : "border-border bg-surface-raised text-ink-muted"
      }`}
    >
      {k.label}
    </div>
  );
}

function KeyboardTester({ pressed, tested }: { pressed: Set<string>; tested: Set<string> }) {
  return (
    <div className="overflow-x-auto rounded border border-border bg-bg p-3">
      <div className="w-max space-y-1">
        {KEYBOARD_ROWS.map((row, i) => (
          <div key={i} className="flex gap-1">
            {row.map((k) => (
              <KeyCap key={k.code} k={k} active={pressed.has(k.code)} tested={tested.has(k.code)} />
            ))}
          </div>
        ))}
        <div className="flex justify-end gap-1 pt-1">
          {ARROW_KEYS.map((k) => (
            <KeyCap key={k.code} k={k} active={pressed.has(k.code)} tested={tested.has(k.code)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function KeyboardTestCard({ order, onSave }: { order: RepairOrderDetail; onSave: SaveResultFn }) {
  const existing = order.hardwareTestResults.find(
    (r) => r.category === "KEYBOARD" && r.testName === KEYBOARD_TEST_NAME,
  );
  const [retesting, setRetesting] = useState(false);
  const showForm = !existing || retesting;
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const [tested, setTested] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!showForm) return;
    function onKeyDown(e: KeyboardEvent) {
      setPressed((prev) => new Set(prev).add(e.code));
      setTested((prev) => new Set(prev).add(e.code));
    }
    function onKeyUp(e: KeyboardEvent) {
      setPressed((prev) => {
        const next = new Set(prev);
        next.delete(e.code);
        return next;
      });
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [showForm]);

  return (
    <Card>
      <CardHeader
        title="Teclado"
        subtitle="Presiona cada tecla del equipo — se resalta al detectarla"
        action={
          existing && !retesting ? (
            <Button
              variant="secondary"
              onClick={() => {
                setRetesting(true);
                setTested(new Set());
              }}
            >
              Volver a probar
            </Button>
          ) : null
        }
      />
      <div className="space-y-3 p-4">
        {existing && !retesting && <ResultSummary result={existing} />}
        {showForm && (
          <>
            <KeyboardTester pressed={pressed} tested={tested} />
            <p className="text-xs text-ink-muted">
              {tested.size} / {TOTAL_KEYS} teclas detectadas
            </p>
            <SaveResultBar
              onSave={async (status, notes) => {
                await onSave("KEYBOARD", KEYBOARD_TEST_NAME, status, notes);
                setRetesting(false);
              }}
              onCancel={existing ? () => setRetesting(false) : undefined}
            />
          </>
        )}
      </div>
    </Card>
  );
}

// --- Cámara: vista previa en vivo + captura de evidencia ---

function CameraTestCard({
  order,
  onSave,
  onChanged,
}: {
  order: RepairOrderDetail;
  onSave: SaveResultFn;
  onChanged: () => void;
}) {
  const existing = order.hardwareTestResults.find(
    (r) => r.category === "CAMERA" && r.testName === CAMERA_TEST_NAME,
  );
  const evidencePhotos = order.photos.filter((p) => p.category === "prueba_camara");
  const [retesting, setRetesting] = useState(false);
  const showForm = !existing || retesting;

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }

  useEffect(() => stopCamera, []);

  // El <video> solo se monta cuando `active` pasa a true (ver JSX más
  // abajo) — asignar `srcObject` en el mismo instante en que llega el
  // stream, ANTES de ese re-render, no hacía nada porque `videoRef.current`
  // todavía era null. Se asigna aquí, después de que el elemento existe.
  useEffect(() => {
    if (active && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [active]);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setActive(true);
    } catch {
      setError(
        "No se pudo acceder a la cámara — revisa permisos del navegador o si hay otra app usándola. Igual puedes marcar el resultado manualmente.",
      );
    }
  }

  async function handleCapture() {
    if (!videoRef.current) return;
    setCapturing(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("No se pudo capturar la imagen");
      const formData = new FormData();
      formData.append("files", blob, `evidencia-camara-${Date.now()}.jpg`);
      formData.append("category", "prueba_camara");
      await api.postForm(`/repair-orders/${order.id}/photos`, formData);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo subir la evidencia");
    } finally {
      setCapturing(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Cámara"
        subtitle="Vista previa en vivo — captura una foto como evidencia de que funciona"
        action={
          existing && !retesting ? (
            <Button variant="secondary" onClick={() => setRetesting(true)}>
              Volver a probar
            </Button>
          ) : null
        }
      />
      <div className="space-y-3 p-4">
        {existing && !retesting && <ResultSummary result={existing} />}

        {evidencePhotos.length > 0 && (
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-ink-muted">
              Evidencia capturada — se incluye en el comprobante de entrega
            </p>
            <PhotoGallery
              photos={evidencePhotos}
              uploadUrl={`/repair-orders/${order.id}/photos`}
              onChanged={onChanged}
              category="prueba_camara"
              compact
            />
          </div>
        )}

        {showForm && (
          <>
            {!active ? (
              <Button type="button" variant="primary" onClick={startCamera}>
                Iniciar cámara
              </Button>
            ) : (
              <div className="space-y-2">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full max-w-sm rounded border border-border"
                />
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={handleCapture} disabled={capturing}>
                    {capturing ? "Subiendo…" : "Capturar evidencia"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={stopCamera}>
                    Detener cámara
                  </Button>
                </div>
              </div>
            )}

            {error && <ErrorBanner message={error} />}

            <SaveResultBar
              onSave={async (status, notes) => {
                await onSave("CAMERA", CAMERA_TEST_NAME, status, notes);
                stopCamera();
                setRetesting(false);
              }}
              onCancel={
                existing
                  ? () => {
                      stopCamera();
                      setRetesting(false);
                    }
                  : undefined
              }
            />
          </>
        )}
      </div>
    </Card>
  );
}

// --- Sonido: tono de prueba por bocina + grabación corta del micrófono ---

function SoundTestCard({ order, onSave }: { order: RepairOrderDetail; onSave: SaveResultFn }) {
  const existing = order.hardwareTestResults.find(
    (r) => r.category === "SOUND" && r.testName === SOUND_TEST_NAME,
  );
  const [retesting, setRetesting] = useState(false);
  const showForm = !existing || retesting;

  const [playing, setPlaying] = useState<"left" | "right" | "both" | null>(null);
  const [recording, setRecording] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function playTone(pan: number, label: "left" | "right" | "both") {
    setError(null);
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const panner = ctx.createStereoPanner();
      const gain = ctx.createGain();
      osc.frequency.value = 440;
      panner.pan.value = pan;
      gain.gain.value = 0.2;
      osc.connect(gain).connect(panner).connect(ctx.destination);
      setPlaying(label);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
      osc.onended = () => {
        setPlaying(null);
        ctx.close();
      };
    } catch {
      setError("Este navegador no permite reproducir el tono de prueba");
    }
  }

  async function testMicrophone() {
    setError(null);
    setPlaybackUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setPlaybackUrl(URL.createObjectURL(new Blob(chunks, { type: "audio/webm" })));
        setRecording(false);
      };
      recorder.start();
      setRecording(true);
      setTimeout(() => recorder.stop(), 3000);
    } catch {
      setError("No se pudo acceder al micrófono — revisa permisos del navegador");
      setRecording(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Sonido"
        subtitle="Reproduce un tono para probar las bocinas y graba unos segundos para probar el micrófono"
        action={
          existing && !retesting ? (
            <Button variant="secondary" onClick={() => setRetesting(true)}>
              Volver a probar
            </Button>
          ) : null
        }
      />
      <div className="space-y-3 p-4">
        {existing && !retesting && <ResultSummary result={existing} />}
        {showForm && (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={playing !== null}
                onClick={() => playTone(-1, "left")}
              >
                {playing === "left" ? "Sonando…" : "Bocina izquierda"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={playing !== null}
                onClick={() => playTone(1, "right")}
              >
                {playing === "right" ? "Sonando…" : "Bocina derecha"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={playing !== null}
                onClick={() => playTone(0, "both")}
              >
                {playing === "both" ? "Sonando…" : "Ambas bocinas"}
              </Button>
              <Button type="button" variant="secondary" disabled={recording} onClick={testMicrophone}>
                {recording ? "Grabando…" : "Probar micrófono (3s)"}
              </Button>
            </div>

            {playbackUrl && <audio controls src={playbackUrl} className="w-full max-w-sm" />}
            {error && <ErrorBanner message={error} />}

            <SaveResultBar
              onSave={async (status, notes) => {
                await onSave("SOUND", SOUND_TEST_NAME, status, notes);
                setRetesting(false);
              }}
              onCancel={existing ? () => setRetesting(false) : undefined}
            />
          </>
        )}
      </div>
    </Card>
  );
}

// --- Disco / Periféricos: checklist guiado, oculto por defecto ---

function ChecklistSection({
  order,
  category,
  title,
  subtitle,
  suggestions,
  onSave,
  onRemove,
}: {
  order: RepairOrderDetail;
  category: HardwareTestCategory;
  title: string;
  subtitle: string;
  suggestions: string[];
  onSave: SaveResultFn;
  onRemove: (id: number) => Promise<void>;
}) {
  const results = order.hardwareTestResults.filter((r) => r.category === category);
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-accent hover:underline"
          >
            {expanded ? "Ocultar" : results.length > 0 ? `Ver (${results.length})` : "Agregar"}
          </button>
        }
      />
      {expanded && (
        <div className="space-y-3 p-4">
          {results.length > 0 && (
            <ul className="divide-y divide-border">
              {results.map((r) => (
                <ChecklistRow key={r.id} result={r} onRemove={onRemove} />
              ))}
            </ul>
          )}
          <AddChecklistItemForm
            category={category}
            suggestions={suggestions}
            existingNames={results.map((r) => r.testName)}
            onSave={onSave}
          />
        </div>
      )}
    </Card>
  );
}

function ChecklistRow({
  result,
  onRemove,
}: {
  result: HardwareTestResult;
  onRemove: (id: number) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function handleRemove() {
    if (!confirm(`¿Quitar "${result.testName}" del checklist?`)) return;
    setBusy(true);
    try {
      await onRemove(result.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-start justify-between gap-3 py-2 text-sm">
      <div>
        <p className="text-ink">{result.testName}</p>
        <TestStatusBadge status={result.status} />
        {result.notes && <p className="text-ink-muted">{result.notes}</p>}
      </div>
      <button
        type="button"
        onClick={handleRemove}
        disabled={busy}
        className="text-xs text-danger hover:underline disabled:opacity-50"
      >
        Quitar
      </button>
    </li>
  );
}

function AddChecklistItemForm({
  category,
  suggestions,
  existingNames,
  onSave,
}: {
  category: HardwareTestCategory;
  suggestions: string[];
  existingNames: string[];
  onSave: SaveResultFn;
}) {
  const [showForm, setShowForm] = useState(false);
  const [testName, setTestName] = useState("");
  const [status, setStatus] = useState<HardwareTestStatus>("PASSED");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableSuggestions = suggestions.filter((s) => !existingNames.includes(s));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!testName.trim()) {
      setError("Escribe o elige qué se va a revisar");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(category, testName.trim(), status, notes);
      setTestName("");
      setNotes("");
      setStatus("PASSED");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      {availableSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availableSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setTestName(s);
                setShowForm(true);
              }}
              className="rounded-full border border-border px-2 py-0.5 text-xs text-ink-muted hover:border-accent hover:text-accent"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-xs text-accent hover:underline"
        >
          + Agregar punto personalizado
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2 rounded border border-border bg-bg p-3">
          {error && <ErrorBanner message={error} />}
          <div className="grid grid-cols-[1fr_140px] gap-2">
            <Input
              placeholder="Ej. Puerto USB 2"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
            />
            <Select value={status} onChange={(e) => setStatus(e.target.value as HardwareTestStatus)}>
              <option value="PASSED">Aprobado</option>
              <option value="FAILED">Falla</option>
              <option value="NOT_APPLICABLE">No aplica</option>
            </Select>
          </div>
          <Input placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Guardando…" : "Agregar"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

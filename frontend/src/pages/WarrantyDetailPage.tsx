import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Warranty } from "@/lib/types";
import { WARRANTY_STATUS_LABELS } from "@/lib/types";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import {
  Button,
  Card,
  CardHeader,
  ErrorBanner,
  Field,
  Input,
  Spinner,
} from "@/components/ui";
import { formatDate } from "@/lib/format";

export function WarrantyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: warranty, loading, error, reload } = useFetch(
    () => api.get<Warranty>(`/warranties/${id}`),
    [id],
  );
  const [editing, setEditing] = useState(false);
  const [claiming, setClaiming] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (error || !warranty) {
    return <ErrorBanner message={error ?? "Garantía no encontrada"} />;
  }

  const isExpired = new Date(warranty.warrantyEndDate) < new Date();

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-muted">
            Orden{" "}
            {warranty.repairOrder && (
              <Link to={`/repair-orders/${warranty.repairOrder.id}`} className="font-mono text-accent">
                {warranty.repairOrder.orderCode}
              </Link>
            )}
          </p>
          <h1 className="text-xl font-semibold text-ink">{warranty.repairOrder?.customer?.fullName}</h1>
        </div>
        <span
          className={`font-mono text-xs uppercase ${
            warranty.status === "ACTIVE"
              ? "text-success"
              : warranty.status === "CLAIMED"
                ? "text-info"
                : "text-danger"
          }`}
        >
          {WARRANTY_STATUS_LABELS[warranty.status]}
        </span>
      </div>

      {editing ? (
        <EditWarrantyForm
          warranty={warranty}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <Card>
          <CardHeader title="Cobertura" />
          <dl className="grid grid-cols-2 gap-4 p-4 text-sm">
            <div className="col-span-2">
              <dt className="text-xs uppercase tracking-wide text-ink-muted">Descripción</dt>
              <dd className="text-ink">{warranty.coverageDescription}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-muted">Entrega</dt>
              <dd className="text-ink">{formatDate(warranty.deliveryDate)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-muted">Vigente hasta</dt>
              <dd className={isExpired ? "text-danger" : "text-ink"}>
                {formatDate(warranty.warrantyEndDate)}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3 border-t border-border p-4">
            {warranty.status === "ACTIVE" && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Editar cobertura
              </Button>
            )}
            <DownloadPdfButton
              path={`/warranties/${warranty.id}/document`}
              filename={`garantia-${warranty.repairOrder?.orderCode}.pdf`}
              label="Descargar certificado PDF"
            />
          </div>
        </Card>
      )}

      {warranty.status === "CLAIMED" && warranty.claimNotes && (
        <Card>
          <CardHeader title="Reclamo registrado" />
          <p className="p-4 text-sm text-ink-muted">{warranty.claimNotes}</p>
        </Card>
      )}

      {warranty.status === "ACTIVE" && !isExpired && (
        <Card>
          <CardHeader
            title="Reclamo de garantía"
            subtitle="Si el cliente vuelve por esta falla, se genera una nueva orden ligada al mismo equipo"
          />
          {claiming ? (
            <ClaimWarrantyForm
              warrantyId={warranty.id}
              onClaimed={(newOrderId) => navigate(`/repair-orders/${newOrderId}`)}
              onCancel={() => setClaiming(false)}
            />
          ) : (
            <div className="p-4">
              <Button variant="danger" onClick={() => setClaiming(true)}>
                Registrar reclamo
              </Button>
            </div>
          )}
        </Card>
      )}

      {isExpired && warranty.status === "ACTIVE" && (
        <p className="text-sm text-warning">
          Esta garantía venció el {formatDate(warranty.warrantyEndDate)} — ya no se puede reclamar.
        </p>
      )}
    </div>
  );
}

function EditWarrantyForm({
  warranty,
  onSaved,
  onCancel,
}: {
  warranty: Warranty;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [coverageDescription, setCoverageDescription] = useState(warranty.coverageDescription);
  const [warrantyEndDate, setWarrantyEndDate] = useState(warranty.warrantyEndDate.slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/warranties/${warranty.id}`, { coverageDescription, warrantyEndDate });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Editar cobertura" />
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}
        <Field label="Descripción de cobertura">
          <Input value={coverageDescription} onChange={(e) => setCoverageDescription(e.target.value)} required />
        </Field>
        <Field label="Vigente hasta">
          <Input
            type="date"
            value={warrantyEndDate}
            onChange={(e) => setWarrantyEndDate(e.target.value)}
            required
          />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ClaimWarrantyForm({
  warrantyId,
  onClaimed,
  onCancel,
}: {
  warrantyId: number;
  onClaimed: (newOrderId: number) => void;
  onCancel: () => void;
}) {
  const [reportedIssue, setReportedIssue] = useState("");
  const [claimNotes, setClaimNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const result = await api.post<{ claimOrder: { id: number } }>(`/warranties/${warrantyId}/claim`, {
        reportedIssue,
        claimNotes,
      });
      onClaimed(result.claimOrder.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar el reclamo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4">
      {error && <ErrorBanner message={error} />}
      <Field label="¿Qué falla reporta el cliente esta vez?">
        <Input value={reportedIssue} onChange={(e) => setReportedIssue(e.target.value)} required />
      </Field>
      <Field label="Observación del reclamo">
        <Input value={claimNotes} onChange={(e) => setClaimNotes(e.target.value)} required />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Registrando…" : "Confirmar reclamo y crear nueva orden"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

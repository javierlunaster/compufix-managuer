import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { Device } from "@/lib/types";
import { StatusPill } from "@/components/StatusPill";
import { DeviceSpecsCard } from "@/components/DeviceSpecsCard";
import { Button, Card, CardHeader, EmptyState, ErrorBanner, Spinner } from "@/components/ui";
import { formatDate } from "@/lib/format";

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: device, loading, error, reload } = useFetch(
    () => api.get<Device>(`/devices/${id}`),
    [id],
  );

  async function handleDeactivate() {
    if (!device) return;
    if (!confirm("¿Desactivar este equipo? Ya no aparecerá para nuevas recepciones.")) return;
    try {
      await api.patch(`/devices/${device.id}/deactivate`);
      navigate(`/customers/${device.customerId}`);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo desactivar");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (error || !device) {
    return <ErrorBanner message={error ?? "Equipo no encontrado"} />;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-muted">
            {device.customer && (
              <Link to={`/customers/${device.customer.id}`} className="text-accent hover:underline">
                {device.customer.fullName}
              </Link>
            )}
          </p>
          <h1 className="text-xl font-semibold text-ink">
            {device.brand?.name} {device.model}
          </h1>
          {device.status === "INACTIVE" && (
            <span className="text-xs uppercase text-danger">Inactivo</span>
          )}
        </div>
        {device.status !== "INACTIVE" && (
          <Button variant="danger" onClick={handleDeactivate}>
            Desactivar
          </Button>
        )}
      </div>

      <DeviceSpecsCard device={device} onUpdated={reload} />

      <Card>
        <CardHeader
          title="Historial de reparaciones"
          subtitle="Todas las veces que este equipo ha pasado por el taller, sin importar quién lo trajo"
        />
        {device.repairOrders && device.repairOrders.length > 0 ? (
          <ul className="divide-y divide-border">
            {device.repairOrders.map((o) => (
              <li key={o.id}>
                <Link
                  to={`/repair-orders/${o.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-raised"
                >
                  <span className="font-mono text-accent">{o.orderCode}</span>
                  <span className="text-ink-muted">{formatDate(o.entryDate)}</span>
                  <StatusPill status={o.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Sin reparaciones registradas todavía para este equipo" />
        )}
      </Card>
    </div>
  );
}

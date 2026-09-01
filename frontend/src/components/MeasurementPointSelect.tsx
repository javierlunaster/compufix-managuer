import { MEASUREMENT_POINTS_CATALOG, type MeasurementPoint } from "@/lib/measurementPoints";
import { Select } from "@/components/ui";

/**
 * Al elegir un punto, entrega el objeto completo (nombre + valor esperado
 * + unidad) — quien lo use decide qué hacer con eso (llenar los campos de
 * un formulario individual, o agregar una fila nueva en una carga masiva).
 * El desplegable siempre vuelve a "Selecciona un punto…" después de
 * elegir, para poder usarse varias veces seguidas sin recargar la página.
 */
export function MeasurementPointSelect({
  onSelect,
  className,
}: {
  onSelect: (point: MeasurementPoint) => void;
  className?: string;
}) {
  const groups = Array.from(new Set(MEASUREMENT_POINTS_CATALOG.map((p) => p.group)));

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const index = Number(e.target.value);
    if (Number.isNaN(index)) return;
    onSelect(MEASUREMENT_POINTS_CATALOG[index]);
    e.target.value = "";
  }

  return (
    <Select defaultValue="" onChange={handleChange} className={className}>
      <option value="" disabled>
        Selecciona un punto conocido…
      </option>
      {groups.map((group) => (
        <optgroup key={group} label={group}>
          {MEASUREMENT_POINTS_CATALOG.map((point, index) =>
            point.group === group ? (
              <option key={index} value={index}>
                {point.pointName} — {point.expectedValue}
              </option>
            ) : null,
          )}
        </optgroup>
      ))}
    </Select>
  );
}

import { useFetch } from "@/lib/useFetch";
import { api } from "@/lib/api";

export const DEVICE_MODELS_DATALIST_ID = "device-model-suggestions";

/**
 * <datalist> nativo del navegador — sin componente de autocompletado a la
 * medida: el navegador ya sabe filtrar mientras se escribe, navegar con
 * flechas, y sigue funcionando con teclado. Se usa junto con
 * <Input list={DEVICE_MODELS_DATALIST_ID} />. Los modelos son texto
 * libre (no un catálogo cerrado, ver catalogs.service.ts) — esto es una
 * ayuda para no repetir el mismo modelo, nunca una restricción; se puede
 * seguir escribiendo cualquier cosa.
 */
export function DeviceModelDatalist({
  brandId,
  deviceTypeId,
}: {
  brandId?: string | number;
  deviceTypeId?: string | number;
}) {
  const { data: models } = useFetch(
    () =>
      api.get<string[]>("/catalogs/device-models", {
        brandId: brandId || undefined,
        deviceTypeId: deviceTypeId || undefined,
      }),
    [brandId, deviceTypeId],
  );

  return (
    <datalist id={DEVICE_MODELS_DATALIST_ID}>
      {models?.map((m) => (
        <option key={m} value={m} />
      ))}
    </datalist>
  );
}

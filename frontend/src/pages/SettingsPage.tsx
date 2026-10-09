import { useEffect, useState } from "react";
import { api, ApiError, resolvePhotoUrl } from "@/lib/api";
import { applyBusinessSettings } from "@/lib/branding";
import type { BusinessSettings } from "@/lib/types";
import { Button, Card, CardHeader, ErrorBanner, Field, Input, Spinner } from "@/components/ui";

/**
 * Página "Configuración" (solo Administrador — el backend rechaza el
 * PATCH/POST de logo a cualquier otro rol) — reemplaza las variables
 * VITE_* horneadas al build por datos editables en caliente, guardados en
 * `business_settings` (fila única, ver BusinessSettingsService). Cada
 * cliente tiene su propia base de datos, así que esto nunca se mezcla
 * entre negocios distintos desplegados desde el mismo repositorio.
 */
export function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<BusinessSettings>("/business-settings");
      setSettings(data);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "No se pudo cargar la configuración");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Configuración</h1>
        <p className="text-sm text-ink-muted">
          Nombre, contacto, redes y tema del sitio — los cambios se aplican de inmediato, sin redesplegar nada
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}
      {loadError && <ErrorBanner message={loadError} />}

      {settings && <LogoCard settings={settings} onUpdated={setSettings} />}
      {settings && <ThemeCard settings={settings} onUpdated={setSettings} />}
      {settings && <ServiceJobAccountCard settings={settings} onUpdated={setSettings} />}
      {settings && <OwnerSignatureCard settings={settings} onUpdated={setSettings} />}
      {settings && <BrandingForm settings={settings} onUpdated={setSettings} />}
    </div>
  );
}

function LogoCard({
  settings,
  onUpdated,
}: {
  settings: BusinessSettings;
  onUpdated: (s: BusinessSettings) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const updated = await api.postForm<BusinessSettings>("/business-settings/logo", formData);
      onUpdated(updated);
      applyBusinessSettings(updated);
      setFile(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo subir el logo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Logo" subtitle="Se muestra en el menú lateral y en las páginas públicas" />
      <div className="flex flex-wrap items-center gap-4 p-4">
        {settings.logoUrl && (
          <div className="flex items-center rounded bg-white px-3 py-2 shadow-sm">
            <img src={resolvePhotoUrl(settings.logoUrl)} alt={settings.shortName} className="h-10 w-auto" />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-2">
          {error && <ErrorBanner message={error} />}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-xs text-ink-muted file:mr-2 file:rounded file:border file:border-border file:bg-surface-raised file:px-2 file:py-1 file:text-xs file:text-ink"
          />
          {file && (
            <Button type="button" variant="secondary" onClick={handleUpload} disabled={uploading} className="self-start">
              {uploading ? "Subiendo…" : "Subir logo"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function ThemeCard({
  settings,
  onUpdated,
}: {
  settings: BusinessSettings;
  onUpdated: (s: BusinessSettings) => void;
}) {
  const [accentColor, setAccentColor] = useState(settings.accentColor);
  const [accentStrongColor, setAccentStrongColor] = useState(settings.accentStrongColor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const updated = await api.patch<BusinessSettings>("/business-settings", {
        accentColor,
        accentStrongColor,
      });
      onUpdated(updated);
      applyBusinessSettings(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el tema");
    } finally {
      setSaving(false);
    }
  }

  const dirty = accentColor !== settings.accentColor || accentStrongColor !== settings.accentStrongColor;

  return (
    <Card>
      <CardHeader title="Tema" subtitle="Color de acento usado en botones, enlaces y resaltados" />
      <div className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}
        <div className="flex flex-wrap gap-6">
          <Field label="Color de acento">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-9 w-12 rounded border border-border bg-bg"
              />
              <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-28" />
            </div>
          </Field>
          <Field label="Color de acento (resaltado/hover)">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentStrongColor}
                onChange={(e) => setAccentStrongColor(e.target.value)}
                className="h-9 w-12 rounded border border-border bg-bg"
              />
              <Input
                value={accentStrongColor}
                onChange={(e) => setAccentStrongColor(e.target.value)}
                className="w-28"
              />
            </div>
          </Field>
        </div>
        <Button type="button" variant="primary" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? "Guardando…" : "Guardar tema"}
        </Button>
      </div>
    </Card>
  );
}

type BrandingFields = Omit<
  BusinessSettings,
  | "id"
  | "logoUrl"
  | "accentColor"
  | "accentStrongColor"
  | "updatedAt"
  | "nextServiceJobAccountNumber"
  | "ownerFullName"
  | "ownerDocumentId"
  | "ownerSignatureUrl"
>;

// El backend rechaza (ValidationPipe con forbidNonWhitelisted) cualquier
// campo que no esté declarado en UpdateBusinessSettingsDto — así que el
// PATCH de este formulario nunca puede mandar el objeto `settings` tal
// cual (trae id/updatedAt/logoUrl/accentColor/accentStrongColor/
// nextServiceJobAccountNumber/ownerFullName/ownerDocumentId/
// ownerSignatureUrl, que no son parte del DTO o viven en sus propias
// tarjetas). Se extraen a mano los campos que sí le corresponden a este
// formulario.
function pickBrandingFields(settings: BusinessSettings): BrandingFields {
  const {
    id,
    logoUrl,
    accentColor,
    accentStrongColor,
    updatedAt,
    nextServiceJobAccountNumber,
    ownerFullName,
    ownerDocumentId,
    ownerSignatureUrl,
    ...fields
  } = settings;
  return fields;
}

/**
 * Identidad que firma la cuenta de cobro de Servicios externos (ver
 * DocumentsService.generateServiceJobAccount) — SIEMPRE el propietario,
 * nunca el técnico que hizo el trabajo en sitio. También deja fijar en
 * qué número sigue la numeración ("Cuenta de Cobro N°"), para continuar
 * donde se quedó el taller con su numeración en papel.
 */
function ServiceJobAccountCard({
  settings,
  onUpdated,
}: {
  settings: BusinessSettings;
  onUpdated: (s: BusinessSettings) => void;
}) {
  const [ownerFullName, setOwnerFullName] = useState(settings.ownerFullName ?? "");
  const [ownerDocumentId, setOwnerDocumentId] = useState(settings.ownerDocumentId ?? "");
  const [nextAccountNumber, setNextAccountNumber] = useState(
    String(settings.nextServiceJobAccountNumber),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    setSaving(true);
    try {
      const updated = await api.patch<BusinessSettings>("/business-settings", {
        ownerFullName: ownerFullName || undefined,
        ownerDocumentId: ownerDocumentId || undefined,
        nextServiceJobAccountNumber: Number(nextAccountNumber) || undefined,
      });
      onUpdated(updated);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Servicios externos"
        subtitle="Quién firma la cuenta de cobro, y la numeración de la próxima"
      />
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}
        {done && (
          <p className="rounded border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            Guardado correctamente.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre completo del propietario">
            <Input
              value={ownerFullName}
              onChange={(e) => setOwnerFullName(e.target.value)}
              placeholder="Ej. Javier Enrique Luna Marzola"
            />
          </Field>
          <Field label="Cédula del propietario">
            <Input
              value={ownerDocumentId}
              onChange={(e) => setOwnerDocumentId(e.target.value)}
              placeholder="Ej. 8363317"
            />
          </Field>
        </div>
        <p className="text-xs text-ink-muted">
          La cuenta de cobro siempre sale a nombre del propietario, no del técnico asignado al
          trabajo — su comisión se calcula aparte.
        </p>
        <Field label="Próxima Cuenta de Cobro N°">
          <Input
            type="number"
            min={1}
            value={nextAccountNumber}
            onChange={(e) => setNextAccountNumber(e.target.value)}
            className="max-w-[10rem]"
          />
        </Field>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </form>
    </Card>
  );
}

/**
 * Firma (imagen) del propietario para la cuenta de cobro — reemplaza la
 * línea en blanco de la firma por la imagen real (ver
 * DocumentsService.generateServiceJobAccount / PdfBuilder.signatureImage).
 * Si no se sube, el documento sigue saliendo igual que antes, con la línea
 * en blanco para firmar a mano.
 */
function OwnerSignatureCard({
  settings,
  onUpdated,
}: {
  settings: BusinessSettings;
  onUpdated: (s: BusinessSettings) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const updated = await api.postForm<BusinessSettings>(
        "/business-settings/owner-signature",
        formData,
      );
      onUpdated(updated);
      setFile(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo subir la firma");
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    if (!confirm("¿Quitar la firma del propietario? Las próximas cuentas de cobro saldrán sin ella.")) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const updated = await api.delete<BusinessSettings>("/business-settings/owner-signature");
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo quitar la firma");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Firma del propietario"
        subtitle="Sale impresa en la cuenta de cobro de Servicios externos, en vez de la línea en blanco"
      />
      <div className="flex flex-wrap items-center gap-4 p-4">
        {settings.ownerSignatureUrl && (
          <div className="flex items-center rounded bg-white px-3 py-2 shadow-sm">
            <img
              src={resolvePhotoUrl(settings.ownerSignatureUrl)}
              alt="Firma del propietario"
              className="h-14 w-auto"
            />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-2">
          {error && <ErrorBanner message={error} />}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-xs text-ink-muted file:mr-2 file:rounded file:border file:border-border file:bg-surface-raised file:px-2 file:py-1 file:text-xs file:text-ink"
          />
          <div className="flex gap-2">
            {file && (
              <Button type="button" variant="secondary" onClick={handleUpload} disabled={busy}>
                {busy ? "Subiendo…" : "Subir firma"}
              </Button>
            )}
            {settings.ownerSignatureUrl && !file && (
              <Button type="button" variant="danger" onClick={handleClear} disabled={busy}>
                Quitar firma
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function BrandingForm({
  settings,
  onUpdated,
}: {
  settings: BusinessSettings;
  onUpdated: (s: BusinessSettings) => void;
}) {
  const [fields, setFields] = useState<BrandingFields>(() => pickBrandingFields(settings));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function set<K extends keyof BrandingFields>(key: K, value: BrandingFields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
    setDone(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await api.patch<BusinessSettings>("/business-settings", fields);
      onUpdated(updated);
      applyBusinessSettings(updated);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Negocio y contacto" />
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        {error && <ErrorBanner message={error} />}
        {done && (
          <p className="rounded border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            Configuración guardada correctamente.
          </p>
        )}

        <Field label="Nombre del negocio">
          <Input value={fields.businessName} onChange={(e) => set("businessName", e.target.value)} required />
        </Field>
        <Field label="Nombre corto">
          <Input value={fields.shortName} onChange={(e) => set("shortName", e.target.value)} required />
        </Field>
        <Field label="Lema">
          <Input value={fields.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ubicación (encabezado)">
            <Input value={fields.locationTag} onChange={(e) => set("locationTag", e.target.value)} />
          </Field>
          <Field label="Ubicación (pie de página)">
            <Input value={fields.footerLocation} onChange={(e) => set("footerLocation", e.target.value)} />
          </Field>
        </div>
        <Field label="Lema del pie de página">
          <Input value={fields.footerTagline} onChange={(e) => set("footerTagline", e.target.value)} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Teléfono (texto mostrado)">
            <Input
              value={fields.phoneDisplay ?? ""}
              onChange={(e) => set("phoneDisplay", e.target.value)}
            />
          </Field>
          <Field label="Teléfono (formato para llamar, con +57…)">
            <Input value={fields.phoneDial ?? ""} onChange={(e) => set("phoneDial", e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="WhatsApp (solo números, con código de país)">
            <Input
              value={fields.whatsappNumber ?? ""}
              onChange={(e) => set("whatsappNumber", e.target.value)}
            />
          </Field>
          <Field label="Mensaje predeterminado de WhatsApp">
            <Input
              value={fields.whatsappMessage}
              onChange={(e) => set("whatsappMessage", e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Dirección (línea 1)">
            <Input value={fields.addressLine1 ?? ""} onChange={(e) => set("addressLine1", e.target.value)} />
          </Field>
          <Field label="Dirección (línea 2)">
            <Input value={fields.addressLine2 ?? ""} onChange={(e) => set("addressLine2", e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ciudad">
            <Input value={fields.addressCity ?? ""} onChange={(e) => set("addressCity", e.target.value)} />
          </Field>
          <Field label="Enlace directo de Google Maps (opcional)">
            <Input
              value={fields.mapsUrlOverride ?? ""}
              onChange={(e) => set("mapsUrlOverride", e.target.value)}
              placeholder="Si se deja vacío, se arma con la dirección"
            />
          </Field>
        </div>

        <Field label="Facebook (opcional)">
          <Input value={fields.facebookUrl ?? ""} onChange={(e) => set("facebookUrl", e.target.value)} />
        </Field>
        <Field label="Instagram (opcional)">
          <Input value={fields.instagramUrl ?? ""} onChange={(e) => set("instagramUrl", e.target.value)} />
        </Field>
        <Field label="YouTube (opcional)">
          <Input value={fields.youtubeUrl ?? ""} onChange={(e) => set("youtubeUrl", e.target.value)} />
        </Field>

        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </form>
    </Card>
  );
}

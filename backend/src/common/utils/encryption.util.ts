import * as crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Deriva una llave de 32 bytes a partir de ENCRYPTION_KEY sin importar su
 * longitud original (evita que un valor de .env mal dimensionado rompa el
 * cifrado — se normaliza siempre a 32 bytes vía SHA-256).
 */
function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "ENCRYPTION_KEY no está configurada — revisa el archivo .env",
    );
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Cifra un texto plano. El resultado incluye el IV y el tag de autenticación
 * (formato: "iv.authTag.datosCifrados", todo en base64) para poder
 * descifrarlo después sin guardar esos valores por separado.
 *
 * Uso: contraseñas de equipos entregadas por el cliente (RepairOrder) y
 * credenciales de licencias de software (SoftwareLicense) — nunca se
 * almacenan en texto plano, cumpliendo la sección 32 del brief.
 */
export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Formato de dato cifrado inválido");
  }
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

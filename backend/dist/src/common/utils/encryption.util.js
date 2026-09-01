"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
const crypto = __importStar(require("crypto"));
const ALGORITHM = "aes-256-gcm";
/**
 * Deriva una llave de 32 bytes a partir de ENCRYPTION_KEY sin importar su
 * longitud original (evita que un valor de .env mal dimensionado rompa el
 * cifrado — se normaliza siempre a 32 bytes vía SHA-256).
 */
function getKey() {
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret) {
        throw new Error("ENCRYPTION_KEY no está configurada — revisa el archivo .env");
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
function encryptSecret(plainText) {
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
function decryptSecret(payload) {
    const [ivB64, tagB64, dataB64] = payload.split(".");
    if (!ivB64 || !tagB64 || !dataB64) {
        throw new Error("Formato de dato cifrado inválido");
    }
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(dataB64, "base64")),
        decipher.final(),
    ]);
    return decrypted.toString("utf8");
}

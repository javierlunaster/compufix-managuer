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
exports.photoUploadOptions = exports.UPLOADS_DIR = void 0;
const common_1 = require("@nestjs/common");
const multer_1 = require("multer");
const crypto_1 = require("crypto");
const path_1 = require("path");
const fs = __importStar(require("fs"));
// Sistema de archivos local — tal como se propuso desde la arquitectura de
// la Fase 1 ("almacenamiento de imágenes: sistema de archivos local en
// desarrollo, con capa abstraída para migrar a S3-compatible en
// producción"). Esta constante es exactamente esa capa: si el día de
// mañana hay que migrar a S3/MinIO, este es el único archivo que cambia.
exports.UPLOADS_DIR = "./uploads";
if (!fs.existsSync(exports.UPLOADS_DIR)) {
    fs.mkdirSync(exports.UPLOADS_DIR, { recursive: true });
}
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB por foto
exports.photoUploadOptions = {
    storage: (0, multer_1.diskStorage)({
        destination: exports.UPLOADS_DIR,
        filename: (_req, file, callback) => {
            // Nombre aleatorio, no el nombre original del archivo — evita
            // colisiones y evita filtrar nombres de archivo del computador del
            // cliente/técnico que subió la foto.
            callback(null, `${(0, crypto_1.randomUUID)()}${(0, path_1.extname)(file.originalname)}`);
        },
    }),
    limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 10 },
    fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            callback(new common_1.BadRequestException("Solo se permiten imágenes (JPEG, PNG, WEBP o GIF)"), false);
            return;
        }
        callback(null, true);
    },
};

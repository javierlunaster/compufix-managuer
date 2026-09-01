import { BadRequestException } from "@nestjs/common";
import { diskStorage } from "multer";
import { randomUUID } from "crypto";
import { extname } from "path";
import * as fs from "fs";

// Sistema de archivos local — tal como se propuso desde la arquitectura de
// la Fase 1 ("almacenamiento de imágenes: sistema de archivos local en
// desarrollo, con capa abstraída para migrar a S3-compatible en
// producción"). Esta constante es exactamente esa capa: si el día de
// mañana hay que migrar a S3/MinIO, este es el único archivo que cambia.
export const UPLOADS_DIR = "./uploads";

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB por foto

export const photoUploadOptions = {
  storage: diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, callback) => {
      // Nombre aleatorio, no el nombre original del archivo — evita
      // colisiones y evita filtrar nombres de archivo del computador del
      // cliente/técnico que subió la foto.
      callback(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 10 },
  fileFilter: (_req: unknown, file: Express.Multer.File, callback: (error: Error | null, accept: boolean) => void) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(new BadRequestException("Solo se permiten imágenes (JPEG, PNG, WEBP o GIF)"), false);
      return;
    }
    callback(null, true);
  },
};

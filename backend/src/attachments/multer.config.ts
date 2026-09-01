import { BadRequestException } from "@nestjs/common";
import { memoryStorage } from "multer";

// Almacenamiento en memoria — el archivo llega como buffer en
// `file.buffer` y de ahí lo sube AttachmentsService a Supabase Storage
// (ver storage/storage.service.ts). Antes se escribía a disco local
// (Fase 1-15); se cambió porque el filesystem de un contenedor en Railway
// es efímero y se pierde en cada redeploy.
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB por foto

export const photoUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 10 },
  fileFilter: (_req: unknown, file: Express.Multer.File, callback: (error: Error | null, accept: boolean) => void) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(new BadRequestException("Solo se permiten imágenes (JPEG, PNG, WEBP o GIF)"), false);
      return;
    }
    callback(null, true);
  },
};

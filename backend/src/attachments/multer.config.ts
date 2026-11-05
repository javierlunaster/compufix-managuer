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

// Para esquemáticos/boardview de placas SCRAP (ver scrap-boards/) — a
// diferencia de una foto, estos archivos no tienen un tipo MIME
// predecible: un esquemático suele ser PDF, pero un boardview (.fz, .bvr,
// .bvm, .bdv, según el software del técnico — OpenBoardView, Borneo...)
// casi siempre llega como "application/octet-stream" sin importar su
// extensión real. Restringir por MIME type aquí dejaría fuera justo los
// archivos que este módulo necesita guardar, así que no se filtra tipo —
// solo tamaño, y es una herramienta interna del taller, no algo que vea
// el cliente. 25 MB porque un esquemático en PDF de alta resolución pesa
// bastante más que una foto de evidencia.
const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024;

export const scrapBoardFileUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES, files: 10 },
};

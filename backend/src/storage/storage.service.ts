import { Injectable, InternalServerErrorException, OnModuleInit } from "@nestjs/common";
import { StorageClient } from "@supabase/storage-js";
import { randomUUID } from "crypto";
import { extname } from "path";
import sharp from "sharp";

// Una foto de celular moderna pesa varios MB y mide miles de píxeles de
// lado — muy por encima de lo que hace falta para verse en pantalla o
// imprimirse en un PDF tamaño carta. Bajarla a 1920px del lado más largo
// y recomprimir a JPEG calidad 80 reduce el peso típico entre 80-95% sin
// pérdida visible, ahorrando espacio en el plan de Supabase Storage.
const MAX_IMAGE_DIMENSION_PX = 1920;
const JPEG_QUALITY = 80;

/**
 * Capa de almacenamiento de archivos — reemplaza el disco local (Fase 1-15)
 * por Supabase Storage, necesario porque el filesystem de un contenedor en
 * Railway es efímero: se pierde en cada redeploy salvo que se use un
 * Volume. Con Supabase Storage las fotos sobreviven a cualquier redeploy y
 * quedan cubiertas por los backups automáticos de Supabase.
 *
 * Usa el paquete liviano @supabase/storage-js en vez del cliente completo
 * @supabase/supabase-js a propósito: ese último inicializa también su
 * cliente de Realtime (websockets) al crearse, que en Node 20 revienta el
 * proceso con "Node.js detected but native WebSocket not found" (requiere
 * Node 22+) — algo que nunca necesitamos, ya que este servicio solo sube y
 * borra archivos.
 *
 * Es el único archivo que sabe hablarle a Supabase Storage — attachments/
 * solo conoce esta interfaz (upload/remove), tal como se planteó desde la
 * arquitectura original ("capa abstraída para migrar a S3-compatible").
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private client: StorageClient;
  private bucket: string;

  onModuleInit() {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "attachments";

    if (!url || !serviceRoleKey) {
      throw new Error(
        "Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY. Revisa tu .env (compáralo con .env.example).",
      );
    }

    // Service role key: el backend sube/borra archivos en nombre de
    // cualquier usuario autenticado ya validado por JwtAuthGuard — la
    // autorización real ya ocurrió antes de llegar aquí, así que no hace
    // falta (ni conviene) usar la anon key con políticas RLS por archivo.
    this.client = new StorageClient(`${url}/storage/v1`, {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    });
  }

  /**
   * Redimensiona y recomprime una foto antes de subirla (ver constantes
   * arriba). Siempre normaliza a JPEG sin importar el formato de origen
   * (PNG/WEBP/GIF) — para fotos de cámara, JPEG comprime muchísimo mejor
   * que PNG y aquí nunca hace falta transparencia. `.rotate()` sin
   * argumentos lee la orientación EXIF UNA vez para girar los píxeles
   * correctamente antes de que sharp descarte el resto de los metadatos
   * al recomprimir (efecto colateral bueno: tampoco se filtra ubicación
   * GPS u otros datos EXIF de la foto original).
   *
   * Si sharp no puede procesar el archivo (formato raro, corrupto), se
   * sube tal cual llegó — nunca bloquea la evidencia del técnico por un
   * problema de compresión.
   */
  private async compressIfImage(
    file: Express.Multer.File,
  ): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
    if (!file.mimetype.startsWith("image/")) {
      return { buffer: file.buffer, contentType: file.mimetype, extension: extname(file.originalname) };
    }

    try {
      const buffer = await sharp(file.buffer)
        .rotate()
        .resize({
          width: MAX_IMAGE_DIMENSION_PX,
          height: MAX_IMAGE_DIMENSION_PX,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer();
      return { buffer, contentType: "image/jpeg", extension: ".jpg" };
    } catch {
      return { buffer: file.buffer, contentType: file.mimetype, extension: extname(file.originalname) };
    }
  }

  /**
   * Sube un archivo y devuelve su URL pública. `folder` agrupa los
   * archivos dentro del bucket (ej. "repair-orders/42") solo para que el
   * bucket sea navegable a simple vista desde el dashboard de Supabase —
   * no se usa para ninguna lógica del sistema.
   */
  async upload(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ path: string; publicUrl: string; contentType: string }> {
    const { buffer, contentType, extension } = await this.compressIfImage(file);
    const path = `${folder}/${randomUUID()}${extension}`;

    const { error } = await this.client.from(this.bucket).upload(path, buffer, {
      contentType,
      upsert: false,
    });

    if (error) {
      throw new InternalServerErrorException(`No se pudo subir el archivo a Supabase Storage: ${error.message}`);
    }

    const { data } = this.client.from(this.bucket).getPublicUrl(path);
    return { path, publicUrl: data.publicUrl, contentType };
  }

  /**
   * Borra un archivo por su `path` dentro del bucket (no por URL completa).
   * Si ya no existe, Supabase no lanza error — mismo criterio que ya tenía
   * el borrado en disco local (fs.unlink con callback vacío).
   */
  async remove(path: string): Promise<void> {
    await this.client.from(this.bucket).remove([path]);
  }

  /**
   * Extrae el `path` dentro del bucket a partir de una URL pública
   * guardada en `Attachment.fileUrl` — necesario porque solo se persiste
   * la URL completa, no el path por separado (ver AttachmentsService).
   */
  pathFromPublicUrl(publicUrl: string): string {
    const marker = `/storage/v1/object/public/${this.bucket}/`;
    const idx = publicUrl.indexOf(marker);
    return idx === -1 ? publicUrl : publicUrl.slice(idx + marker.length);
  }
}

import { Injectable, InternalServerErrorException, OnModuleInit } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { extname } from "path";

/**
 * Capa de almacenamiento de archivos — reemplaza el disco local (Fase 1-15)
 * por Supabase Storage, necesario porque el filesystem de un contenedor en
 * Railway es efímero: se pierde en cada redeploy salvo que se use un
 * Volume. Con Supabase Storage las fotos sobreviven a cualquier redeploy y
 * quedan cubiertas por los backups automáticos de Supabase.
 *
 * Es el único archivo que sabe hablarle a Supabase Storage — attachments/
 * solo conoce esta interfaz (upload/remove), tal como se planteó desde la
 * arquitectura original ("capa abstraída para migrar a S3-compatible").
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private client: SupabaseClient;
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
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  /**
   * Sube un archivo y devuelve su URL pública. `folder` agrupa los
   * archivos dentro del bucket (ej. "repair-orders/42") solo para que el
   * bucket sea navegable a simple vista desde el dashboard de Supabase —
   * no se usa para ninguna lógica del sistema.
   */
  async upload(file: Express.Multer.File, folder: string): Promise<{ path: string; publicUrl: string }> {
    const path = `${folder}/${randomUUID()}${extname(file.originalname)}`;

    const { error } = await this.client.storage.from(this.bucket).upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

    if (error) {
      throw new InternalServerErrorException(`No se pudo subir el archivo a Supabase Storage: ${error.message}`);
    }

    const { data } = this.client.storage.from(this.bucket).getPublicUrl(path);
    return { path, publicUrl: data.publicUrl };
  }

  /**
   * Borra un archivo por su `path` dentro del bucket (no por URL completa).
   * Si ya no existe, Supabase no lanza error — mismo criterio que ya tenía
   * el borrado en disco local (fs.unlink con callback vacío).
   */
  async remove(path: string): Promise<void> {
    await this.client.storage.from(this.bucket).remove([path]);
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

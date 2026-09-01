/**
 * Migración única de fotos ya subidas (antes de pasar a Railway + Supabase)
 * desde el disco local (carpeta uploads/, Fase 1-15) hacia Supabase
 * Storage — necesario porque el filesystem de Railway es efímero.
 *
 * Uso (después de haber corrido `npx prisma migrate deploy` y de haber
 * restaurado los datos con deploy/import-to-supabase.sh, para que existan
 * las filas de Attachment que este script va a actualizar):
 *
 *   DATABASE_URL="<la de Supabase>" \
 *   SUPABASE_URL="https://tu-proyecto.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="..." \
 *   SUPABASE_STORAGE_BUCKET="attachments" \
 *   npx ts-node scripts/migrate-uploads-to-supabase.ts ./uploads-antiguos
 *
 * El argumento es la carpeta con los .jpg/.png que exportaste del servidor
 * o computador anterior (ej. lo que copiaste de deploy/migration-export/
 * después de descomprimir uploads.tar.gz).
 *
 * Es seguro volver a correrlo si se corta a la mitad: solo toca las filas
 * cuyo fileUrl todavía empieza con "/uploads/" (las ya migradas, que
 * empiezan con "https://", se saltan).
 */
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const localDir = process.argv[2];
  if (!localDir) {
    console.error("Uso: ts-node scripts/migrate-uploads-to-supabase.ts <carpeta-con-fotos-antiguas>");
    process.exit(1);
  }
  if (!fs.existsSync(localDir)) {
    console.error(`No existe la carpeta: ${localDir}`);
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "attachments";
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const pending = await prisma.attachment.findMany({
    where: { fileUrl: { startsWith: "/uploads/" } },
  });

  console.log(`Fotos por migrar: ${pending.length}`);

  let migrated = 0;
  let missing = 0;

  for (const attachment of pending) {
    const filename = path.basename(attachment.fileUrl);
    const localPath = path.join(localDir, filename);

    if (!fs.existsSync(localPath)) {
      console.warn(`  ! No se encontró el archivo local para el attachment ${attachment.id}: ${filename}`);
      missing++;
      continue;
    }

    const buffer = fs.readFileSync(localPath);
    const storagePath = `repair-orders/${attachment.repairOrderId ?? "sin-orden"}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, { contentType: attachment.fileType, upsert: true });

    if (uploadError) {
      console.error(`  ! Error subiendo attachment ${attachment.id} (${filename}): ${uploadError.message}`);
      continue;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);

    await prisma.attachment.update({
      where: { id: attachment.id },
      data: { fileUrl: data.publicUrl },
    });

    migrated++;
    if (migrated % 20 === 0) console.log(`  ... ${migrated} migradas`);
  }

  console.log(`\nListo. Migradas: ${migrated}. Sin archivo local encontrado: ${missing}.`);
  if (missing > 0) {
    console.log(
      "Las filas sin archivo local NO se modificaron (siguen apuntando a /uploads/... hasta que las resuelvas a mano).",
    );
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { validateEnv } from "./common/config/validate-env";

async function bootstrap() {
  // Antes de crear la app: si falta una variable obligatoria o quedó un
  // secreto de ejemplo sin cambiar en producción, mejor que truene aquí,
  // con un mensaje claro, que a mitad de la primera request de un cliente.
  validateEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Las fotos de evidencia (Fase 15) ya no se sirven desde este servidor:
  // viven en Supabase Storage (ver storage/storage.service.ts) y el
  // frontend las carga directo desde ahí, así que no hace falta
  // useStaticAssets ni el ajuste de crossOriginResourcePolicy que eso
  // requería.
  app.use(helmet());

  // En desarrollo, sin FRONTEND_URL definida, se permite cualquier origen
  // (más simple para trabajar en local). En producción, restringido
  // explícitamente al dominio real del frontend — dejarlo abierto ahí
  // sería aceptar requests autenticadas desde cualquier sitio web.
  const frontendUrl = process.env.FRONTEND_URL;
  app.enableCors({
    origin: frontendUrl ? frontendUrl.split(",") : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta campos no declarados en el DTO
      forbidNonWhitelisted: true, // rechaza el request si envían campos extra
      transform: true, // convierte payloads a instancias de la clase del DTO
    }),
  );

  app.setGlobalPrefix("api");

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`COMPufix Manager API escuchando en http://localhost:${port}/api`);
}
bootstrap();

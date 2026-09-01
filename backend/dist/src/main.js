"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
const validate_env_1 = require("./common/config/validate-env");
async function bootstrap() {
    // Antes de crear la app: si falta una variable obligatoria o quedó un
    // secreto de ejemplo sin cambiar en producción, mejor que truene aquí,
    // con un mensaje claro, que a mitad de la primera request de un cliente.
    (0, validate_env_1.validateEnv)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // crossOriginResourcePolicy en "cross-origin": por defecto, Helmet
    // bloquea que un origen distinto (el frontend en :5173) cargue recursos
    // de este servidor (:3000) como <img src="...">. Sin este ajuste, las
    // fotos de evidencia (Fase 15) se subirían bien pero nunca se verían en
    // la interfaz — el navegador las rechazaría en silencio por política de
    // origen cruzado, no por un error de la aplicación.
    app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
    // Sirve las fotos subidas (ver attachments/multer.config.ts) en
    // /uploads/<archivo> — nótese que NO lleva el prefijo /api: setGlobalPrefix
    // solo afecta a los controladores, no a los archivos estáticos.
    app.useStaticAssets((0, path_1.join)(process.cwd(), "uploads"), { prefix: "/uploads" });
    // En desarrollo, sin FRONTEND_URL definida, se permite cualquier origen
    // (más simple para trabajar en local). En producción, restringido
    // explícitamente al dominio real del frontend — dejarlo abierto ahí
    // sería aceptar requests autenticadas desde cualquier sitio web.
    const frontendUrl = process.env.FRONTEND_URL;
    app.enableCors({
        origin: frontendUrl ? frontendUrl.split(",") : true,
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true, // descarta campos no declarados en el DTO
        forbidNonWhitelisted: true, // rechaza el request si envían campos extra
        transform: true, // convierte payloads a instancias de la clase del DTO
    }));
    app.setGlobalPrefix("api");
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    // eslint-disable-next-line no-console
    console.log(`COMPufix Manager API escuchando en http://localhost:${port}/api`);
}
bootstrap();

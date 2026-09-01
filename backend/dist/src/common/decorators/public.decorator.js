"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Public = exports.IS_PUBLIC_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.IS_PUBLIC_KEY = "isPublic";
/**
 * Marca un endpoint como accesible sin token (ej. login). Se usa junto con
 * JwtAuthGuard, que está registrado globalmente — sin este decorador,
 * TODA ruta nueva queda protegida por defecto (fail-safe: es más seguro
 * olvidar marcar una ruta pública que olvidar protegerla).
 */
const Public = () => (0, common_1.SetMetadata)(exports.IS_PUBLIC_KEY, true);
exports.Public = Public;

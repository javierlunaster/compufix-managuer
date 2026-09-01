"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
/**
 * Sin este filtro, un error inesperado (ej. una excepción de Prisma que no
 * se convirtió a una HttpException a propósito) terminaría devolviendo el
 * mensaje interno de Node/Prisma tal cual al cliente — que puede revelar
 * detalles de la estructura de la base de datos o rutas del servidor. En
 * producción, cualquier error que no sea una HttpException conocida se
 * convierte en un 500 genérico; el detalle real se manda al log del
 * servidor, no a la respuesta HTTP.
 */
let AllExceptionsFilter = class AllExceptionsFilter {
    constructor() {
        this.logger = new common_1.Logger("ExceptionFilter");
        this.isProduction = process.env.NODE_ENV === "production";
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const isHttpException = exception instanceof common_1.HttpException;
        const status = isHttpException
            ? exception.getStatus()
            : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const exposedResponse = isHttpException
            ? exception.getResponse()
            : this.isProduction
                ? { message: "Ha ocurrido un error inesperado" }
                : { message: exception?.message, stack: exception?.stack };
        if (!isHttpException || status >= 500) {
            this.logger.error(isHttpException ? exception.message : exception?.stack ?? String(exception));
        }
        response.status(status).json(typeof exposedResponse === "string"
            ? { statusCode: status, message: exposedResponse }
            : { statusCode: status, ...exposedResponse });
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);

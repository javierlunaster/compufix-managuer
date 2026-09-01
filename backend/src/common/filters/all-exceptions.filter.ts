import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";

/**
 * Sin este filtro, un error inesperado (ej. una excepción de Prisma que no
 * se convirtió a una HttpException a propósito) terminaría devolviendo el
 * mensaje interno de Node/Prisma tal cual al cliente — que puede revelar
 * detalles de la estructura de la base de datos o rutas del servidor. En
 * producción, cualquier error que no sea una HttpException conocida se
 * convierte en un 500 genérico; el detalle real se manda al log del
 * servidor, no a la respuesta HTTP.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");
  private readonly isProduction = process.env.NODE_ENV === "production";

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exposedResponse = isHttpException
      ? exception.getResponse()
      : this.isProduction
        ? { message: "Ha ocurrido un error inesperado" }
        : { message: (exception as Error)?.message, stack: (exception as Error)?.stack };

    if (!isHttpException || status >= 500) {
      this.logger.error(
        isHttpException ? exception.message : (exception as Error)?.stack ?? String(exception),
      );
    }

    response.status(status).json(
      typeof exposedResponse === "string"
        ? { statusCode: status, message: exposedResponse }
        : { statusCode: status, ...exposedResponse },
    );
  }
}

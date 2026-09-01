import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * A diferencia de JwtAuthGuard (del personal), este NO está registrado
 * globalmente — se aplica explícitamente solo en las rutas del portal de
 * clientes que lo necesitan (@UseGuards(CustomerJwtAuthGuard)). El
 * controlador completo se marca @Public() para que el guard global del
 * personal lo ignore, y este guard es el único que realmente protege
 * estas rutas.
 */
@Injectable()
export class CustomerJwtAuthGuard extends AuthGuard("customer-jwt") {}

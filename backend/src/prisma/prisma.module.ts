import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/**
 * @Global() para que cualquier módulo pueda inyectar PrismaService sin
 * tener que importar PrismaModule explícitamente en cada uno.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

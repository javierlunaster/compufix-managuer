import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Envuelve PrismaClient como un provider de Nest para poder inyectarlo
 * en cualquier servicio (`constructor(private prisma: PrismaService) {}`)
 * y para que la conexión se abra/cierre junto con el ciclo de vida de la
 * aplicación.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

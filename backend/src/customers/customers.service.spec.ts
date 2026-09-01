import { Test } from "@nestjs/testing";
import { ConflictException } from "@nestjs/common";
import { CustomersService } from "./customers.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

/**
 * Ejemplo de cómo probar un servicio sin depender de una base de datos
 * real: se simula `PrismaService` con funciones de Jest (`jest.fn()`) que
 * devuelven exactamente lo que cada prueba necesita. Este es el patrón a
 * seguir para escribir pruebas del resto de servicios del sistema —
 * ninguno de los otros ~35 servicios tiene pruebas todavía (ver
 * limitación documentada en el README de esta fase), pero todos siguen la
 * misma forma (`constructor(prisma, audit, ...)`), así que este mismo
 * molde aplica directo.
 */
describe("CustomersService", () => {
  let service: CustomersService;
  let prisma: {
    customer: {
      findMany: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      customer: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    audit = { log: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = moduleRef.get(CustomersService);
  });

  it("crea un cliente nuevo cuando no hay coincidencias de nombre", async () => {
    prisma.customer.findMany.mockResolvedValue([]);
    prisma.customer.create.mockResolvedValue({ id: 1, fullName: "Hans Patiño" });

    const result = await service.create({ fullName: "Hans Patiño" } as any, 99);

    expect(prisma.customer.create).toHaveBeenCalled();
    expect(result.fullName).toBe("Hans Patiño");
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CREATE", entityType: "Customer" }),
    );
  });

  it("rechaza con 409 si ya existe un cliente con el nombre normalizado igual", async () => {
    prisma.customer.findMany.mockResolvedValue([
      { id: 1, fullName: "Hans Patiño", phone: "3028110131", documentId: null },
    ]);

    await expect(service.create({ fullName: "hans patiño" } as any, 99)).rejects.toThrow(
      ConflictException,
    );

    expect(prisma.customer.create).not.toHaveBeenCalled();
  });

  it("crea igual si se confirma explícitamente pese al posible duplicado", async () => {
    prisma.customer.findMany.mockResolvedValue([{ id: 1, fullName: "Hans Patiño" }]);
    prisma.customer.create.mockResolvedValue({ id: 2, fullName: "hans patiño" });

    const result = await service.create(
      { fullName: "hans patiño", confirmCreateDespiteDuplicate: true } as any,
      99,
    );

    expect(prisma.customer.create).toHaveBeenCalled();
    expect(result.id).toBe(2);
  });
});

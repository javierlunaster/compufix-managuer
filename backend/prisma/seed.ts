/**
 * Seed de catálogos base (Fase 1).
 *
 * Estos valores NO son datos inventados: son los catálogos que se detectaron
 * al analizar Inventario-PC.xlsx (ver documento de arquitectura, secciones
 * A, B y G). El objetivo es que el sistema arranque con los mismos
 * catálogos que el taller ya usa en la práctica, normalizados.
 *
 * Ejecutar con: npm run seed
 */

import { PrismaClient, RecordStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // ---------------------------------------------------------------------
  // Roles (sección 21 del brief)
  // ---------------------------------------------------------------------
  const roleNames = [
    "Administrador",
    "Gerente",
    "Técnico",
    "Recepción",
    "Inventario",
    "Ventas",
  ];
  const roles: Record<string, number> = {};
  for (const name of roleNames) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    roles[name] = role.id;
  }

  // ---------------------------------------------------------------------
  // Usuario administrador inicial
  // (cambiar la contraseña inmediatamente después del primer login)
  // ---------------------------------------------------------------------
  const passwordHash = await bcrypt.hash("CambiarEstaClave123!", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      fullName: "Administrador",
      username: "admin",
      passwordHash,
      roleId: roles["Administrador"],
    },
  });

  // ---------------------------------------------------------------------
  // Tipos de equipo — normalizados de las 21 variantes detectadas
  // en "Ingreso de equipos" (Portatil, portatil, Portaitil, Portatl...)
  // ---------------------------------------------------------------------
  const deviceTypes = [
    "Portátil",
    "Torre",
    "All in One",
    "Tablet",
    "Placa base",
    "Impresora",
  ];
  for (const name of deviceTypes) {
    await prisma.deviceType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ---------------------------------------------------------------------
  // Marcas — normalizadas de las variantes detectadas
  // (Hp/HP/hp/HP /hP → "HP", etc.)
  // ---------------------------------------------------------------------
  const brands = [
    "HP",
    "Lenovo",
    "Asus",
    "Dell",
    "Acer",
    "Toshiba",
    "Compaq",
    "Apple",
    "Samsung",
    "Sony",
    "Clon",
  ];
  for (const name of brands) {
    await prisma.brand.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ---------------------------------------------------------------------
  // Categorías de producto (sección 11 del brief)
  // ---------------------------------------------------------------------
  const categories = [
    "Cargadores",
    "Baterías",
    "Pantallas",
    "Teclados",
    "SSD",
    "HDD",
    "RAM",
    "Cables",
    "Conectores",
    "MOSFET",
    "IC",
    "Resistencias",
    "Capacitores",
    "Componentes electrónicos",
    "Accesorios",
    "Licencias de software",
    "Otros",
  ];
  for (const name of categories) {
    await prisma.productCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ---------------------------------------------------------------------
  // Servicios — muestra de "Codigos de facturacion" del Excel
  // (completar el resto en el módulo de Configuración)
  // ---------------------------------------------------------------------
  const services: { code: string; name: string; basePrice: number }[] = [
    {
      code: "1030",
      name: "Mantenimiento preventivo y actualización a SSD 256 GB",
      basePrice: 0,
    },
    {
      code: "1031",
      name: "Reemplazo de pantalla y mantenimiento preventivo",
      basePrice: 0,
    },
    {
      code: "1032",
      name: "Cambio de carcasa soporte de teclado (incluye teclado y touch)",
      basePrice: 0,
    },
  ];
  for (const s of services) {
    await prisma.service.upsert({
      where: { code: s.code },
      update: {},
      create: {
        code: s.code,
        name: s.name,
        basePrice: s.basePrice,
      },
    });
  }

  // ---------------------------------------------------------------------
  // Proveedores recurrentes detectados en Compras/Cotizaciones
  // ---------------------------------------------------------------------
  const supplierNames = ["Jawan", "Virtual Tronic", "Digital"];
  const supplierIds: Record<string, number> = {};
  for (const name of supplierNames) {
    const existing = await prisma.supplier.findFirst({ where: { name } });
    const supplier =
      existing ??
      (await prisma.supplier.create({ data: { name } }));
    supplierIds[name] = supplier.id;
  }

  // ---------------------------------------------------------------------
  // Cuentas de pago — de la hoja "Transferencias"
  // ---------------------------------------------------------------------
  await prisma.paymentAccount.createMany({
    data: [
      { supplierId: supplierIds["Jawan"], ownerName: "Jawan", channel: "Nequi", accountRef: "3176448284" },
      { ownerName: "Microxol - Martin Valois", channel: "Bancolombia", accountRef: "Ahorros 69813875845" },
      { supplierId: supplierIds["Virtual Tronic"], ownerName: "Virtual Tronic", channel: "Bancolombia", accountRef: "Ahorros 23600011383" },
    ],
    skipDuplicates: true,
  });

  console.log("Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

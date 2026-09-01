import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Prueba end-to-end de ejemplo — a diferencia de las pruebas unitarias
 * (`*.spec.ts` junto a cada servicio), esta arranca la aplicación
 * COMPLETA, incluida la conexión real a PostgreSQL. Por eso requiere:
 *
 *   docker compose up -d        (Postgres corriendo)
 *   npx prisma migrate deploy   (esquema aplicado)
 *   npm run seed                (usuario admin creado)
 *
 * antes de `npm run test:e2e`. Es deliberadamente un solo ejemplo, no una
 * suite completa — el objetivo de esta fase es dejar el patrón
 * funcionando (cómo se arranca la app en modo prueba, cómo se le pega con
 * supertest) para que se pueda extender, no cubrir cada endpoint del
 * sistema con un e2e — eso sería una fase de trabajo en sí misma.
 */
describe("Auth (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/health responde 200 sin necesitar token", () => {
    return request(app.getHttpServer())
      .get("/api/health")
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBeDefined();
      });
  });

  it("POST /api/auth/login rechaza credenciales incorrectas con 401", () => {
    return request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ username: "admin", password: "clave-definitivamente-incorrecta" })
      .expect(401);
  });

  it("una ruta protegida sin token responde 401", () => {
    return request(app.getHttpServer()).get("/api/customers").expect(401);
  });
});

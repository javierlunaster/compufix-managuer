import { encryptSecret, decryptSecret } from "./encryption.util";

describe("encryptSecret / decryptSecret", () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = "clave-de-prueba-solo-para-tests";
  });

  afterAll(() => {
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  it("descifra exactamente lo que se cifró (round-trip)", () => {
    const plain = "clave-temporal-del-cliente-123";
    const encrypted = encryptSecret(plain);
    expect(decryptSecret(encrypted)).toBe(plain);
  });

  it("el valor cifrado nunca contiene el texto plano original", () => {
    // Esta es la prueba que más importa desde el punto de vista de
    // seguridad (sección 32 del brief): lo que se guarda en la base de
    // datos jamás debe incluir la contraseña original como substring.
    const plain = "unaContraseñaFacilDeIdentificar";
    const encrypted = encryptSecret(plain);
    expect(encrypted).not.toContain(plain);
  });

  it("dos cifrados del mismo texto producen resultados distintos", () => {
    // Gracias al IV aleatorio en cada llamada — si esto fallara, dos
    // clientes con la misma contraseña tendrían el mismo valor cifrado,
    // lo cual filtraría información (alguien podría notar coincidencias).
    const plain = "misma-clave";
    expect(encryptSecret(plain)).not.toBe(encryptSecret(plain));
  });

  it("falla al descifrar con una llave distinta a la que se usó para cifrar", () => {
    const encrypted = encryptSecret("dato-sensible");
    process.env.ENCRYPTION_KEY = "una-llave-completamente-distinta";
    expect(() => decryptSecret(encrypted)).toThrow();
    process.env.ENCRYPTION_KEY = "clave-de-prueba-solo-para-tests";
  });
});

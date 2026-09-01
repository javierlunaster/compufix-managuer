import { normalizeName } from "./normalize-name.util";

describe("normalizeName", () => {
  it("convierte a minúsculas", () => {
    expect(normalizeName("MANUEL GONZALEZ")).toBe("manuel gonzalez");
  });

  it("quita tildes y diacríticos", () => {
    expect(normalizeName("José Andrés")).toBe("jose andres");
  });

  it("recorta espacios al inicio y al final", () => {
    expect(normalizeName("  Hans Patiño  ")).toBe("hans patiño");
  });

  it("colapsa espacios múltiples en uno solo", () => {
    expect(normalizeName("Manuel    Gonzalez")).toBe("manuel gonzalez");
  });

  it("dos variantes de escritura del mismo nombre normalizan igual", () => {
    // Este es exactamente el caso real detectado en el Excel (Fase 1):
    // los 4 duplicados encontrados eran la misma persona con distinta
    // capitalización/espaciado, no personas distintas.
    expect(normalizeName("Manuel Gonzalez")).toBe(normalizeName("MANUEL   GONZÁLEZ "));
  });

  it("nombres genuinamente distintos NO normalizan igual", () => {
    expect(normalizeName("Juan Pérez")).not.toBe(normalizeName("Juan Pablo Pérez"));
  });
});

import { parseSpanishDate } from "./spanish-date.util";

describe("parseSpanishDate", () => {
  it("reconstruye una fecha real a partir de Año/Mes en español/Día", () => {
    const date = parseSpanishDate(2025, "Julio", 8);
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2025);
    expect(date?.getMonth()).toBe(6); // julio = índice 6
    expect(date?.getDate()).toBe(8);
  });

  it("es insensible a mayúsculas y espacios en el nombre del mes", () => {
    // "Agosto " con espacio al final es un caso real detectado en el
    // Excel (ver Fase 1, fila del consecutivo 10820).
    const date = parseSpanishDate(2025, "Agosto ", 9);
    expect(date?.getMonth()).toBe(7);
  });

  it("devuelve null si el mes no es reconocible", () => {
    expect(parseSpanishDate(2025, "Ago", 9)).toBeNull();
    expect(parseSpanishDate(2025, "", 9)).toBeNull();
  });

  it("devuelve null si el año está fuera de un rango razonable", () => {
    expect(parseSpanishDate(1899, "Enero", 1)).toBeNull();
    expect(parseSpanishDate(2200, "Enero", 1)).toBeNull();
  });

  it("devuelve null para un día imposible (ej. 31 de febrero)", () => {
    // JavaScript "corrige" fechas imposibles silenciosamente (31 de
    // febrero se convierte en el 3 de marzo) — esta prueba confirma que
    // parseSpanishDate detecta ese desfase en vez de aceptarlo.
    expect(parseSpanishDate(2025, "Febrero", 31)).toBeNull();
  });

  it("devuelve null si el día está fuera de rango (0 o 32)", () => {
    expect(parseSpanishDate(2025, "Enero", 0)).toBeNull();
    expect(parseSpanishDate(2025, "Enero", 32)).toBeNull();
  });
});

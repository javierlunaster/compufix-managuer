/**
 * Convierte un monto en pesos a su forma escrita en español, para la
 * "cuenta de cobro" de Servicios externos (ver ServiceJobsService) — el
 * formato en papel que ya usaba el taller escribe el monto en letras
 * ("QUINIENTOS SESENTA MIL PESOS M/C") además de en números.
 *
 * Solo pesos enteros (sin centavos) — ningún documento del taller cobra
 * fracciones de peso.
 */

const UNITS = [
  "",
  "UN",
  "DOS",
  "TRES",
  "CUATRO",
  "CINCO",
  "SEIS",
  "SIETE",
  "OCHO",
  "NUEVE",
  "DIEZ",
  "ONCE",
  "DOCE",
  "TRECE",
  "CATORCE",
  "QUINCE",
  "DIECISÉIS",
  "DIECISIETE",
  "DIECIOCHO",
  "DIECINUEVE",
  "VEINTE",
  "VEINTIÚN",
  "VEINTIDÓS",
  "VEINTITRÉS",
  "VEINTICUATRO",
  "VEINTICINCO",
  "VEINTISÉIS",
  "VEINTISIETE",
  "VEINTIOCHO",
  "VEINTINUEVE",
];

const TENS = [
  "",
  "",
  "VEINTE",
  "TREINTA",
  "CUARENTA",
  "CINCUENTA",
  "SESENTA",
  "SETENTA",
  "OCHENTA",
  "NOVENTA",
];

const HUNDREDS = [
  "",
  "CIENTO",
  "DOSCIENTOS",
  "TRESCIENTOS",
  "CUATROCIENTOS",
  "QUINIENTOS",
  "SEISCIENTOS",
  "SETECIENTOS",
  "OCHOCIENTOS",
  "NOVECIENTOS",
];

function threeDigitsToWords(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "CIEN";

  const hundredsDigit = Math.floor(n / 100);
  const remainder = n % 100;
  const parts: string[] = [];

  if (hundredsDigit > 0) parts.push(HUNDREDS[hundredsDigit]);

  if (remainder > 0) {
    if (remainder <= 29) {
      // 0-29 son una sola palabra (ver UNITS) — "veintiuno", no "veinte y uno".
      parts.push(UNITS[remainder]);
    } else {
      const tensDigit = Math.floor(remainder / 10);
      const unitsDigit = remainder % 10;
      if (unitsDigit === 0) {
        parts.push(TENS[tensDigit]);
      } else {
        parts.push(`${TENS[tensDigit]} Y ${UNITS[unitsDigit]}`);
      }
    }
  }

  return parts.join(" ");
}

export function numberToWordsEs(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return "CERO PESOS M/C";

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const units = n % 1000;

  const parts: string[] = [];

  if (millions > 0) {
    parts.push(
      millions === 1 ? "UN MILLÓN" : `${threeDigitsToWords(millions)} MILLONES`,
    );
  }

  if (thousands > 0) {
    parts.push(thousands === 1 ? "MIL" : `${threeDigitsToWords(thousands)} MIL`);
  }

  if (units > 0) {
    parts.push(threeDigitsToWords(units));
  }

  return `${parts.join(" ")} PESOS M/C`;
}

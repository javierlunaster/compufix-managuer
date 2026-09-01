import PDFDocument from "pdfkit";

/**
 * Las fuentes estándar de PDFKit (Helvetica y compañía) solo soportan la
 * codificación WinAnsi (básicamente Windows-1252): letras con tilde, ñ, ¿¡,
 * y la raya "—" SÍ están cubiertas, pero símbolos tipográficos más
 * modernos —flechas, comillas curvas, viñetas, puntos suspensivos como un
 * solo carácter— NO existen en esa fuente y PDFKit los reemplaza por
 * glifos irreconocibles en vez de fallar con un error claro (así se generó
 * el texto corrupto "!'" donde debía ir una flecha "→" en el informe
 * técnico). Esta función normaliza cualquier texto ANTES de pasarlo a
 * PDFKit — se aplica en todos los métodos de PdfBuilder, así que cubre no
 * solo el texto que este código arma, sino cualquier texto libre que un
 * técnico haya escrito (una falla reportada, una nota) y que algún día
 * incluya uno de estos símbolos sin que nadie se dé cuenta hasta imprimir.
 */
// Códigos Unicode que Windows-1252/WinAnsi sí soporta en el rango "alto"
// (0x80-0x9F del byte original) aunque su código Unicode quede muy por
// encima de 0xFF — la raya "—" (U+2014), las comillas curvas, la viñeta
// "•" y los puntos suspensivos "…" están AQUÍ, no serían "seguros" bajo un
// simple chequeo de rango numérico, pero la fuente sí los dibuja bien.
const WINANSI_SPECIAL_CODEPOINTS = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
  0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

function isWinAnsiSafe(codePoint: number): boolean {
  if (codePoint <= 0x7f) return true; // ASCII
  if (codePoint >= 0xa0 && codePoint <= 0xff) return true; // Latin-1: tildes, ñ, ¿¡, etc.
  return WINANSI_SPECIAL_CODEPOINTS.has(codePoint);
}

function sanitizeForPdf(text: string): string {
  // Las flechas SÍ tienen un reemplazo con significado (no son solo
  // decorativas, comunican dirección/secuencia), así que se convierten a
  // su equivalente en ASCII en vez de perderse como "?".
  const withArrowsReplaced = text.replace(/[→⇒➜➔]/g, "->").replace(/[←⇐]/g, "<-");

  return Array.from(withArrowsReplaced)
    .map((ch) => (isWinAnsiSafe(ch.codePointAt(0) ?? 0) ? ch : "?"))
    .join("");
}

/**
 * Envoltorio delgado sobre PDFKit con los bloques que se repiten en todos
 * los documentos del taller (encabezado con datos del negocio, títulos de
 * sección, pares clave/valor, tablas, párrafos). Cada generador de
 * documento (ver documents.service.ts) compone estos bloques en vez de
 * manipular PDFKit directamente — mismo criterio que el resto del sistema:
 * un solo lugar concentra el "cómo se ve", los servicios solo deciden
 * "qué contenido va".
 */
export class PdfBuilder {
  doc: PDFKit.PDFDocument;

  constructor() {
    this.doc = new PDFDocument({ margin: 50, size: "letter", bufferPages: true });
  }

  header(params: { docTitle: string; docSubtitle?: string }) {
    this.doc
      .fontSize(9)
      .fillColor("#6b7280")
      .text("COMPUFIX — TALLER DE REPARACIÓN DE COMPUTADORES", { align: "left" });

    this.doc
      .moveDown(0.3)
      .fontSize(18)
      .fillColor("#111827")
      .text(sanitizeForPdf(params.docTitle), { align: "left" });

    if (params.docSubtitle) {
      this.doc.fontSize(10).fillColor("#6b7280").text(sanitizeForPdf(params.docSubtitle));
    }

    this.doc
      .moveTo(50, this.doc.y + 10)
      .lineTo(this.doc.page.width - 50, this.doc.y + 10)
      .strokeColor("#d1d5db")
      .stroke();

    this.doc.moveDown(1.2);
    return this;
  }

  sectionTitle(text: string) {
    this.doc
      .moveDown(0.6)
      .fontSize(11)
      .fillColor("#111827")
      .text(sanitizeForPdf(text).toUpperCase(), { characterSpacing: 0.5 });
    this.doc.moveDown(0.3).fontSize(10).fillColor("#111827");
    return this;
  }

  /** Pares etiqueta/valor en dos columnas, como un formulario impreso. */
  keyValueGrid(pairs: [string, string | null | undefined][]) {
    const colWidth = (this.doc.page.width - 100) / 2;
    const colGap = 10;

    // Se agrupan de a 2 (una fila = hasta 2 columnas) y se calcula la
    // altura real de cada fila ANTES de decidir dónde empieza la
    // siguiente — con el número de pares impar (ej. Cliente/Teléfono/
    // Documento = 3), depender del cursor `doc.y` que va dejando cada
    // `.text()` hacía que la última fila sin pareja nunca avanzara la
    // posición correctamente, y la siguiente sección quedaba escrita
    // encima de esta.
    for (let i = 0; i < pairs.length; i += 2) {
      const row = pairs.slice(i, i + 2);
      const rowStartY = this.doc.y;
      let rowHeight = 0;

      row.forEach(([label, value], col) => {
        const x = 50 + col * (colWidth + colGap);
        const width = colWidth - colGap;
        const safeLabel = sanitizeForPdf(label).toUpperCase();

        this.doc.fontSize(8);
        const labelHeight = this.doc.heightOfString(safeLabel, { width });
        this.doc.fillColor("#6b7280").text(safeLabel, x, rowStartY, { width });

        const valueText = value ? sanitizeForPdf(value) : "—";
        const valueY = rowStartY + labelHeight + 2;
        this.doc.fontSize(10);
        const valueHeight = this.doc.heightOfString(valueText, { width });
        this.doc.fillColor("#111827").text(valueText, x, valueY, { width });

        rowHeight = Math.max(rowHeight, labelHeight + 2 + valueHeight);
      });

      this.doc.y = rowStartY + rowHeight + 8;
    }

    this.doc.x = this.doc.page.margins.left;
    return this;
  }

  paragraph(text: string) {
    this.doc.fontSize(10).fillColor("#111827").text(sanitizeForPdf(text), { align: "left" });
    this.doc.moveDown(0.4);
    return this;
  }

  /** Tabla simple de ancho completo — usada para mediciones, repuestos, etc. */
  table(headers: string[], rows: string[][], columnWidths?: number[]) {
    const usableWidth = this.doc.page.width - 100;
    const widths = columnWidths ?? headers.map(() => usableWidth / headers.length);
    const startX = 50;
    let y = this.doc.y + 4;
    const safeHeaders = headers.map((h) => sanitizeForPdf(h));
    const safeRows = rows.map((row) => row.map((cell) => sanitizeForPdf(cell)));

    this.doc.fontSize(8).fillColor("#6b7280");
    let x = startX;
    safeHeaders.forEach((h, i) => {
      this.doc.text(h.toUpperCase(), x, y, { width: widths[i] });
      x += widths[i];
    });
    y += 14;
    this.doc
      .moveTo(startX, y - 3)
      .lineTo(startX + usableWidth, y - 3)
      .strokeColor("#d1d5db")
      .stroke();

    this.doc.fontSize(9).fillColor("#111827");
    for (const row of safeRows) {
      // Altura real de la fila, calculada ANTES de escribir nada: si una
      // celda tiene texto largo que ocupa varias líneas (ej. la
      // descripción combinada de un procedimiento + resultado), la fila
      // completa crece para acomodarlo — una altura fija de 16px, como
      // tenía esta función antes, hacía que esas celdas largas invadieran
      // la fila siguiente.
      const rowHeight = Math.max(
        ...row.map((cell, i) => this.doc.heightOfString(cell, { width: widths[i] })),
      );

      if (y + rowHeight > this.doc.page.height - 80) {
        this.doc.addPage();
        y = 50;
      }

      x = startX;
      row.forEach((cell, i) => {
        this.doc.text(cell, x, y, { width: widths[i] });
        x += widths[i];
      });
      y += rowHeight + 6;
    }

    this.doc.y = y + 6;
    this.doc.x = this.doc.page.margins.left;
    return this;
  }

  spacer(height = 10) {
    this.doc.moveDown(height / 10);
    return this;
  }

  signatureLine(label: string) {
    const y = this.doc.y + 30;
    this.doc
      .moveTo(50, y)
      .lineTo(250, y)
      .strokeColor("#9ca3af")
      .stroke();
    this.doc.fontSize(9).fillColor("#6b7280").text(sanitizeForPdf(label), 50, y + 4);
    return this;
  }

  footer(text: string) {
    const safeText = sanitizeForPdf(text);
    const range = this.doc.bufferedPageRange();
    // El pie de página se escribe a propósito muy cerca del borde inferior
    // FÍSICO de la hoja (page.height - 40), que queda por fuera del
    // margen inferior configurado (50pt). Sin este ajuste, PDFKit
    // interpreta esa posición como "no cabe, hace falta una página
    // nueva" y crea una hoja adicional casi en blanco solo para el pie de
    // página — el "salto de página" que se reportó. Bajar el margen
    // inferior a 0 justo mientras se escribe el pie evita ese chequeo
    // automático, sin afectar el resto del contenido de la página.
    const originalBottomMargin = this.doc.page.margins.bottom;
    for (let i = range.start; i < range.start + range.count; i++) {
      this.doc.switchToPage(i);
      this.doc.page.margins.bottom = 0;
      this.doc
        .fontSize(8)
        .fillColor("#9ca3af")
        .text(safeText, 50, this.doc.page.height - 40, {
          width: this.doc.page.width - 100,
          align: "center",
        });
      this.doc.page.margins.bottom = originalBottomMargin;
    }
    return this;
  }

  async build(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      this.doc.on("data", (chunk) => chunks.push(chunk));
      this.doc.on("end", () => resolve(Buffer.concat(chunks)));
      this.doc.on("error", reject);
      this.doc.end();
    });
  }
}

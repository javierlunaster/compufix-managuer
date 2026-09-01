/**
 * Catálogo de puntos de medición conocidos para el diagnóstico de
 * alimentación de laptops (basado en un checklist real de "Power Trace" —
 * diagnóstico S5/S0 para equipos gamer). No es un catálogo del backend:
 * `DiagnosticMeasurement` sigue siendo texto libre (pointName/expectedValue
 * son strings), tal como se diseñó desde la Fase 5 — esto es puramente una
 * ayuda de la interfaz para no tener que escribir a mano el nombre exacto
 * y el valor esperado de un punto que ya se conoce de memoria.
 *
 * Si el checklist real del taller tiene puntos que no están aquí, se
 * pueden seguir escribiendo a mano en el formulario — el catálogo es un
 * atajo, nunca una restricción.
 */
export type MeasurementPoint = {
  group: string;
  pointName: string;
  expectedValue: string;
  unit?: string;
};

export const MEASUREMENT_POINTS_CATALOG: MeasurementPoint[] = [
  // --- Estado S5 — Alimentación estándar (Jack DC) ---
  { group: "S5 · Entrada DC", pointName: "Adaptador 20V", expectedValue: "20 V", unit: "V" },
  { group: "S5 · Entrada DC", pointName: "CHARGER_IN", expectedValue: "20 V", unit: "V" },
  { group: "S5 · Charger", pointName: "B+", expectedValue: "19 ~ 20 V", unit: "V" },
  { group: "S5 · Charger", pointName: "REGN", expectedValue: "≈ 6 V", unit: "V" },
  { group: "S5 · Charger", pointName: "ACDET", expectedValue: "Correcto", unit: "Estado" },
  { group: "S5 · Charger", pointName: "ACIN", expectedValue: "≈ 3 V", unit: "V" },
  { group: "S5 · Charger", pointName: "ACP / ACN", expectedValue: "Señal presente", unit: "Estado" },
  { group: "S5 · Fuentes Always", pointName: "+3VALW", expectedValue: "3.3 V", unit: "V" },
  { group: "S5 · Fuentes Always", pointName: "+5VALW", expectedValue: "5 V", unit: "V" },
  { group: "S5 · LDO", pointName: "+3VLDO", expectedValue: "3.3 V", unit: "V" },
  { group: "S5 · RTC", pointName: "VCCRTC", expectedValue: "3.0 ~ 3.3 V", unit: "V" },
  { group: "S5 · RTC", pointName: "Cristal 32.768 kHz", expectedValue: "Oscilando", unit: "Hz" },
  { group: "S5 · EC / KBC", pointName: "RST_N_EC (Reset KBC)", expectedValue: "Alto (≈3.3 V)", unit: "Estado" },
  { group: "S5 · EC / KBC", pointName: "EC_RSMRST#", expectedValue: "Alto (≈3.3 V)", unit: "Estado" },
  {
    group: "S5 · EC / KBC",
    pointName: "LID_SW# (Sensor tapa)",
    expectedValue: "Alto (tapa abierta) / Bajo (tapa cerrada)",
    unit: "Estado",
  },
  { group: "S5 · EC / KBC", pointName: "EC_ON_3VALW", expectedValue: "Alto (≈3.3 V)", unit: "Estado" },
  { group: "S5 · EC / KBC", pointName: "EC_ON_5VALW", expectedValue: "Alto (≈3.3 V)", unit: "Estado" },
  { group: "S5 · BIOS / SPI", pointName: "SPI (Actividad)", expectedValue: "Actividad presente", unit: "Estado" },

  // --- Estado S5 — Alimentación USB-C ---
  { group: "S5 · USB-C", pointName: "VBUS", expectedValue: "5 V ~ 20 V", unit: "V" },
  { group: "S5 · USB-C", pointName: "CC1", expectedValue: "Comunicación", unit: "Estado" },
  { group: "S5 · USB-C", pointName: "CC2", expectedValue: "Comunicación", unit: "Estado" },
  { group: "S5 · Controlador PD", pointName: "I2C (PD ↔ EC)", expectedValue: "Actividad", unit: "Estado" },
  { group: "S5 · Controlador PD", pointName: "20V Negociados", expectedValue: "20 V", unit: "V" },
  { group: "S5 · Controlador PD", pointName: "TYPE_C_GATE_VBUS", expectedValue: "Presente (Alto)", unit: "Estado" },
  { group: "S5 · Controlador PD", pointName: "TYPE_C_GATE_VSYS", expectedValue: "Presente (Alto)", unit: "Estado" },

  // --- Estado S0 — Equipo encendido ---
  { group: "S0 · Botón / EC", pointName: "PBTN_OUT#", expectedValue: "Pulso al presionar", unit: "Estado" },
  { group: "S0 · PCH", pointName: "PM_SLP_S5#", expectedValue: "Alto", unit: "Estado" },
  { group: "S0 · PCH", pointName: "PM_SLP_S4#", expectedValue: "Alto", unit: "Estado" },
  { group: "S0 · PCH", pointName: "PM_SLP_S3#", expectedValue: "Alto", unit: "Estado" },
  { group: "S0 · EC", pointName: "SYSON", expectedValue: "Alto", unit: "Estado" },
  { group: "S0 · CPU (VRM)", pointName: "+VCCIN_AUX", expectedValue: "≈ 1.8 ~ 2.1 V", unit: "V" },
  { group: "S0 · CPU (VRM)", pointName: "+VCCCORE", expectedValue: "≈ 0.6 ~ 1.4 V (según CPU)", unit: "V" },
  { group: "S0 · CPU (VRM)", pointName: "VR_PWRGD", expectedValue: "Alto", unit: "Estado" },
  { group: "S0 · RAM (VRM)", pointName: "FBVDDQ", expectedValue: "≈ 1.1 ~ 1.35 V", unit: "V" },
  { group: "S0 · RAM (VRM)", pointName: "DRAM_POWER_GOOD", expectedValue: "Alto", unit: "Estado" },
  { group: "S0 · RAM (VRM)", pointName: "DRAM_RESET#", expectedValue: "Alto", unit: "Estado" },
  { group: "S0 · PCH", pointName: "PLTRST#", expectedValue: "Alto", unit: "Estado" },
];

# COMPufix Manager — Plan de diseño de la interfaz

Antes de escribir componentes, esto fija la identidad visual para que cada
pantalla nueva la seguidera de forma consistente, en vez de reinventar
colores/espaciados pantalla por pantalla.

## De dónde sale la identidad

Esto es una herramienta interna para técnicos de un taller de reparación
electrónica — no un sitio de marketing. La gente que la usa trabaja con
multímetros, tarjetas madre, y tapetes antiestáticos, muchas veces con luz
de banco de trabajo. La identidad se basa en ESO, no en un dashboard SaaS
genérico:

- El **tapete antiestático** (ESD mat) de cualquier banco de electrónica es
  gris-verde azulado oscuro, no negro puro — así que el fondo base no es
  `#000000`, es un carbón con tinte verde-azulado.
  - Advertencia de calibración por Skill de diseño: **negro casi puro +
    acento verde ácido/vermellón** es uno de los "defaults" que cualquier
    IA produce por reflejo. Por eso el acento aquí NO es verde neón — es
    **cobre/soldadura** (el color real de una pista de cobre o una gota de
    estaño), y el fondo es carbón-verdoso de tapete, no negro puro.
- El **código de orden** (`C11061`) y las **mediciones de diagnóstico**
  (`ACDET: 2.72V`) son, literalmente, lecturas de instrumento — se tratan
  tipográficamente como una pantalla de multímetro: monoespaciada, con
  tracking amplio, números tabulares.
- El verde sí aparece, pero restringido a estados "OK"/"reparado" — como el
  LED verde de un instrumento cuando la medición está en rango, no como
  color de marca.

## Paleta (variables CSS en `src/index.css`)

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#10171A` | Fondo base — carbón con tinte verde-azulado (tapete ESD) |
| `--surface` | `#17201F` | Paneles, tarjetas |
| `--surface-raised` | `#1D2827` | Elementos elevados (modales, dropdowns) |
| `--border` | `#2A3634` | Líneas divisorias, bordes de 1px |
| `--text` | `#ECE6DA` | Texto principal — crema cálido, como la página de un manual de servicio |
| `--text-muted` | `#93A29C` | Texto secundario |
| `--accent` | `#C2884D` | Cobre — acento de marca, enlaces, foco, elementos interactivos |
| `--accent-strong` | `#E3A868` | Cobre claro — hover, énfasis |
| `--success` | `#4ADE80` | Solo para estados OK/reparado/en rango — no es el acento de marca |
| `--warning` | `#F5B944` | Pendiente, diagnosticando, stock bajo |
| `--info` | `#5FA8D3` | En progreso |
| `--danger` | `#E5484D` | No reparado, cancelado, fuera de rango |

## Tipografía

- **IBM Plex Sans** — texto general. Humanista, técnica sin ser fría.
- **IBM Plex Mono** — códigos de orden, números, mediciones, badges de
  estado, tablas de datos. Misma superfamilia que Plex Sans (diseñadas para
  convivir), así que combinan sin sentirse como dos fuentes pegadas con
  cinta.

Se evita Inter/system-ui como default silencioso — es la elección que
cualquier proyecto genérico haría sin pensarlo.

## Layout

Sidebar angosta fija a la izquierda (ícono + etiqueta, colapsable) + barra
superior con **búsqueda global** prominente (sección 25 del brief: escribir
`C11061` y encontrar todo de inmediato) + contenido principal. Paneles con
bordes de 1px (hairline), radios de esquina modestos (6px) — sensación de
"gabinete bien construido", no de burbuja de app de consumo.

## Elemento de firma

La vista de una orden de reparación (el "expediente técnico", sección 30
del brief) es la pantalla que define el resto: el código de orden se
muestra grande, monoespaciado, con tracking amplio — como el display de un
instrumento — y el estado se muestra como una píldora con un punto que
imita un LED indicador (con un halo sutil del color del estado). La tabla
de mediciones de diagnóstico reutiliza este mismo lenguaje: alineación
tabular estricta, como la lectura real de un multímetro.

## Autocrítica aplicada

- Primer intento: acento verde sobre negro — descartado por ser el cliché
  exacto que advierte el skill de diseño.
  Cambio: cobre sobre carbón verdoso, verde reservado para estados "OK".
- Se evitaron marcadores numerados tipo `01 / 02 / 03` en el sidebar/nav:
  no hay una secuencia real ahí (el menú no es un proceso ordenado), así
  que no se decoran con números — el brief sí tiene una secuencia real
  (Ingresado → Diagnóstico → ... → Entregado) y ESA sí se representa como
  una línea de tiempo con pasos, porque ahí el orden comunica algo cierto.

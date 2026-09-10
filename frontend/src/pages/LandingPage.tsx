import { useEffect } from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

const WHATSAPP_URL =
  "https://wa.me/573013951619?text=Hola%2C%20quiero%20una%20cotizaci%C3%B3n%20para%20mi%20equipo";
const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Transversal+68+Manzana+31+Lote+21%2C+Las+Gaviotas+segunda+etapa%2C+Cartagena%2C+Bol%C3%ADvar";

/**
 * Página pública de inicio — lo primero que ve cualquier visitante sin
 * sesión iniciada en "/" (ver HomeGate en App.tsx). El personal ya
 * autenticado sigue viendo el Dashboard en esa misma ruta, sin cambios.
 */
export function LandingPage() {
  useEffect(() => {
    document.title = "CompuFix Soluciones Integrales";
  }, []);

  return (
    <div className="landing-page">
      <header className="site">
        <div className="wrap header-row">
          <div className="brand">
            <span className="brand-name">
              Compu<span className="accent-dot">Fix</span>
            </span>
            <span className="brand-tag">Soluciones Integrales · Cartagena</span>
          </div>
          <div className="header-actions">
            <a className="phone-readout" href="tel:+573013951619">
              301 395 1619
            </a>
            <a className="btn btn-primary" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            <Link className="staff-link" to="/login">
              Personal
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <p className="eyebrow">Taller de electrónica · Diagnóstico a nivel de placa</p>
              <h1>
                Encontramos la falla <em>real</em> de tu equipo, no solo el síntoma.
              </h1>
              <p className="lede">
                En CompuFix medimos voltajes, revisamos componentes y probamos placa por placa
                antes de cotizar. Reparamos lo que de verdad está dañado — nada más, nada menos.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                  Escríbenos por WhatsApp
                </a>
                <a className="btn btn-ghost" href="#servicios">
                  Ver servicios
                </a>
              </div>
              <div className="hero-meta">
                <div>
                  <strong>6</strong>Líneas de servicio
                </div>
                <div>
                  <strong>5</strong>Pasos hasta la entrega
                </div>
                <div>
                  <strong>1</strong>Garantía por escrito
                </div>
              </div>
            </div>
            <div className="scope" aria-hidden="true">
              <div className="scope-head">
                <span>Lectura de diagnóstico</span>
                <span>En vivo</span>
              </div>
              <svg viewBox="0 0 600 150" role="img">
                <line className="scope-grid-line" x1="0" y1="37" x2="600" y2="37"></line>
                <line className="scope-grid-line" x1="0" y1="75" x2="600" y2="75"></line>
                <line className="scope-grid-line" x1="0" y1="113" x2="600" y2="113"></line>
                <line className="scope-grid-line" x1="120" y1="0" x2="120" y2="150"></line>
                <line className="scope-grid-line" x1="240" y1="0" x2="240" y2="150"></line>
                <line className="scope-grid-line" x1="360" y1="0" x2="360" y2="150"></line>
                <line className="scope-grid-line" x1="480" y1="0" x2="480" y2="150"></line>
                <path
                  className="scope-trace"
                  d="M0,80 L18,42 L36,112 L54,28 L72,122 L90,46 L108,96 Q150,20 200,80 C260,140 300,24 350,80 C400,120 430,66 470,79 C510,88 540,79 570,80"
                />
                <circle className="scope-dot" cx="565" cy="80" r="4"></circle>
                <text className="scope-label" x="10" y="140">
                  FALLA
                </text>
                <text className="scope-label" x="500" y="140">
                  ESTABLE
                </text>
              </svg>
            </div>
          </div>
        </section>

        <section className="section-block" id="servicios">
          <div className="wrap">
            <div className="block-head">
              <div>
                <p className="eyebrow">Catálogo de servicios</p>
                <h2>Seis líneas de trabajo, un solo taller.</h2>
              </div>
              <p>Cada servicio se factura por separado y siempre con cotización aprobada antes de reparar.</p>
            </div>
            <div className="legend">
              <div className="legend-item">
                <span className="legend-code">SVC-01</span>
                <h3>Diagnóstico electrónico</h3>
                <p>Medición de voltajes y componentes directo en la placa para ubicar la falla exacta, no solo el síntoma visible.</p>
              </div>
              <div className="legend-item">
                <span className="legend-code">SVC-02</span>
                <h3>Reparación de placas</h3>
                <p>Reemplazo de MOSFETs, IC de carga y conectores DC con soldadura de precisión bajo microscopio.</p>
              </div>
              <div className="legend-item">
                <span className="legend-code">SVC-03</span>
                <h3>Mantenimiento preventivo</h3>
                <p>Limpieza interna, cambio de pasta térmica, revisión de batería y ventiladores antes de que fallen.</p>
              </div>
              <div className="legend-item">
                <span className="legend-code">SVC-04</span>
                <h3>Recuperación de datos</h3>
                <p>Rescate de archivos de discos dañados o equipos que ya no encienden, cuando el hardware lo permite.</p>
              </div>
              <div className="legend-item">
                <span className="legend-code">SVC-05</span>
                <h3>Software y licencias</h3>
                <p>Formateo, instalación de sistema operativo y licencias originales de Windows y Office.</p>
              </div>
              <div className="legend-item">
                <span className="legend-code">SVC-06</span>
                <h3>Repuestos y accesorios</h3>
                <p>Pantallas, cargadores, baterías y memorias con garantía, para portátiles, torres y todo en uno.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="wrap">
            <div className="block-head">
              <div>
                <p className="eyebrow">Cómo trabajamos</p>
                <h2>De la recepción a la entrega, sin sorpresas.</h2>
              </div>
            </div>
            <div className="rail">
              <div className="rail-step">
                <h3>Recepción</h3>
                <p>Registramos el equipo, los accesorios entregados y la falla que reportas.</p>
              </div>
              <div className="rail-step">
                <h3>Diagnóstico</h3>
                <p>Medimos y probamos hasta ubicar la causa exacta, con evidencia fotográfica.</p>
              </div>
              <div className="rail-step">
                <h3>Cotización</h3>
                <p>Te confirmamos el costo y el tiempo estimado antes de tocar nada más.</p>
              </div>
              <div className="rail-step">
                <h3>Reparación</h3>
                <p>Ejecutamos el arreglo con repuestos de calidad y control de cada paso.</p>
              </div>
              <div className="rail-step">
                <h3>Entrega</h3>
                <p>Pruebas finales frente a ti y garantía por escrito sobre lo reparado.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="wrap">
            <div className="portal">
              <div>
                <h2>¿Ya nos dejaste un equipo?</h2>
                <p>
                  Consulta en línea en qué paso va tu reparación, sin tener que llamar — con el
                  mismo número o documento que dejaste en recepción.
                </p>
              </div>
              <Link className="btn btn-primary" to="/portal/login">
                Consultar estado del equipo
              </Link>
            </div>
          </div>
        </section>

        <section className="section-block" id="contacto">
          <div className="wrap">
            <div className="block-head">
              <div>
                <p className="eyebrow">Visítanos o escríbenos</p>
                <h2>Taller en Las Gaviotas, Cartagena.</h2>
              </div>
            </div>
            <div className="contact-grid">
              <div className="contact-card">
                <h3>Dirección</h3>
                <address>
                  Transversal 68 Manzana 31 Lote 21
                  <br />
                  Las Gaviotas, segunda etapa
                  <br />
                  Cartagena, Bolívar
                </address>
                <a className="map-link" href={MAPS_URL} target="_blank" rel="noreferrer">
                  Ver en el mapa →
                </a>
              </div>
              <div className="contact-card">
                <h3>Teléfono</h3>
                <address>
                  <a className="phone-readout" href="tel:+573013951619" style={{ fontSize: "1.1rem" }}>
                    301 395 1619
                  </a>
                </address>
                <a className="map-link" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                  Escribir por WhatsApp →
                </a>
              </div>
              <div className="contact-card">
                <h3>Redes</h3>
                <div className="ports">
                  <a
                    className="port-tag"
                    href="https://www.facebook.com/compufixsolucionesintegrales/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Facebook <span className="arrow">↗</span>
                  </a>
                  <a
                    className="port-tag"
                    href="https://www.instagram.com/javierenriqueluna/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Instagram <span className="arrow">↗</span>
                  </a>
                  <a
                    className="port-tag"
                    href="https://www.youtube.com/@javierlunamarzola"
                    target="_blank"
                    rel="noreferrer"
                  >
                    YouTube <span className="arrow">↗</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site">
        <div className="wrap footer-row">
          <span>© 2026 CompuFix Soluciones Integrales — Cartagena, Colombia</span>
          <span>Diagnóstico · Reparación · Repuestos</span>
        </div>
      </footer>
    </div>
  );
}

import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Sin esto, cualquier error de JavaScript durante el render (ej. acceder a
 * una propiedad de un objeto que el backend no devolvió) desmonta TODO el
 * árbol de React en silencio — la pantalla queda en blanco sin ninguna
 * pista de qué pasó. Este componente atrapa esos errores y muestra un
 * mensaje visible en su lugar, para que un problema como ese sea evidente
 * de inmediato en vez de parecer que "el módulo no carga".
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Error de render capturado por ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-lg font-medium text-ink">Esta pantalla no pudo cargar</p>
          <p className="max-w-md text-sm text-ink-muted">
            Ocurrió un error inesperado. Si esto se repite, comparte el mensaje técnico con soporte:
          </p>
          <pre className="max-w-lg overflow-x-auto rounded border border-danger/30 bg-danger/10 p-3 text-left text-xs text-danger">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="text-sm text-accent hover:underline"
          >
            Intentar de nuevo
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

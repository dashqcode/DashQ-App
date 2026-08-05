import React from 'react';
import Icon from './components/ui/Icon';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);

    // Auto-reload for chunk loading errors (deployment caching issues)
    const isChunkError = error?.message?.includes('Failed to fetch dynamically imported module') || error?.name === 'ChunkLoadError' || error?.message?.includes('Importing a module script failed');
    if (isChunkError) {
      const hasReloaded = sessionStorage.getItem('chunk_failed_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_failed_reload', 'true');
        window.location.reload();
      }
    } else {
      sessionStorage.removeItem('chunk_failed_reload');
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: 'var(--bg-primary, #0f0f13)', color: 'var(--text-primary, #ffffff)', zIndex: 9999, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", sans-serif' }}>
          <div style={{ background: 'var(--bg-secondary, #18181b)', padding: '40px', borderRadius: '24px', border: '1px solid var(--border-light, rgba(255,255,255,0.05))', maxWidth: '800px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '30px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                <Icon icon="solar:danger-triangle-bold-duotone" size={24} />
              </div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Error Inesperado</h2>
            </div>
            
            <p style={{ color: 'var(--text-secondary, #a1a1aa)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              {this.state.error?.message?.includes('Failed to fetch dynamically imported module') 
                ? 'El sistema se ha actualizado y tu navegador tiene una versión antigua en caché. Por favor, realiza una recarga fuerte (Ctrl + Shift + R) o limpia la caché de tu navegador.' 
                : 'Ha ocurrido un error gráfico interno en el sistema. Puedes intentar recargar la página para solucionar el problema temporalmente.'}
            </p>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '30px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.03)' }}>
              <details style={{ whiteSpace: 'pre-wrap', fontSize: '12px', color: '#ef4444' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, outline: 'none' }}>Ver detalles técnicos del error</summary>
                <div style={{ marginTop: '12px', opacity: 0.8 }}>
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </div>
              </details>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', borderRadius: '24px', background: 'var(--color-primary, #6366f1)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon icon="solar:refresh-bold-duotone" size={18} /> Recargar Página
              </button>
              <button onClick={() => window.location.href = '/'} style={{ padding: '12px 24px', borderRadius: '24px', background: 'transparent', border: '1px solid var(--border-light, rgba(255,255,255,0.1))', color: 'var(--text-primary, #fff)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon icon="solar:home-angle-bold-duotone" size={18} /> Ir al Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

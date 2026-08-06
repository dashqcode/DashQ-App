import React from 'react';
import './index.css';

function App() {
  return (
    <div className="app-wrapper">
      {/* Navbar */}
      <nav style={{ padding: '1.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', background: 'var(--accent-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
            DashQ
          </div>
          <div>
            <a href="#features" style={{ marginRight: '1.5rem', color: 'var(--text-secondary)' }}>Características</a>
            <a href="#contact" className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>Contacto</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={{ padding: '6rem 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Background glow effects */}
        <div style={{ position: 'absolute', top: '20%', left: '20%', width: '300px', height: '300px', background: 'var(--accent-primary)', filter: 'blur(150px)', opacity: '0.2', zIndex: -1, borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', top: '30%', right: '20%', width: '250px', height: '250px', background: 'var(--accent-secondary)', filter: 'blur(150px)', opacity: '0.2', zIndex: -1, borderRadius: '50%' }}></div>
        
        <div className="container">
          <div style={{ display: 'inline-block', padding: '0.25rem 1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '99px', color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: '500', marginBottom: '1.5rem' }}>
            Próximamente versión 1.0 ✨
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', maxWidth: '800px', margin: '0 auto 1.5rem auto' }}>
            Revoluciona tu Gestión de Documentos con <span className="text-gradient">Inteligencia Artificial</span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2.5rem auto', lineHeight: '1.6' }}>
            El primer sistema de archivos local y privado que lee, analiza y organiza todos tus PDFs, Excels y Words automáticamente sin enviar tus datos a la nube.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a href="#contact" className="btn btn-primary">Unirse a la lista de espera</a>
            <a href="#features" className="btn btn-outline">Descubrir más</a>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" style={{ padding: '5rem 0', background: 'var(--bg-tertiary)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem' }}>Diseñado para la Productividad</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Todo lo que necesitas en una sola plataforma ultra rápida.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {/* Feature 1 */}
            <div className="glass-card">
              <div style={{ width: '48px', height: '48px', background: 'rgba(59,130,246,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--accent-primary)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <h3 style={{ fontSize: '1.25rem' }}>Chat con tus Documentos</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Hazle preguntas a tus PDFs. La IA lee el documento por ti y te da respuestas instantáneas con referencias exactas.</p>
            </div>
            
            {/* Feature 2 */}
            <div className="glass-card">
              <div style={{ width: '48px', height: '48px', background: 'rgba(139,92,246,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--accent-secondary)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <h3 style={{ fontSize: '1.25rem' }}>100% Privado y Local</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Sin nubes misteriosas. Todos tus archivos confidenciales se procesan y almacenan directamente en tu computadora.</p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card">
              <div style={{ width: '48px', height: '48px', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: '#10b981' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
              </div>
              <h3 style={{ fontSize: '1.25rem' }}>Herramientas Todo en Uno</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Edita hojas de Excel, redacta en Word y comprime PDFs masivos sin salir de la aplicación ni pagar licencias extra.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" style={{ padding: '6rem 0', position: 'relative' }}>
        <div className="container">
          <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem', background: 'linear-gradient(to right, rgba(22,27,34,0.9), rgba(22,27,34,0.9)), url("https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80")', backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Sé el primero en probar DashQ</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
              Estamos ultimando los detalles para el gran lanzamiento. Déjanos tu correo y te avisaremos en cuanto esté disponible.
            </p>
            
            <form style={{ display: 'flex', gap: '0.5rem', maxWidth: '400px', margin: '0 auto' }} onSubmit={(e) => { e.preventDefault(); alert('¡Gracias por tu interés! Te contactaremos pronto.'); }}>
              <input 
                type="email" 
                placeholder="tu@correo.com" 
                required
                style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'white', outline: 'none' }}
              />
              <button type="submit" className="btn btn-primary">Notificarme</button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '3rem 0', borderTop: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '1rem', color: 'white', fontWeight: 'bold' }}>
            <div style={{ width: '24px', height: '24px', background: 'var(--accent-primary)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
            </div>
            DashQ
          </div>
          <p>© {new Date().getFullYear()} DashQ. Todos los derechos reservados.</p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a href="#" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Política de Privacidad</a>
            <a href="#" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Términos de Servicio</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

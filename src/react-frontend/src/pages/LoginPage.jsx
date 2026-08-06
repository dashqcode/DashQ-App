import React, { useState, useEffect, useRef } from 'react';
import Icon from '../components/ui/Icon';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './login.css';

const SYSTEM_TIPS = [
  {
    title: "Acceso en Red Local",
    icon: "solar:server-square-bold-duotone",
    content: "Accede al sistema desde cualquier dispositivo en tu red WiFi usando la IP asignada en el panel. Sin necesidad de internet."
  },
  {
    title: "Privacidad Garantizada",
    icon: "solar:shield-check-bold-duotone",
    content: "Tus documentos físicos y digitales se almacenan estrictamente en la computadora principal. Nada se sube a nubes públicas."
  },
  {
    title: "Búsqueda Rápida",
    icon: "solar:minimalistic-magnifer-bold-duotone",
    content: <>Presiona <kbd style={{ background: '#3f3f46', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#fff' }}>Ctrl + K</kbd> dentro del gestor para buscar archivos por su contenido al instante.</>
  },
  {
    title: "Organización Eficiente",
    icon: "solar:tag-horizontal-bold-duotone",
    content: "Utiliza carpetas y etiquetas de colores para categorizar tus documentos. Esto agilizará enormemente la generación de reportes."
  },
  {
    title: "Túnel Seguro de Acceso",
    icon: "solar:global-bold-duotone",
    content: "Si necesitas acceder desde casa, activa el Túnel Seguro en configuración para obtener un enlace encriptado temporal."
  }
];

function LoginPage() {
  const [currentTip, setCurrentTip] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaText, setCaptchaText] = useState('');
  const [captchaError, setCaptchaError] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let text = '';
    for (let i = 0; i < 4; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(text);
  };

  useEffect(() => {
    generateCaptcha();
    const savedUser = localStorage.getItem('dashq_saved_username');
    if (savedUser) {
      setUsername(savedUser);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % SYSTEM_TIPS.length);
    }, 6000); // Rota cada 6 segundos

    return () => clearInterval(tipInterval);
  }, [currentTip]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!username || !password || !captchaInput) return;
    
    // Captcha validation (case insensitive)
    if (captchaInput.trim().toUpperCase() !== captchaText) {
      setCaptchaError(true);
      generateCaptcha();
      setCaptchaInput('');
      return;
    }
    
    const trimmedUser = username.trim();

    if (rememberMe) {
      localStorage.setItem('dashq_saved_username', trimmedUser);
    } else {
      localStorage.removeItem('dashq_saved_username');
    }

    setLoginError(false);



    if (trimmedUser.toUpperCase() === 'ACAJA' && password === 'Archivocaja24*') {
      login({
        name: 'Archivo de Caja', username: 'ACAJA', email: 'acaja@dashq.com', role: 'Administrador',
        permissions: { read: true, write: true, rename: true, copy: true, move: true, tag: true, delete: true, print: true }
      }, rememberMe);
      navigate('/gestor');
      return;
    }
    
    // Check against local users
    let usersList = [];
    try {
      const stored = localStorage.getItem('dashq_users_list');
      if (stored) usersList = JSON.parse(stored);
    } catch(err) {}

    const foundUser = usersList.find(u => 
      ((u.name || '').trim().toLowerCase() === trimmedUser.toLowerCase() || (u.username || '').trim().toLowerCase() === trimmedUser.toLowerCase()) 
      && u.password === password && u.status === 'Activo'
    );

    if (!foundUser) {
      setLoginError(true);
      generateCaptcha();
      setCaptchaInput('');
      return;
    }

    if (foundUser.status !== 'Activo') {
      setLoginError(true);
      generateCaptcha();
      setCaptchaInput('');
      return;
    }
    
    setCaptchaError(false);
    setIsLoading(true);
    // Simulate network delay for effect
    setTimeout(() => {
      login(foundUser, rememberMe);
      
      let targetRoute = '/gestor';
      if (foundUser.role !== 'Administrador' && foundUser.pageAccess) {
        const pa = foundUser.pageAccess;
        if (pa.dashboard === true) targetRoute = '/';
        else if (pa.gestor === true) targetRoute = '/gestor';
        else if (pa.biblioteca === true) targetRoute = '/library';
        else if (pa.calendario === true) targetRoute = '/calendar';
        else if (pa.checklist === true) targetRoute = '/checklist';
        else if (pa.actividades === true) targetRoute = '/actividades';
        else if (pa.reportes === true) targetRoute = '/reporte-vista';
        else if (pa.ajustes === true) targetRoute = '/settings';
      }
      
      navigate(targetRoute);
    }, 800);
  };

  return (
    <div className="login-split-layout">
      {/* Left side: Content / Testimonial Carousel */}
      <div className="login-left-pane">
        <div style={{ maxWidth: '520px', margin: '0 auto', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="login-left-content" style={{ margin: 0, maxWidth: '100%' }}>
          <h1 className="login-left-title">Gestión documental en tu red local</h1>
          <p className="login-left-subtitle">
            Organiza, visualiza y comparte tus archivos de forma segura entre todos los equipos de tu oficina sin depender de servidores externos ni internet.
          </p>

          <div className="login-trust-badges">
            <div className="trust-badge">
              <Icon icon="solar:shield-check-bold-duotone" size={16} />
              <span>100% Privado</span>
            </div>
            <div className="trust-badge">
              <Icon icon="solar:bolt-bold-duotone" size={16} />
              <span>Búsqueda Instantánea</span>
            </div>
            <div className="trust-badge">
              <Icon icon="solar:infinity-bold-duotone" size={16} />
              <span>Sin Límites</span>
            </div>
          </div>

          <div className="login-testimonial" style={{ minHeight: '160px', display: 'flex', flexDirection: 'column' }}>
            <div key={currentTip} className="carousel-fade">
              <div className="login-testimonial-author" style={{ marginBottom: '16px' }}>
                <div className="author-avatar" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#60a5fa' }}>
                  <Icon icon={SYSTEM_TIPS[currentTip].icon} size={22} />
                </div>
                <div className="author-info">
                  <strong>Consejo del Sistema</strong>
                  <span>{SYSTEM_TIPS[currentTip].title}</span>
                </div>
              </div>
              <p style={{ fontStyle: 'normal', color: '#a1a1aa', fontSize: '13px', flex: 1, margin: 0 }}>
                {SYSTEM_TIPS[currentTip].content}
              </p>
            </div>
            
            {/* Carousel dots */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '32px', alignItems: 'center' }}>
              {SYSTEM_TIPS.map((_, idx) => (
                <div 
                  key={idx}
                  onClick={() => setCurrentTip(idx)}
                  style={{
                    width: currentTip === idx ? '32px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    background: currentTip === idx ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.2)',
                    transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
                    cursor: 'pointer',
                    overflow: 'hidden'
                  }}
                >
                  {currentTip === idx && (
                    <div 
                      style={{
                        height: '100%',
                        background: '#60a5fa',
                        animation: 'fillProgress 6s linear forwards'
                      }} 
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          </div>
        
          {/* Footer links (Privacidad, Ayuda) */}
          <div className="login-footer-links" style={{ position: 'relative', bottom: 0, left: 0, transform: 'none', marginTop: '80px', maxWidth: '100%' }}>
            <a href="#">Política de Privacidad</a>
            <span className="dot-separator">•</span>
            <a href="#">Ayuda y Soporte</a>
            <span className="dot-separator">•</span>
            <a href="#">Términos de Uso</a>
          </div>

        </div>
      </div>
      </div>

      {/* Right side: Form (Centered inside the pane as a card) */}
      <div className="login-right-pane">
        <div className="login-form-card">
          <div className="login-header">
            <div className="login-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <img src="/logo.svg" alt="DashQ" style={{ width: '42px', height: '42px', filter: 'none', boxShadow: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '24px', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>DashQ</span>
                <span style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', lineHeight: 1, transform: 'translateY(3px)' }}>
                  v1.0.9
                </span>
              </div>
            </div>
            <h2 style={{ marginTop: '0', fontSize: '20px', fontWeight: '600' }}>Iniciar Sesión</h2>
            <p>Plataforma de gestión documental y colaboración en red local</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            
            {/* USERNAME */}
            <div className="input-group">
              <label htmlFor="username">USUARIO</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Icon icon="solar:user-bold-duotone" size={16} />
                </span>
                <input
                  type="text"
                  id="username"
                  placeholder="Ingresa tu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="input-group">
              <label htmlFor="password">CONTRASEÑA</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Icon icon="solar:lock-bold-duotone" size={16} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span className="input-icon-right" onClick={() => setShowPassword(!showPassword)} title={showPassword ? "Ocultar" : "Mostrar"}>
                  <Icon icon={showPassword ? 'solar:eye-closed-bold-duotone' : 'solar:eye-bold-duotone'} size={16} />
                </span>
              </div>
            </div>

            {/* FORM OPTIONS */}
            <div className="form-options">
              <div 
                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setRememberMe(!rememberMe)}
              >
                <div 
                  className="remember-toggle"
                  style={{
                    width: '36px', height: '20px', borderRadius: '24px',
                    background: rememberMe ? '#60a5fa' : '#3f3f46',
                    display: 'flex', alignItems: 'center',
                    padding: '2px', transition: 'all 0.3s ease',
                    position: 'relative', marginRight: '8px', flexShrink: 0
                  }}
                >
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                    transform: rememberMe ? 'translateX(16px)' : 'translateX(0)',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                  }}></div>
                </div>
                <span style={{ color: '#a1a1aa', fontSize: '12px', userSelect: 'none' }}>
                  Recordarme
                </span>
              </div>
            </div>

            {/* CAPTCHA */}
            <div className="input-group">
              <label>CÓDIGO DE SEGURIDAD</label>
              <div className="captcha-container">
                <div className="captcha-display">
                  <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '12px', color: '#f4f4f5', userSelect: 'none', marginLeft: '12px' }}>{captchaText}</span>
                </div>
                <button type="button" onClick={generateCaptcha} className="captcha-refresh-btn" title="Recargar Captcha">
                  <Icon icon="solar:refresh-bold-duotone" size={16} />
                </button>
              </div>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Icon icon="solar:shield-warning-bold-duotone" size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Ingresa el código de arriba"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  style={{ borderColor: captchaError ? '#ef4444' : '' }}
                />
              </div>
              {captchaError && <span style={{ color: '#ef4444', fontSize: '11px' }}>El código ingresado es incorrecto</span>}
              {loginError && !captchaError && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', display: 'block' }}>Usuario, contraseña o cuenta inactiva.</span>}
            </div>

            {/* SUBMIT BUTTON */}
            <button 
              type="submit" 
              className="login-submit-btn"
              disabled={!username || !password || !captchaInput || isLoading}
            >
              {isLoading ? (
                <span className="loader-spinner"></span>
              ) : (
                <>
                  Ingresar al Sistema <Icon icon="solar:arrow-right-bold-duotone" size={18} />
                </>
              )}
            </button>
          </form>

          <div className="login-footer-text">
            Servicio seguro y privado. Procesamiento local 100% en el navegador.
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

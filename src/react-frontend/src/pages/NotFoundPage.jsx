import React from 'react';
import Icon from '../components/ui/Icon';
import { useNavigate } from 'react-router-dom';

const BugIcon = ({ style, className }) => (
  <svg width="40" height="40" viewBox="0 0 32 32" style={style} className={className}>
    <g fill="#4fd1c5" stroke="#000" strokeWidth="2">
      {/* legs left */}
      <path d="M11,14 L4,11 M11,18 L3,18 M11,22 L5,26" />
      {/* legs right */}
      <path d="M21,14 L28,11 M21,18 L29,18 M21,22 L27,26" />
      {/* antennas */}
      <path d="M14,10 L10,3 M18,10 L22,3" strokeLinecap="round" />
      {/* body */}
      <ellipse cx="16" cy="19" rx="8" ry="10" />
      {/* body split */}
      <path d="M16,9 L16,29" />
      {/* head */}
      <path d="M11,11 Q16,5 21,11 Z" />
    </g>
  </svg>
);

const ZipperFace = () => (
  <svg width="120" height="120" viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="50" fill="#fde047" />
    <ellipse cx="40" cy="45" rx="5" ry="10" fill="#000" />
    <ellipse cx="80" cy="45" rx="5" ry="10" fill="#000" />
    <path d="M30,75 L35,70 L40,80 L45,70 L50,80 L55,70 L60,80 L65,70 L70,80 L75,70 L80,80 L85,70 L90,75" fill="none" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
  </svg>
);

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      background: '#050505', color: '#ffffff', fontFamily: '"Inter", sans-serif',
      padding: '24px', boxSizing: 'border-box', overflow: 'hidden'
    }}>
      <style>{`
        @keyframes bug1 { 0% { transform: translate(-10vw, 80vh) rotate(45deg); } 100% { transform: translate(110vw, -10vh) rotate(45deg); } }
        @keyframes bug2 { 0% { transform: translate(110vw, 20vh) rotate(-135deg); } 100% { transform: translate(-10vw, 90vh) rotate(-135deg); } }
        @keyframes bug3 { 0% { transform: translate(30vw, -10vh) rotate(100deg); } 100% { transform: translate(80vw, 110vh) rotate(100deg); } }
        @keyframes bug4 { 0% { transform: translate(-10vw, 20vh) rotate(15deg); } 100% { transform: translate(110vw, 40vh) rotate(15deg); } }
        @keyframes bug5 { 0% { transform: translate(70vw, 110vh) rotate(-60deg); } 100% { transform: translate(20vw, -10vh) rotate(-60deg); } }
        .bug { position: absolute; opacity: 0.8; z-index: 0; }
        .bug-1 { animation: bug1 25s linear infinite; }
        .bug-2 { animation: bug2 35s linear infinite; animation-delay: -5s; }
        .bug-3 { animation: bug3 28s linear infinite; animation-delay: -12s; }
        .bug-4 { animation: bug4 40s linear infinite; animation-delay: -2s; }
        .bug-5 { animation: bug5 30s linear infinite; animation-delay: -17s; }
      `}</style>

      {/* Bugs background */}
      <BugIcon className="bug bug-1" />
      <BugIcon className="bug bug-2" />
      <BugIcon className="bug bug-3" />
      <BugIcon className="bug bug-4" />
      <BugIcon className="bug bug-5" />

      {/* Header */}
      <div style={{ position: 'absolute', top: '40px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1 }}>
        <div style={{ 
          width: '32px', height: '32px', borderRadius: '50%', background: '#fde047', 
          display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }}>
           <Icon icon="solar:folder-error-bold-duotone" size={20} style={{ color: '#000' }} />
        </div>
        <span style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>DashQ</span>
      </div>

      {/* Central 404 Area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '40px', marginTop: '60px', marginBottom: '40px', zIndex: 1 }}>
        <div style={{ fontSize: '280px', fontWeight: 900, lineHeight: 1, transform: 'rotate(12deg)' }}>4</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '110px', height: '30px', background: '#7c3aed' }}></div>
          <ZipperFace />
          <div style={{ width: '110px', height: '30px', background: '#7c3aed' }}></div>
        </div>
        <div style={{ fontSize: '280px', fontWeight: 900, lineHeight: 1, transform: 'rotate(-12deg)' }}>4</div>
      </div>

      {/* Text */}
      <p style={{ maxWidth: '600px', textAlign: 'center', color: '#a1a1aa', fontSize: '16px', lineHeight: '1.6', marginBottom: '48px', zIndex: 1 }}>
        La página que buscas no se puede encontrar. Parece que intentas acceder a una página que ha sido eliminada o que nunca existió...
      </p>

      {/* Button */}
      <button 
        onClick={() => navigate('/')} 
        style={{
          background: '#fde047', color: '#000', border: 'none', padding: '16px 40px',
          borderRadius: '8px', fontWeight: 800, fontSize: '14px', letterSpacing: '1px',
          cursor: 'pointer', zIndex: 1, transition: 'transform 0.2s, background 0.2s'
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = '#fef08a'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#fde047'; }}
      >
        VOLVER AL INICIO
      </button>

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: '30px', width: '100%', padding: '0 40px', display: 'flex', justifyContent: 'space-between', boxSizing: 'border-box', alignItems: 'center', zIndex: 1 }}>
        <div style={{ color: '#52525b', fontSize: '13px' }}>
          © 2026 DashQ. Todos los derechos reservados.
        </div>
        <div style={{ display: 'flex', gap: '20px', color: '#fde047', alignItems: 'center' }}>
          <a href="mailto:dashqcode@gmail.com" title="Email" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <Icon icon="solar:letter-bold-duotone" size={20} />
            <span style={{ color: '#a1a1aa' }}>dashqcode@gmail.com</span>
          </a>
          <a href="tel:+51969065797" title="Teléfono" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <Icon icon="solar:phone-bold-duotone" size={20} />
            <span style={{ color: '#a1a1aa' }}>+51 969 065 797</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;

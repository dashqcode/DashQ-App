const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'react-frontend', 'src', 'App.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Make the bell icon blue
const targetIcon = `<Icon icon="solar:bell-bing-bold-duotone" size={20} />
            {unreadActivities > 0 && (`;
const newIcon = `<Icon icon="solar:bell-bing-bold-duotone" size={20} color={unreadActivities > 0 ? 'var(--color-primary)' : 'inherit'} />
            {unreadActivities > 0 && (`;
content = content.replace(targetIcon, newIcon);

// 2. Make the notification content an interactive button
const targetNotif = `<div style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>Tienes {unreadActivities} actividad(es) pendiente(s). Ve al Centro de Actividades para revisarlas.</div>`;
const newNotif = `<button 
                  onClick={() => { setShowNotifMenu(false); navigate('/actividades'); }}
                  style={{ display: 'block', padding: '12px 16px', color: 'var(--text-primary)', fontSize: '13px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', width: '100%' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                    <Icon icon="solar:bell-bing-bold-duotone" size={16} />
                    ¡Nueva Actividad!
                  </div>
                  Tienes <strong style={{ color: '#fff' }}>{unreadActivities}</strong> actividad(es) pendiente(s). Haz clic aquí para ir al Centro de Actividades y revisarlas.
                </button>`;
content = content.replace(targetNotif, newNotif);

fs.writeFileSync(file, content);
console.log('App.jsx modified with notification UI enhancements.');

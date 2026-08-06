/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';
import Icon from '../components/ui/Icon';

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = 'info', action = null) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type, action, closing: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, closing: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300); // Wait for fade out animation
    }, action ? 6000 : 3500); // Time to show
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="drive-toast-container">
        {toasts.map(t => {
          let iconClass = "solar:info-circle-bold-duotone";
          let iconColor = "var(--color-primary)"; // blue
          if (t.type === 'success') {
            iconClass = "solar:check-circle-bold-duotone";
            iconColor = "#60a5fa"; // green
          } else if (t.type === 'error') {
            iconClass = "solar:close-circle-bold-duotone";
            iconColor = "#ef4444"; // red
          }
          return (
            <div key={t.id} className={`drive-toast ${t.closing ? 'closing' : ''}`}>
              <div style={{ position: 'relative', width: '24px', height: '24px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
                  <circle cx="12" cy="12" r="11" fill="none" stroke={iconColor} strokeWidth="1.5" strokeOpacity="0.2" />
                  <circle cx="12" cy="12" r="11" fill="none" stroke={iconColor} strokeWidth="1.5" strokeDasharray="69.115" strokeDashoffset="0" className="toast-circle-progress" />
                </svg>
                <Icon icon={iconClass} size={14} color={iconColor} style={{ zIndex: 1 }} />
              </div>
               <span className="toast-msg" style={{ marginLeft: '4px' }}>{t.msg}</span>
               {typeof t.action === 'object' && t.action !== null && (
                 <button 
                   className="toast-action-btn"
                   onClick={() => {
                     if (t.action.onClick) t.action.onClick();
                     setToasts(prev => prev.map(pt => pt.id === t.id ? { ...pt, closing: true } : pt));
                   }}
                 >
                   {t.action.label}
                 </button>
               )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

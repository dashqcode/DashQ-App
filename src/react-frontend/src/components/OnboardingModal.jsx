import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './ui/Icon';
import { useAuth } from '../context/AuthContext';

const OnboardingModal = () => {
  const { user, updateUser } = useAuth();
  
  // Check if we need onboarding: user is authenticated, not an Invitado, NOT the admin ACAJA, and missing contact info
  const needsOnboarding = user && user.role !== 'Invitado' && user.username !== 'ACAJA' && (!user.phone);

  const [formData, setFormData] = useState({
    phone: user?.phone || ''
  });
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!needsOnboarding) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.phone.trim()) {
      setError('Por favor, ingresa tu número de teléfono para continuar.');
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API delay for better UX
    setTimeout(() => {
      updateUser({
        phone: formData.phone
      });
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <AnimatePresence>
      <div className="onboarding-overlay">
        <motion.div 
          className="onboarding-modal glass-panel"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="onboarding-header">
            <div className="onboarding-icon-container">
              <Icon icon="solar:user-id-bold-duotone" size={32} color="var(--color-primary)" />
            </div>
            <h2>¡Bienvenido a DashQ!</h2>
            <p>Antes de comenzar, necesitamos que completes tu perfil con tu información de contacto. Esto es necesario para la seguridad de tu cuenta.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="onboarding-form">
            <div className="form-group">
              <label>Teléfono Celular <span className="required">*</span></label>
              <div className="input-with-icon">
                <Icon icon="solar:phone-bold-duotone" size={18} className="input-icon" />
                <input 
                  type="tel" 
                  placeholder="Ej: 987 654 321" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="modern-input"
                  autoFocus
                />
              </div>
            </div>
            
            {error && (
              <motion.div 
                className="error-message"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <Icon icon="solar:danger-circle-bold-duotone" size={16} />
                <span>{error}</span>
              </motion.div>
            )}
            
            <button 
              type="submit" 
              className={`modern-btn primary full-width ${isSubmitting ? 'loading' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="spinner-small"></div>
              ) : (
                <>
                  <Icon icon="solar:check-read-bold-duotone" size={18} />
                  Guardar y Continuar
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .onboarding-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .onboarding-modal {
          background: var(--bg-primary);
          border-radius: 24px;
          width: 100%;
          max-width: 440px;
          padding: 32px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05);
          border: 1px solid var(--border-color);
        }
        
        .onboarding-header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .onboarding-icon-container {
          width: 64px;
          height: 64px;
          background: rgba(99, 102, 241, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
        }
        
        .onboarding-header h2 {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 12px 0;
          color: var(--text-primary);
        }
        
        .onboarding-header p {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }
        
        .onboarding-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .form-group label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .required {
          color: #ef4444;
        }
        
        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .input-icon {
          position: absolute;
          left: 14px;
          color: var(--text-tertiary);
          pointer-events: none;
        }
        
        .modern-input {
          width: 100%;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 12px 14px 12px 42px;
          font-size: 14px;
          color: var(--text-primary);
          transition: all 0.2s ease;
          outline: none;
        }
        
        .modern-input:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
          background: var(--bg-primary);
        }
        
        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          padding: 12px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          overflow: hidden;
        }
        
        .full-width {
          width: 100%;
          justify-content: center;
          padding: 14px;
          font-size: 15px;
          border-radius: 12px;
          margin-top: 10px;
        }
        
        .spinner-small {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </AnimatePresence>
  );
};

export default OnboardingModal;

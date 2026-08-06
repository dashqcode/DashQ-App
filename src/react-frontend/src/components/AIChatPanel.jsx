import React, { useState, useRef, useEffect } from 'react';
import Icon from './ui/Icon';

function AIChatPanel({ fileId, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'model', text: '¡Hola! Soy tu asistente documental de IA. Puedes hacerme preguntas sobre este documento o pedirme que lo resuma.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId, message: userMsg })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'model', text: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', text: `Error: ${data.error}` }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'model', text: 'Error de red al conectar con la IA.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      width: '350px',
      height: '100%',
      background: 'var(--bg-primary)',
      borderLeft: '1px solid var(--border-light)',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
      animation: 'slideInRight 0.3s ease forwards'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon="solar:magic-stick-3-bold-duotone" color="white" size={18} />
          </div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>Chat Inteligente</h3>
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
          padding: '4px', borderRadius: '4px', display: 'flex'
        }}>
          <Icon icon="solar:close-circle-bold-duotone" size={20} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '18px 18px 0 18px' : '18px 18px 18px 0',
              background: msg.role === 'user' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
              color: 'white',
              fontSize: '13.5px',
              lineHeight: '1.5',
              border: msg.role === 'model' ? '1px solid var(--border-light)' : 'none',
              whiteSpace: 'pre-wrap'
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '12px 16px', borderRadius: '18px 18px 18px 0', background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-light)', display: 'flex', gap: '4px', alignItems: 'center'
            }}>
              <div className="beautiful-dots-container" style={{ padding: '4px 8px', display: 'flex', gap: '4px' }}>
                <div className="beautiful-dot"></div>
                <div className="beautiful-dot"></div>
                <div className="beautiful-dot"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-primary)' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', background: 'var(--bg-secondary)', borderRadius: '24px', border: '1px solid var(--border-color)', padding: '8px 8px 8px 16px' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pregunta algo sobre el documento..."
            style={{
              flex: 1, border: 'none', background: 'transparent', color: 'white', fontSize: '13.5px',
              resize: 'none', height: '36px', maxHeight: '120px', outline: 'none', fontFamily: 'inherit',
              lineHeight: '36px', overflowY: 'hidden'
            }}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{
              background: input.trim() && !isLoading ? 'linear-gradient(135deg, var(--color-primary), #818cf8)' : 'rgba(255,255,255,0.1)',
              border: 'none', width: '36px', height: '36px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
              color: 'white', flexShrink: 0, transition: 'all 0.2s'
            }}>
            <Icon icon="solar:plain-bold" size={18} />
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '10.5px', color: 'var(--text-secondary)' }}>
          La IA puede cometer errores. Verifica la información.
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .dot-flashing {
          position: relative;
          width: 6px;
          height: 6px;
          border-radius: 5px;
          background-color: var(--color-primary);
          color: var(--color-primary);
          animation: dot-flashing 1s infinite linear alternate;
        }
        @keyframes dot-flashing {
          0% { background-color: var(--color-primary); }
          50%, 100% { background-color: rgba(255,255,255,0.2); }
        }
      `}</style>
    </div>
  );
}

export default AIChatPanel;

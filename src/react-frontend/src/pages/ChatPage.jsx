import React, { useState, useEffect, useRef } from 'react';
import Icon from '../components/ui/Icon';

function ChatPage() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [message, setMessage] = useState('');
  

  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [viewMode, setViewMode] = useState('chats'); // 'chats' or 'directory'
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('dashq_user');
      const parsedCurrentUser = storedUser ? JSON.parse(storedUser) : { email: 'admin@dashq.com', name: 'Admin' };

      const stored = localStorage.getItem('dashq_users_list');
      if (stored) {
        const parsed = JSON.parse(stored);
        const others = parsed.filter(u => u.email !== parsedCurrentUser.email);
        setUsers(others);
      }
    } catch (e) {
      console.warn(e);
    }
  }, []);

  useEffect(() => {
    if (activeChat) {
      const chatKey = `dashq_message_${activeChat.email}`;
      const storedChat = localStorage.getItem(chatKey);
      if (storedChat) {
        setMessages(JSON.parse(storedChat));
      } else {
        setMessages([]);
      }
      setChatSearchTerm('');
      setShowChatSearch(false);
    }
  }, [activeChat]);

  // Helper to get actual last message for sidebar
  const getLastMessageInfo = (email) => {
    try {
      const stored = localStorage.getItem(`dashq_message_${email}`);
      if (stored) {
        const msgs = JSON.parse(stored);
        if (msgs && msgs.length > 0) {
          const last = msgs[msgs.length - 1];
          return { text: last.type === 'file' ? 'Archivo adjunto' : last.text, time: last.time };
        }
      }
    } catch {}
    return null;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredUsers = users.filter(u => 
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.oficina && u.oficina.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !activeChat) return;
    
    const newMsg = {
      id: Date.now(),
      sender: 'me',
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    };
    
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    
    const chatKey = `dashq_message_${activeChat.email}`;
    localStorage.setItem(chatKey, JSON.stringify(updatedMessages));
    
    setMessage('');

    // Simular respuesta del otro usuario para que "funcione de verdad"
    setTimeout(() => {
      const replyMsg = {
        id: Date.now() + 1,
        sender: 'other',
        text: 'Recibido. Gracias por la información.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'text'
      };
      setMessages(prev => {
        const withReply = [...prev, replyMsg];
        localStorage.setItem(`dashq_message_${activeChat.email}`, JSON.stringify(withReply));
        return withReply;
      });
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: '16px', background: 'transparent' }}>
      
      {/* Sidebar: Lista de Chats */}
      <div style={{ width: '340px', display: 'flex', flexDirection: 'column', background: '#161616', borderRadius: '32px', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {viewMode === 'directory' && (
                <button onClick={() => setViewMode('chats')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Icon icon="solar:arrow-left-bold-duotone" size={18} />
                </button>
              )}
              <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                {viewMode === 'chats' ? 'Mensajes' : 'Contactos'}
              </h2>
            </div>
            {viewMode === 'chats' && (
              <button onClick={() => setViewMode('directory')} style={{ background: 'var(--color-primary)', border: 'none', width: '40px', height: '40px', borderRadius: '50%', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                <Icon icon="solar:pen-new-square-bold-duotone" size={20} />
              </button>
            )}
          </div>
          
          <div style={{ position: 'relative' }}>
            <Icon icon="solar:magnifer-bold-duotone" size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              id="chat-search-input"
              type="text" 
              placeholder={viewMode === 'chats' ? "Buscar chats..." : "Buscar contactos..."} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '9999px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
          {viewMode === 'chats' ? (
            <>
              {filteredUsers.filter(u => getLastMessageInfo(u.email) !== null).length > 0 ? (
                filteredUsers.filter(u => getLastMessageInfo(u.email) !== null).map((user, idx) => {
                  const lastMsgInfo = getLastMessageInfo(user.email);
                  return (
                    <div 
                      key={idx} 
                      onClick={() => setActiveChat(user)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '9999px', cursor: 'pointer',
                        background: activeChat === user ? 'rgba(255,255,255,0.05)' : 'transparent',
                        border: activeChat === user ? '1px solid var(--border-light)' : '1px solid transparent',
                        marginBottom: '4px', transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => { if (activeChat !== user) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                      onMouseLeave={e => { if (activeChat !== user) e.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{ position: 'relative' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), #818cf8)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        {user.status === 'Activo' && (
                          <div style={{ position: 'absolute', bottom: '0px', right: '0px', width: '14px', height: '14px', background: '#22c55e', border: '3px solid var(--bg-card)', borderRadius: '50%' }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lastMsgInfo.time}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastMsgInfo.text}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Icon icon="solar:chat-line-bold-duotone" size={40} style={{ opacity: 0.3, marginBottom: '16px' }} />
                  <p style={{ fontSize: '14px', margin: 0, lineHeight: 1.5 }}>No tienes chats activos.<br/>Inicia uno nuevo en el botón superior.</p>
                </div>
              )}
            </>
          ) : (
            <>
              {Object.entries(
                filteredUsers.reduce((acc, user) => {
                  const group = user.oficina || user.rol || 'General';
                  if (!acc[group]) acc[group] = [];
                  acc[group].push(user);
                  return acc;
                }, {})
              ).map(([groupName, groupUsers]) => (
                <div key={groupName} style={{ marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 12px 12px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-primary)', fontWeight: 800 }}>{groupName}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {groupUsers.map(user => (
                      <div 
                        key={user.email} 
                        onClick={() => { setActiveChat(user); setViewMode('chats'); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', borderRadius: '9999px', cursor: 'pointer', transition: '0.2s', border: '1px solid transparent' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), #818cf8)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold' }}>
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{user.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.rol || 'Usuario'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {/* Área Principal: Mensajes */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', background: '#161616', borderRadius: '32px', overflow: 'hidden' }}>
        {activeChat ? (
        <>
          {/* Chat Header */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', background: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), #818cf8)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 'bold' }}>
                {activeChat.name ? activeChat.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{activeChat.name}</h3>
                <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }} />
                  En línea
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setShowChatSearch(!showChatSearch); setChatSearchTerm(''); }} style={{ background: showChatSearch ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background= showChatSearch ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}>
                <Icon icon="solar:magnifer-bold-duotone" size={18} />
              </button>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowMenu(!showMenu)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}>
                  <Icon icon="solar:menu-dots-bold-duotone" size={18} />
                </button>
                {showMenu && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '8px', zIndex: 10, minWidth: '160px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                    <div style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '8px', color: 'var(--text-primary)' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} onClick={() => setShowMenu(false)}>Ver Perfil</div>
                    <div style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '8px', color: 'var(--text-primary)' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} onClick={() => setShowMenu(false)}>Silenciar</div>
                    <div style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderRadius: '8px', color: '#ef4444' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.1)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} onClick={() => { setMessages([]); localStorage.removeItem(`dashq_message_${activeChat.email}`); setShowMenu(false); }}>Vaciar Chat</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {showChatSearch && (
            <div style={{ padding: '12px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Icon icon="solar:magnifer-bold-duotone" size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  placeholder="Buscar en esta conversación..." 
                  value={chatSearchTerm}
                  onChange={e => setChatSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '10px 16px 10px 40px', background: '#161616', border: '1px solid var(--border-light)', borderRadius: '9999px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Chat History */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '11px', padding: '4px 12px', borderRadius: '12px', fontWeight: 600 }}>Ayer</span>
            </div>
            
            {messages.filter(msg => !chatSearchTerm || msg.text.toLowerCase().includes(chatSearchTerm.toLowerCase())).map((msg) => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'me' ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', maxWidth: '75%', flexDirection: msg.sender === 'me' ? 'row-reverse' : 'row' }}>
                  
                  {msg.sender === 'other' && (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), #818cf8)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', flexShrink: 0 }}>
                      {activeChat.name ? activeChat.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}

                  {msg.type === 'text' && (
                    <div style={{ 
                      background: msg.sender === 'me' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', 
                      color: msg.sender === 'me' ? 'white' : 'var(--text-primary)', 
                      padding: '14px 20px', 
                      borderRadius: msg.sender === 'me' ? '24px 24px 4px 24px' : '24px 24px 24px 4px',
                      fontSize: '15px', lineHeight: '1.5',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                    }}>
                      {msg.text}
                    </div>
                  )}

                  {msg.type === 'file' && (
                    <div style={{ 
                      background: msg.sender === 'me' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', 
                      color: msg.sender === 'me' ? 'white' : 'var(--text-primary)', 
                      padding: '16px 20px', 
                      borderRadius: msg.sender === 'me' ? '24px 24px 4px 24px' : '24px 24px 24px 4px',
                      display: 'flex', alignItems: 'center', gap: '16px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.1)', cursor: 'pointer'
                    }}>
                      <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon icon="solar:document-bold-duotone" size={24} color="white" />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>{msg.text}</div>
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>{msg.size}</div>
                      </div>
                      <Icon icon="solar:download-square-bold-duotone" size={24} color="rgba(255,255,255,0.8)" style={{ marginLeft: '12px' }} />
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', padding: msg.sender === 'me' ? '0 4px' : '0 40px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{msg.time}</span>
                  {msg.sender === 'me' && <Icon icon="solar:check-read-bold" size={14} color="#3b82f6" />}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-color)', background: 'transparent' }}>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#161616', borderRadius: '9999px', padding: '10px 10px 10px 20px', border: '1px solid var(--border-light)' }}>
              
              <input type="file" id="chat-file-input" style={{display: 'none'}} onChange={(e) => {
                if (e.target.files.length > 0) {
                  const file = e.target.files[0];
                  const newMsg = {
                    id: Date.now(),
                    sender: 'me',
                    text: file.name,
                    size: (file.size / 1024).toFixed(1) + ' KB',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    type: 'file'
                  };
                  setMessages(prev => {
                    const updated = [...prev, newMsg];
                    localStorage.setItem(`dashq_message_${activeChat.email}`, JSON.stringify(updated));
                    return updated;
                  });
                  setTimeout(() => {
                    const replyMsg = {
                      id: Date.now() + 1,
                      sender: 'other',
                      text: '¡Archivo recibido!',
                      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      type: 'text'
                    };
                    setMessages(prev => {
                      const withReply = [...prev, replyMsg];
                      localStorage.setItem(`dashq_message_${activeChat.email}`, JSON.stringify(withReply));
                      return withReply;
                    });
                  }, 1500);
                }
              }} />

              <button type="button" onClick={() => document.getElementById('chat-file-input').click()} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Icon icon="solar:paperclip-2-bold-duotone" size={20} />
              </button>
              
              {isRecording ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px', color: '#ef4444', fontWeight: 600, fontSize: '14px', animation: 'pulse 1.5s infinite' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                  Grabando audio...
                </div>
              ) : (
                <input 
                  type="text" 
                  placeholder="Escribe tu mensaje..." 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '14px', outline: 'none' }}
                />
              )}
              
              <button type="button" onClick={() => setMessage(m => m + ' 😊')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Icon icon="solar:smile-circle-bold-duotone" size={20} />
              </button>
              
              <button 
                type={message.trim() && !isRecording ? "submit" : "button"} 
                onClick={() => {
                  if (!message.trim() && !isRecording) {
                    setIsRecording(true);
                    setTimeout(() => {
                      setIsRecording(false);
                      const newMsg = {
                        id: Date.now(),
                        sender: 'me',
                        text: '🎵 Nota de voz (0:04)',
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        type: 'text'
                      };
                      setMessages(prev => {
                        const updated = [...prev, newMsg];
                        localStorage.setItem(`dashq_message_${activeChat.email}`, JSON.stringify(updated));
                        return updated;
                      });
                      setTimeout(() => {
                        const replyMsg = {
                          id: Date.now() + 1,
                          sender: 'other',
                          text: '¡Audio recibido!',
                          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                          type: 'text'
                        };
                        setMessages(prev => {
                          const withReply = [...prev, replyMsg];
                          localStorage.setItem(`dashq_message_${activeChat.email}`, JSON.stringify(withReply));
                          return withReply;
                        });
                      }, 1500);
                    }, 2500);
                  }
                }}
                style={{ background: (message.trim() || isRecording) ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', color: (message.trim() || isRecording) ? 'white' : 'var(--text-muted)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}>
                {isRecording ? <Icon icon="solar:stop-circle-bold" size={18} color="#ef4444" /> : (message.trim() ? <Icon icon="solar:plain-bold" size={18} /> : <Icon icon="solar:microphone-3-bold-duotone" size={18} />)}
              </button>
            </form>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: 'var(--text-muted)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
             <Icon icon="solar:chat-round-dots-bold-duotone" size={40} style={{ opacity: 0.5 }} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Tus Mensajes</h2>
          <p style={{ fontSize: '14px', maxWidth: '300px', textAlign: 'center', lineHeight: '1.5' }}>
            Selecciona una conversación de la lista para empezar a chatear o inicia una nueva.
          </p>
        </div>
      )}
      </div>
    </div>
  );
}

export default ChatPage;

import React, { useState, useEffect } from 'react';
import Icon from '../components/ui/Icon';
import CustomSelect from '../components/CustomSelect';

const STAGES = [
  { id: 'tesoreria', label: 'Tesorería', color: '#60a5fa' },
  { id: 'contabilidad', label: 'Contabilidad', color: '#f472b6' },
  { id: 'administracion', label: 'Administración', color: '#fbbf24' },
  { id: 'archivo_caja', label: 'Archivo de Caja', color: '#34d399' }
];

function getActivities(user) {
  try {
    const listados = JSON.parse(localStorage.getItem('dashq_notas_pago_v5')) || [];
    return listados
      .filter(d => !d.devuelto) // Simplificado por ahora
      .map(d => ({
        id: d.id,
        docId: d.id,
        docRef: d.referencia || 'Listado sin ref',
        title: 'Revisión de Notas de Pago',
        description: `Se requiere revisión del listado ${d.referencia} con ${d.notasDePago?.length || 0} notas de pago.`,
        sender: d.usuarioRegistro || 'Sistema',
        date: d.fechaRegistro,
        type: d.estado === 'completado' ? 'success' : 'action_required',
        read: true,
        stageIndex: d.stageIndex || 0,
        notasDePago: d.notasDePago || [],
        history: d.historial || [],
        devuelto: d.devuelto
      }))
      .sort((a,b) => new Date(b.date) - new Date(a.date));
  } catch(e) {
    return [];
  }
}

const ActivityPage = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  
  const [showObsInput, setShowObsInput] = useState(false);
  const [obsItem, setObsItem] = useState('General');
  const [obsText, setObsText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setNotifications(getActivities(user));
  }, [user]);

  const filtered = notifications.filter(n => {
    if (filter === 'unread' && n.read) return false;
    if (filter === 'reviewed' && n.type === 'action_required') return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.sender.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedNotif = notifications.find(n => n.id === selectedId);

  const handleSelect = (id) => {
    setSelectedId(id);
    setShowObsInput(false);
    setCurrentPage(1);
  };

  const addToast = (msg, type='success') => alert(msg);

  const handleApprove = () => {
    if (!selectedNotif) return;
    try {
      const listados = JSON.parse(localStorage.getItem('dashq_notas_pago_v5')) || [];
      const docIndex = listados.findIndex(d => d.id === selectedNotif.docId);
      if (docIndex === -1) return;
      
      const doc = listados[docIndex];
      const currentStage = STAGES[doc.stageIndex];
      const ts = new Date().toISOString();

      doc.historial.push({
        accion: 'Visto Bueno',
        usuario: user?.name || 'Usuario',
        fecha: ts,
        etapa: currentStage.label
      });

      doc.stageIndex += 1;
      if (doc.stageIndex >= STAGES.length) {
        doc.estado = 'completado';
        doc.historial.push({
          accion: 'Listado completado y archivado',
          usuario: 'Sistema',
          fecha: ts,
          etapa: 'Finalizado'
        });
      }

      listados[docIndex] = doc;
      localStorage.setItem('dashq_notas_pago_v5', JSON.stringify(listados));
      setNotifications(getActivities(user));
      setSelectedId(null);
      addToast(`Visto bueno registrado en ${currentStage.label}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = () => {
    if (!selectedNotif) return;
    if (!obsText.trim()) {
      addToast("Debes ingresar el motivo de la observación.", "error");
      return;
    }
    try {
      const listados = JSON.parse(localStorage.getItem('dashq_notas_pago_v5')) || [];
      const docIndex = listados.findIndex(d => d.id === selectedNotif.docId);
      if (docIndex === -1) return;
      
      const doc = listados[docIndex];
      const currentStage = STAGES[doc.stageIndex];
      const ts = new Date().toISOString();

      doc.historial.push({
        accion: 'Devuelto con observaciones',
        usuario: user?.name || 'Usuario',
        fecha: ts,
        etapa: currentStage.label,
        obs: obsText
      });

      doc.stageIndex = Math.max(0, doc.stageIndex - 1);
      doc.devuelto = true;
      doc.estado = 'en_proceso';

      listados[docIndex] = doc;
      localStorage.setItem('dashq_notas_pago_v5', JSON.stringify(listados));
      setNotifications(getActivities(user));
      setShowObsInput(false);
      setObsText('');
      setSelectedId(null);
      addToast('Devuelto con observaciones');
    } catch (e) {
      console.error(e);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'action_required': return { icon: 'solar:bell-bing-bold-duotone', color: '#60a5fa' };
      case 'warning': return { icon: 'solar:danger-triangle-bold-duotone', color: '#f59e0b' };
      case 'success': return { icon: 'solar:check-circle-bold-duotone', color: '#10b981' };
      default: return { icon: 'solar:info-circle-bold-duotone', color: '#94a3b8' };
    }
  };

  const s = {
    page: { display: 'flex', flex: 1, padding: 0, gap: '16px', overflow: 'hidden', height: '100%', fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', background: 'transparent' },
    left: { width: '380px', flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100%', background: '#161616', borderRadius: '32px', border: 'none' },
    lHeader: { padding: '24px 24px 16px' },
    title: { fontSize: '22px', fontWeight: 700, marginBottom: '4px' },
    subtitle: { fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' },
    searchWrap: { position: 'relative', flex: 1, marginBottom: '16px' },
    searchInput: { width: '100%', padding: '10px 12px 10px 34px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '30px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' },
    searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' },
    tab: { padding: '6px 14px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500, cursor: 'pointer' },
    tabActive: { padding: '6px 14px', borderRadius: '30px', border: '1px solid var(--color-primary)', background: 'var(--color-primary-glow)', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 500, cursor: 'pointer' },
    listArea: { flex: 1, overflowY: 'auto', padding: '0 24px 24px' },
    card: (sel, unread) => ({ padding: '18px 22px', borderRadius: '24px', marginBottom: '12px', cursor: 'pointer', border: `1px solid ${sel ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)'}`, background: sel ? 'var(--color-primary-glow)' : unread ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s ease', boxShadow: sel ? '0 4px 12px rgba(0,0,0,0.1)' : 'none' }),
    right: { flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#161616', borderRadius: '32px' },
    rEmpty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--text-muted)' },
    rHeader: { padding: '16px 24px' },
    rBody: { flex: 1, padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: '16px' },
    rFooter: { padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'transparent' },
    badge: { display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '30px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, gap: '4px' },
    historyItem: { padding: '12px 0', display: 'flex', gap: '16px' },
    avatar: { width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 },
    obsBox: { marginTop: '12px', padding: '12px 16px', background: 'rgba(245, 158, 11, 0.1)', borderLeft: '3px solid #f59e0b', borderRadius: '0 8px 8px 0', fontSize: '13px', color: 'var(--text-secondary)' },
    btnPrimary: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px 24px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '30px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' },
    btnDanger: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px 24px', background: 'transparent', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.3)', borderRadius: '30px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' },
    btnOutline: { display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', border: 'none', borderRadius: '30px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', alignSelf: 'flex-start' },
    textarea: { width: '100%', padding: '16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', resize: 'none', height: '80px', fontFamily: 'Inter, sans-serif', marginBottom: '12px' },
    formatDate: (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) {
        return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
    },
    formatFullDate: (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) + ' a las ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <div style={s.page}>
      
      {/* ── INBOX (LEFT) ── */}
      <div style={s.left}>
        <div style={s.lHeader}>
          <div style={s.title}>Centro de Actividades</div>
          <div style={s.subtitle}>Notificaciones y observaciones</div>
          
          <div style={s.searchWrap}>
            <Icon icon="solar:minimalistic-magnifer-bold-duotone" size={14} style={s.searchIcon} />
            <input 
              style={s.searchInput}
              type="text" 
              placeholder="Buscar..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', padding: '0 24px' }}>
          <button style={filter === 'all' ? s.tabActive : s.tab} onClick={() => setFilter('all')}>Todas</button>
          <button style={filter === 'unread' ? s.tabActive : s.tab} onClick={() => setFilter('unread')}>No leídas</button>
          <button style={filter === 'reviewed' ? s.tabActive : s.tab} onClick={() => setFilter('reviewed')}>Revisadas</button>
        </div>

        <div style={s.listArea}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '40px' }}>
              <Icon icon="solar:bell-off-bold-duotone" size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
              <div>No hay notificaciones</div>
              <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '8px', maxWidth: '200px', margin: '8px auto' }}>
                Los documentos que envíes a revisión aparecerán aquí.
              </div>
            </div>
          ) : (
            filtered.map(n => {
              const sel = n.id === selectedId;
              const t = getTypeIcon(n.type);
              return (
                <div 
                  key={n.id} 
                  style={s.card(sel, !n.read)} 
                  onClick={() => handleSelect(n.id)}
                  onMouseEnter={e => { if (!sel) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; } }}
                  onMouseLeave={e => { if (!sel) { e.currentTarget.style.background = !n.read ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; } }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }} />}
                      <Icon icon={t.icon} size={16} color={t.color} />
                      <span style={{ fontSize: '13px', fontWeight: !n.read ? 700 : 600, color: sel ? 'var(--color-primary)' : 'var(--text-primary)' }}>{n.sender}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.formatDate(n.date)}</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', lineHeight: 1.3 }}>{n.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {n.description}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── DETAILS (RIGHT) ── */}
      <div style={s.right}>
        {!selectedNotif ? (
          <div style={s.rEmpty}>
            <Icon icon="solar:inbox-in-bold-duotone" size={64} style={{ opacity: 0.1 }} />
            <div style={{ fontSize: '15px' }}>Selecciona una notificación para ver los detalles</div>
          </div>
        ) : (
          <>
            <div style={s.rHeader}>
              <div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{selectedNotif.title}</h2>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{selectedNotif.description}</p>
              </div>
            </div>

            <div style={s.rBody}>
              {/* Flujo de Etapas */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon icon="solar:routing-bold-duotone" size={16} /> 
                  Flujo de Etapas
                </div>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
                    {STAGES.map((stage, i, arr) => {
                      const isArchived = selectedNotif.type === 'success' || selectedNotif.description.includes('archivadas en Caja') || selectedNotif.title === 'Archivado exitosamente';
                      const done = i < selectedNotif.stageIndex || isArchived;
                      const active = i === selectedNotif.stageIndex && !isArchived;
                      return (
                        <div key={stage.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                          {i < arr.length - 1 && (
                            <div style={{ position: 'absolute', top: '15px', left: '50%', width: '100%', height: '2px', background: (i < selectedNotif.stageIndex || isArchived) ? '#60a5fa' : 'rgba(255,255,255,0.08)', zIndex: 0 }} />
                          )}
                          <div style={{ width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: active ? `2px solid ${stage.color}` : done ? `2px solid ${stage.color}` : '2px solid rgba(255,255,255,0.15)', background: done ? stage.color : '#121212', flexShrink: 0, position: 'relative', zIndex: 2, transition: 'all 0.2s' }}>
                            {done
                              ? <Icon icon="solar:check-circle-bold-duotone" size={12} color="#111" />
                              : <Icon icon={stage.icon || "solar:record-circle-bold-duotone"} size={12} color={active ? stage.color : 'rgba(255,255,255,0.3)'} />
                            }
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: active ? 800 : 600, textAlign: 'center', marginTop: '8px', color: active ? '#ffffff' : done ? 'var(--text-primary)' : 'var(--text-muted)', letterSpacing: active ? '0.5px' : '0', transition: 'all 0.3s ease' }}>{stage.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Notas de Pago */}
              {selectedNotif.notasDePago && selectedNotif.notasDePago.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon icon="solar:document-bold-duotone" size={16} /> 
                    Notas de Pago ({selectedNotif.notasDePago.length})
                  </div>
                  
                  <div style={{ overflowX: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead style={{ zIndex: 1 }}>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>#</th>
                          <th style={{ textAlign: 'left', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>N Nota</th>
                          <th style={{ textAlign: 'left', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SIAF</th>
                          <th style={{ textAlign: 'left', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado/Obs.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedNotif.notasDePago.slice((currentPage - 1) * 5, currentPage * 5).map((n, i) => (
                          <tr key={i}>
                            <td style={{ padding: '10px 0', color: 'var(--text-muted)' }}>{String((currentPage - 1) * 5 + i + 1).padStart(2, '0')}</td>
                            <td style={{ padding: '10px 0', fontWeight: 600, color: 'var(--text-primary)' }}>{n.numero}</td>
                            <td style={{ padding: '10px 0', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{n.siaf}</td>
                            <td style={{ padding: '10px 0', color: n.estado ? '#f59e0b' : 'var(--text-muted)', fontWeight: n.estado ? 600 : 400 }}>{n.estado ? n.estado.split(' (')[0] : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {selectedNotif.notasDePago.length > 5 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '12px' }}>
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)', padding: '6px 12px', borderRadius: '20px', cursor: currentPage === 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}
                      >
                        <Icon icon="solar:alt-arrow-left-bold-duotone" size={14} /> Anterior
                      </button>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        Página {currentPage} de {Math.ceil(selectedNotif.notasDePago.length / 5)}
                      </span>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(selectedNotif.notasDePago.length / 5), p + 1))}
                        disabled={currentPage === Math.ceil(selectedNotif.notasDePago.length / 5)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: currentPage === Math.ceil(selectedNotif.notasDePago.length / 5) ? 'var(--text-muted)' : 'var(--text-primary)', padding: '6px 12px', borderRadius: '20px', cursor: currentPage === Math.ceil(selectedNotif.notasDePago.length / 5) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}
                      >
                        Siguiente <Icon icon="solar:alt-arrow-right-bold-duotone" size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ACCIONES */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon icon="solar:box-bold-duotone" size={16} /> 
                  Acción — {STAGES[selectedNotif.stageIndex]?.label}
                </div>

                {!selectedNotif.devuelto && selectedNotif.type === 'action_required' && !showObsInput && (
                  <div style={{ padding: '20px 24px', borderRadius: '30px', background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.15)', marginBottom: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#60a5fa', marginBottom: '6px' }}>Pendiente de Visto Bueno</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                      Listado recepcionado. Revisa las notas de pago y da el visto bueno para derivar a la siguiente oficina, o devuélvelo con una observación.
                    </div>
                  </div>
                )}

                {selectedNotif.type === 'action_required' && (
                  <div style={{ background: 'transparent' }}>
                    {showObsInput ? (
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 600, marginBottom: '6px' }}>Ítem observado:</div>
                              <CustomSelect
                                value={obsItem}
                                onChange={setObsItem}
                                options={[
                                  { value: 'General', label: 'Problema general' },
                                  ...(selectedNotif.notasDePago || []).map((n, i) => ({
                                    value: n.numero,
                                    label: `${String(i + 1).padStart(2, '0')} - Nota N° ${n.numero}`
                                  }))
                                ]}
                              />
                            </div>
                            <div style={{ flex: 2 }}>
                              <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 600, marginBottom: '6px' }}>Motivo de la observación:</div>
                              <input 
                                type="text"
                                style={{ width: '100%', padding: '0 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                                placeholder="Ej. SIAF 121 no corresponde..."
                                value={obsText}
                                onChange={(e) => setObsText(e.target.value)}
                                autoFocus
                              />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button style={{ ...s.btnDanger, flex: 'none', background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', padding: '10px 20px' }} onClick={handleReject}>Confirmar Devolución</button>
                            <button style={{ ...s.btnOutline, flex: 'none', padding: '10px 20px' }} onClick={() => setShowObsInput(false)}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button style={{ ...s.btnPrimary, flex: 'none', background: '#60a5fa', color: '#111', padding: '10px 20px' }} onClick={handleApprove}>
                          <Icon icon="solar:check-circle-bold-duotone" size={16} /> Dar Visto Bueno
                        </button>
                        <button style={{ ...s.btnDanger, flex: 'none', background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', padding: '10px 20px' }} onClick={() => setShowObsInput(true)}>
                          <Icon icon="solar:undo-left-bold-duotone" size={16} /> Observar y Devolver
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ActivityPage;

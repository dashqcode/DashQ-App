import React, { useMemo, useState, useEffect, useRef } from 'react';
import Icon from '../components/ui/Icon';
import { useFiles } from '../context/FileContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { getActivities, STAGES } from '../utils/activityUtils';
import Chart from 'react-apexcharts';
import { useNavigate } from 'react-router-dom';

function DashboardPage() {
  const { globalStats, isLoading, setCurrentFolderId } = useFiles();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [hoveredFolder, setHoveredFolder] = useState(null);
  const [activityRange, setActivityRange] = useState('Sem');
  const notifiedSet = useRef(new Set());
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('dashq_tasks');
      if (saved) {
        const parsed = JSON.parse(saved);
        const dummyTexts = ['Revisar notas de pago semanales', 'Aprobar documentos de tesorería', 'Reunión con Administrador', 'Actualizar reporte de caja'];
        const cleanTasks = parsed.filter(t => !dummyTexts.includes(t.text));
        return cleanTasks;
      }
      return [];
    } catch (e) {
      return [];
    }
  });
  const [newTaskText, setNewTaskText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [calendarEvents, setCalendarEvents] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dashq_calendar_v1')) || [];
    } catch {
      return [];
    }
  });

  const FERIADOS = [
    { date: '01-01', name: 'Año Nuevo' },
    { date: '03-28', name: 'Jueves Santo' },
    { date: '03-29', name: 'Viernes Santo' },
    { date: '05-01', name: 'Día del Trabajo' },
    { date: '06-29', name: 'San Pedro y San Pablo' },
    { date: '07-23', name: 'Día de la FAP' },
    { date: '07-28', name: 'Independencia Nacional' },
    { date: '07-29', name: 'Fiestas Patrias' },
    { date: '08-06', name: 'Batalla de Junín' },
    { date: '08-30', name: 'Santa Rosa de Lima' },
    { date: '10-08', name: 'Combate de Angamos' },
    { date: '11-01', name: 'Día de Todos los Santos' },
    { date: '12-08', name: 'Inmaculada Concepción' },
    { date: '12-09', name: 'Batalla de Ayacucho' },
    { date: '12-25', name: 'Navidad' },
  ];

  const getNextHoliday = () => {
    const today = new Date();
    const m = today.getMonth() + 1;
    const d = today.getDate();
    const todayStr = `${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    
    let next = FERIADOS.find(f => f.date >= todayStr);
    if (!next) next = FERIADOS[0]; // next year
    
    const [nm, nd] = next.date.split('-');
    return { name: next.name, dateStr: `${nd}/${nm}` };
  };
  
  const nextHoliday = getNextHoliday();

  useEffect(() => {
    localStorage.setItem('dashq_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // Ignorar si el navegador bloquea audio
    }
  };

  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      const currentAmPm = now.toLocaleTimeString('en-US', {hour: 'numeric', minute:'2-digit'});
      const currentHour = now.getHours().toString();
      const currentMinute = now.getMinutes();

      // Check Tasks
      tasks.forEach(t => {
        if (!t.completed && t.time === currentAmPm && !notifiedSet.current.has('task_' + t.id)) {
          playNotificationSound();
          addToast(`¡Hora de: ${t.text}!`, 'info');
          notifiedSet.current.add('task_' + t.id);
        }
      });

      // Check Events
      calendarEvents.forEach(e => {
        if (!e.date) return;
        const ed = new Date(e.date);
        if (ed.getDate() === now.getDate() && ed.getMonth() === now.getMonth() && ed.getFullYear() === now.getFullYear()) {
          // If startHour is now and minute is 0-5
          if (e.startHour === currentHour && currentMinute < 5 && !notifiedSet.current.has('event_' + e.id)) {
            playNotificationSound();
            addToast(`Evento iniciando: ${e.title}`, 'info');
            notifiedSet.current.add('event_' + e.id);
          }
        }
      });
    };

    const interval = setInterval(checkNotifications, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [tasks, calendarEvents, addToast]);

  const handleTaskSubmit = () => {
    if (newTaskText.trim()) {
      setTasks([{ id: Date.now(), text: newTaskText, time: new Date().toLocaleTimeString('en-US', {hour: 'numeric', minute:'2-digit'}), completed: false }, ...tasks]);
      setNewTaskText('');
    }
  };

  const addTask = (e) => {
    if (e.key === 'Enter') handleTaskSubmit();
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Real Data Integration
  const totalFilesCount = globalStats?.totalFiles || 0;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const taskProgress = totalTasks === 0 ? 100 : Math.round((completedTasks / totalTasks) * 100);
  const widgetSeries = [taskProgress];

  const topFolders = (globalStats?.topFolders || []).slice(0, 5).map(f => ({
    name: f.name,
    value: formatBytes(f.size)
  }));

  const cats = globalStats?.categories || {};
  const pdfCount = cats.pdf?.count || 0;
  const imgCount = cats.img?.count || 0;
  const otherCount = (cats.doc?.count || 0) + (cats.xl?.count || 0) + (cats.other?.count || 0);
  const totalCatDocs = pdfCount + imgCount + otherCount || 1; // avoid div by 0 for progress bars

  const trafficData = [
    { label: 'PDF', value: pdfCount, color: '#6366f1', icon: 'solar:document-bold-duotone' },
    { label: 'Imágenes', value: imgCount, color: '#8b5cf6', icon: 'solar:gallery-bold-duotone' },
    { label: 'Otros', value: otherCount, color: '#ec4899', icon: 'solar:box-bold-duotone' }
  ];

  const EMPTY_ARRAY = useMemo(() => [], []);
  const allFiles = globalStats?.allFiles || EMPTY_ARRAY;

  const { actData, totalDocsData, trendData, totalDocsGrowth, trendGrowth, growthTotal } = useMemo(() => {
    const now = new Date();
    
    // Actividad
    const actD = [];
    const actCat = [];
    if (activityRange === 'Sem') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        actCat.push(d.toLocaleDateString('es-ES', { weekday: 'short' }));
        const count = allFiles.filter(f => {
          if (!f.date) return false;
          const fd = new Date(f.date);
          return fd.getDate() === d.getDate() && fd.getMonth() === d.getMonth() && fd.getFullYear() === d.getFullYear();
        }).length;
        actD.push(count);
      }
    } else {
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const year = now.getFullYear();
      for (let i = 0; i < 12; i++) {
        actCat.push(months[i]);
        const count = allFiles.filter(f => {
          if (!f.date) return false;
          const fd = new Date(f.date);
          return fd.getMonth() === i && fd.getFullYear() === year;
        }).length;
        actD.push(count);
      }
    }

    const actTotal = actD.reduce((a,b) => a+b, 0);
    const computedActData = { data: actD, categories: actCat, total: actTotal.toLocaleString(), trend: '+0%' };

    // Documentos Totales (últimos 10 días acumulativo)
    const tData = [];
    let cumulative1 = allFiles.filter(f => f.date && new Date(f.date) < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 9)).length;
    for (let i = 9; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayCount = allFiles.filter(f => {
        if (!f.date) return false;
        const fd = new Date(f.date);
        return fd.getDate() === d.getDate() && fd.getMonth() === d.getMonth() && fd.getFullYear() === d.getFullYear();
      }).length;
      cumulative1 += dayCount;
      tData.push(cumulative1);
    }
    const tGrowth = tData[tData.length - 2] > 0 
      ? Math.round(((tData[tData.length - 1] - tData[tData.length - 2]) / tData[tData.length - 2]) * 100) 
      : (tData[tData.length - 1] > 0 ? 100 : 0);

    // Crecimiento (últimos 6 meses acumulativo)
    const trData = [];
    let cumulative2 = allFiles.filter(f => f.date && new Date(f.date) < new Date(now.getFullYear(), now.getMonth() - 5, 1)).length;
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(now.getMonth() - i);
      const monthCount = allFiles.filter(f => {
        if (!f.date) return false;
        const fd = new Date(f.date);
        return fd.getMonth() === d.getMonth() && fd.getFullYear() === d.getFullYear();
      }).length;
      cumulative2 += monthCount;
      trData.push(cumulative2);
    }
    
    // Crecimiento mensual
    const thisMonthFiles = allFiles.filter(f => {
       if (!f.date) return false;
       const fd = new Date(f.date);
       return fd.getMonth() === now.getMonth() && fd.getFullYear() === now.getFullYear();
    }).length;
    const lastMonthFiles = allFiles.filter(f => {
       if (!f.date) return false;
       const fd = new Date(f.date);
       let lm = now.getMonth() - 1;
       let ly = now.getFullYear();
       if(lm < 0) { lm = 11; ly -= 1; }
       return fd.getMonth() === lm && fd.getFullYear() === ly;
    }).length;

    const trGrowth = lastMonthFiles > 0 
      ? ((thisMonthFiles - lastMonthFiles) / lastMonthFiles * 100).toFixed(1)
      : (thisMonthFiles > 0 ? '100.0' : '0.0');

    return { 
      actData: computedActData, 
      totalDocsData: tData, 
      trendData: trData, 
      totalDocsGrowth: tGrowth, 
      trendGrowth: trGrowth,
      growthTotal: thisMonthFiles
    };
  }, [allFiles, activityRange]);

  const activitySeries = [{ name: 'Documentos', data: actData.data }];
  const activityOptions = {
    chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
    plotOptions: { bar: { borderRadius: 4, columnWidth: activityRange === 'Sem' ? '50%' : '70%' } },
    colors: ['#6366f1'],
    dataLabels: { enabled: false },
    xaxis: { categories: actData.categories, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: 'var(--text-muted)' } } },
    yaxis: { show: false },
    grid: { borderColor: 'rgba(255,255,255,0.05)', strokeDashArray: 4 },
    tooltip: { theme: 'dark' }
  };

  const trendSeries = [{ name: 'Registros', data: trendData }];
  const trendOptions = {
    chart: { type: 'area', toolbar: { show: false }, background: 'transparent', sparkline: { enabled: true }, animations: { enabled: true, easing: 'easeinout', speed: 800 } },
    stroke: { curve: 'smooth', width: 3 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] } },
    colors: ['#8b5cf6'],
    tooltip: { fixed: { enabled: false }, x: { show: false }, y: { title: { formatter: () => '' } }, marker: { show: false } }
  };





  // Removing static topFolders array since it's computed dynamically above
  // Replacing legacy styles with new bento styles
  const now = new Date();
  const todayNum = now.getDate();
  const weekDays = [];
  for(let i=0; i<7; i++) {
    const d = new Date(now);
    d.setDate(todayNum - now.getDay() + 1 + i);
    const isToday = d.getDate() === todayNum;
    weekDays.push({
      num: d.getDate(),
      name: d.toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 3).toUpperCase(),
      active: isToday
    });
  }

  const s = {
    page: { display: 'flex', flex: 1, padding: '16px 24px', overflowY: 'auto', gap: '16px', boxSizing: 'border-box', background: 'var(--bg-card)', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.03)', minHeight: 0 },
    mainCol: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: 'min-content', gap: '12px' },
    sideCol: { width: '340px', display: 'flex', flexDirection: 'column', gap: '12px' },
    card: { background: 'var(--bg-card)', borderRadius: '24px', padding: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' },
    heroCard: { gridColumn: 'span 2', background: 'linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(236,72,153,0.05) 100%)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '28px', padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', justifyContent: 'center' },
    statPill: { background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    chartCard: { gridColumn: 'span 3', background: 'var(--bg-card)', borderRadius: '28px', padding: '20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' },
    listCard: { gridColumn: 'span 3', background: 'var(--bg-card)', borderRadius: '28px', padding: '20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' },
    
    // Calendar/Side elements
    calDay: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '6px 0', borderRadius: '14px', background: 'var(--bg-secondary)' },
    calDayActive: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '6px 0', borderRadius: '14px', background: 'var(--color-primary)', boxShadow: '0 8px 20px rgba(99,102,241,0.3)' },
    taskItem: { background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '16px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: '0.2s', marginBottom: '8px' },
    taskItemDone: { background: 'rgba(16,185,129,0.05)', padding: '12px 16px', borderRadius: '16px', border: '1px dashed #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', opacity: 0.7, marginBottom: '8px' }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
         <Icon icon="solar:pie-chart-bold-duotone" size={48} style={{ color: 'var(--color-primary)', animation: 'pulse 2s infinite' }} />
      </div>
    );
  }

  const isOperationalRole = user && user.role !== 'Administrador' && user.role !== 'admin' && user.role !== 'Admin';
  const pendingDocs = user ? getActivities(user).filter(a => a.isPendingForMe) : [];

  const canAccess = (pageKey) => {
    if (!user) return false;
    if (user.role === 'Administrador') return true;
    if (!user.pageAccess) return true; // legacy support
    return user.pageAccess[pageKey] === true;
  };

  const searchResults = (() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    try {
      const lists = JSON.parse(localStorage.getItem('dashq_notas_pago_v5')) || [];
      const matches = lists.filter(lst => {
        if ((lst.numero || '').toLowerCase().includes(q)) return true;
        if ((lst.siaf || '').toLowerCase().includes(q)) return true;
        if (lst.notasDePago && lst.notasDePago.some(n => (n.numero || '').toLowerCase().includes(q))) return true;
        return false;
      });
      return matches.slice(0, 3);
    } catch { return []; }
  })();



  // Update Activity Chart Options to match "Smooth Curves" and Bento Style
  const newActivityOptions = {
    ...activityOptions,
    chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
    stroke: { width: 0 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 1, opacityTo: 0.6, stops: [0, 100], type: 'vertical' } },
    plotOptions: { bar: { borderRadius: 6, columnWidth: activityRange === 'Sem' ? '30%' : '50%' } },
    xaxis: { ...activityOptions.xaxis, labels: { style: { colors: '#888', fontWeight: 600 } } },
    yaxis: { show: false, min: 0, tickAmount: 3, forceNiceScale: true },
  };

  return (
    <div style={s.page}>
      
      {/* ── MAIN AREA ── */}
      <div style={{ ...s.mainCol, ...(isOperationalRole ? { display: 'flex', flexDirection: 'column' } : {}) }}>
        
        {isOperationalRole ? (
          // --- ROLE DASHBOARD (Rich layout) ---
          <React.Fragment>
            <div style={{...s.heroCard, gridColumn: 'span 3', flexShrink: 0}}>
              <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>Hola, {user.name}</h1>
              <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-muted)' }}>Tienes {pendingDocs.length} documentos pendientes hoy. Revisa tu panel para más detalles.</p>
            </div>

            {/* WIDGETS BASADOS EN ACCESO (Tarjetas más grandes) */}
            {(canAccess('gestor') || canAccess('biblioteca') || canAccess('reportes') || canAccess('chat')) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {canAccess('gestor') && (
                  <div onClick={() => navigate('/gestor')} style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '20px', background: 'rgba(167,139,250,0.1)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon icon="solar:folder-with-files-bold-duotone" size={28} />
                      </div>
                      <Icon icon="solar:arrow-right-up-bold-duotone" size={20} color="var(--border-light)" />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Gestor de Archivos</h3>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Explora las carpetas y archivos digitales almacenados.</p>
                    </div>
                  </div>
                )}
                {canAccess('biblioteca') && (
                  <div onClick={() => navigate('/library')} style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '20px', background: 'rgba(52,211,153,0.1)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon icon="solar:book-bold-duotone" size={28} />
                      </div>
                      <Icon icon="solar:arrow-right-up-bold-duotone" size={20} color="var(--border-light)" />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Biblioteca</h3>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Búsqueda global y rápida de todos tus formatos indexados.</p>
                    </div>
                  </div>
                )}
                {canAccess('reportes') && (
                  <div onClick={() => navigate('/reporte-vista')} style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '20px', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon icon="solar:document-text-bold-duotone" size={28} />
                      </div>
                      <Icon icon="solar:arrow-right-up-bold-duotone" size={20} color="var(--border-light)" />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Reportes</h3>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Genera reportes de notas de pago y desempeño documental.</p>
                    </div>
                  </div>
                )}
                {canAccess('chat') && (
                  <div onClick={() => navigate('/chat')} style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '20px', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon icon="solar:chat-round-dots-bold-duotone" size={28} />
                      </div>
                      <Icon icon="solar:arrow-right-up-bold-duotone" size={20} color="var(--border-light)" />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Mensajes</h3>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Comunícate con tu equipo de trabajo y coordinadores.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* VISTA RESUMEN (Listados + Actividades) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', alignItems: 'stretch', flex: 1 }}>
              {canAccess('checklist') && (
                <div style={{ ...s.listCard, gridColumn: 'auto' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                     <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Rastreador de Archivos (En Vivo)</h3>
                     <Icon icon="solar:routing-2-bold-duotone" size={24} color="var(--color-primary)" />
                   </div>
                   
                   <div style={{ marginBottom: '16px', position: 'relative' }}>
                     <input
                       type="text"
                       placeholder="Buscar por Nota de Pago, SIAF o Listado..."
                       value={searchQuery}
                       onChange={e => setSearchQuery(e.target.value)}
                       style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                     />
                     <Icon icon="solar:minimalistic-magnifer-bold-duotone" size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '14px' }} />
                   </div>

                   <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
                     {!searchResults ? (
                       <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '14px', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', textAlign: 'center' }}>
                         <Icon icon="solar:route-bold-duotone" size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
                         Ingresa un número para rastrear su trayectoria actual en las oficinas.
                       </div>
                     ) : searchResults.length === 0 ? (
                       <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '14px', background: 'rgba(255,255,255,0.01)', borderRadius: '16px' }}>No se encontraron coincidencias.</div>
                     ) : (
                       searchResults.map((lst, idx) => (
                         <div key={idx} style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                             <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{lst.numero}</div>
                             <div style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', textTransform: 'uppercase', height: 'fit-content' }}>
                               Etapa: {STAGES[lst.stageIndex]?.label || 'Completado'}
                             </div>
                           </div>
                           <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                             {lst.notasDePago?.length || 0} notas vinculadas • SIAF: {lst.siaf || 'N/A'}
                           </div>
                           
                           {lst.historial && lst.historial.length > 0 && (
                             <div style={{ marginTop: '24px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                               {/* Línea vertical central */}
                               <div style={{ position: 'absolute', left: '23px', top: '32px', bottom: '10px', width: '2px', background: 'var(--border-light)', zIndex: 0 }}></div>
                               
                               {/* Cabecera / Icono principal (como en la imagen) */}
                               <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', position: 'relative', zIndex: 1 }}>
                                 <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(187,247,208,0.3)' }}>
                                   <Icon icon="solar:routing-2-bold-duotone" size={24} color="#166534" />
                                 </div>
                                 <div style={{ paddingTop: '2px' }}>
                                   <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>Trayectoria del<br/>Documento</div>
                                 </div>
                               </div>

                               {/* Nodos de la trayectoria */}
                               {lst.historial.slice(-4).map((h, hIdx, arr) => {
                                 const isLast = hIdx === arr.length - 1;
                                 return (
                                   <div key={hIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '33px', position: 'relative', zIndex: 1 }}>
                                     {/* Nodo (círculo) */}
                                     <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: isLast ? 'var(--text-primary)' : 'var(--bg-card)', border: isLast ? '2px solid var(--text-primary)' : '2px solid var(--border-color)', marginLeft: '17px', marginTop: '4px', flexShrink: 0, zIndex: 1 }}></div>
                                     {/* Contenido */}
                                     <div style={{ marginTop: '-2px' }}>
                                       <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{h.accion || h.etapa || 'Movimiento'}</div>
                                       <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                         {new Date(h.fecha).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}<br/>
                                         Responsable: {h.usuario}
                                       </div>
                                     </div>
                                   </div>
                                 );
                               })}
                             </div>
                           )}
                         </div>
                       ))
                     )}
                   </div>
                </div>
              )}
              
              {canAccess('actividades') && (
                <div style={{ ...s.listCard, gridColumn: 'auto' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Centro de Actividades</h3>
                       {pendingDocs.length > 0 && <span style={{ background: '#f43f5e', color: 'white', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '10px' }}>{pendingDocs.length}</span>}
                     </div>
                     <button onClick={() => navigate('/actividades')} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Ir a Módulo</button>
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                     {pendingDocs.length === 0 ? (
                       <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', background: 'rgba(255,255,255,0.01)', borderRadius: '16px' }}>
                         <Icon icon="solar:check-circle-bold-duotone" size={48} style={{ color: '#10b981', opacity: 0.2, marginBottom: '12px' }} />
                         <div>No tienes tareas pendientes. ¡Todo al día!</div>
                       </div>
                     ) : (
                       pendingDocs.slice(0, 4).map((doc, idx) => (
                         <div key={idx} onClick={() => navigate('/actividades')} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: 'rgba(244,63,94,0.05)', borderRadius: '16px', cursor: 'pointer', border: '1px solid rgba(244,63,94,0.1)', transition: '0.2s' }}>
                           <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <Icon icon={'solar:danger-triangle-bold-duotone'} size={22} />
                           </div>
                           <div>
                             <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{doc.message}</div>
                             <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{doc.docRef || doc.docId || ''}</div>
                           </div>
                         </div>
                       ))
                     )}
                   </div>
                </div>
              )}
            </div>
          </React.Fragment>
        ) : (
          // --- ADMIN DASHBOARD (BENTO GRID) ---
          <React.Fragment>
            
            {/* ROW 1: Hero (Span 2) + Metrics Column (Span 1) */}
            <div style={s.heroCard}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Bienvenido al<br />Workspace
                </h1>
                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '80%' }}>
                  Monitorea el flujo documental, aprueba solicitudes y mantén el control de todos tus registros.
                </p>
                <button onClick={() => navigate('/gestor')} style={{ background: 'var(--color-primary)', color: '#111', border: 'none', padding: '14px 28px', borderRadius: '24px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: '0 8px 24px rgba(99,102,241,0.3)', transition: 'transform 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon icon="solar:folder-open-bold-duotone" size={20} color="#111" />
                  Ir al Gestor
                </button>
              </div>
              <Icon icon="solar:layers-bold-duotone" size={160} style={{ position: 'absolute', right: '-20px', bottom: '-20px', color: 'var(--color-primary)', opacity: 0.1, zIndex: 0 }} />
            </div>

            <div style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Pill 1 */}
              <div style={s.statPill}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Archivos Totales</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalFilesCount.toLocaleString()}</div>
                </div>
                <div style={{ width: '40px', height: '40px', borderRadius: '16px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon icon="solar:documents-bold-duotone" size={20} />
                </div>
              </div>
              {/* Pill 2 */}
              <div style={s.statPill}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Crecimiento (Mes)</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>+{growthTotal}</div>
                </div>
                <div style={{ width: '40px', height: '40px', borderRadius: '16px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon icon="solar:graph-up-bold-duotone" size={20} />
                </div>
              </div>
              {/* Pill 3 */}
              <div style={s.statPill}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Formato Principal</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>PDF <span style={{fontSize:'12px', color:'var(--text-muted)'}}>({trafficData[0].value})</span></div>
                </div>
                <div style={{ width: '40px', height: '40px', borderRadius: '16px', background: 'rgba(236,72,153,0.1)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon icon="solar:document-bold-duotone" size={20} />
                </div>
              </div>
            </div>

            {/* ROW 2: Activity Chart (Organic Curve) */}
            <div style={s.chartCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Flujo de Carga Documental</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Métricas de subida de archivos en el periodo seleccionado.</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '4px', display: 'flex', gap: '4px', border: '1px solid var(--border-light)' }}>
                  <span onClick={() => setActivityRange('Sem')} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '14px', cursor: 'pointer', background: activityRange === 'Sem' ? 'var(--color-primary)' : 'transparent', color: activityRange === 'Sem' ? 'white' : 'var(--text-muted)', fontWeight: 600, transition: '0.2s' }}>
                    Semanal
                  </span>
                  <span onClick={() => setActivityRange('Mes')} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '14px', cursor: 'pointer', background: activityRange === 'Mes' ? 'var(--color-primary)' : 'transparent', color: activityRange === 'Mes' ? 'white' : 'var(--text-muted)', fontWeight: 600, transition: '0.2s' }}>
                    Mensual
                  </span>
                </div>
              </div>
              <div style={{ height: '140px', width: '100%', marginLeft: '-10px' }}>
                <Chart options={newActivityOptions} series={activitySeries} type="bar" height="100%" />
              </div>
            </div>

            {/* ROW 3: Dos Columnas (Carpetas y Formatos) */}
            <div style={{ gridColumn: 'span 3', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              
              {/* Columna Izquierda: Carpetas */}
              <div style={{ ...s.listCard, gridColumn: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Últimos Movimientos</h3>
                  <button onClick={() => navigate('/gestor')} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Ver todo</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {topFolders.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay datos suficientes.</div>
                  ) : (
                    topFolders.slice(0, 3).map((f, i) => (
                      <div key={i} onClick={() => { setCurrentFolderId(f.name); navigate('/gestor'); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', cursor: 'pointer', border: '1px solid transparent', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.border = '1px solid var(--border-light)'} onMouseLeave={e => e.currentTarget.style.border = '1px solid transparent'}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon icon="solar:folder-bold-duotone" size={20} color="#a78bfa" />
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{f.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Directorio</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{f.value}</div>
                          <div style={{ fontSize: '11px', color: '#10b981' }}>Almacenado</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Columna Derecha: Formatos */}
              <div style={{ ...s.listCard, gridColumn: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Formatos Indexados</h3>
                  <button onClick={() => navigate('/biblioteca')} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Biblioteca</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {trafficData.every(t => t.value === 0) ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Aún no has subido archivos.</div>
                  ) : (
                    trafficData.map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${t.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon icon={t.icon} size={20} color={t.color} />
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{t.label}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sistema Global</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{t.value}</div>
                          <div style={{ fontSize: '11px', color: t.color }}>Archivos</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </React.Fragment>
        )}
      </div>

      {/* ── SIDEBAR (AGENDA & TASKS) ── */}
      <div style={s.sideCol}>
        
        <div style={{ background: 'var(--bg-card)', borderRadius: '32px', padding: '24px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Agenda</h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{now.toLocaleDateString('es-ES', { weekday: 'long', month: 'long', year: 'numeric' })}</p>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {weekDays.map(d => (
              <div key={d.name} style={d.active ? s.calDayActive : s.calDay}>
                <div style={{ fontSize: '10px', color: d.active ? 'rgba(0,0,0,0.7)' : 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{d.name}</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: d.active ? '#111' : 'var(--text-primary)' }}>{d.num}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '12px 16px', borderRadius: '16px', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon icon="solar:confetti-bold-duotone" size={18} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px', opacity: 0.8 }}>Próximo Feriado</div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>{nextHoliday.name} ({nextHoliday.dateStr})</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Tus Pendientes</h4>
            <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600 }}>{completedTasks}/{totalTasks}</span>
          </div>

          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <input 
              type="text" 
              placeholder="Añadir pendiente..." 
              value={newTaskText}
              onChange={e => setNewTaskText(e.target.value)}
              onKeyDown={addTask}
              style={{ width: '100%', padding: '10px 16px', paddingRight: '44px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }} 
            />
            <button 
              onClick={handleTaskSubmit}
              disabled={!newTaskText.trim()}
              style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: newTaskText.trim() ? 'var(--color-primary)' : 'transparent', border: 'none', borderRadius: '10px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: newTaskText.trim() ? '#111' : 'var(--text-muted)', cursor: newTaskText.trim() ? 'pointer' : 'default', transition: '0.2s' }}
            >
              <Icon icon="solar:add-square-bold-duotone" size={16} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingRight: '4px' }}>
            {calendarEvents
              .filter(e => {
                 if(!e.date) return false;
                 const ed = new Date(e.date);
                 return ed.getDate() === now.getDate() && ed.getMonth() === now.getMonth() && ed.getFullYear() === now.getFullYear();
              })
              .map(e => (
                <div key={e.id || e.title} style={{ ...s.taskItem, borderLeft: `4px solid ${e.color || '#6366f1'}` }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{e.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{e.startHour}:00</div>
                </div>
            ))}
            
            {tasks.map(t => (
              <div key={t.id} style={t.completed ? s.taskItemDone : s.taskItem} onClick={() => toggleTask(t.id)}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: t.completed ? '#10b981' : 'var(--text-primary)', textDecoration: t.completed ? 'line-through' : 'none' }}>{t.text}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{t.time}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default DashboardPage;

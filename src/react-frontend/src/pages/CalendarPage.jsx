import React, { useState } from 'react';
import Icon from '../components/ui/Icon';
import CustomSelect from '../components/CustomSelect';

// Helpers de fechas
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getStartOfMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const formatDateDayMonth = (date) => {
  return date.toLocaleDateString('es-PE', { weekday: 'short', month: 'numeric', day: 'numeric' });
};

const formatHeaderDate = (date, tab) => {
  if (tab === 'Día') {
    return date.toLocaleDateString('es-PE', { month: 'short', day: 'numeric', year: 'numeric' });
  } else if (tab === 'Semana') {
    const start = getStartOfWeek(date);
    const end = addDays(start, 6);
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString('es-PE', { month: 'short' })} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${start.toLocaleDateString('es-PE', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('es-PE', { month: 'short', day: 'numeric' })}, ${start.getFullYear()}`;
  } else {
    return date.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  }
};

const getDaysInMonthView = (date) => {
  const start = getStartOfMonth(date);
  const firstDay = getStartOfWeek(start);
  const days = [];
  let current = firstDay;
  for (let i = 0; i < 42; i++) {
    days.push(current);
    current = addDays(current, 1);
  }
  return days;
};

const calendars = [
  { id: 'tes', name: 'Tesorería', color: '#60a5fa' },
  { id: 'con', name: 'Contabilidad', color: '#a78bfa' },
  { id: 'adm', name: 'Administración', color: '#fb7185' },
  { id: 'arc', name: 'Archivo de Caja', color: '#34d399' }
];

const getPeruvianHolidays = (year) => {
  return [
    { title: 'Año Nuevo', d: new Date(year, 0, 1) },
    { title: 'Día del Trabajador', d: new Date(year, 4, 1) },
    { title: 'Batalla de Arica y Día de la Bandera', d: new Date(year, 5, 7) },
    { title: 'San Pedro y San Pablo', d: new Date(year, 5, 29) },
    { title: 'Día de la Fuerza Aérea', d: new Date(year, 6, 23) },
    { title: 'Fiestas Patrias', d: new Date(year, 6, 28) },
    { title: 'Fiestas Patrias', d: new Date(year, 6, 29) },
    { title: 'Batalla de Junín', d: new Date(year, 7, 6) },
    { title: 'Santa Rosa de Lima', d: new Date(year, 7, 30) },
    { title: 'Combate de Angamos', d: new Date(year, 9, 8) },
    { title: 'Día de Todos los Santos', d: new Date(year, 10, 1) },
    { title: 'Inmaculada Concepción', d: new Date(year, 11, 8) },
    { title: 'Batalla de Ayacucho', d: new Date(year, 11, 9) },
    { title: 'Navidad', d: new Date(year, 11, 25) }
  ].map((h, i) => ({
    id: `hol-${year}-${i}`,
    title: h.title,
    start: new Date(year, h.d.getMonth(), h.d.getDate(), 8, 0, 0),
    end: new Date(year, h.d.getMonth(), h.d.getDate(), 18, 0, 0),
    bgColor: '#ef4444', // Solid Red
    textColor: '#ffffff',
    horizontal: true
  }));
};

const loadEvents = () => {
  try {
    return JSON.parse(localStorage.getItem('dashq_calendar_v1')) || [];
  } catch {
    return [];
  }
};
const saveEvents = (events) => {
  localStorage.setItem('dashq_calendar_v1', JSON.stringify(events));
};

const hours = ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm'];

const s = {
  page: { display: 'flex', flex: 1, padding: 0, gap: '16px', overflow: 'hidden', height: '100%', fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', background: 'transparent' },
  left: { width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100%', background: '#161616', borderRadius: '32px', border: 'none', padding: '24px', overflowY: 'auto' },
  right: { flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#161616', borderRadius: '32px' }
};

function CalendarPage() {
  const [activeTab, setActiveTab] = useState('Semana');
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [userEvents, setUserEvents] = useState(() => loadEvents());
  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', startHour: '10', endHour: '12', color: '#60a5fa' });
  
  // Convert loaded string dates back to Date objects
  const parsedUserEvents = userEvents.map(e => ({
    ...e,
    start: new Date(e.start),
    end: new Date(e.end)
  }));
  
  const allEvents = [...getPeruvianHolidays(currentDate.getFullYear()), ...parsedUserEvents];

  const handlePrev = () => {
    if (activeTab === 'Día') setCurrentDate(addDays(currentDate, -1));
    else if (activeTab === 'Semana') setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(addMonths(currentDate, -1));
  };

  const handleNext = () => {
    if (activeTab === 'Día') setCurrentDate(addDays(currentDate, 1));
    else if (activeTab === 'Semana') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date) return;
    const [y, m, d] = newEvent.date.split('-');
    const start = new Date(y, m - 1, d, parseInt(newEvent.startHour), 0, 0);
    const end = new Date(y, m - 1, d, parseInt(newEvent.endHour), 0, 0);
    
    const createdEvent = {
      id: `evt-${Date.now()}`,
      title: newEvent.title,
      start: start.toISOString(),
      end: end.toISOString(),
      bgColor: newEvent.color,
      textColor: '#ffffff', // solid
      horizontal: false
    };
    
    const updated = [...userEvents, createdEvent];
    setUserEvents(updated);
    saveEvents(updated);
    setShowModal(false);
    setNewEvent({ title: '', date: '', startHour: '10', endHour: '12', color: '#60a5fa' });
  };

  let daysToShow = [];
  if (activeTab === 'Día') {
    daysToShow = [currentDate];
  } else if (activeTab === 'Semana') {
    const start = getStartOfWeek(currentDate);
    for (let i = 0; i < 7; i++) daysToShow.push(addDays(start, i));
  } else {
    daysToShow = getDaysInMonthView(currentDate); 
  }

  // Helper para posicionar un evento en Daily/Weekly
  const renderEvent = (event, colIndex, totalCols) => {
    // Check if event is on the exact same date as the column
    const colDate = daysToShow[colIndex];
    if (event.start.getDate() !== colDate.getDate() || event.start.getMonth() !== colDate.getMonth() || event.start.getFullYear() !== colDate.getFullYear()) {
      return null;
    }

    // Grid starts at 8am (hour index 0)
    // 60px per hour
    let top, height;
    if (event.horizontal) {
      top = 4; // Inside the 40px all-day row
      height = 32;
    } else {
      const startHourOffset = event.start.getHours() + (event.start.getMinutes() / 60) - 8;
      const durationHours = (event.end - event.start) / (1000 * 60 * 60);
      if (startHourOffset < 0) return null; // Only show if it's after 8am
      top = 41 + (startHourOffset * 61); // 40px all-day header + borders
      height = (durationHours * 61) - 2; // -2 for spacing
    }

    const formatTime = (d) => d.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit', hour12: false });

    return (
      <div key={event.id} style={{ 
        position: 'absolute', 
        top: `${top}px`, 
        left: `calc(80px + ((100% - 80px) / ${totalCols} * ${colIndex}) + 6px)`, 
        width: `calc(((100% - 80px) / ${totalCols}) - 16px)`, 
        height: `${height}px`, 
        padding: '2px',
        zIndex: 10
      }}>
        <div style={{ 
          background: event.bgColor, 
          color: event.textColor, 
          borderRadius: '4px', 
          height: '100%', 
          padding: '4px 8px', 
          fontSize: event.horizontal ? '11px' : '12px', 
          display: 'flex', 
          flexDirection: event.horizontal ? 'row' : 'column',
          alignItems: event.horizontal ? 'center' : 'flex-start',
          gap: event.horizontal ? '4px' : '0',
          overflow: 'hidden',
          whiteSpace: event.horizontal ? 'nowrap' : 'normal'
        }}>
          {!event.horizontal && <span style={{ fontWeight: 600 }}>{formatTime(event.start)} - {formatTime(event.end)}</span>}
          <span>{event.title}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={s.page}>
      
      {/* Left Sidebar */}
      <div style={s.left}>
        
        {/* Add Event Button */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button onClick={() => setShowModal(true)} style={{ flex: 1, padding: '12px', background: 'var(--color-primary)', color: '#111111', border: 'none', borderRadius: '30px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(96,165,250,0.2)' }}>
            <Icon icon="solar:calendar-add-bold-duotone" size={18} /> Nuevo Evento
          </button>
        </div>

        {/* Mini Calendar Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <Icon icon="solar:alt-arrow-left-bold-duotone" size={16} style={{ cursor: 'pointer' }} onClick={() => setCurrentDate(addMonths(currentDate, -1))} />
          <span style={{ fontWeight: 600, fontSize: '15px', textTransform: 'capitalize' }}>{currentDate.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}</span>
          <Icon icon="solar:alt-arrow-right-bold-duotone" size={16} style={{ cursor: 'pointer' }} onClick={() => setCurrentDate(addMonths(currentDate, 1))} />
        </div>

        {/* Mini Calendar Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '12px', marginBottom: '8px' }}>
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => <span key={d} style={{ color: 'var(--text-muted)' }}>{d}</span>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '32px' }}>
          {getDaysInMonthView(currentDate).map((day, i) => {
            const isOtherMonth = day.getMonth() !== currentDate.getMonth();
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = day.toDateString() === currentDate.toDateString();
            
            return (
              <div key={i} style={{ 
                padding: '6px 0', 
                fontSize: '13px', 
                color: isOtherMonth ? 'var(--text-muted)' : (isSelected ? '#111111' : 'var(--text-primary)'),
                background: isSelected ? 'var(--color-primary)' : 'transparent',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: isSelected ? 600 : 400
              }} onClick={() => setCurrentDate(day)}>
                {day.getDate()}
              </div>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <Icon icon="solar:minimalistic-magnifer-bold-duotone" size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Buscar..." style={{ width: '100%', padding: '10px 10px 10px 36px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px', color: '#fff', outline: 'none', fontSize: '14px' }} />
        </div>

        {/* Categories Removed as they were non-functional placeholders */}

      </div>

      {/* Main Calendar Area */}
      <div style={s.right}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border-light)' }}>
          
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '30px', overflow: 'hidden' }}>
            {['Día', 'Semana', 'Mes'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ 
                padding: '8px 20px', 
                border: 'none', 
                background: activeTab === tab ? 'var(--color-primary)' : 'transparent', 
                color: activeTab === tab ? '#fff' : 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: 'pointer',
                borderRadius: activeTab === tab ? '30px' : '0'
              }}>
                {tab}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {formatHeaderDate(currentDate, activeTab)}
          </div>

          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '30px', overflow: 'hidden' }}>
            <button onClick={handlePrev} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRight: '1px solid var(--border-light)' }}>
              <Icon icon="solar:alt-arrow-left-bold-duotone" size={16} />
            </button>
            <button onClick={handleNext} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Icon icon="solar:alt-arrow-right-bold-duotone" size={16} />
            </button>
          </div>
        </div>

        {/* Content based on tab */}
        {activeTab === 'Mes' ? (
          
          /* MONTHLY VIEW */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Days Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'transparent', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                <div key={d} style={{ textAlign: 'center', padding: '12px 0', borderRight: '1px solid rgba(255,255,255,0.1)' }}>{d}</div>
              ))}
            </div>
            
            {/* Grid */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, 1fr)' }}>
              {daysToShow.map((day, i) => {
                const dayEvents = allEvents.filter(e => e.start.getDate() === day.getDate() && e.start.getMonth() === day.getMonth() && e.start.getFullYear() === day.getFullYear());
                return (
                  <div key={i} style={{ borderRight: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: day.getMonth() === currentDate.getMonth() ? 'var(--text-primary)' : 'var(--text-muted)', marginBottom: '8px' }}>
                      {day.getDate()}
                    </div>
                    {/* Render tiny events for monthly */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {dayEvents.map(e => (
                        <div key={e.id} style={{ background: e.bgColor, color: e.textColor, fontSize: '10px', padding: '2px 4px', borderRadius: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {e.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        ) : (

          /* DAILY / WEEKLY VIEW */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Days Header */}
            <div style={{ display: 'flex', background: 'transparent', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ width: '80px', borderRight: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}></div>
              {daysToShow.map((day, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', padding: '12px 0', borderRight: i < daysToShow.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                  {formatDateDayMonth(day)}
                </div>
              ))}
            </div>

            {/* Grid Body */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              
              {/* All day row */}
              <div style={{ display: 'flex', minHeight: '40px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ width: '80px', padding: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', borderRight: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                  Todo el día
                </div>
                <div style={{ flex: 1, display: 'flex' }}>
                  {daysToShow.map((_, col) => (
                    <div key={col} style={{ flex: 1, borderRight: col < daysToShow.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}></div>
                  ))}
                </div>
              </div>

              {/* Hours rows */}
              {hours.map((hour, i) => (
                <div key={i} style={{ display: 'flex', minHeight: '60px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ width: '80px', padding: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', borderRight: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                    {hour}
                  </div>
                  <div style={{ flex: 1, display: 'flex' }}>
                    {daysToShow.map((_, col) => (
                      <div key={col} style={{ flex: 1, borderRight: col < daysToShow.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}></div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Absolute positioned dynamic events */}
              {allEvents.map(event => {
                // Determine which column this event falls into (if any)
                return daysToShow.map((day, colIndex) => {
                  return renderEvent(event, colIndex, daysToShow.length);
                });
              })}

            </div>
          </div>
        )}
      </div>

      {/* Modal para Crear Evento */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#1c1c1c', borderRadius: '30px', padding: '32px', width: '100%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700, color: '#fff' }}>Nuevo Evento</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Agrega un nuevo evento a tu calendario personal.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>TÍTULO DEL EVENTO *</label>
                <input type="text" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px', color: '#fff', fontSize: '14px', outline: 'none' }} placeholder="Ej: Comité Mensual" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>FECHA *</label>
                <input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px', color: '#fff', fontSize: '14px', outline: 'none', colorScheme: 'dark' }} />
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>HORA INICIO</label>
                  <CustomSelect 
                    value={newEvent.startHour} 
                    onChange={val => setNewEvent({...newEvent, startHour: val})} 
                    options={[8,9,10,11,12,13,14,15,16,17].map(h => ({ value: String(h), label: `${h}:00` }))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>HORA FIN</label>
                  <CustomSelect 
                    value={newEvent.endHour} 
                    onChange={val => setNewEvent({...newEvent, endHour: val})} 
                    options={[9,10,11,12,13,14,15,16,17,18].map(h => ({ value: String(h), label: `${h}:00` }))}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>COLOR</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {['#60a5fa', '#a78bfa', '#fb7185', '#34d399'].map(c => (
                    <div key={c} onClick={() => setNewEvent({...newEvent, color: c})} style={{ width: '32px', height: '32px', borderRadius: '50%', background: c, cursor: 'pointer', border: newEvent.color === c ? '3px solid #fff' : '2px solid transparent', transition: 'all 0.2s' }} />
                  ))}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleAddEvent} style={{ flex: 1, padding: '12px', background: 'var(--color-primary)', border: 'none', borderRadius: '30px', color: '#111', fontWeight: 600, cursor: 'pointer' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default CalendarPage;

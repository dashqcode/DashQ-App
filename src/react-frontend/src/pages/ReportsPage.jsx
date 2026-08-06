import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import CustomSelect from '../components/CustomSelect';

const STAGES = [
  { id: 'tesoreria',    label: 'Tesorería' },
  { id: 'contabilidad', label: 'Contabilidad' },
  { id: 'administracion',label: 'Administración' },
  { id: 'archivo_caja', label: 'Archivo de Caja' },
];

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatFullDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) + ' a las ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
};

export default function ReportsPage() {
    const { state } = useLocation();

  const [reportType, setReportType] = useState('archivos'); // 'archivos' | 'listas'
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Filters
  const [filterYear, setFilterYear] = useState(state?.year || 'todos');
  const [filterMonth, setFilterMonth] = useState(state?.month || 'todos');
  const [filterType, setFilterType] = useState(state?.type || 'todos');

  // Modal
  const [previewList, setPreviewList] = useState(null);

  // Auto-generate if navigated with state
  useEffect(() => {
    if (state?.year || state?.month || state?.type) {
      handleGenerate();
    }
  }, []); // eslint-disable-line

  // Reset type filter on switch
  useEffect(() => {
    setFilterType('todos');
    setHasGenerated(false);
    setReportData([]);
  }, [reportType]);

  const handleGenerate = async () => {
    setLoading(true);
    setHasGenerated(true);
    setReportData([]);

    if (reportType === 'archivos') {
      try {
        const res = await fetch('/api/files');
        if (res.ok) {
          const data = await res.json();
          // The API returns a 'files' array where each has upload_date instead of date
          // but let's normalize it to have .date to make filtering easier
          const normalized = (data.files || []).map(f => ({
            ...f,
            name: f.original_name || f.name,
            date: f.upload_date || f.date,
            size: f.size
          }));
          setReportData(normalized);
        } else {
          setReportData([]);
        }
      } catch (_err) {
        setReportData([]);
      }
    } else {
      try {
        const listados = JSON.parse(localStorage.getItem('dashq_notas_pago_v5')) || [];
        setReportData(listados);
      } catch (_err) {
        setReportData([]);
      }
    }
    setLoading(false);
  };

  const filteredData = useMemo(() => {
    return reportData.filter(item => {
      let itemDate = new Date();
      
      if (reportType === 'archivos') {
        itemDate = new Date(item.date || Date.now());
        if (filterType !== 'todos') {
          const name = (item.name || '').toLowerCase();
          if (filterType === 'pdf' && !name.endsWith('.pdf')) return false;
          if (filterType === 'word' && !name.endsWith('.docx') && !name.endsWith('.doc')) return false;
          if (filterType === 'excel' && !name.endsWith('.xlsx') && !name.endsWith('.xls')) return false;
        }
      } else {
        itemDate = new Date(item.fechaCreacion || Date.now());
        if (filterType !== 'todos') {
          if (filterType === 'archivado' && item.estado !== 'archivado') return false;
          if (filterType === 'pendiente' && item.estado === 'archivado') return false;
          if (filterType === 'devuelto' && !item.devuelto) return false;
        }
      }

      if (filterYear !== 'todos' && itemDate.getFullYear().toString() !== filterYear) return false;
      if (filterMonth !== 'todos' && (itemDate.getMonth() + 1).toString() !== filterMonth) return false;

      return true;
    });
  }, [reportData, filterYear, filterMonth, filterType, reportType]);

  const handlePrint = () => window.print();

  const handleDownloadCSV = () => {
    let header = [];
    let rows = [];

    if (reportType === 'archivos') {
      header = ['Nombre', 'Ubicación', 'Fecha', 'Peso'];
      rows = filteredData.map(f => [
        f.name,
        f.original_path || 'Raíz',
        formatDate(f.date),
        formatSize(f.size)
      ]);
    } else {
      header = ['N° Listado', 'Año Fiscal', 'Estado/Etapa', 'Notas de Pago', 'Creado Por', 'Fecha'];
      rows = filteredData.map(d => [
        d.numero,
        d.anoFiscal,
        d.estado === 'archivado' ? 'Archivado' : (d.devuelto ? 'Devuelto' : `En ${STAGES[d.stageIndex]?.label || 'Revisión'}`),
        d.notasDePago?.length || 0,
        d.creadoPor,
        formatDate(d.fechaCreacion)
      ]);
    }
    
    const csvContent = [header, ...rows]
      .map(e => e.map(item => `"${item}"`).join(","))
      .join("\n");
      
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_DASHQ_${reportType}_${filterYear}_${filterMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDocStatusStyle = (doc) => {
    if (doc.estado === 'archivado') return { bg: '#10b98122', col: '#10b981', txt: 'Archivado' };
    if (doc.devuelto) return { bg: '#f59e0b22', col: '#f59e0b', txt: 'Devuelto' };
    return { bg: '#60a5fa22', col: '#60a5fa', txt: `En ${STAGES[doc.stageIndex]?.label || 'Progreso'}` };
  };

  return (
      <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.03)', height: '100%', flex: 1, overflow: 'hidden', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ── HEADER & CONFIG (NO PRINT) ── */}
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>Generador de Reportes</h1>
        </div>

        {/* TABS CON ANIMACIÓN */}
        <div style={{ position: 'relative', display: 'flex', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '30px', width: '500px' }}>
          <div style={{ 
            position: 'absolute', top: '6px', bottom: '6px', width: '244px', 
            background: 'var(--color-primary)', borderRadius: '30px', 
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: reportType === 'archivos' ? 'translateX(0)' : 'translateX(244px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }} />
          <button 
            onClick={() => setReportType('archivos')}
            style={{ flex: 1, padding: '10px', borderRadius: '30px', border: 'none', background: 'transparent', color: reportType === 'archivos' ? '#111' : 'var(--text-secondary)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', zIndex: 1, transition: 'color 0.3s' }}
          >
            <Icon icon="solar:documents-bold-duotone" size={18} /> Archivos Físicos/Digitales
          </button>
          <button 
            onClick={() => setReportType('listas')}
            style={{ flex: 1, padding: '10px', borderRadius: '30px', border: 'none', background: 'transparent', color: reportType === 'listas' ? '#111' : 'var(--text-secondary)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', zIndex: 1, transition: 'color 0.3s' }}
          >
            <Icon icon="solar:clipboard-list-bold-duotone" size={18} /> Control Documental
          </button>
        </div>

        {/* FILTERS & ACTION */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-end', background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <div style={{ flex: '0 0 auto', minWidth: '150px' }}>
            <CustomSelect
              label="Año"
              value={filterYear}
              onChange={setFilterYear}
              options={[
                { value: 'todos', label: 'Todos los años' },
                { value: '2026', label: '2026' },
                { value: '2025', label: '2025' }
              ]}
            />
          </div>
          <div style={{ flex: '0 0 auto', minWidth: '150px' }}>
            <CustomSelect
              label="Mes"
              value={filterMonth}
              onChange={setFilterMonth}
              options={[
                { value: 'todos', label: 'Todos los meses' },
                { value: '1', label: 'Enero' },
                { value: '2', label: 'Febrero' },
                { value: '3', label: 'Marzo' },
                { value: '4', label: 'Abril' },
                { value: '5', label: 'Mayo' },
                { value: '6', label: 'Junio' },
                { value: '7', label: 'Julio' },
                { value: '8', label: 'Agosto' },
                { value: '9', label: 'Septiembre' },
                { value: '10', label: 'Octubre' },
                { value: '11', label: 'Noviembre' },
                { value: '12', label: 'Diciembre' }
              ]}
            />
          </div>
          <div style={{ flex: '0 0 auto', minWidth: '160px' }}>
            <CustomSelect
              label={reportType === 'archivos' ? 'Tipo de Archivo' : 'Estado del Documento'}
              value={filterType}
              onChange={setFilterType}
              options={reportType === 'archivos' ? [
                { value: 'todos', label: 'Todos' },
                { value: 'pdf', label: 'Documentos PDF' },
                { value: 'word', label: 'Documentos Word' },
                { value: 'excel', label: 'Hojas de Cálculo' }
              ] : [
                { value: 'todos', label: 'Todos' },
                { value: 'pendiente', label: 'Pendientes' },
                { value: 'archivado', label: 'Archivados' },
                { value: 'devuelto', label: 'Devueltos' }
              ]}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button 
              onClick={handleGenerate}
              disabled={loading}
              style={{ background: 'var(--color-primary)', border: 'none', color: '#111', padding: '14px 28px', borderRadius: '16px', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
              onMouseEnter={e => { if(!loading) e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { if(!loading) e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <Icon icon={loading ? "solar:refresh-bold-duotone" : "solar:magic-stick-3-bold-duotone"} size={22} style={{ animation: loading ? 'pulse 1s infinite' : 'none' }} /> 
              {loading ? 'Generando Reporte...' : 'Generar Reporte'}
            </button>
          </div>
        </div>
      </div>

      {/* ── REPORT PREVIEW (PRINTABLE) ── */}
      {!hasGenerated ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '20px', background: 'rgba(255,255,255,0.01)', borderRadius: '30px', border: '1px dashed rgba(255,255,255,0.06)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
            <Icon icon="solar:document-add-bold-duotone" size={40} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Listo para crear tu reporte</h3>
            <span style={{ fontSize: '14px' }}>Configura tus filtros en el panel superior y presiona "Generar Reporte"</span>
          </div>
        </div>
      ) : (
        <>
          <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button onClick={handlePrint} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: '30px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Icon icon="solar:printer-bold-duotone" size={18} /> Imprimir / PDF
            </button>
            <button onClick={handleDownloadCSV} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: '30px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Icon icon="solar:export-bold-duotone" size={18} /> Descargar CSV
            </button>
          </div>

          <div className="print-container" style={{ background: 'white', padding: '40px', borderRadius: '8px', color: 'black', minHeight: '600px' }}>
            <div style={{ borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', textTransform: 'uppercase', color: '#1a1a1a' }}>
                  {reportType === 'archivos' ? 'Reporte de Archivos Físicos y Digitales' : 'Reporte de Control Documental'}
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '11px' }}>Sistema de Gestión Documental DASHQ</p>
              </div>
              <div style={{ textAlign: 'right', color: '#666', fontSize: '11px' }}>
                <div><strong>Filtros aplicados:</strong></div>
                <div>Tipo: {filterType} | Año: {filterYear} | Mes: {filterMonth}</div>
                <div>Total encontrados: {filteredData.length}</div>
              </div>
            </div>

            {filteredData.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#999' }}>
                <Icon icon="solar:folder-error-bold-duotone" size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <div style={{ fontSize: '14px', fontWeight: 600 }}>No hay datos</div>
                <div style={{ fontSize: '12px' }}>No se encontraron registros con los filtros seleccionados.</div>
              </div>
            ) : reportType === 'archivos' ? (
              (() => {
                const grouped = {};
                filteredData.forEach(f => {
                  const d = new Date(f.date || Date.now());
                  const key = d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }).toUpperCase();
                  if (!grouped[key]) grouped[key] = [];
                  grouped[key].push(f);
                });
                return Object.keys(grouped).map(monthYear => (
                  <div key={monthYear} style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, borderBottom: '1px solid #ddd', paddingBottom: '4px', marginBottom: '8px', color: '#333' }}>{monthYear}</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Nombre del Archivo</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Ubicación</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Fecha Exacta</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Peso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grouped[monthYear].map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '8px', fontWeight: 600 }}>{row.name}</td>
                            <td style={{ padding: '8px', color: '#666' }}>{row.original_path || row.folder || 'Raíz'}</td>
                            <td style={{ padding: '8px' }}>{formatDate(row.date)}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{formatSize(row.size)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ));
              })()
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>N° Listado</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Estado / Etapa</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Notas de Pago</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Creado por</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Fecha</th>
                    <th className="no-print" style={{ padding: '8px', textAlign: 'center', width: '80px' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{row.numero} <span style={{ color: '#999', fontWeight: 400 }}>({row.anoFiscal})</span></td>
                      <td style={{ padding: '8px' }}>
                        {(() => {
                          const s = getDocStatusStyle(row);
                          return (
                            <span style={{ padding: '4px 8px', background: s.bg, color: s.col, borderRadius: '4px', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>
                              {s.txt}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600 }}>{row.notasDePago?.length || 0}</td>
                      <td style={{ padding: '8px', color: '#666' }}>{row.creadoPor}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{formatDate(row.fechaCreacion)}</td>
                      <td className="no-print" style={{ padding: '8px', textAlign: 'center' }}>
                        <button 
                          onClick={() => setPreviewList(row)}
                          style={{ background: '#f0f0f0', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Icon icon="solar:eye-bold-duotone" size={14} /> Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── PREVIEW MODAL FOR LISTAS ── */}
      {previewList && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-secondary)', width: '100%', maxWidth: '600px', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Detalle de Listado: {previewList.numero}</h3>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Creado el {formatFullDate(previewList.fechaCreacion)}</div>
              </div>
              <button onClick={() => setPreviewList(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <Icon icon="solar:close-circle-bold-duotone" size={24} />
              </button>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <div style={{ flex: 1, padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estado</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: getDocStatusStyle(previewList).col }}>{getDocStatusStyle(previewList).txt}</div>
                </div>
                <div style={{ flex: 1, padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Notas de Pago</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{previewList.notasDePago?.length || 0} registros</div>
                </div>
              </div>

              <h4 style={{ fontSize: '14px', margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>Contenido del Listado (SIAF)</h4>
              
              {previewList.notasDePago?.length > 0 ? (
                <div style={{ border: '1px solid var(--border-light)', borderRadius: '8px', overflow: 'hidden' }}>
                  {previewList.notasDePago.map((n, i) => (
                    <div key={i} style={{ padding: '12px 16px', borderBottom: i === previewList.notasDePago.length - 1 ? 'none' : '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', background: i % 2 === 0 ? 'transparent' : 'var(--bg-tertiary)' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>N° Nota: {n.numero}</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>SIAF: {n.siaf}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                  Este listado no contiene notas de pago asociadas.
                </div>
              )}
            </div>
            
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setPreviewList(null)} style={{ background: 'var(--color-primary)', border: 'none', color: '#111', padding: '10px 24px', borderRadius: '30px', fontWeight: 600, cursor: 'pointer' }}>
                Cerrar Previsualización
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-container, .print-container * { visibility: visible !important; }
          .print-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; box-shadow: none; border-radius: 0; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}

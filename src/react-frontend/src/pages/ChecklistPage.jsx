import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import Icon from '../components/ui/Icon';
import { useAuth } from '../context/AuthContext';

// â”€â”€ ETAPAS INSTITUCIONALES ────────────────────────────────────────────────â”€â”€â”€
const STAGES = [
  { id: 'tesoreria',    label: 'Tesorería',     icon: 'solar:wallet-money-bold-duotone',      color: '#60a5fa' },
  { id: 'contabilidad', label: 'Contabilidad',  icon: 'solar:document-text-bold-duotone',     color: '#60a5fa' },
  { id: 'administracion',label: 'Administración',icon: 'solar:buildings-bold-duotone',         color: '#60a5fa' },
  { id: 'archivo_caja', label: 'Archivo de Caja',icon: 'solar:archive-bold-duotone',           color: '#60a5fa' },
];

// â”€â”€ STORAGE ────────────────────────────────────────────────────────────────â”€â”€
const STORAGE_KEY = 'dashq_notas_pago_v5';
const loadListados = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } };
const saveListados = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
const saveActivity = (activity) => {
  try {
    const act = JSON.parse(localStorage.getItem('dashq_activities_v1')) || [];
    localStorage.setItem('dashq_activities_v1', JSON.stringify([activity, ...act]));
  } catch {}
};


const genId = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const formatDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatDateShort = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// â”€â”€ DEMO DATA ────────────────────────────────────────────────────────────────
const now = new Date();
const todayISO = now.toISOString().slice(0, 10);
const DEMO = [];

// â”€â”€ COMPONENTE PRINCIPAL ────────────────────────────────────────────────────â”€â”€
export default function ChecklistPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [simulatedRole, setSimulatedRole] = useState('Administrador');
  const activeRole = user?.role === 'Administrador' ? simulatedRole : (user?.oficina || 'Usuario');
  const userName = user?.name || activeRole;

  const [listados, setListados] = useState(() => {
    const stored = loadListados();
    return stored.length > 0 ? stored : DEMO;
  });
  
  const [selectedId, setSelectedId] = useState(() => {
    const params = new URLSearchParams(location.search);
    const docRef = params.get('docRef');
    const stored = loadListados();
    const lists = stored.length > 0 ? stored : DEMO;
    if (docRef) {
      const found = lists.find(d => d.numero === docRef);
      if (found) return found.id;
    }
    return null;
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docRef = params.get('docRef');
    if (docRef) {
      const found = listados.find(d => d.numero === docRef);
      if (found && found.id !== selectedId) {
        setSelectedId(found.id);
      }
    }
  }, [location.search, listados, selectedId]);

  useEffect(() => {
    saveListados(listados);
  }, [listados]);

  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [showHistory, setShowHistory] = useState(false);

  // Modal nuevo listado
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Acción en etapa actual
  const [obsTexto, setObsTexto] = useState('');
  const [obsItem, setObsItem] = useState('General');
  const [showObsInput, setShowObsInput] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Edición de notas de pago
  const [newNota, setNewNota] = useState({ numero: '', siaf: '', estado: '' });
  // Advertencia de duplicado: { tipo: 'mismo_listado' | 'otro_listado', referencia: string }
  const [dupWarning, setDupWarning] = useState(null);

  // Resetear página al cambiar de documento
  useEffect(() => { setDupWarning(null); setCurrentPage(1); }, [selectedId]);

  // 🖨️ Imprimir listado 🖨️
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printHtml, setPrintHtml] = useState('');

  const handleExportCSV = () => {
    if (!selectedDoc) return;
    const headers = ['#', 'Nº NOTA DE PAGO', 'SIAF', 'FECHA REGISTRO'];
    const rows = selectedDoc.notasDePago.map((n, i) => [
      String(i + 1).padStart(2, '0'),
      n.numero,
      n.siaf,
      formatDate(selectedDoc.fechaCreacion).split(' a las')[0]
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // \uFEFF for Excel UTF-8 BOM
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${selectedDoc.numero}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!selectedDoc) return;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${selectedDoc.numero} — Listado de Notas de Pago</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; padding: 24px 32px; }
    h1 { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
    .sub { font-size: 11px; color: #555; margin-bottom: 24px; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #555; margin-bottom: 6px; border-bottom: 2px solid #111; padding-bottom: 3px; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 20px; border: 1px solid #111; border-radius: 6px; }
    thead th { background: #111; color: #fff; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid #fff; border-bottom: 1px solid #111; }
    thead th:first-child { border-top-left-radius: 5px; }
    thead th:last-child { border-top-right-radius: 5px; border-right: none; }
    tbody tr:nth-child(even) { background: #fafafa; }
    tbody td { padding: 8px 10px; border-right: 1px solid #ccc; border-bottom: 1px solid #ccc; }
    tbody td:last-child { border-right: none; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:last-child td:first-child { border-bottom-left-radius: 5px; }
    tbody tr:last-child td:last-child { border-bottom-right-radius: 5px; }
    .hist-item { padding: 6px 0; border-bottom: 1px solid #eee; }
    .hist-item strong { font-size: 11px; }
    .hist-item small { font-size: 10px; color: #666; }
    .obs-box { margin-top: 3px; padding: 4px 8px; background: #fff8e1; border-left: 3px solid #f9a825; font-size: 10px; color: #5d4037; }
    
    @page { margin: 15mm 15mm 25mm 15mm; }
    #page-footer {
      position: fixed;
      bottom: 0;
      width: 100%;
      padding-top: 8px;
      border-top: 1px solid #ddd;
      font-size: 9px;
      color: #777;
      display: flex;
      justify-content: space-between;
    }
    .page-number:after { content: counter(page); }
  </style>
</head>
<body>
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #111;">
    <div>
      <h1>Listado de Notas de Pago</h1>
      <div class="sub" style="margin-bottom: 0;">${selectedDoc.numero} &nbsp;&bull;&nbsp; Año Fiscal ${selectedDoc.anoFiscal} &nbsp;&bull;&nbsp; Creado el ${formatDate(selectedDoc.fechaCreacion)}</div>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <div style="text-align: right; margin-right: 12px;">
        <div style="font-size: 16px; font-weight: 800; letter-spacing: -0.5px; line-height: 1;">DashQ</div>
        <div style="font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">Control Documental</div>
      </div>
      <svg width="36" height="36" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill="#111" d="M0 3C0 1.34315 1.34315 0 3 0H19C26.1797 0 32 5.8203 32 13V19C32 26.1797 26.1797 32 19 32H3C1.34315 32 0 30.6569 0 29V3Z"></path>
        <path fill="#fff" d="M12.4851 18.925C12.4851 20.3456 12.7822 21.5962 13.3762 22.6767C13.9901 23.7572 14.8119 24.5975 15.8416 25.1978C16.8713 25.7981 18.0198 26.0982 19.2871 26.0982C20.5743 26.0982 21.7129 25.8181 22.703 25.2578C23.6931 24.6776 24.4653 23.8772 25.0198 22.8568C25.5743 21.8363 25.8515 20.6558 25.8515 19.3151C25.8515 17.9545 25.5743 16.724 25.0198 15.6235C24.4653 14.523 23.6733 13.6426 22.6436 12.9823C21.6337 12.322 20.4356 11.9918 19.0495 11.9918C17.7624 11.9918 16.6238 12.292 15.6337 12.8922C14.6634 13.4925 13.8911 14.3129 13.3168 15.3533C12.7624 16.3938 12.4851 17.5844 12.4851 18.925ZM8 18.925C8 17.3242 8.27723 15.8636 8.83168 14.543C9.38614 13.2024 10.1683 12.0418 11.1782 11.0614C12.1881 10.0809 13.3564 9.33061 14.6832 8.81037C16.0297 8.27012 17.4851 8 19.0495 8C20.6337 8 22.0891 8.27012 23.4158 8.81037C24.7426 9.33061 25.8911 10.0809 26.8614 11.0614C27.8515 12.0418 28.6139 13.2024 29.1485 14.543C29.703 15.8636 29.9802 17.3242 29.9802 18.925C29.9802 20.5057 29.7129 21.9764 29.1782 23.337C28.6436 24.6776 27.8812 25.8481 26.8911 26.8486C25.9208 27.849 24.7723 28.6294 23.4455 29.1896C22.1188 29.7299 20.6535 30 19.0495 30C17.4653 30 16 29.7299 14.6535 29.1896C13.3069 28.6294 12.1287 27.849 11.1188 26.8486C10.1287 25.8481 9.35644 24.6776 8.80198 23.337C8.26733 21.9764 8 20.5057 8 18.925ZM17.7426 20.4256H22.3465L32 32H29.1782L17.7426 20.4256Z"></path>
      </svg>
    </div>
  </div>

  <div class="section-title">Notas de Pago (${selectedDoc.notasDePago.length})</div>
  <table>
    <thead><tr><th>#</th><th>Nº Nota de Pago</th><th>SIAF</th><th>Estado/Obs.</th><th>Fecha Registro</th></tr></thead>
    <tbody>
      ${selectedDoc.notasDePago.map((n, i) => `
        <tr><td>${String(i + 1).padStart(2, '0')}</td><td><strong>${n.numero}</strong></td><td>${n.siaf}</td><td>${n.estado ? n.estado.split(' (')[0] : '-'}</td><td>${formatDate(selectedDoc.fechaCreacion).split(' a las')[0]}</td></tr>
      `).join('')}
      ${selectedDoc.notasDePago.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:#999;padding:12px">Sin notas registradas</td></tr>' : ''}
    </tbody>
  </table>

  <div id="page-footer">
    <span>Responsable: <strong>${userName}</strong></span>
    <span class="page-number">Página </span>
  </div>
</body>
</html>`;

    setPrintHtml(html);
    setShowPrintPreview(true);
  };

  const selectedDoc = listados.find(d => d.id === selectedId) || null;
  const currentStageLabel = selectedDoc ? STAGES[selectedDoc.stageIndex]?.label : '';
  const canAct = activeRole === 'Administrador' || activeRole === currentStageLabel;

  const filtered = listados.filter(d => {
    const term = search.toLowerCase();
    const matchSearch = d.numero.toLowerCase().includes(term) ||
      d.anoFiscal.includes(term) || d.creadoPor.toLowerCase().includes(term) ||
      (d.notasDePago && d.notasDePago.some(n => n.numero.toLowerCase().includes(term) || (n.siaf && n.siaf.toLowerCase().includes(term))));
    const matchEstado = filterEstado === 'all' || d.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  // Helper para previsualizar el siguiente correlativo
  const getNextNumero = (year) => {
    const maxNum = listados
      .filter(d => d.anoFiscal === year.trim())
      .map(d => parseInt(d.numero.split('-')[2] || '0', 10))
      .reduce((max, cur) => Math.max(max, cur), 0);
    const padNum = String(maxNum + 1).padStart(4, '0');
    return `LST-${year.trim()}-${padNum}`;
  };

  // ── Crear nuevo listado ─────────────────────────────────────────────────────
  const handleCreate = () => {
    const ts = new Date().toISOString();
    const defaultAno = String(new Date().getFullYear());
    const newNumero = getNextNumero(defaultAno);

    const doc = {
      id: genId(),
      numero: newNumero,
      anoFiscal: defaultAno,
      fechaLista: todayISO,
      creadoPor: userName,
      fechaCreacion: ts,
      stageIndex: 0,
      estado: 'en_proceso',
      devuelto: false,
      observacionPendiente: '',
      notasDePago: [],
      historial: [{ accion: 'Listado creado', etapa: 'Tesorería', fecha: ts, usuario: userName, obs: '' }],
    };
    setListados(prev => [doc, ...prev]);
    setSelectedId(doc.id);
    setSearch('');
    setShowHistory(false);
    setObsTexto('');
    setShowObsInput(false);
    setDupWarning(null);
  };

  // ── Agregar nota de pago (con detección de duplicados solo en N° de nota) ────────────
  const handleAddNota = (forzar = false) => {
    if (!newNota.numero.trim() || !newNota.siaf.trim()) return;

    const isAnuladoStr = newNota.estado && newNota.estado.toLowerCase().includes('anul');

    if (!forzar && !isAnuladoStr) {
      // Duplicado en mismo listado (solo por N° de nota)
      const enActual = selectedDoc?.notasDePago.find(
        n => n.numero.trim().toLowerCase() === newNota.numero.trim().toLowerCase()
      );
      if (enActual) {
        setDupWarning({ tipo: 'mismo_listado', referencia: selectedDoc.numero });
        return;
      }

      // Duplicado en otro listado (solo por N° de nota)
      for (const lst of listados) {
        if (lst.id === selectedId) continue;
        const enOtro = lst.notasDePago.find(
          n => n.numero.trim().toLowerCase() === newNota.numero.trim().toLowerCase()
        );
        if (enOtro) {
          setDupWarning({ tipo: 'otro_listado', referencia: lst.numero, anoFiscal: lst.anoFiscal });
          return;
        }
      }
    }

    const isAnulado = newNota.estado && newNota.estado.toLowerCase().includes('anul');
    let listaAnterior = null;
    if (isAnulado) {
      listaAnterior = listados.find(lst => lst.id !== selectedId && lst.notasDePago.some(n => n.numero.trim().toLowerCase() === newNota.numero.trim().toLowerCase()));
    }

    const nota = { 
      id: genId(), 
      numero: newNota.numero.trim(), 
      siaf: newNota.siaf.trim(),
      estado: newNota.estado ? newNota.estado.trim() : ''
    };
    setListados(prev => prev.map(d => {
      if (d.id === selectedId) {
        let nuevoHistorial = [...d.historial];
        if (listaAnterior) {
          nuevoHistorial.unshift({
             id: genId(),
             fecha: new Date().toISOString(),
             accion: `Antecedente: Nota ${nota.numero} (Anulada)`,
             etapa: currentStageLabel || 'Edición',
             usuario: userName,
             obs: `Esta nota proviene originalmente del listado ${listaAnterior.numero} y ha sido reingresada por anulación/extorno.`
          });
        }
        return { ...d, notasDePago: [...d.notasDePago, nota], historial: nuevoHistorial };
      } else if (listaAnterior && d.id === listaAnterior.id) {
        let nuevoHistorial = [...d.historial];
        nuevoHistorial.unshift({
           id: genId(),
           fecha: new Date().toISOString(),
           accion: `Nota ${nota.numero} anulada/extornada`,
           etapa: d.estado === 'archivado' ? 'Archivado' : `En ${STAGES[d.stageIndex]?.label || 'Edición'}`,
           usuario: userName,
           obs: `Esta nota ha sido reingresada en el listado ${selectedDoc.numero}.`
        });
        return {
          ...d,
          historial: nuevoHistorial,
          notasDePago: d.notasDePago.map(n => 
            n.numero.trim().toLowerCase() === nota.numero.toLowerCase()
            ? { ...n, estado: 'ANULADO' }
            : n
          )
        };
      }
      return d;
    }));
    setNewNota({ numero: '', siaf: '', estado: '' });
    setDupWarning(null);
    if (selectedDoc) {
      setCurrentPage(Math.ceil((selectedDoc.notasDePago.length + 1) / 10));
    }
  };

  const handleDeleteNota = (notaId) => {
    setConfirmDelete({ type: 'nota', id: notaId });
  };

  const executeDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'listado') {
      setListados(prev => prev.filter(d => d.id !== confirmDelete.id));
      if (selectedId === confirmDelete.id) setSelectedId(null);
    } else if (confirmDelete.type === 'nota') {
      setListados(prev => prev.map(d => d.id !== selectedId ? d : {
        ...d, notasDePago: d.notasDePago.filter(n => n.id !== confirmDelete.id),
      }));
    }
    setConfirmDelete(null);
  };

  // ── Visto Bueno (avanzar) ────────────────────────────────────────────────────
  const handleVistoBueno = () => {
    const doc = listados.find(d => d.id === selectedId);
    if (!doc) return;
    const ts = new Date().toISOString();
    const currentStage = STAGES[doc.stageIndex];
    const nextStage = STAGES[doc.stageIndex + 1];

    if (doc.stageIndex === STAGES.length - 1) {
      // Archivar definitivamente
      setListados(prev => prev.map(d => d.id !== selectedId ? d : {
        ...d,
        estado: 'archivado',
        devuelto: false,
        observacionPendiente: '',
        historial: [...d.historial, {
          accion: 'Archivado definitivamente',
          etapa: currentStage.label,
          fecha: ts,
          usuario: userName,
          obs: '',
        }],
      }));
    } else {
      setListados(prev => prev.map(d => d.id !== selectedId ? d : {
        ...d,
        stageIndex: d.stageIndex + 1,
        devuelto: false,
        recepcionado: false,
        observacionPendiente: '',
        historial: [...d.historial, {
          accion: `Visto Bueno — Enviado a ${nextStage.label}`,
          etapa: currentStage.label,
          fecha: ts,
          usuario: userName,
          obs: '',
        }],
      }));
    }
    setObsTexto('');
    setShowObsInput(false);
  };

  // ── Recepcionar listado (etapas 1-3) ──────────────────────────────────────
  const handleRecepcionar = () => {
    const doc = listados.find(d => d.id === selectedId);
    if (!doc) return;
    const ts = new Date().toISOString();
    const currentStage = STAGES[doc.stageIndex];
    setListados(prev => prev.map(d => d.id !== selectedId ? d : {
      ...d,
      recepcionado: true,
      historial: [...d.historial, {
        accion: `Recepcionado en ${currentStage.label}`,
        etapa: currentStage.label,
        fecha: ts,
        usuario: userName,
        obs: '',
      }],
    }));
  };

  // ── Devolver con observación ─────────────────────────────────────────────────
  const handleDevolver = () => {
    const doc = listados.find(d => d.id === selectedId);
    if (!doc || doc.stageIndex === 0) return;
    if (!obsTexto.trim()) { setShowObsInput(true); return; }
    const ts = new Date().toISOString();
    const currentStage = STAGES[doc.stageIndex];
    const prevStage = STAGES[doc.stageIndex - 1];
    setListados(prev => prev.map(d => {
      if (d.id !== selectedId) return d;
      let finalObs = obsTexto.trim();
      if (obsItem !== 'General') {
        const nota = d.notasDePago.find(n => n.numero === obsItem);
        if (nota) {
          finalObs = `[SIAF: ${nota.siaf} (${nota.numero})] - ${obsTexto.trim()}`;
        } else {
          finalObs = `[Ítem: ${obsItem}] - ${obsTexto.trim()}`;
        }
      }
      const historyItem = {
        accion: `Devuelto a ${prevStage.label} con observación`,
        etapa: currentStage.label,
        fecha: ts,
        usuario: userName,
        obs: finalObs,
      };
      
      saveActivity({
        id: `act_${Date.now()}`,
        title: 'Documento observado',
        description: `El listado ${d.numero} fue devuelto con observaciones: ${finalObs}`,
        date: ts,
        type: 'warning',
        read: false,
        sender: currentStage.label,
        docRef: d.numero,
        history: [{ id: `h_${Date.now()}`, action: historyItem.accion, user: userName, date: ts, obs: historyItem.obs }]
      });

      return {
        ...d,
        stageIndex: d.stageIndex - 1,
        devuelto: true,
        recepcionado: false,
        observacionPendiente: finalObs,
        historial: [...d.historial, historyItem],
      };
    }));
    setObsTexto('');
    setObsItem('General');
    setShowObsInput(false);
  };

  // —— Recuperar a Borrador (Solo si no ha sido recepcionado) ――――――――――――――――
  const handleRecuperarBorrador = () => {
    const doc = listados.find(d => d.id === selectedId);
    if (!doc || doc.stageIndex !== 1 || doc.recepcionado) return;
    const ts = new Date().toISOString();
    setListados(prev => prev.map(d => d.id !== selectedId ? d : {
      ...d,
      stageIndex: 0,
      devuelto: false,
      recepcionado: false,
      historial: [...d.historial, {
        accion: 'Recuperado a Borrador',
        etapa: 'Tesorería',
        fecha: ts,
        usuario: userName,
        obs: 'El envío a Contabilidad fue anulado porque no había sido recepcionado aún.',
      }],
    }));
  };

  // —— Enviar desde Tesorería ─────────────────────────────────────────────────
  const handleEnviarTesoreria = () => {
    const doc = listados.find(d => d.id === selectedId);
    if (!doc || doc.notasDePago.length === 0) return;
    const ts = new Date().toISOString();
    const esReenvio = doc.devuelto;
    setListados(prev => prev.map(d => d.id !== selectedId ? d : {
      ...d,
      stageIndex: 1,
      devuelto: false,
      observacionPendiente: '',
      historial: [...d.historial, {
        accion: esReenvio
          ? 'Subsanado — Reenviado a Contabilidad'
          : 'Enviado a Contabilidad (Visto Bueno)',
        etapa: 'Tesorería',
        fecha: ts,
        usuario: userName,
        obs: esReenvio ? '(Lista corregida luego de la observación recibida)' : '',
      }],
    }));
    setObsTexto('');
    setShowObsInput(false);
  };

  // ── Eliminar listado ────────────────────────────────────────────────────────
  const handleDelete = (id) => {
    setConfirmDelete({ type: 'listado', id });
  };

  // ── ESTILOS ──────────────────────────────────────────────────────────────────
  const s = {
    page: { display: 'flex', flex: 1, minHeight: 0, padding: 0, gap: '16px', overflow: 'hidden', height: '100%', fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', background: 'transparent' },
    // LEFT
    left: { width: '380px', flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100%', background: '#161616', borderRadius: '32px', border: 'none' },
    lHeader: { padding: '24px 24px 16px', borderBottom: 'none' },
    title: { fontSize: '22px', fontWeight: 700, marginBottom: '4px' },
    subtitle: { fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' },
    topBar: { display: 'flex', gap: '8px', marginBottom: '16px' },
    btnPrimary: { display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: '#60a5fa', color: '#111111', border: 'none', borderRadius: '30px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' },
    searchWrap: { position: 'relative', flex: 1 },
    searchInput: { width: '100%', padding: '10px 12px 10px 34px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '30px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' },
    searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' },
    filterRow: { display: 'flex', gap: '8px' },
    filterBtn: (a) => ({ padding: '6px 14px', borderRadius: '30px', border: `1px solid ${a ? '#60a5fa' : 'rgba(255,255,255,0.1)'}`, background: a ? 'rgba(96,165,250,0.15)' : 'transparent', color: a ? '#60a5fa' : 'var(--text-muted)', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }),
    docList: { flex: 1, overflowY: 'auto', padding: '0 24px 24px' },
    card: (sel) => ({ padding: '18px 22px', borderRadius: '24px', marginBottom: '12px', cursor: 'pointer', border: `1px solid ${sel ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.04)'}`, background: sel ? 'rgba(96,165,250,0.08)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s ease', boxShadow: sel ? '0 4px 12px rgba(0,0,0,0.1)' : 'none' }),
    badge: (color, bg) => ({ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '30px', background: bg || 'rgba(255,255,255,0.05)', color, fontSize: '11px', fontWeight: 600 }),
    // RIGHT
    right: { flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', background: '#161616', borderRadius: '32px', position: 'relative' },
    rEmpty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--text-muted)' },
    rScroll: { flex: 1, minHeight: 0, overflow: 'hidden', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' },
    // CARDS dentro del detalle
    section: { background: 'transparent', overflow: 'hidden' },
    sectionHead: { padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' },
    sectionBody: { padding: '12px 16px' },
    // TABLA notas
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
    th: { padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' },
    td: { padding: '5px 12px', verticalAlign: 'middle' },
    // STEPPER
    stepper: { display: 'flex', alignItems: 'flex-start', position: 'relative' },
    stepDot: (done, active, color) => ({ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: active ? `2px solid ${color}` : done ? `2px solid ${color}` : '2px solid rgba(255,255,255,0.15)', background: done ? color : '#121212', flexShrink: 0, position: 'relative', zIndex: 2, transition: 'all 0.2s' }),
    stepLine: (done) => ({ position: 'absolute', top: '18px', left: '50%', width: '100%', height: '2px', background: done ? '#60a5fa' : 'rgba(255,255,255,0.08)', zIndex: 0 }),
    // ACCIONES
    btnVB: { display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '30px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' },
    btnDev: { display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)', borderRadius: '30px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' },
    btnArchive: { display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '30px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' },
    btnEnviar: { display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', background: '#60a5fa', color: '#111111', border: 'none', borderRadius: '30px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' },
    textarea: { width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '30px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', resize: 'none', height: '70px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' },
    input: (w) => ({ width: w || '100%', padding: '7px 11px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '30px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }),
    // MODAL
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modal: { background: 'var(--bg-card)', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.08)', width: '420px', padding: '28px' },
  };

  const stageColor = (doc) => doc ? (doc.estado === 'archivado' ? '#60a5fa' : STAGES[doc.stageIndex]?.color || '#60a5fa') : '#60a5fa';
  const stageLabel = (doc) => doc ? (doc.estado === 'archivado' ? 'Archivado' : `En ${STAGES[doc.stageIndex]?.label}`) : '';

  return (
    <div style={s.page}>
      {/* LEFT PANEL */}
      <div style={s.left}>
        <div style={s.lHeader}>
          <div style={s.title}>Control Documental</div>
          <div style={s.subtitle}>Notas de Pago — Flujo institucional</div>
          
          {user?.role === 'Administrador' && (
            <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Simular rol (Admin):</span>
              <div style={{ width: '180px' }}>
                <CustomSelect
                  value={simulatedRole}
                  onChange={setSimulatedRole}
                  options={[
                    { value: 'Administrador', label: 'Administrador (Todos)' },
                    { value: 'Tesorería', label: 'Tesorería' },
                    { value: 'Contabilidad', label: 'Contabilidad' },
                    { value: 'Administración', label: 'Administración' },
                    { value: 'Archivo de Caja', label: 'Archivo de Caja' }
                  ]}
                />
              </div>
            </div>
          )}

          <div style={s.topBar}>
            {(activeRole === 'Administrador' || activeRole === 'Tesorería') && (
              <button style={s.btnPrimary} onClick={handleCreate}>
                <Icon icon="solar:add-circle-bold-duotone" size={14} /> Nuevo Listado
              </button>
            )}
            <div style={s.searchWrap}>
              <Icon icon="solar:minimalistic-magnifer-bold-duotone" size={13} style={s.searchIcon} />
              <input style={s.searchInput} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={s.filterRow}>
            {[['all','Todos'],['en_proceso','En proceso'],['archivado','Archivados']].map(([v,l]) => (
              <button key={v} style={s.filterBtn(filterEstado === v)} onClick={() => setFilterEstado(v)}>{l}</button>
            ))}
          </div>
        </div>

        <div style={s.docList}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '32px', fontSize: '13px' }}>
              <Icon icon="solar:document-bold-duotone" size={28} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
              Sin resultados
            </div>
          ) : filtered.map(doc => {
            const isSelected = doc.id === selectedId;
            return (
              <div 
                key={doc.id} 
                style={s.card(isSelected)} 
                onClick={() => { setSelectedId(doc.id); setShowHistory(false); setObsTexto(''); setShowObsInput(false); }}
                onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; } }}
                onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; } }}
              >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{doc.numero}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Año Fiscal {doc.anoFiscal} • {doc.notasDePago.length} nota{doc.notasDePago.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                  <span style={s.badge(stageColor(doc))}>{stageLabel(doc)}</span>
                  {doc.stageIndex === 0 && doc.estado !== 'archivado' && (
                    <span style={s.badge('#94a3b8', 'rgba(148,163,184,0.1)')}>Borrador</span>
                  )}
                  {doc.stageIndex > 0 && doc.estado !== 'archivado' && (
                    <span style={s.badge('#22c55e', 'rgba(34,197,94,0.1)')}>Registrado</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Por: <span style={{ color: 'var(--text-secondary)' }}>{doc.creadoPor}</span></span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDateShort(doc.fechaCreacion)}</span>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={s.right}>
        {!selectedDoc ? (
          <div style={s.rEmpty}>
            <Icon icon="solar:document-text-bold-duotone" size={48} style={{ opacity: 0.15 }} />
            <div style={{ fontWeight: 600 }}>Selecciona un listado</div>
            <div style={{ fontSize: '13px' }}>Elige un registro de la lista para ver su detalle.</div>
          </div>
        ) : showPrintPreview ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>Vista Previa de Impresión</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedDoc.numero}</div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setShowPrintPreview(false)} 
                  style={{ padding: '8px 16px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                >
                  Regresar
                </button>
                <button 
                  onClick={() => {
                    const iframe = document.getElementById('print-iframe');
                    if (iframe && iframe.contentWindow) {
                      iframe.contentWindow.print();
                    }
                  }} 
                  style={{ padding: '8px 16px', borderRadius: '30px', border: 'none', background: '#60a5fa', color: '#111', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px' }}
                >
                  <Icon icon="solar:printer-bold-duotone" size={16} /> Imprimir Documento
                </button>
              </div>
            </div>
            <div style={{ flex: 1, background: '#fff', overflow: 'hidden' }}>
              <iframe
                id="print-iframe"
                srcDoc={printHtml}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Print Preview"
              />
            </div>
          </div>
        ) : (
          <div style={s.rScroll}>

            {/* ENCABEZADO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>Listado de Notas de Pago</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700 }}>{selectedDoc.numero}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>·</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Año Fiscal {selectedDoc.anoFiscal}</span>
                  <span style={s.badge(stageColor(selectedDoc))}>{stageLabel(selectedDoc)}</span>
                  
                  {selectedDoc.stageIndex === 0 && selectedDoc.estado !== 'archivado' && (
                    <span style={s.badge('#94a3b8', 'rgba(148,163,184,0.1)')}>Borrador</span>
                  )}
                  {selectedDoc.stageIndex > 0 && selectedDoc.estado !== 'archivado' && (
                    <span style={s.badge('#22c55e', 'rgba(34,197,94,0.1)')}>Registrado</span>
                  )}
                  
                  {selectedDoc.devuelto && <span style={s.badge('#60a5fa', 'rgba(96,165,250,0.1)')}>Devuelto</span>}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Creado por <strong style={{ color: 'var(--text-secondary)' }}>{selectedDoc.creadoPor}</strong> el {formatDate(selectedDoc.fechaCreacion)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {selectedDoc.estado !== 'archivado' && (
                  <button
                    onClick={() => handleDelete(selectedDoc.id)}
                    style={{ padding: '7px 12px', borderRadius: '30px', border: '1px solid rgba(248,113,113,0.2)', background: 'transparent', color: 'rgba(248,113,113,0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, transition: '0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Icon icon="solar:trash-bin-minimalistic-bold-duotone" size={13} /> Eliminar
                  </button>
                )}
                <button
                  onClick={handlePrint}
                  style={{ padding: '7px 12px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600 }}
                >
                  <Icon icon="solar:printer-bold-duotone" size={13} /> Imprimir / PDF
                </button>
                <button
                  onClick={handleExportCSV}
                  style={{ padding: '7px 12px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600 }}
                >
                  <Icon icon="solar:document-text-bold-duotone" size={13} /> CSV
                </button>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  style={{ padding: '7px 12px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)', background: showHistory ? 'rgba(255,255,255,0.06)' : 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600 }}
                >
                  <Icon icon="solar:history-bold-duotone" size={13} /> Historial ({selectedDoc.historial.length})
                </button>
              </div>
            </div>

            {showHistory ? (
              /* HISTORIAL */
              <div style={s.section}>
                <div style={s.sectionHead}>
                  <div style={s.sectionTitle}><Icon icon="solar:history-bold-duotone" size={13} /> Historial de Movimientos</div>
                </div>
                <div style={{ ...s.sectionBody, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[...selectedDoc.historial].reverse().map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', paddingBottom: '8px', borderBottom: i < selectedDoc.historial.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        <Icon icon="solar:flag-bold-duotone" size={12} color="#818cf8" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{h.accion}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{h.usuario}</span> · {h.etapa} · {formatDate(h.fecha)}
                        </div>
                        {h.obs && (
                          <div style={{ marginTop: '5px', padding: '7px 10px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '30px', fontSize: '12px', color: '#60a5fa' }}>
                            {h.obs}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* FLUJO DE ETAPAS */}
                <div style={s.section}>
                  <div style={s.sectionHead}>
                    <div style={s.sectionTitle}><Icon icon="solar:routing-bold-duotone" size={13} /> Flujo de Etapas</div>
                  </div>
                  <div style={{ ...s.sectionBody }}>
                    <div style={s.stepper}>
                      {STAGES.map((stage, i) => {
                        const done = i < selectedDoc.stageIndex || selectedDoc.estado === 'archivado';
                        const active = i === selectedDoc.stageIndex && selectedDoc.estado !== 'archivado';
                        return (
                          <div key={stage.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                            {i < STAGES.length - 1 && <div style={s.stepLine(i < selectedDoc.stageIndex || selectedDoc.estado === 'archivado')} />}
                            <div style={s.stepDot(done, active, stage.color)}>
                              {done
                                ? <Icon icon="solar:check-circle-bold-duotone" size={14} color="#fff" />
                                : <Icon icon={stage.icon} size={12} color={active ? stage.color : 'rgba(255,255,255,0.3)'} />
                              }
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: active ? 800 : 600, textAlign: 'center', marginTop: '8px', color: active ? '#ffffff' : done ? 'var(--text-primary)' : 'var(--text-muted)', letterSpacing: active ? '0.5px' : '0', transition: 'all 0.3s ease' }}>{stage.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* OBSERVACIÓN PENDIENTE (si fue devuelto) */}
                {selectedDoc.devuelto && selectedDoc.observacionPendiente && (
                  <div style={{ padding: '16px 20px', borderRadius: '30px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <Icon icon="solar:danger-triangle-bold-duotone" size={16} color="#60a5fa" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa', marginBottom: '3px' }}>OBSERVACIÓN RECIBIDA</div>
                      <div style={{ fontSize: '13px', lineHeight: 1.5 }}>{selectedDoc.observacionPendiente}</div>
                    </div>
                  </div>
                )}

                {/* TABLA DE NOTAS DE PAGO */}
                <div style={{ ...s.section, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ ...s.sectionHead, flexShrink: 0 }}>
                    <div style={s.sectionTitle}>
                      <Icon icon="solar:document-text-bold-duotone" size={13} />
                      Notas de Pago ({selectedDoc.notasDePago.length})
                    </div>
                  </div>

                  {/* Advertencia duplicado */}
                  {dupWarning && (
                    <div style={{ margin: '0 14px 12px', padding: '16px 20px', borderRadius: '30px', background: dupWarning.tipo === 'mismo_listado' ? 'rgba(248,113,113,0.08)' : 'rgba(96,165,250,0.08)', border: `1px solid ${dupWarning.tipo === 'mismo_listado' ? 'rgba(248,113,113,0.3)' : 'rgba(96,165,250,0.3)'}` }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <Icon icon={dupWarning.tipo === 'mismo_listado' ? 'solar:danger-circle-bold-duotone' : 'solar:danger-triangle-bold-duotone'} size={18} color={dupWarning.tipo === 'mismo_listado' ? '#f87171' : '#60a5fa'} style={{ flexShrink: 0 }} />
                        <div>
                          {dupWarning.tipo === 'mismo_listado' ? (
                            <>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f87171', marginBottom: '3px' }}>Nota de pago duplicada</div>
                              <div style={{ fontSize: '12px', lineHeight: 1.5 }}>El N° de nota <strong>{newNota.numero}</strong> ya existe en este listado. Esto parece un error de ingreso. ¿Deseas agregarla de todas formas?</div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa', marginBottom: '3px' }}>Nota encontrada en listado anterior</div>
                              <div style={{ fontSize: '12px', lineHeight: 1.5 }}>El N° de nota <strong>{newNota.numero}</strong> ya aparece en el listado <strong>{dupWarning.referencia}</strong> (Año Fiscal {dupWarning.anoFiscal}). Puede tratarse de una <strong>nota de pago anulada</strong> que se vuelve a procesar. ¿Confirmas que deseas agregarla?</div>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleAddNota(true)} style={{ padding: '6px 14px', borderRadius: '30px', border: 'none', background: dupWarning.tipo === 'mismo_listado' ? 'rgba(248,113,113,0.2)' : 'rgba(96,165,250,0.2)', color: dupWarning.tipo === 'mismo_listado' ? '#f87171' : '#60a5fa', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
                          Sí, agregar de todas formas
                        </button>
                        <button onClick={() => setDupWarning(null)} style={{ padding: '6px 14px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ overflowX: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ minWidth: '780px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                      
                      {/* ENCABEZADOS Y FORMULARIO (FIJOS) */}
                      <div style={{ paddingRight: '6px', background: 'transparent', flexShrink: 0 }}>
                        <table style={{ ...s.table, tableLayout: 'fixed' }}>
                          <colgroup>
                            <col style={{ width: '45px' }} />
                            <col style={{ width: '160px' }} />
                            <col style={{ width: '140px' }} />
                            <col style={{ width: 'auto' }} />
                            <col style={{ width: '140px' }} />
                            <col style={{ width: '90px' }} />
                          </colgroup>
                          <thead>
                            <tr>
                              <th style={s.th}>#</th>
                              <th style={s.th}>Nº Nota</th>
                              <th style={s.th}>SIAF</th>
                              <th style={s.th}>Estado/Obs.</th>
                              <th style={s.th}>Fecha Registro</th>
                              <th style={s.th}></th>
                            </tr>
                            {/* FORMULARIO ESTÁTICO ALINEADO CON COLUMNAS */}
                            {selectedDoc.stageIndex === 0 && selectedDoc.estado !== 'archivado' && (
                              <tr style={{ background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={s.td}>
                                  <div style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(96,165,250,0.1)', borderRadius: '50%', color: '#60a5fa' }}>
                                    <Icon icon="solar:pen-bold-duotone" size={12} />
                                  </div>
                                </td>
                                <td style={s.td}>
                                  <input
                                    style={{ ...s.input('100%'), padding: '8px 14px', fontSize: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '30px', outline: 'none', transition: 'border-color 0.2s' }}
                                    placeholder="Ej: 45645"
                                    value={newNota.numero}
                                    onChange={e => { setNewNota(p => ({ ...p, numero: e.target.value })); setDupWarning(null); }}
                                    onKeyDown={e => e.key === 'Enter' && handleAddNota()}
                                  />
                                </td>
                                <td style={s.td}>
                                  <input
                                    style={{ ...s.input('100%'), padding: '8px 14px', fontSize: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '30px', outline: 'none', transition: 'border-color 0.2s' }}
                                    placeholder="Ej: 777"
                                    value={newNota.siaf}
                                    onChange={e => { setNewNota(p => ({ ...p, siaf: e.target.value })); setDupWarning(null); }}
                                    onKeyDown={e => e.key === 'Enter' && handleAddNota()}
                                  />
                                </td>
                                <td style={s.td}>
                                  <input
                                    style={{ ...s.input('100%'), padding: '8px 14px', fontSize: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '30px', outline: 'none', transition: 'border-color 0.2s' }}
                                    placeholder="Ej: ANULADO (Opcional)"
                                    value={newNota.estado || ''}
                                    onChange={e => setNewNota(p => ({ ...p, estado: e.target.value }))}
                                    onKeyDown={e => e.key === 'Enter' && handleAddNota()}
                                  />
                                </td>
                                <td style={s.td}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Automático</span>
                                </td>
                                <td style={s.td}>
                                  <button onClick={() => handleAddNota()} style={{ display: 'flex', alignItems: 'center', background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)', height: '32px', padding: '0 16px', fontSize: '12px', borderRadius: '30px', width: '100%', justifyContent: 'center', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                                    Añadir
                                  </button>
                                </td>
                              </tr>
                            )}
                          </thead>
                        </table>
                      </div>

                      {/* CUERPO DE LA LISTA (SCROLLABLE INDEPENDIENTE) */}
                      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                        <table style={{ ...s.table, tableLayout: 'fixed', marginTop: '-1px' }}>
                          <colgroup>
                            <col style={{ width: '45px' }} />
                            <col style={{ width: '160px' }} />
                            <col style={{ width: '140px' }} />
                            <col style={{ width: 'auto' }} />
                            <col style={{ width: '140px' }} />
                            <col style={{ width: '90px' }} />
                          </colgroup>
                          <tbody>
                        {selectedDoc.notasDePago.length === 0 ? (
                          <tr><td colSpan={6} style={{ ...s.td, textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Aún no hay notas de pago registradas.</td></tr>
                        ) : (
                          selectedDoc.notasDePago.slice((currentPage - 1) * 10, currentPage * 10).map((n, i) => {
                            const idx = (currentPage - 1) * 10 + i;
                            return (
                              <tr key={n.id}>
                                <td style={{ ...s.td, color: 'var(--text-muted)', fontSize: '12px' }}>{String(idx + 1).padStart(2, '0')}</td>
                                <td style={{ ...s.td, fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>{n.numero}</td>
                                <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>{n.siaf}</td>
                                <td style={{ ...s.td, color: n.estado ? '#f59e0b' : 'var(--text-muted)', fontWeight: n.estado ? 600 : 400, fontSize: '12px' }}>{n.estado ? n.estado.split(' (')[0] : '-'}</td>
                                <td style={{ ...s.td, color: 'var(--text-muted)', fontSize: '12px' }}>{formatDate(selectedDoc.fechaCreacion).split(' a las')[0]}</td>
                                {selectedDoc.stageIndex === 0 && selectedDoc.estado !== 'archivado' && (
                                  <td style={s.td}>
                                    <button onClick={() => handleDeleteNota(n.id)} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', cursor: 'pointer', padding: '4px 12px', fontSize: '11px', fontWeight: 600, borderRadius: '30px', transition: 'all 0.2s' }}>
                                      Borrar
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {selectedDoc.notasDePago.length > 10 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px 0 0 0', gap: '12px' }}>
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)', padding: '8px', borderRadius: '12px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Icon icon="solar:alt-arrow-left-bold-duotone" size={16} />
                      </button>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Página {currentPage} de {Math.ceil(selectedDoc.notasDePago.length / 10)}
                      </span>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(selectedDoc.notasDePago.length / 10), p + 1))}
                        disabled={currentPage === Math.ceil(selectedDoc.notasDePago.length / 10)}
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', color: currentPage === Math.ceil(selectedDoc.notasDePago.length / 10) ? 'var(--text-muted)' : 'var(--text-primary)', padding: '8px', borderRadius: '12px', cursor: currentPage === Math.ceil(selectedDoc.notasDePago.length / 10) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Icon icon="solar:alt-arrow-right-bold-duotone" size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

                {/* PANEL DE ACCIÓN (según etapa) */}
                {selectedDoc.estado === 'archivado' ? (
                  <div style={{ padding: '16px', borderRadius: '30px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <Icon icon="solar:archive-bold-duotone" size={28} color="#60a5fa" />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#60a5fa' }}>Archivado Definitivamente</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Este listado ha sido procesado y cerrado. Consulta el historial para ver todos los detalles.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ ...s.section, flexShrink: 0 }}>
                    <div style={s.sectionHead}>
                      <div style={s.sectionTitle}>
                        <Icon icon={STAGES[selectedDoc.stageIndex]?.icon} size={13} color={STAGES[selectedDoc.stageIndex]?.color} />
                        Acción — {STAGES[selectedDoc.stageIndex]?.label}
                      </div>
                    </div>
                    <div style={{ ...s.sectionBody, display: 'flex', flexDirection: 'column', gap: '10px' }}>

                      {canAct ? (
                        <>
                          {selectedDoc.stageIndex === 0 ? (
                            /* TESORERÍA A: enviar o subsanar */
                            <div>
                              {selectedDoc.devuelto && (
                                <div style={{ marginBottom: '10px', padding: '16px 20px', borderRadius: '30px', background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.2)', fontSize: '12px', color: '#60a5fa' }}>
                                  <strong>Modo corrección:</strong> Edita la lista de notas de pago para subsanar la observación recibida. El historial conservará el registro completo.
                                </div>
                              )}
                              <button
                                style={{ ...s.btnEnviar, opacity: selectedDoc.notasDePago.length === 0 ? 0.4 : 1, cursor: selectedDoc.notasDePago.length === 0 ? 'not-allowed' : 'pointer' }}
                                onClick={handleEnviarTesoreria}
                                disabled={selectedDoc.notasDePago.length === 0}
                              >
                                <Icon icon={selectedDoc.devuelto ? 'solar:restart-bold-duotone' : 'solar:arrow-right-bold-duotone'} size={14} />
                                {selectedDoc.devuelto
                                  ? `Subsanar y Reenviar a Contabilidad (${selectedDoc.notasDePago.length} nota${selectedDoc.notasDePago.length !== 1 ? 's' : ''})`
                                  : `Enviar a Contabilidad ${selectedDoc.notasDePago.length === 0 ? '(sin notas aún)' : `(${selectedDoc.notasDePago.length} nota${selectedDoc.notasDePago.length !== 1 ? 's' : ''})`}`
                                }
                              </button>
                            </div>
                          ) : (
                            /* CONTABILIDAD / ADMINISTRACIÓN / ARCHIVO DE CAJA: recepcionar primero, luego actuar */
                            <div>
                              {!selectedDoc.recepcionado ? (
                                /* AUN NO RECEPCIONADO */
                                <div>
                                  <div style={{ padding: '18px 24px', borderRadius: '30px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', marginBottom: '12px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#60a5fa', marginBottom: '4px' }}>Pendiente de Recepción</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                      El listado ha sido enviado por Tesorería. {STAGES[selectedDoc.stageIndex]?.label} debe recepcionar el documento para comenzar su revisión.
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button style={{ ...s.btnEnviar, background: '#60a5fa' }} onClick={handleRecepcionar}>
                                      <Icon icon="solar:inbox-in-bold-duotone" size={15} /> Recepcionar Listado
                                    </button>
                                    {activeRole === 'Administrador' && selectedDoc.stageIndex === 1 && (
                                      <button 
                                        onClick={handleRecuperarBorrador}
                                        style={{ ...s.btnDev, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}
                                      >
                                        <Icon icon="solar:undo-left-bold-duotone" size={15} /> Recuperar a Borrador (Admin)
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                /* YA RECEPCIONADO: mostrar opciones */
                                <div>
                                  {!showObsInput && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                      Listado recepcionado. Revisa las notas de pago y da el visto bueno para derivar a la siguiente oficina, o devuélvelo con una observación.
                                    </div>
                                  )}

                                  {showObsInput && (
                                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 600, marginBottom: '6px' }}>Ítem observado:</div>
                                        <CustomSelect
                                          value={obsItem}
                                          onChange={setObsItem}
                                          options={[
                                            { value: 'General', label: 'Problema general' },
                                            ...selectedDoc.notasDePago.map((n, i) => ({
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
                                          style={{ width: '100%', padding: '0 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', height: '38px', boxSizing: 'border-box' }}
                                          placeholder="Describe el motivo..."
                                          value={obsTexto}
                                          onChange={e => setObsTexto(e.target.value)}
                                          autoFocus
                                        />
                                      </div>
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {selectedDoc.stageIndex < STAGES.length - 1 ? (
                                      <button style={{ ...s.btnVB, padding: '8px 16px' }} onClick={handleVistoBueno}>
                                        <Icon icon="solar:check-circle-bold-duotone" size={15} />
                                        Visto Bueno → {STAGES[selectedDoc.stageIndex + 1]?.label}
                                      </button>
                                    ) : (
                                      <button style={{ ...s.btnArchive, padding: '8px 16px' }} onClick={handleVistoBueno}>
                                        <Icon icon="solar:archive-bold-duotone" size={15} />
                                        Archivar Definitivamente
                                      </button>
                                    )}

                                    {showObsInput ? (
                                      <>
                                        <button style={{ ...s.btnDev, padding: '8px 16px', opacity: obsTexto.trim() ? 1 : 0.5 }} onClick={handleDevolver} disabled={!obsTexto.trim()}>
                                          <Icon icon="solar:undo-left-bold-duotone" size={15} />
                                          Confirmar Devolución
                                        </button>
                                        <button onClick={() => { setShowObsInput(false); setObsTexto(''); setObsItem('General'); }} style={{ padding: '8px 16px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>
                                          Cancelar
                                        </button>
                                      </>
                                    ) : (
                                      <button style={s.btnDev} onClick={() => setShowObsInput(true)}>
                                        <Icon icon="solar:undo-left-bold-duotone" size={15} />
                                        Devolver con Observación
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        (activeRole === 'Tesorería' || activeRole === 'Administrador') && selectedDoc.stageIndex === 1 && !selectedDoc.recepcionado ? (
                          <div>
                            <div style={{ padding: '16px 20px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '30px', marginBottom: '12px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f87171', marginBottom: '4px' }}>Pendiente de Recepción en Contabilidad</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '12px' }}>
                                El listado ha sido enviado a Contabilidad pero <strong>aún no ha sido recepcionado</strong>. Puedes pasarlo a Borrador si necesitas seguir editándolo.
                              </div>
                              <button 
                                onClick={handleRecuperarBorrador}
                                style={{ ...s.btnDev, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', width: 'auto' }}
                              >
                                <Icon icon="solar:undo-left-bold-duotone" size={15} /> Recuperar a Borrador
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: '16px', background: '#161616', borderRadius: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                            <Icon icon="solar:lock-password-bold-duotone" size={24} style={{ marginBottom: '8px', opacity: 0.5 }} /><br/>
                            No tienes permisos para actuar en esta etapa.<br/>Tu oficina (<strong>{activeRole}</strong>) no coincide con <strong>{STAGES[selectedDoc.stageIndex]?.label}</strong>.
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              </>
            )}
          </div>
        )}
      </div>



      {/* MODAL CONFIRMAR ELIMINAR */}
      {confirmDelete && (
        <div style={s.overlay} onClick={() => setConfirmDelete(null)}>
          <div style={{ ...s.modal, width: '380px' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: '#f87171' }}>
              <Icon icon="solar:danger-triangle-bold-duotone" size={18} style={{ marginRight: '6px', verticalAlign: '-3px' }} />
              Confirmar Eliminación
            </div>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {confirmDelete.type === 'listado' 
                ? '¿Estás seguro de que deseas eliminar TODO este listado? Esta acción no se puede deshacer.'
                : '¿Estás seguro de que deseas eliminar esta nota de pago? Esta acción no se puede deshacer.'}
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={executeDelete} style={{ padding: '8px 16px', background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '30px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}



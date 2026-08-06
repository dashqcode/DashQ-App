import React, { useEffect, useState, useRef } from 'react';
import Icon from './ui/Icon';
import { Workbook } from '@fortune-sheet/react';
import '@fortune-sheet/react/dist/index.css';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { useAuth } from '../context/AuthContext';

export default function CustomExcelEditor({ url, relativePath, file, onClose, onSaveSuccess, onRename, onToggleStar, isStarred, onGoToFolder }) {
  const { user } = useAuth();
  const perms = user?.permissions || { read: true, write: false, rename: false, copy: false, move: false, tag: false, delete: false, print: false };

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(file?.name || '');
  const [isHoveringName, setIsHoveringName] = useState(false);

  const handleDoubleClickName = () => {
    if (onRename && perms.rename) {
      setIsEditingName(true);
      setEditName(file.name);
    }
  };

  const handleRenameSubmit = () => {
    setIsEditingName(false);
    if (editName.trim() && editName !== file.name && onRename) {
      onRename(editName.trim());
    }
  };

  const [sheetData, setSheetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const workbookRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const loadExcel = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Network error fetching Excel file");
        const arrayBuffer = await response.arrayBuffer();
        if (!isMounted) return;
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        const sheets = workbook.SheetNames.map((name, index) => {
          const ws = workbook.Sheets[name];
          const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
          
          const celldata = [];
          let maxCol = 10;
          json.forEach((row, r) => {
            if (Array.isArray(row)) {
              if (row.length > maxCol) maxCol = row.length;
              row.forEach((val, c) => {
                if (val !== null && val !== undefined && val !== '') {
                  celldata.push({
                    r: r,
                    c: c,
                    v: { v: val, m: val + "" }
                  });
                }
              });
            }
          });
          
          return {
            name: name,
            celldata: celldata,
            index: index,
            status: index === 0 ? 1 : 0,
            order: index,
            row: Math.max(json.length + 20, 50),
            column: Math.max(maxCol + 10, 20),
          };
        });

        if (sheets.length === 0) {
          setError("El archivo está vacío o no tiene hojas legibles.");
          setLoading(false);
          return;
        }

        setSheetData(sheets);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error("Parse error:", err);
        setError("Error al descargar o procesar el archivo Excel.");
        setLoading(false);
      }
    };
    loadExcel();
    
    return () => { isMounted = false; };
  }, [url]);

  const handleSave = async () => {
    if (!workbookRef.current) return;
    setSaving(true);
    try {
      // FortuneSheet instance
      const data = workbookRef.current.getAllSheets();
      
      // Convert FortuneSheet data back to Excel buffer using exceljs
      const workbook = new ExcelJS.Workbook();
      
      data.forEach(sheet => {
        const worksheet = workbook.addWorksheet(sheet.name);
        
        // Populate cells
        if (sheet.celldata) {
          sheet.celldata.forEach(cell => {
            const row = cell.r + 1; // exceljs is 1-indexed
            const col = cell.c + 1;
            const value = cell.v ? cell.v.v : null;
            if (value !== null && value !== undefined) {
              const excelCell = worksheet.getCell(row, col);
              excelCell.value = value;
              // Basic styling could go here, but we focus on data
            }
          });
        }
      });
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      const formData = new FormData();
      formData.append('file', blob, 'edit.xlsx');
      formData.append('path', relativePath);

      const response = await fetch('/api/update_file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error del servidor al guardar.");
      }

      alert("Archivo guardado correctamente.");
      if (onSaveSuccess) onSaveSuccess();
      
    } catch (err) {
      console.error(err);
      alert("Error al guardar el archivo: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '20px', color: '#888' }}>Cargando Editor de Excel... esto puede tomar unos segundos.</div>;
  if (error) return <div style={{ padding: '20px', color: '#ef4444' }}>{error}</div>;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f3f2f1', fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif' }}>
      
      {/* Office 365 Style Ribbon Header */}
      <div style={{ display: 'flex', flexDirection: 'column', background: '#fff', borderBottom: '1px solid #e1dfdd' }}>
        
        {/* Title Bar (Green like Excel) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#107c41', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', background: '#21a366', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Icon icon="solar:document-text-bold-duotone" size={16} color="white" />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.5px' }}>Excel</span>
            </div>

            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.3)' }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isEditingName ? (
                <input 
                   value={editName}
                   onChange={e => setEditName(e.target.value)}
                   onBlur={handleRenameSubmit}
                   onKeyDown={e => e.key === 'Enter' && handleRenameSubmit()}
                   autoFocus
                   style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid white', borderRadius: '4px', padding: '2px 6px', fontSize: '13px', outline: 'none', width: '200px' }}
                />
              ) : (
                <span 
                  onDoubleClick={handleDoubleClickName}
                  onMouseEnter={() => setIsHoveringName(true)}
                  onMouseLeave={() => setIsHoveringName(false)}
                  title={onRename && perms.rename ? "Doble clic para renombrar" : ""}
                  style={{ fontSize: '13px', fontWeight: '500', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: (onRename && perms.rename) ? 'text' : 'default', padding: '2px 6px', borderRadius: '4px', background: (onRename && perms.rename && isHoveringName) ? 'rgba(255,255,255,0.1)' : 'transparent', transition: 'background 0.2s' }}
                >
                  {file?.name || 'Documento'}
                  {(onRename && perms.rename) && isHoveringName && (
                     <Icon icon="solar:pen-bold-duotone" size={12} color="rgba(255,255,255,0.8)" />
                  )}
                  {(onToggleStar && perms.tag) ? (
                    <Icon 
                      icon={isStarred ? 'solar:star-bold-duotone' : 'solar:star-line-duotone'} 
                      size={14} 
                      color={isStarred ? '#60a5fa' : 'rgba(255,255,255,0.8)'}
                      onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
                      style={{ cursor: 'pointer', marginLeft: '4px', transition: 'transform 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      title={isStarred ? "Quitar de destacados" : "Añadir a destacados"}
                    />
                  ) : (
                    <Icon icon="solar:star-bold-duotone" size={14} color="rgba(255,255,255,0.8)" />
                  )}
                  {(onGoToFolder && perms.move) && (
                    <Icon 
                      icon="solar:folder-open-bold-duotone" 
                      size={14} 
                      color="rgba(255,255,255,0.8)"
                      onClick={(e) => { e.stopPropagation(); onGoToFolder(); }}
                      style={{ cursor: 'pointer', marginLeft: '4px', transition: 'transform 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      title="Mostrar en carpeta"
                    />
                  )}
                </span>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', background: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: '12px' }}>
              {perms.write ? 'Edición' : 'Solo Lectura'}
            </span>
            {onClose && (
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} title="Cerrar">
                <Icon icon="mdi:close" size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Top bar (Tabs & Actions) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 16px', background: '#f3f2f1' }}>
          
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '36px' }}>
            <button style={{ background: 'transparent', border: 'none', color: '#323130', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px 4px 0 0', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e1dfdd'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Archivo</button>
            <button style={{ background: '#fff', border: 'none', color: '#217346', fontSize: '13px', fontWeight: 600, padding: '8px 12px', cursor: 'pointer', borderBottom: '3px solid #217346', borderRadius: '4px 4px 0 0' }}>Inicio</button>
            {perms.write && (
              <>
                <button style={{ background: 'transparent', border: 'none', color: '#323130', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px 4px 0 0', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e1dfdd'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Insertar</button>
                <button style={{ background: 'transparent', border: 'none', color: '#323130', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px 4px 0 0', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e1dfdd'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Diseño de página</button>
                <button style={{ background: 'transparent', border: 'none', color: '#323130', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px 4px 0 0', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e1dfdd'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Fórmulas</button>
                <button style={{ background: 'transparent', border: 'none', color: '#323130', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px 4px 0 0', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e1dfdd'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Datos</button>
                <button style={{ background: 'transparent', border: 'none', color: '#323130', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px 4px 0 0', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e1dfdd'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Revisar</button>
              </>
            )}
            <button style={{ background: 'transparent', border: 'none', color: '#323130', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px 4px 0 0', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e1dfdd'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Vista</button>
          </div>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            
            {perms.write && (
              <button 
                onClick={handleSave} 
                disabled={saving}
                style={{ 
                  background: '#107c41', 
                  color: 'white', 
                  border: 'none', 
                  padding: '6px 16px', 
                  borderRadius: '4px', 
                  cursor: saving ? 'wait' : 'pointer', 
                  fontWeight: 600,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#0c5c30'; }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#107c41'; }}
              >
                {saving ? 'Guardando...' : <><Icon icon="solar:diskette-bold-duotone" size={16} /> Guardar</>}
              </button>
            )}
          </div>
        </div>
        
        {/* Decorative thin green bar (optional, some office themes have it) */}
        <div style={{ height: '1px', background: '#e1dfdd', width: '100%' }}></div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <Workbook 
          ref={workbookRef} 
          data={sheetData} 
          lang="es"
          onChange={() => {}} // dummy to avoid warnings
        />
      </div>
    </div>
  );
}

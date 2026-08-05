import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

export default function CustomExcelViewer({ url }) {
  const [html, setHtml] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadExcel = async () => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        if (!isMounted) return;
        
        const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const htmlString = XLSX.utils.sheet_to_html(worksheet, { id: 'excel-table' });
        setHtml(htmlString);
      } catch (err) {
        console.error("Error loading Excel:", err);
        setError("Error al cargar el archivo Excel.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    loadExcel();
    return () => { isMounted = false; };
  }, [url]);

  if (loading) return <div style={{ padding: '20px', color: '#888' }}>Cargando Excel...</div>;
  if (error) return <div style={{ padding: '20px', color: '#ef4444' }}>{error}</div>;

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', backgroundColor: '#fff', padding: '16px' }}>
      <style>{`
        #excel-table { border-collapse: collapse; width: 100%; color: #000; font-size: 13px; font-family: sans-serif; }
        #excel-table td, #excel-table th { border: 1px solid #ccc; padding: 4px 8px; }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

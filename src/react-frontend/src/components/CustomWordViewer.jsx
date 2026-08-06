import React, { useEffect, useState } from 'react';
import mammoth from 'mammoth';

export default function CustomWordViewer({ url }) {
  const [html, setHtml] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadWord = async () => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        if (!isMounted) return;
        
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setHtml(result.value);
      } catch (err) {
        console.error("Error loading Word doc:", err);
        setError("Error al cargar el archivo Word.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    loadWord();
    return () => { isMounted = false; };
  }, [url]);

  if (loading) return <div style={{ padding: '20px', color: '#888' }}>Cargando Word...</div>;
  if (error) return <div style={{ padding: '20px', color: '#ef4444' }}>{error}</div>;

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', backgroundColor: '#fff', padding: '32px', color: '#000', fontFamily: 'serif', fontSize: '15px', lineHeight: '1.6' }}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

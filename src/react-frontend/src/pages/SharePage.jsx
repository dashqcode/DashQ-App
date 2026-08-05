import React, { Suspense, lazy } from 'react';
import Icon from '../components/ui/Icon';
import { useParams } from 'react-router-dom';

const CustomPdfViewer = lazy(() => import('../components/CustomPdfViewer'));

export default function SharePage() {
  const { token } = useParams();

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      <Suspense fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%', color: 'var(--text-secondary)' }}>
          <Icon icon="solar:refresh-bold-duotone" size={24} />
          Cargando documento compartido...
        </div>
      }>
         <CustomPdfViewer url={"/s/" + token} name="Documento Compartido" />
      </Suspense>
    </div>
  );
}

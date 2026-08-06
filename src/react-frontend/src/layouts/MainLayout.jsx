import { Outlet } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import Sidebar from './Sidebar';

function MainLayout() {
  return (
    <div className="app-container">
      {/* Drag and Drop Overlay */}
      <div id="dropzone-overlay" className="dropzone-overlay">
        <div className="overlay-content">
          <Icon icon="solar:cloud-upload-bold-duotone" size={18} />
          <h2>Arrastra tus PDFs aqu�</h2>
          <p>Los archivos se procesar�n localmente de forma segura</p>
        </div>
      </div>

      <Sidebar />

      <main className="main-content">
        <div className="view-content-wrapper">
          <input type="file" id="hidden-file-input" accept="*/*" style={{ display: 'none' }} multiple />
          
          {/* Outlet is where the Dashboard, Gestor, or Settings will render */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default MainLayout;

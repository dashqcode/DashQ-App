import React from 'react';
import Icon from './Icon';

/**
 * UniversalSearch - Un buscador estandarizado para toda la app.
 */
function UniversalSearch({ 
  value, 
  onChange, 
  onClear,
  onSubmit, 
  placeholder = "Buscar... (Ctrl+F)", 
  inputRef = null,
  style = {}
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(e);
  };

  const handleClear = () => {
    if (onClear) onClear();
    else onChange('');
  };

  return (
    <form 
      className={`gestor-search-box ${value ? 'has-text' : ''}`} 
      autoComplete="off" 
      onSubmit={handleSubmit} 
      style={style}
    >
      <input 
        ref={inputRef}
        type="text" 
        placeholder={placeholder} 
        value={value} 
        onChange={e => onChange(e.target.value)} 
      />
      <div className="gestor-search-icon-wrapper">
        {value ? (
          <button type="button" className="gestor-search-clear" onClick={handleClear} title="Limpiar búsqueda">
            <Icon icon="mdi:close" size={20} />
          </button>
        ) : (
          <button 
            type={onSubmit ? "submit" : "button"} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'inherit', 
              padding: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: onSubmit ? 'pointer' : 'default', 
              width: '100%', 
              height: '100%' 
            }}
          >
            <Icon icon="solar:magnifer-bold-duotone" size={18} />
          </button>
        )}
      </div>
    </form>
  );
}

export default UniversalSearch;

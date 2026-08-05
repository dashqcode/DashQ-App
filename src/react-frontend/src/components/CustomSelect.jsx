import React, { useState, useRef, useEffect } from 'react';
import Icon from './ui/Icon';
import { createPortal } from 'react-dom';

export default function CustomSelect({ label, options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [openUpwards, setOpenUpwards] = useState(false);
  const ref = useRef();
  const dropdownRef = useRef();

  useEffect(() => {
    const handleClick = (e) => { 
      if (ref.current && !ref.current.contains(e.target) && (!dropdownRef.current || !dropdownRef.current.contains(e.target))) {
        setIsOpen(false);
      }
    };
    const handleScroll = (e) => {
      // Close dropdown if user scrolls the container to prevent detached floating
      if (isOpen && ref.current && !ref.current.contains(e.target) && (!dropdownRef.current || !dropdownRef.current.contains(e.target))) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 200; // max height
      
      let style = {
        position: 'fixed',
        left: rect.left,
        minWidth: rect.width,
        whiteSpace: 'nowrap',
        zIndex: 2147483647, // Max 32-bit int to guarantee top level
        background: 'var(--bg-card, #121212)',
        border: '1px solid var(--border-light, rgba(255,255,255,0.1))',
        borderRadius: '20px',
        maxHeight: `${dropdownHeight}px`,
        overflowY: 'auto',
        boxShadow: '0 10px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.5)',
        display: 'flex',
        padding: '8px'
      };

      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        style.bottom = window.innerHeight - rect.top + 4;
        style.flexDirection = 'column-reverse';
        
      } else {
        style.top = rect.bottom + 4;
        style.flexDirection = 'column';
        
      }
      setDropdownStyle(style);
    }
    setIsOpen(!isOpen);
  };

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {label && <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</label>}
      <div 
        onClick={handleToggle}
        style={{ width: '100%', padding: '10px 14px', borderRadius: '30px', border: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', fontSize: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border 0.2s' }}
      >
        <span>{selectedOption?.label}</span>
        <Icon icon="solar:alt-arrow-down-bold-duotone" size={10} />
      </div>
      
      {isOpen && createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="kanban-scroll">
          {options.map((opt, i) => (
            <div 
              key={i}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              style={{ padding: '8px 16px', fontSize: '12px', cursor: 'pointer', borderRadius: '30px', marginBottom: '2px', color: value === opt.value ? 'white' : 'var(--text-secondary)', background: value === opt.value ? '#60a5fa' : 'transparent', transition: '0.1s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { if (value !== opt.value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { if (value !== opt.value) e.currentTarget.style.background = 'transparent'; }}
            >
              {opt.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}


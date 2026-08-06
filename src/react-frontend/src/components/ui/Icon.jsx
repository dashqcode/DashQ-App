import { Icon as IconifyIcon } from '@iconify/react';

/**
 * Universal icon component using Iconify + Solar Bold Duotone set.
 * Usage: <Icon icon="solar:folder-bold-duotone" size={20} color="#60a5fa" />
 */
const Icon = ({ icon, size = 20, color, style, className, onClick, title }) => {
  const combinedStyle = { ...(color ? { color } : {}), ...(style || {}) };
  
  if (onClick) {
    return (
      <span
        onClick={onClick}
        title={title}
        style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
        className={className}
      >
        <IconifyIcon icon={icon} width={size} height={size} style={combinedStyle} className="solar-icon" data-icon="true" />
      </span>
    );
  }

  return (
    <IconifyIcon
      icon={icon}
      width={size}
      height={size}
      style={combinedStyle}
      className={`solar-icon ${className || ''}`}
      title={title}
      data-icon="true"
    />
  );
};

export default Icon;

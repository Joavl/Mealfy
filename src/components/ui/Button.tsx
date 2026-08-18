import type { ButtonHTMLAttributes } from 'react';
import React from 'react';
import './Button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  fullWidth = false, 
  icon,
  loading = false,
  className = '',
  ...props 
}) => {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const widthClass = fullWidth ? 'btn-full' : '';

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${widthClass} ${className} ${loading ? 'loading' : ''}`.trim()}
      disabled={loading || props.disabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="btn-spinner" aria-hidden="true" /> : (icon && <span className="btn-icon">{icon}</span>)}
      {children}
    </button>
  );
};

export default Button;

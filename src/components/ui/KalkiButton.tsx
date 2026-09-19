import React, { ButtonHTMLAttributes } from 'react';

export interface KalkiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function KalkiButton({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}: KalkiButtonProps) {
  const baseClass = 'kalki-button';
  const variantClass = `kalki-button--${variant}`;
  const sizeClass = `kalki-button--${size}`;
  const loadingClass = isLoading ? 'is-loading' : '';
  
  return (
    <button
      className={[baseClass, variantClass, sizeClass, loadingClass, className].filter(Boolean).join(' ')}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="kalki-button-spinner"></span>
      ) : (
        children
      )}
    </button>
  );
}

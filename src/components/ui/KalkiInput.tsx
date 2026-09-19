import React, { InputHTMLAttributes, forwardRef, useId } from 'react';

export interface KalkiInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  required?: boolean;
}

export const KalkiInput = forwardRef<HTMLInputElement, KalkiInputProps>(
  ({ label, error, required, className = '', id, ...props }, ref) => {
    const defaultId = useId();
    const inputId = id || defaultId;
    
    return (
      <div className={`kalki-field ${className}`}>
        {label && (
          <label htmlFor={inputId} className="kalki-label">
            {label} {required && <span className="kalki-required">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`kalki-input ${error ? 'is-invalid' : ''}`}
          required={required}
          {...props}
        />
        {error && <span className="kalki-error-text">{error}</span>}
      </div>
    );
  }
);

KalkiInput.displayName = 'KalkiInput';

import React, { SelectHTMLAttributes, forwardRef, useId } from 'react';

export interface KalkiSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  required?: boolean;
}

export const KalkiSelect = forwardRef<HTMLSelectElement, KalkiSelectProps>(
  ({ label, error, required, className = '', id, children, ...props }, ref) => {
    const defaultId = useId();
    const selectId = id || defaultId;
    
    return (
      <div className={`kalki-field ${className}`}>
        {label && (
          <label htmlFor={selectId} className="kalki-label">
            {label} {required && <span className="kalki-required">*</span>}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`kalki-select ${error ? 'is-invalid' : ''}`}
          required={required}
          {...props}
        >
          {children}
        </select>
        {error && <span className="kalki-error-text">{error}</span>}
      </div>
    );
  }
);

KalkiSelect.displayName = 'KalkiSelect';

import React, { TextareaHTMLAttributes, forwardRef, useId } from 'react';

export interface KalkiTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  required?: boolean;
}

export const KalkiTextarea = forwardRef<HTMLTextAreaElement, KalkiTextareaProps>(
  ({ label, error, required, className = '', id, ...props }, ref) => {
    const defaultId = useId();
    const textareaId = id || defaultId;
    
    return (
      <div className={`kalki-field ${className}`}>
        {label && (
          <label htmlFor={textareaId} className="kalki-label">
            {label} {required && <span className="kalki-required">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={`kalki-textarea ${error ? 'is-invalid' : ''}`}
          required={required}
          {...props}
        />
        {error && <span className="kalki-error-text">{error}</span>}
      </div>
    );
  }
);

KalkiTextarea.displayName = 'KalkiTextarea';

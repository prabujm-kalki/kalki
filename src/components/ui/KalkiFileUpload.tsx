import React, { forwardRef, InputHTMLAttributes, useState } from 'react';

export interface KalkiFileUploadProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  required?: boolean;
  onFileSelect?: (file: File | null) => void;
  existingUrl?: string | null;
}

export const KalkiFileUpload = forwardRef<HTMLInputElement, KalkiFileUploadProps>(
  ({ label, error, required, existingUrl, className = '', onChange, onFileSelect, ...props }, ref) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      setSelectedFile(file);
      if (onChange) onChange(e);
      if (onFileSelect) onFileSelect(file);
    };

    const handleRemove = () => {
      setSelectedFile(null);
      if (onFileSelect) onFileSelect(null);
    };

    return (
      <div className={`kalki-field ${className}`}>
        {label && (
          <label className="kalki-label">
            {label} {required && <span className="kalki-required">*</span>}
          </label>
        )}
        <div className={`kalki-file-upload ${error ? 'is-invalid' : ''}`}>
          {!selectedFile ? (
            <div className="kalki-file-upload-empty">
              <label className="kalki-button kalki-button--secondary kalki-button--sm" style={{cursor: 'pointer'}}>
                {existingUrl ? 'Replace File' : 'Choose File'}
                <input
                  type="file"
                  style={{ display: 'none' }}
                  ref={ref}
                  onChange={handleFileChange}
                  {...props}
                />
              </label>
              {existingUrl ? (
                <a href={existingUrl} target="_blank" rel="noopener noreferrer" className="kalki-file-link" style={{ marginLeft: '10px', fontSize: '0.9em', color: 'var(--kalki-primary)', textDecoration: 'underline' }}>
                  View Current File
                </a>
              ) : (
                <span className="kalki-file-placeholder">No file chosen</span>
              )}
            </div>
          ) : (
            <div className="kalki-file-upload-selected">
              <div className="kalki-file-info">
                <span className="kalki-file-icon">📄</span>
                <div className="kalki-file-details">
                  <span className="kalki-file-name">{selectedFile.name}</span>
                  <span className="kalki-file-size">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                </div>
              </div>
              <button 
                type="button" 
                className="kalki-button kalki-button--ghost kalki-button--sm kalki-file-remove"
                onClick={handleRemove}
              >
                &times;
              </button>
            </div>
          )}
        </div>
        {error && <span className="kalki-error-text">{error}</span>}
      </div>
    );
  }
);

KalkiFileUpload.displayName = 'KalkiFileUpload';

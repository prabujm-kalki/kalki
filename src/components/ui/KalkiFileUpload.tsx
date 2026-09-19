import React, { forwardRef, InputHTMLAttributes, useState } from 'react';

export interface KalkiFileUploadProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  required?: boolean;
  onFileSelect?: (file: File | null) => void;
}

export const KalkiFileUpload = forwardRef<HTMLInputElement, KalkiFileUploadProps>(
  ({ label, error, required, className = '', onChange, onFileSelect, ...props }, ref) => {
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
                Choose File
                <input
                  type="file"
                  style={{ display: 'none' }}
                  ref={ref}
                  onChange={handleFileChange}
                  {...props}
                />
              </label>
              <span className="kalki-file-placeholder">No file chosen</span>
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

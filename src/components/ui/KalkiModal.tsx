"use client";

import React, { type ReactNode } from "react";
import { X } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";

export interface KalkiModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  closeOnBackdropClick?: boolean;
}

/**
 * Standard Kalki BOS Modal Component
 * 
 * Features:
 * 1. Automatic ESCAPE key closing via global LIFO stack.
 * 2. Backdrop click to close (configurable).
 * 3. Vanilla CSS classes (.kalki-modal-overlay, .kalki-modal).
 * 4. Premium scrollable modal body.
 */
export function KalkiModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = "640px",
  closeOnBackdropClick = true,
}: KalkiModalProps) {
  // Automatically attaches Escape listener to top of stack when open
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="kalki-modal-overlay"
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{ zIndex: 1050 }}
    >
      <div
        className="kalki-modal"
        style={{
          maxWidth,
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div className="kalki-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#1e293b" }}>{title}</h2>
            {subtitle && (
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="kalki-modal-close"
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px", color: "#64748b" }}
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="kalki-modal-content" style={{ padding: "20px", flex: 1, overflowY: "auto" }}>
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="kalki-modal-footer" style={{ padding: "16px 20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

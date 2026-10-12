"use client";

import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteMarketingTemplate } from "./actions";

export function TemplateRowActions({ templateId }: { templateId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMarketingTemplate(templateId);
      // We don't set showConfirm(false) because the row will unmount when deleted
    } catch (err) {
      console.error(err);
      alert("Failed to delete template");
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isDeleting}
        style={{
          background: "transparent",
          border: "none",
          color: "#ef4444",
          cursor: isDeleting ? "not-allowed" : "pointer",
          padding: "8px",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: isDeleting ? 0.5 : 1,
          transition: "background-color 0.2s"
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#fee2e2"}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
        title="Delete Template"
      >
        <Trash2 size={16} />
      </button>

      {showConfirm && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "8px", border: "1px solid #e2e8f0", width: "100%", maxWidth: "400px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}>
            <h3 style={{ marginTop: 0, color: "#1e293b", fontSize: "1.125rem", fontWeight: 600 }}>Confirm Deletion</h3>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "24px", lineHeight: 1.5 }}>
              Are you sure you want to permanently delete this marketing template and its enrolled audiences? This action cannot be undone.
            </p>
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                style={{ padding: "8px 16px", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#475569", fontWeight: 500, cursor: isDeleting ? "not-allowed" : "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                style={{ padding: "8px 16px", backgroundColor: "#ef4444", border: "none", borderRadius: "6px", color: "#ffffff", fontWeight: 500, cursor: isDeleting ? "not-allowed" : "pointer" }}
              >
                {isDeleting ? "Deleting..." : "Delete Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

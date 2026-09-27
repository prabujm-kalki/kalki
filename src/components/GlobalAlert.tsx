"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function GlobalAlert() {
  const [messages, setMessages] = useState<{ id: number; text: string }[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const originalAlert = window.alert;
      
      window.alert = (message: string) => {
        const id = Date.now() + Math.random();
        setMessages((prev) => [...prev, { id, text: message }]);
        
        setTimeout(() => {
          setMessages((prev) => prev.filter((m) => m.id !== id));
        }, 5000);
      };
      
      return () => {
        window.alert = originalAlert;
      };
    }
  }, []);

  if (messages.length === 0) return null;

  return (
    <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 9999, display: "flex", flexDirection: "column", gap: "10px" }}>
      {messages.map((m) => (
        <div key={m.id} style={{ 
          background: "white", 
          borderLeft: "4px solid #ef4444", 
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", 
          padding: "1rem", 
          borderRadius: "0.5rem",
          display: "flex",
          alignItems: "flex-start",
          gap: "1rem",
          maxWidth: "400px",
          color: "#1f2937",
          animation: "slideIn 0.3s ease-out forwards"
        }}>
          <div style={{ flex: 1, fontSize: "0.875rem", fontWeight: 500, lineHeight: 1.4 }}>{m.text}</div>
          <button onClick={() => setMessages(prev => prev.filter(msg => msg.id !== m.id))} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", padding: "0.25rem", display: "flex" }}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState, FormEvent } from "react";
import { KalkiInput } from "@/components/ui/KalkiInput";
import { KalkiButton } from "@/components/ui/KalkiButton";
import { useToast } from "@/components/ui/Toast";

export function PasswordChangeForm() {
  const { addToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/me/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to change password");
      }
      
      addToast({ type: 'success', message: 'Password changed successfully.' });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to change password.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && <div style={{ color: 'var(--kalki-danger)', fontSize: '0.875rem' }}>{error}</div>}
      
      <KalkiInput 
        label="Current Password" 
        type="password" 
        required 
        value={currentPassword} 
        onChange={e => setCurrentPassword(e.target.value)} 
        disabled={pending} 
      />
      <KalkiInput 
        label="New Password" 
        type="password" 
        required 
        minLength={8}
        value={newPassword} 
        onChange={e => setNewPassword(e.target.value)} 
        disabled={pending} 
      />
      <KalkiInput 
        label="Confirm New Password" 
        type="password" 
        required 
        minLength={8}
        value={confirmPassword} 
        onChange={e => setConfirmPassword(e.target.value)} 
        disabled={pending} 
      />
      
      <KalkiButton type="submit" variant="primary" disabled={pending}>
        {pending ? "Changing..." : "Change Password"}
      </KalkiButton>
    </form>
  );
}

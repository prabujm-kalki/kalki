"use client";

import { useState, useEffect } from "react";
import { submitRegularizationRequest, getMissingPunchTypesForDate } from "@/domains/attendance/regularizationActions";
import { useSessionView } from "@/components/AppShell";
import { useRouter } from "next/navigation";

export function RegularizationRequestForm() {
  const { selected } = useSessionView();
  const router = useRouter();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [punchType, setPunchType] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  
  const [availablePunches, setAvailablePunches] = useState<{value: string, label: string}[]>([]);
  const [isLoadingPunches, setIsLoadingPunches] = useState(false);

  useEffect(() => {
    if (!date || !selected) {
      setAvailablePunches([]);
      setPunchType("");
      return;
    }
    
    setIsLoadingPunches(true);
    getMissingPunchTypesForDate(date, selected.organizationId, selected.locationId)
      .then(punches => {
        setAvailablePunches(punches);
        if (punches.length > 0) {
          setPunchType(punches[0].value);
        } else {
          setPunchType("");
        }
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoadingPunches(false));
  }, [date, selected]);

  if (!selected) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!punchType) {
      alert("No punch type selected. You may have already recorded all punches for this day.");
      return;
    }
    setStatus("submitting");
    try {
      const combinedDateTime = new Date(`${date}T${time}`);
      const res = await submitRegularizationRequest({
        date,
        requestedPunchType: punchType,
        requestedTime: combinedDateTime,
        reason,
        organizationId: selected!.organizationId,
        locationId: selected!.locationId,
      });

      if (res.error) {
        setStatus("idle");
        alert(res.error);
        return;
      }

      if (res.success) {
        setStatus("success");
        setDate("");
        setTime("");
        setReason("");
        setTimeout(() => setStatus("idle"), 3000);
        alert("Success! Your missing punch request has been submitted for manager approval.");
        router.refresh();
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Failed to submit request");
      alert(err.message || "Failed to submit request");
    }
  }

  return (
    <div className="att-card" style={{ padding: "1.5rem" }}>
      <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.125rem", borderBottom: "1px solid var(--att-border)", paddingBottom: "0.5rem" }}>
        Request Attendance Regularization
      </h3>
      <p style={{ fontSize: "0.875rem", color: "var(--att-text-muted)", marginBottom: "1.5rem" }}>
        Missing a punch? Submit a manual adjustment request for manager approval.
      </p>

      {status === "success" && (
        <div style={{ padding: "1rem", background: "var(--att-success)", color: "#fff", borderRadius: "8px", marginBottom: "1rem" }}>
          Request submitted successfully!
        </div>
      )}

      {status === "error" && (
        <div style={{ padding: "1rem", background: "var(--att-destructive)", color: "#fff", borderRadius: "8px", marginBottom: "1rem" }}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem", fontWeight: 500, color: "var(--att-text-muted)" }}>Date</label>
            <input 
              type="date" 
              required 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="att-input-premium"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem", fontWeight: 500, color: "var(--att-text-muted)" }}>Time</label>
            <input 
              type="time" 
              required 
              value={time} 
              onChange={e => setTime(e.target.value)}
              className="att-input-premium"
            />
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem", fontWeight: 500, color: "var(--att-text-muted)" }}>Punch Type</label>
          <select 
            value={punchType} 
            onChange={e => setPunchType(e.target.value)}
            className="att-input-premium"
            disabled={!date || isLoadingPunches || availablePunches.length === 0}
          >
            {!date && <option value="">Select a date first...</option>}
            {date && isLoadingPunches && <option value="">Loading available punches...</option>}
            {date && !isLoadingPunches && availablePunches.length === 0 && <option value="">All punches already recorded</option>}
            {availablePunches.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem", fontWeight: 500, color: "var(--att-text-muted)" }}>Reason</label>
          <textarea 
            required 
            rows={3} 
            value={reason} 
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Forgot to punch out yesterday..."
            className="att-input-premium"
            style={{ resize: "vertical" }}
          ></textarea>
        </div>

        <button 
          type="submit" 
          disabled={status === "submitting"}
          className="att-button-premium"
          style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}
        >
          {status === "submitting" ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}

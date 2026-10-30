"use client";

import { useState, useEffect, useRef } from "react";
import { useSessionView } from "@/components/AppShell";
import { Save, Settings, Smartphone, BellRing, UploadCloud, Music, CheckCircle2, MessageSquare, Link as LinkIcon, Key, Phone, ShieldCheck, Copy, Check, Eye, EyeOff, RefreshCw, Radio, X, Send, User, Building, Clock, ChevronRight } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { KalkiPageHeader } from "@/components/ui/KalkiPageHeader";
import { KalkiSection } from "@/components/ui/KalkiSection";
import { KalkiButton } from "@/components/ui/KalkiButton";

export function GeneralSettings() {
  const { selected } = useSessionView();
  const [template, setTemplate] = useState("");
  const [whatsappDispatchMode, setWhatsappDispatchMode] = useState<"NO_WHATSAPP" | "API_AUTOMATED" | "WEB_LINK_POPUP">("WEB_LINK_POPUP");
  const [whatsappContentFormat, setWhatsappContentFormat] = useState<"TEXT_AND_PDF_LINK" | "TEXT_ONLY" | "PDF_LINK_ONLY">("TEXT_AND_PDF_LINK");
  const [enableMobilePush, setEnableMobilePush] = useState(false);
  const [notificationTone, setNotificationTone] = useState("level-1");
  const [customTones, setCustomTones] = useState<Record<string, string>>({});
  const [playingLevel, setPlayingLevel] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // WhatsApp Cloud API Configuration State
  const [waPhoneNumberId, setWaPhoneNumberId] = useState("");
  const [waBusinessAccountId, setWaBusinessAccountId] = useState("");
  const [waApiToken, setWaApiToken] = useState("");
  const [waWebhookVerifyToken, setWaWebhookVerifyToken] = useState("kalki_wa_webhook_verify_token");
  const [waAppSecret, setWaAppSecret] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [testingWa, setTestingWa] = useState(false);
  const [waTestResult, setWaTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetch(`/api/organizations/${selected.organizationId}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.organization) {
          setTemplate(data.organization.whatsappPoTemplate || "");
          setWhatsappDispatchMode(data.organization.whatsappDispatchMode || "WEB_LINK_POPUP");
          setWhatsappContentFormat(data.organization.whatsappContentFormat || "TEXT_AND_PDF_LINK");
          setEnableMobilePush(data.organization.enableMobilePushNotifications || false);
          setNotificationTone(data.organization.notificationTone || "level-1");
          setCustomTones(data.organization.customTones || {});
          
          const waConfig = data.organization.whatsappConfig || {};
          setWaPhoneNumberId(waConfig.phoneNumberId || "");
          setWaBusinessAccountId(waConfig.businessAccountId || waConfig.wabaId || "");
          setWaApiToken(waConfig.apiToken || "");
          setWaWebhookVerifyToken(waConfig.webhookVerifyToken || "kalki_wa_webhook_verify_token");
          setWaAppSecret(waConfig.appSecret || "");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selected]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/organizations/${selected.organizationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          whatsappPoTemplate: template,
          whatsappDispatchMode: whatsappDispatchMode,
          whatsappContentFormat: whatsappContentFormat,
          enableMobilePushNotifications: enableMobilePush,
          notificationTone: notificationTone,
          customTones: customTones,
          whatsappConfig: {
            phoneNumberId: waPhoneNumberId.trim(),
            businessAccountId: waBusinessAccountId.trim(),
            apiToken: waApiToken.trim(),
            webhookVerifyToken: waWebhookVerifyToken.trim() || "kalki_wa_webhook_verify_token",
            appSecret: waAppSecret.trim(),
          }
        })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: "Settings saved successfully!" });
      } else {
        const errJson = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: errJson?.error || `Failed to save settings (HTTP ${res.status}).` });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || "An unexpected network error occurred." });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 6000);
    }
  };

  const handleTestWhatsAppConnection = async () => {
    if (!waPhoneNumberId || !waApiToken) {
      setWaTestResult({
        success: false,
        message: "Please enter both Phone Number ID and Access Token before testing.",
      });
      return;
    }

    setTestingWa(true);
    setWaTestResult(null);

    try {
      const res = await fetch("/api/settings/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId: waPhoneNumberId,
          apiToken: waApiToken,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setWaTestResult({
          success: true,
          message: `Connected successfully! Account: ${json.data.verifiedName} (${json.data.displayPhoneNumber})`,
          details: json.data,
        });
      } else {
        setWaTestResult({
          success: false,
          message: json.error || "Connection test failed. Check your credentials.",
        });
      }
    } catch (err: any) {
      setWaTestResult({
        success: false,
        message: err?.message || "Network error while connecting to Meta Graph API.",
      });
    } finally {
      setTestingWa(false);
    }
  };

  const [testMobileNumber, setTestMobileNumber] = useState("");
  const [sendingTestMessage, setSendingTestMessage] = useState(false);
  const [testSendResult, setTestSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectedTestTemplate, setSelectedTestTemplate] = useState<string>("auto");

  useEffect(() => {
    if (!selected?.organizationId) return;
    fetch(`/api/marketing/templates?organizationId=${selected.organizationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const approved = data.data.filter((t: any) => t.status === "APPROVED");
          setAvailableTemplates(approved);
          if (approved.length > 0 && selectedTestTemplate === "auto") {
            setSelectedTestTemplate(approved[0].name);
          }
        }
      })
      .catch(() => {});
  }, [selected?.organizationId]);

  const handleSendLiveTestMessage = async () => {
    if (!testMobileNumber) {
      setTestSendResult({ success: false, message: "Please enter a destination phone number (e.g. 9842771993)." });
      return;
    }

    setSendingTestMessage(true);
    setTestSendResult(null);

    const chosenTemplate = availableTemplates.find((t) => t.name === selectedTestTemplate);

    try {
      const res = await fetch("/api/settings/whatsapp/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobileNumber: testMobileNumber,
          organizationId: selected?.organizationId,
          templateName:
            selectedTestTemplate !== "text" && selectedTestTemplate !== "auto"
              ? selectedTestTemplate
              : undefined,
          languageCode: chosenTemplate?.language || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setTestSendResult({
          success: true,
          message: json.message || `Message sent successfully! (Meta Message ID: ${json.messageId})`,
        });
        fetchWaLogs();
      } else {
        setTestSendResult({
          success: false,
          message: json.error || "Failed to send test message.",
        });
      }
    } catch (e: any) {
      setTestSendResult({
        success: false,
        message: e?.message || "Network error while sending test message.",
      });
    } finally {
      setSendingTestMessage(false);
    }
  };

  // Real-time WhatsApp Communications Feed State
  const [waCommunications, setWaCommunications] = useState<any[]>([]);
  const [loadingWaLogs, setLoadingWaLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyStatus, setReplyStatus] = useState<{ success: boolean; message: string } | null>(null);

  const fetchWaLogs = async () => {
    if (!selected?.organizationId) return;
    setLoadingWaLogs(true);
    try {
      const res = await fetch(`/api/settings/whatsapp/communications?organizationId=${selected.organizationId}&limit=30`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setWaCommunications(data.data);
      }
    } catch (e) {
      console.error("Failed to load WhatsApp communications", e);
    } finally {
      setLoadingWaLogs(false);
    }
  };

  const handleSendDirectReply = async () => {
    if (!selectedLog || !replyText.trim() || !selected?.organizationId) return;
    const destinationNumber = selectedLog.direction === "INBOUND" ? selectedLog.senderNumber : selectedLog.recipientNumber;
    
    setSendingReply(true);
    setReplyStatus(null);
    try {
      const res = await fetch("/api/settings/whatsapp/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selected?.organizationId,
          to: destinationNumber,
          text: replyText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyStatus({ success: true, message: "Reply delivered to WhatsApp!" });
        setReplyText("");
        setTimeout(() => {
          fetchWaLogs();
        }, 800);
      } else {
        setReplyStatus({ success: false, message: data.error || "Failed to deliver message." });
      }
    } catch (err: any) {
      setReplyStatus({ success: false, message: err?.message || "Network error" });
    } finally {
      setSendingReply(false);
    }
  };

  // Close modal on Escape key press
  useEscapeKey(() => setSelectedLog(null), !!selectedLog);

  useEffect(() => {
    if (selected?.organizationId) {
      fetchWaLogs();
      const interval = setInterval(fetchWaLogs, 15000); // 15-second real-time poll
      return () => clearInterval(interval);
    }
  }, [selected?.organizationId]);

  // Registered Mobile Devices State
  const [registeredDevices, setRegisteredDevices] = useState<any[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string>("");

  const fetchRegisteredDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await fetch("/api/users/device-token/test");
      const data = await res.json();
      if (data.success && Array.isArray(data.devices)) {
        setRegisteredDevices(data.devices);
        if (data.devices.length > 0 && !selectedTargetUserId) {
          setSelectedTargetUserId(data.devices[0].userId);
        }
      }
    } catch (e) {
      console.error("Failed to load registered devices", e);
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    fetchRegisteredDevices();
  }, []);

  const [webhookCallbackUrl, setWebhookCallbackUrl] = useState("https://detached-manned-shining.ngrok-free.dev/api/webhooks/whatsapp");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hostname.includes("ngrok")) {
      setWebhookCallbackUrl(`${window.location.origin}/api/webhooks/whatsapp`);
    }
  }, []);

  const handleFileUpload = async (level: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected?.organizationId) return;
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        // /api/upload returns { urls: { file: "/uploads/..." } }
        const uploadedUrl = data?.urls?.file || data?.url || Object.values(data?.urls || {})[0] as string;
        
        if (uploadedUrl) {
          const updatedTones = { ...customTones, [level]: uploadedUrl };
          setCustomTones(updatedTones);
          
          // Auto-save immediately to database so user doesn't lose it
          await fetch(`/api/organizations/${selected.organizationId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customTones: updatedTones }),
          });

          setMessage({ type: 'success', text: `Tone for ${level} uploaded and saved successfully!` });
          setTimeout(() => setMessage(null), 4000);
          return;
        }
      }
      setMessage({ type: 'error', text: 'Failed to upload audio file.' });
    } catch (err: any) {
      console.error("Upload error:", err);
      setMessage({ type: 'error', text: err?.message || 'Error uploading file' });
    } finally {
      // Reset input value so same file can be re-selected if desired
      e.target.value = '';
    }
  };

  const playTonePreview = (levelId: string) => {
    // If currently playing this level, stop it
    if (playingLevel === levelId) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
        activeAudioRef.current = null;
      }
      setPlayingLevel(null);
      return;
    }

    // Stop any previously playing audio
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }

    const levelConfig = toneLevels.find(l => l.id === levelId);
    const soundKey = customTones[`${levelId}_key`] || (customTones[levelId]?.includes('/sounds/') ? customTones[levelId].replace('/sounds/', '').replace('.wav', '') : levelConfig?.defaultSound);
    const soundUrl = customTones[levelId] || (soundKey ? `/sounds/${soundKey}.wav` : null);

    if (soundUrl && (soundUrl.startsWith("/") || soundUrl.startsWith("http"))) {
      try {
        const audio = new Audio(soundUrl);
        activeAudioRef.current = audio;
        setPlayingLevel(levelId);

        audio.onended = () => {
          setPlayingLevel(null);
          activeAudioRef.current = null;
        };

        audio.play().catch((err) => {
          console.warn("Audio file playback error, falling back to synthesizer:", err);
          setPlayingLevel(null);
          synthesizeTone(levelId);
        });
        return;
      } catch (e) {
        setPlayingLevel(null);
        synthesizeTone(levelId);
        return;
      }
    }
    synthesizeTone(levelId);
  };

  const synthesizeTone = (levelId: string) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const playBeep = (freq: number, start: number, duration: number, type: OscillatorType = "sine") => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      if (levelId === "level-1") {
        // Soft single bell
        playBeep(880, now, 0.4, "sine");
      } else if (levelId === "level-2") {
        // Two crisp beeps
        playBeep(1046, now, 0.12, "triangle");
        playBeep(1318, now + 0.16, 0.18, "triangle");
      } else if (levelId === "level-3") {
        // Melodic chime
        playBeep(587.33, now, 0.25, "sine");
        playBeep(880, now + 0.12, 0.35, "sine");
        playBeep(1174.66, now + 0.25, 0.5, "sine");
      } else if (levelId === "level-4") {
        // Alert sound
        playBeep(784, now, 0.18, "sawtooth");
        playBeep(659, now + 0.2, 0.18, "sawtooth");
        playBeep(784, now + 0.4, 0.3, "sawtooth");
      } else if (levelId === "level-5") {
        // Urgent rising siren
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(1400, now + 0.3);
        osc.frequency.linearRampToValueAtTime(600, now + 0.6);
        osc.frequency.linearRampToValueAtTime(1400, now + 0.9);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.0);
      }
    } catch (err) {
      console.error("Audio synthesis error:", err);
    }
  };

  if (!selected) return <div style={{ padding: '2rem' }}>Select an organization to view settings.</div>;

  const soundpackCatalog = [
    { key: "bell_classic", label: "Classic Bell", defaultFor: "level-1" },
    { key: "soft_chime", label: "Soft Chime", defaultFor: "level-3" },
    { key: "ding_dong", label: "Ding Dong" },
    { key: "marimba", label: "Marimba Strike" },
    { key: "digital_blip", label: "Digital POS Blip" },
    { key: "double_beep", label: "Double Beep", defaultFor: "level-2" },
    { key: "cash_register", label: "Cash Register Bell" },
    { key: "radar_pulse", label: "Radar Pulse" },
    { key: "alarm_horn", label: "Alarm Horn", defaultFor: "level-4" },
    { key: "urgent_siren", label: "Urgent Siren", defaultFor: "level-5" },
    { key: "emergency_pulsar", label: "Emergency Pulsar" },
  ];

  const toneLevels = [
    { id: "level-1", label: "Level 1 - Priority Alert", defaultSound: "bell_classic" },
    { id: "level-2", label: "Level 2 - Follow-up Notice", defaultSound: "double_beep" },
    { id: "level-3", label: "Level 3 - Milestone Chime", defaultSound: "soft_chime" },
    { id: "level-4", label: "Level 4 - Critical Escalation", defaultSound: "alarm_horn" },
    { id: "level-5", label: "Level 5 - Emergency Siren", defaultSound: "urgent_siren" }
  ];

  const handleSelectSound = async (levelId: string, soundKey: string) => {
    if (!selected?.organizationId) return;
    const soundUrl = `/sounds/${soundKey}.wav`;
    const updatedTones = { ...customTones, [levelId]: soundUrl, [`${levelId}_key`]: soundKey };
    setCustomTones(updatedTones);

    try {
      await fetch(`/api/organizations/${selected.organizationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customTones: updatedTones }),
      });
      // Play sound to immediately let user hear what they selected
      const audio = new Audio(soundUrl);
      audio.play().catch(() => {});
      setMessage({ type: 'success', text: `Saved ${soundKey} for ${levelId}!` });
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <style>{`
        .gs-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          animation: fadeIn 0.4s ease-out;
        }
        
        .gs-banner-header {
          background: linear-gradient(135deg, #fdfbf7 0%, #f3ede2 100%);
          border: 1px solid #e2dcd0;
          border-radius: 1rem;
          padding: 2rem;
          margin-bottom: 1.5rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
        }
        .gs-banner-header::after {
          content: '';
          position: absolute;
          right: -20px;
          top: -20px;
          width: 300px;
          height: 300px;
          background-image: radial-gradient(circle, rgba(212,175,55,0.1) 0%, rgba(255,255,255,0) 70%);
          pointer-events: none;
        }
        .gs-banner-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #2c241b;
          margin: 0 0 0.5rem 0;
        }
        .gs-banner-desc {
          font-size: 1rem;
          color: #645a4f;
          margin: 0;
        }
        
        .gs-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          border-radius: 1rem;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }
        .gs-card:hover {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border-color: #cbd5e1;
        }
        
        .gs-card-header {
          font-size: 1.15rem;
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.25rem;
        }
        .gs-icon-wrapper {
          padding: 0.5rem;
          border-radius: 0.5rem;
          display: flex;
        }
        .gs-icon-green { background: #dcfce7; color: #16a34a; }
        .gs-icon-blue { background: #dbeafe; color: #2563eb; }
        
        .gs-card-desc {
          color: #64748b;
          margin-bottom: 1rem;
          padding-left: 2.75rem;
          font-size: 0.9rem;
          line-height: 1.5;
        }
        .gs-card-content {
          padding-left: 2.75rem;
        }
        
        .gs-textarea-wrapper {
          position: relative;
        }
        .gs-textarea {
          width: 100%;
          padding: 0.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          font-family: inherit;
          color: #334155;
          font-weight: 500;
          resize: none;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .gs-textarea:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15);
          background: #ffffff;
        }
        .gs-char-count {
          position: absolute;
          bottom: 0.75rem;
          right: 0.75rem;
          font-size: 0.75rem;
          color: #94a3b8;
        }
        
        /* Toggle Switch */
        .gs-toggle {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        .gs-toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .gs-toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #cbd5e1;
          transition: .3s;
          border-radius: 24px;
        }
        .gs-toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        input:checked + .gs-toggle-slider {
          background-color: #10b981;
        }
        input:checked + .gs-toggle-slider:before {
          transform: translateX(20px);
        }
        
        .gs-tones-section {
          margin-top: 1.25rem;
          transition: all 0.4s ease;
        }
        .gs-tones-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1rem;
        }
        .gs-tone-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          transition: all 0.2s;
        }
        .gs-tone-item:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        
        /* Tone Colors */
        .tone-icon-1 { background: #e0e7ff; color: #4f46e5; } /* Blue */
        .tone-icon-2 { background: #f3e8ff; color: #9333ea; } /* Purple */
        .tone-icon-3 { background: #dcfce7; color: #16a34a; } /* Green */
        .tone-icon-4 { background: #fee2e2; color: #dc2626; } /* Red */
        .tone-icon-5 { background: #fef9c3; color: #ca8a04; } /* Yellow */
        
        .gs-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.75rem;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          transition: all 0.2s;
          color: #475569;
        }
        .gs-action-btn:hover {
          background: #f8fafc;
          color: #1e293b;
        }
        .gs-action-btn-play {
          color: #ca8a04;
          border-color: #fde047;
          background: #fefce8;
        }
        .gs-action-btn-play:hover {
          background: #fef9c3;
          border-color: #facc15;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
      <div style={{ width: '100%', padding: '0' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <KalkiButton onClick={handleSave} disabled={saving || loading} variant="primary">
            {saving ? "Saving..." : "Save Settings"}
          </KalkiButton>
        </div>
        
        <div className="gs-banner-header">
          <h1 className="gs-banner-title">General Settings</h1>
          <p className="gs-banner-desc">Configure global organization preferences and defaults.</p>
        </div>

        {message && (
          <div style={{ padding: '0.75rem', marginBottom: '1rem', background: message.type === 'success' ? '#ecfdf5' : '#fef2f2', color: message.type === 'success' ? '#047857' : '#b91c1c', border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`, borderRadius: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>
            {message.text}
          </div>
        )}

        <div className="gs-wrapper">
          
          {/* Meta WhatsApp Cloud API Configuration */}
          <div className="gs-card" style={{ borderLeft: "4px solid #16a34a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <h2 className="gs-card-header" style={{ marginBottom: "0.25rem" }}>
                  <div className="gs-icon-wrapper gs-icon-green"><Phone size={18} /></div>
                  Meta WhatsApp Cloud API Configuration
                </h2>
                <p className="gs-card-desc" style={{ marginBottom: "0.5rem" }}>
                  Configure your organization's official Meta WhatsApp Business API credentials to automate messages across <strong>Purchasing</strong> (PO dispatch), <strong>Marketing & CRM</strong> (templates & campaigns), and <strong>Operations</strong>.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={handleTestWhatsAppConnection}
                  disabled={testingWa}
                  className="gs-action-btn"
                  style={{
                    backgroundColor: "#f0fdf4",
                    borderColor: "#bbf7d0",
                    color: "#15803d",
                    cursor: testingWa ? "not-allowed" : "pointer",
                    padding: "0.5rem 0.85rem",
                  }}
                >
                  <RefreshCw size={14} className={testingWa ? "animate-spin" : ""} />
                  {testingWa ? "Testing API..." : "Test Connection"}
                </button>
              </div>
            </div>

            {waTestResult && (
              <div
                style={{
                  margin: "0 0 1.25rem 2.75rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  backgroundColor: waTestResult.success ? "#ecfdf5" : "#fef2f2",
                  color: waTestResult.success ? "#065f46" : "#991b1b",
                  border: `1px solid ${waTestResult.success ? "#a7f3d0" : "#fecaca"}`,
                }}
              >
                {waTestResult.success ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />}
                <span>{waTestResult.message}</span>
              </div>
            )}

            <div className="gs-card-content">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
                
                {/* Phone Number ID */}
                <div>
                  <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                    WhatsApp Phone Number ID <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={waPhoneNumberId}
                      onChange={(e) => setWaPhoneNumberId(e.target.value)}
                      placeholder="e.g. 1021665484225497"
                      style={{
                        width: "100%",
                        padding: "0.6rem 0.75rem",
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: "0.5rem",
                        fontSize: "0.875rem",
                        color: "#1e293b",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                    Found in Meta App Dashboard under WhatsApp &gt; API Setup
                  </div>
                </div>

                {/* WhatsApp Business Account ID (WABA ID) */}
                <div>
                  <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                    WhatsApp Business Account ID (WABA ID) <span style={{ color: "#16a34a", fontSize: "0.75rem" }}>(Required for Template Sync & Creation)</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={waBusinessAccountId}
                      onChange={(e) => setWaBusinessAccountId(e.target.value)}
                      placeholder="e.g. 122104923849502267"
                      style={{
                        width: "100%",
                        padding: "0.6rem 0.75rem",
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: "0.5rem",
                        fontSize: "0.875rem",
                        color: "#1e293b",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                    Found in Meta Business Manager &gt; WhatsApp Accounts &gt; Account ID
                  </div>
                </div>

                {/* Permanent Access Token */}
                <div>
                  <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                    Meta System User Access Token <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showToken ? "text" : "password"}
                      value={waApiToken}
                      onChange={(e) => setWaApiToken(e.target.value)}
                      placeholder="EAAG..."
                      style={{
                        width: "100%",
                        padding: "0.6rem 2.5rem 0.6rem 0.75rem",
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: "0.5rem",
                        fontSize: "0.875rem",
                        color: "#1e293b",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      style={{
                        position: "absolute",
                        right: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#64748b",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                    Meta Graph API Token with <code style={{ color: "#16a34a" }}>whatsapp_business_messaging</code> permission
                  </div>
                </div>

              </div>

              {/* Webhook Configuration Section */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.75rem",
                  padding: "1rem",
                  marginBottom: "0.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <ShieldCheck size={16} color="#059669" />
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>
                    Meta Webhook Credentials (Step 2. Production Setup)
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                  
                  {/* Callback URL */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
                      Callback URL (Paste into Meta Dashboard)
                    </label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        type="text"
                        value={webhookCallbackUrl}
                        onChange={(e) => setWebhookCallbackUrl(e.target.value)}
                        placeholder="https://your-domain.com/api/webhooks/whatsapp"
                        style={{
                          flex: 1,
                          padding: "0.5rem 0.75rem",
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "0.5rem",
                          fontSize: "0.8rem",
                          color: "#334155",
                          fontFamily: "monospace",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(webhookCallbackUrl);
                            setCopiedUrl(true);
                            setTimeout(() => setCopiedUrl(false), 2000);
                          }
                        }}
                        className="gs-action-btn"
                        style={{ padding: "0.5rem 0.75rem" }}
                      >
                        {copiedUrl ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                        {copiedUrl ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Verify Token */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
                      Verify Token (Paste into Meta Dashboard)
                    </label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        type="text"
                        value={waWebhookVerifyToken}
                        onChange={(e) => setWaWebhookVerifyToken(e.target.value)}
                        style={{
                          flex: 1,
                          padding: "0.5rem 0.75rem",
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "0.5rem",
                          fontSize: "0.8rem",
                          color: "#334155",
                          fontFamily: "monospace",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(waWebhookVerifyToken);
                            setCopiedToken(true);
                            setTimeout(() => setCopiedToken(false), 2000);
                          }
                        }}
                        className="gs-action-btn"
                        style={{ padding: "0.5rem 0.75rem" }}
                      >
                        {copiedToken ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                        {copiedToken ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* Live Test Message Dispatch Section */}
              <div
                style={{
                  marginTop: "1rem",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "0.75rem",
                  padding: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <MessageSquare size={16} color="#15803d" />
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#166534" }}>
                    Send Live Test Message
                  </span>
                </div>
                <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.8rem", color: "#15803d" }}>
                  Verify that your WhatsApp Cloud API can successfully deliver a live message to your mobile number.
                </p>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  {availableTemplates.length > 0 && (
                    <select
                      value={selectedTestTemplate}
                      onChange={(e) => setSelectedTestTemplate(e.target.value)}
                      title="Select WhatsApp Template"
                      style={{
                        padding: "0.5rem 0.75rem",
                        background: "#ffffff",
                        border: "1px solid #86efac",
                        borderRadius: "0.5rem",
                        fontSize: "0.85rem",
                        color: "#1e293b",
                        outline: "none",
                        fontWeight: 600,
                        maxWidth: "280px",
                      }}
                    >
                      <option value="auto">
                        Auto: {availableTemplates[0]?.name} ({availableTemplates[0]?.language})
                      </option>
                      {availableTemplates.map((t) => (
                        <option key={t.id || t.name} value={t.name}>
                          {t.displayName || t.name} ({t.language}) - APPROVED
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    value={testMobileNumber}
                    onChange={(e) => setTestMobileNumber(e.target.value)}
                    placeholder="Enter phone number (e.g. 9842771993)"
                    style={{
                      flex: 1,
                      minWidth: "200px",
                      padding: "0.5rem 0.75rem",
                      background: "#ffffff",
                      border: "1px solid #86efac",
                      borderRadius: "0.5rem",
                      fontSize: "0.85rem",
                      color: "#1e293b",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSendLiveTestMessage}
                    disabled={sendingTestMessage}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "0.5rem",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: sendingTestMessage ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <RefreshCw size={14} className={sendingTestMessage ? "animate-spin" : ""} />
                    {sendingTestMessage ? "Sending..." : "Send Test Message"}
                  </button>
                </div>

                {testSendResult && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.5rem",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      backgroundColor: testSendResult.success ? "#dcfce7" : "#fee2e2",
                      color: testSendResult.success ? "#15803d" : "#991b1b",
                      border: `1px solid ${testSendResult.success ? "#86efac" : "#fca5a5"}`,
                    }}
                  >
                    {testSendResult.success ? <CheckCircle2 size={14} /> : <ShieldCheck size={14} />}
                    <span>{testSendResult.message}</span>
                  </div>
                )}
              </div>

              {/* Real-time WhatsApp Inbound & Outbound Communication Ledger */}
              <div
                style={{
                  marginTop: "1.25rem",
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "1rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Radio size={16} color="#0284c7" />
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>
                      Live Communication Ledger ({waCommunications.length} recorded)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={fetchWaLogs}
                    disabled={loadingWaLogs}
                    style={{
                      background: "none",
                      border: "1px solid #cbd5e1",
                      borderRadius: "0.375rem",
                      padding: "0.25rem 0.6rem",
                      fontSize: "0.75rem",
                      color: "#475569",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <RefreshCw size={12} className={loadingWaLogs ? "animate-spin" : ""} />
                    Refresh Feed
                  </button>
                </div>

                {waCommunications.length === 0 ? (
                  <div
                    style={{
                      padding: "1rem",
                      background: "#f8fafc",
                      borderRadius: "0.5rem",
                      textAlign: "center",
                      fontSize: "0.8rem",
                      color: "#64748b",
                    }}
                  >
                    No WhatsApp interactions recorded yet. Messages sent or received will appear here in real-time.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                      maxHeight: "280px",
                      overflowY: "auto",
                      paddingRight: "4px",
                    }}
                  >
                    {waCommunications.map((log) => {
                      const isInbound = log.direction === "INBOUND";
                      const statusColor =
                        log.status === "DELIVERED"
                          ? "#0284c7"
                          : log.status === "READ"
                          ? "#16a34a"
                          : log.status === "FAILED"
                          ? "#ef4444"
                          : "#64748b";

                      return (
                        <div
                          key={log.id}
                          onClick={() => {
                            setSelectedLog(log);
                            setReplyStatus(null);
                            setReplyText("");
                          }}
                          style={{
                            padding: "0.6rem 0.75rem",
                            borderRadius: "0.5rem",
                            backgroundColor: isInbound ? "#f0fdf4" : "#f8fafc",
                            border: `1px solid ${isInbound ? "#bbf7d0" : "#e2e8f0"}`,
                            fontSize: "0.8rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "0.75rem",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = isInbound ? "#16a34a" : "#2563eb";
                            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = isInbound ? "#bbf7d0" : "#e2e8f0";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: "0.725rem",
                                  padding: "0.15rem 0.4rem",
                                  borderRadius: "0.25rem",
                                  backgroundColor: isInbound ? "#22c55e" : "#3b82f6",
                                  color: "#ffffff",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                {log.direction}
                              </span>
                              <span style={{ fontWeight: 600, color: "#1e293b" }}>
                                {log.customerName
                                  ? `Customer: ${log.customerName} (${log.customerPhone})`
                                  : log.vendorName
                                  ? `Vendor: ${log.vendorName}`
                                  : isInbound
                                  ? `From: ${log.senderNumber}`
                                  : `To: ${log.recipientNumber}`}
                              </span>
                            </div>
                            <div style={{ color: "#334155", marginTop: "0.2rem", wordBreak: "break-word" }}>
                              {log.content || "<Empty / Media>"}
                            </div>
                          </div>

                          <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                color: statusColor,
                                textTransform: "uppercase",
                                marginBottom: "0.2rem",
                              }}
                            >
                              {log.status}
                            </span>
                            <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                              {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className="gs-card">
            <h2 className="gs-card-header">
              <div className="gs-icon-wrapper gs-icon-green"><MessageSquare size={18} /></div>
              WhatsApp Dispatch Channel & Automation Policy
            </h2>
            <p className="gs-card-desc">
              Control how WhatsApp messages and documents (Purchase Orders, Quotations, Invoices) are dispatched across the entire organization.
            </p>
            <div className="gs-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Channel Mode Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                  Organization WhatsApp Dispatch Channel
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  {[
                    {
                      id: "NO_WHATSAPP",
                      title: "No WhatsApp Message",
                      desc: "Disable WhatsApp popups and prompts completely across all modules (silent mode).",
                    },
                    {
                      id: "API_AUTOMATED",
                      title: "Cloud API (Automated)",
                      desc: "Dispatches automatically in background via official Meta WhatsApp Business API.",
                    },
                    {
                      id: "WEB_LINK_POPUP",
                      title: "WhatsApp Pop-up / Link",
                      desc: "Opens interactive WhatsApp web/app pop-up prompt with pre-filled content.",
                    },
                  ].map((mode) => (
                    <div
                      key={mode.id}
                      onClick={() => setWhatsappDispatchMode(mode.id as any)}
                      style={{
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        border: whatsappDispatchMode === mode.id ? '2px solid #16a34a' : '1px solid #cbd5e1',
                        background: whatsappDispatchMode === mode.id ? '#f0fdf4' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <input
                          type="radio"
                          name="whatsappDispatchMode"
                          checked={whatsappDispatchMode === mode.id}
                          onChange={() => setWhatsappDispatchMode(mode.id as any)}
                          style={{ accentColor: '#16a34a' }}
                        />
                        <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{mode.title}</strong>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                        {mode.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Format Configuration (Only if WhatsApp is active) */}
              {whatsappDispatchMode !== "NO_WHATSAPP" && (
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Default Message Content Format
                  </label>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Choose the format sent when creating POs or documents. Individual vendor settings will override this default.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    {[
                      { id: "TEXT_AND_PDF_LINK", label: "Text Details + PDF Link", note: "Includes items list preview and secure PDF link." },
                      { id: "TEXT_ONLY", label: "Text Details Only", note: "Pure text message without PDF download link." },
                      { id: "PDF_LINK_ONLY", label: "PDF Link Only", note: "Direct link to download the document PDF." },
                    ].map((fmt) => (
                      <label
                        key={fmt.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                          padding: '0.75rem 1rem',
                          background: whatsappContentFormat === fmt.id ? '#ffffff' : 'transparent',
                          border: whatsappContentFormat === fmt.id ? '1px solid #16a34a' : '1px solid #cbd5e1',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="radio"
                            name="whatsappContentFormat"
                            checked={whatsappContentFormat === fmt.id}
                            onChange={() => setWhatsappContentFormat(fmt.id as any)}
                            style={{ accentColor: '#16a34a' }}
                          />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{fmt.label}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', paddingLeft: '1.4rem' }}>{fmt.note}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="gs-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="gs-card-header">
                <div className="gs-icon-wrapper gs-icon-green"><MessageSquare size={18} /></div>
                WhatsApp Purchase Order Template
              </h2>
              <button className="gs-action-btn">
                View Variables
              </button>
            </div>
            <p className="gs-card-desc">
              Configure the default message sent to vendors. Placeholders: <code style={{background:'#f1f5f9', padding:'2px 4px', borderRadius:'4px', color:'#16a34a'}}>{'{poId}'}</code>, <code style={{background:'#f1f5f9', padding:'2px 4px', borderRadius:'4px', color:'#16a34a'}}>{'{amount}'}</code>, <code style={{background:'#f1f5f9', padding:'2px 4px', borderRadius:'4px', color:'#16a34a'}}>{'{items}'}</code>
            </p>
            <div className="gs-card-content">
              <div className="gs-textarea-wrapper">
                <textarea
                  value={template}
                  onChange={(e) => setTemplate(e.target.value.slice(0, 500))}
                  className="gs-textarea"
                  rows={3}
                  placeholder="Hello, please find Purchase Order #{poId} for {amount}..."
                />
                <div className="gs-char-count">{template.length}/500</div>
              </div>
            </div>
          </div>

          <div className="gs-card">
            <h2 className="gs-card-header">
              <div className="gs-icon-wrapper gs-icon-blue"><Smartphone size={18} /></div>
              Mobile App & Push Notifications
            </h2>
            <p className="gs-card-desc">
              Manage push notifications and customize alert sounds for different priority levels.
            </p>
            
            <div className="gs-card-content">
              <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }}>
                <div className="gs-toggle">
                  <input 
                    type="checkbox" 
                    checked={enableMobilePush} 
                    onChange={(e) => setEnableMobilePush(e.target.checked)} 
                  />
                  <span className="gs-toggle-slider"></span>
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>Enable Push Notifications for Mobile App (APK)</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.15rem' }}>When enabled, supported critical alerts and task assignments will be pushed directly to users' mobile devices.</div>
                </div>
              </label>

              <div className="gs-tones-section" style={{ opacity: enableMobilePush ? 1 : 0.5, pointerEvents: enableMobilePush ? 'auto' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155' }}>
                    <BellRing size={16} color="#6366f1" /> Custom Notification Tones
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {registeredDevices.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Target User:</span>
                        <select
                          className="kalki-input"
                          value={selectedTargetUserId}
                          onChange={(e) => setSelectedTargetUserId(e.target.value)}
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem', width: 'auto' }}
                        >
                          {registeredDevices.map((dev) => (
                            <option key={dev.id} value={dev.userId}>
                              {dev.userName || dev.userEmail} ({dev.deviceType})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/users/device-token/test", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId: selectedTargetUserId || undefined }),
                          });
                          const json = await res.json();
                          alert(json.message || (json.success ? "Test push sent! Check the target phone." : "No registered phones found."));
                        } catch (e: any) {
                          alert("Failed to send test push: " + e.message);
                        }
                      }}
                      className="gs-action-btn"
                      style={{ color: '#047857', borderColor: '#a7f3d0', background: '#ecfdf5', fontWeight: 600, padding: '0.4rem 0.8rem' }}
                    >
                      📱 Send Test Push to Phone
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const { runPushDiagnostics } = await import("@/lib/mobileNative");
                          const res = await runPushDiagnostics();
                          alert(
                            res.error
                              ? `⚠️ Diagnostic Alert:\n\n${res.error}\n\nPlatform: ${res.platform}\nNative: ${res.isNative}`
                              : `✅ Diagnostics Passed!\n\nPlatform: ${res.platform}\nToken: ${res.token}\nSync Status: ${res.serverSync?.status}`
                          );
                          fetchRegisteredDevices();
                        } catch (diagErr: any) {
                          alert("Diagnostic tool error: " + diagErr.message);
                        }
                      }}
                      className="gs-action-btn"
                      style={{ color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff', fontWeight: 600, padding: '0.4rem 0.8rem' }}
                      title="Run live push registration check on this device"
                    >
                      🔍 Check Device Registration
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/users/device-token/diag");
                          const json = await res.json();
                          const latest = (json.logs || []).slice(0, 10).map((l: any) => `[${l.status}] ${l.step}: ${JSON.stringify(l.details || "")}`).join("\n\n");
                          alert(latest.length > 0 ? `📋 Server-Side Diag Logs (Last 10):\n\n${latest}` : "No diagnostic logs received by server yet.");
                        } catch (e: any) {
                          alert("Failed to retrieve server logs: " + e.message);
                        }
                      }}
                      className="gs-action-btn"
                      style={{ color: '#475569', borderColor: '#cbd5e1', background: '#f8fafc', fontWeight: 500, padding: '0.4rem 0.8rem' }}
                      title="View all checkpoints received by the server"
                    >
                      📜 View Checkpoint Logs
                    </button>
                    <button
                      type="button"
                      onClick={fetchRegisteredDevices}
                      title="Refresh registered device list"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.8rem', padding: '0.2rem' }}
                    >
                      🔄 ({registeredDevices.length} registered)
                    </button>
                    <div style={{ fontSize: '0.8rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '1px solid #fcd34d', borderRadius: '50%', textAlign: 'center', lineHeight: '12px' }}>i</span>
                      Supported format: MP3, WAV (Max 2 MB)
                    </div>
                  </div>
                </div>
                
                <div className="gs-tones-grid">
                  {toneLevels.map((level, index) => {
                    const iconClass = `tone-icon-${index + 1}`;
                    return (
                      <div key={level.id} className="gs-tone-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className={iconClass}>
                            <Music size={16} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{level.label}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                              Sound: <strong style={{ color: '#059669' }}>{soundpackCatalog.find(s => s.key === (customTones[`${level.id}_key`] || (customTones[level.id]?.includes('/sounds/') ? customTones[level.id].replace('/sounds/', '').replace('.wav', '') : level.defaultSound)))?.label || (customTones[level.id] ? "Custom Audio File" : "Default Bell")}</strong>
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <select
                            value={customTones[`${level.id}_key`] || (customTones[level.id]?.includes('/sounds/') ? customTones[level.id].replace('/sounds/', '').replace('.wav', '') : level.defaultSound)}
                            onChange={(e) => handleSelectSound(level.id, e.target.value)}
                            style={{
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.8rem',
                              backgroundColor: '#ffffff',
                              color: '#1e293b',
                              fontWeight: 500,
                              cursor: 'pointer'
                            }}
                          >
                            {soundpackCatalog.map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.label}
                              </option>
                            ))}
                          </select>

                          <button 
                            type="button" 
                            className={`gs-action-btn ${playingLevel === level.id ? 'gs-action-btn-stop' : 'gs-action-btn-play'}`} 
                            onClick={() => playTonePreview(level.id)}
                            title={playingLevel === level.id ? "Stop audio preview" : `Preview ${level.label} (15 seconds)`}
                            style={playingLevel === level.id ? { backgroundColor: '#fee2e2', borderColor: '#fca5a5', color: '#dc2626' } : {}}
                          >
                            <span style={{ fontSize: '0.65rem' }}>{playingLevel === level.id ? '⏹' : '▶'}</span> {playingLevel === level.id ? 'Stop' : 'Play (15s)'}
                          </button>
                          <label title="Upload Custom Audio File (MP3/WAV)">
                            <input 
                              type="file" 
                              accept="audio/*" 
                              style={{ display: 'none' }} 
                              onChange={(e) => handleFileUpload(level.id, e)} 
                            />
                            <div className="gs-action-btn" style={{ color: '#4f46e5', borderColor: '#c7d2fe', background: '#eef2ff' }}
                                 onMouseOver={(e) => (e.currentTarget.style.background = '#e0e7ff')}
                                 onMouseOut={(e) => (e.currentTarget.style.background = '#eef2ff')}>
                              <UploadCloud size={14} />
                            </div>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Interactive Two-Way WhatsApp Message Details & Reply Modal */}
      {selectedLog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "1rem",
              width: "100%",
              maxWidth: "540px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
              animation: "fadeIn 0.2s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: selectedLog.direction === "INBOUND" ? "#f0fdf4" : "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: selectedLog.direction === "INBOUND" ? "#22c55e" : "#3b82f6",
                    color: "#ffffff",
                  }}
                >
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                    WhatsApp Conversation
                  </h3>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {selectedLog.direction} • {selectedLog.status}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "4px",
                  borderRadius: "0.375rem",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.25rem 1.5rem" }}>
              {/* Contact Information Bar */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: "0.625rem",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e2e8f0",
                  marginBottom: "1rem",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  fontSize: "0.8rem",
                }}
              >
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "0.7rem", fontWeight: 500 }}>
                    SENDER NUMBER
                  </span>
                  <strong style={{ color: "#1e293b" }}>{selectedLog.senderNumber}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "0.7rem", fontWeight: 500 }}>
                    RECIPIENT NUMBER
                  </span>
                  <strong style={{ color: "#1e293b" }}>{selectedLog.recipientNumber}</strong>
                </div>
                {selectedLog.customerName && (
                  <div>
                    <span style={{ color: "#64748b", display: "block", fontSize: "0.7rem", fontWeight: 500 }}>
                      LINKED CUSTOMER
                    </span>
                    <strong style={{ color: "#16a34a" }}>
                      {selectedLog.customerName} ({selectedLog.customerPhone})
                    </strong>
                  </div>
                )}
                {selectedLog.vendorName && (
                  <div>
                    <span style={{ color: "#64748b", display: "block", fontSize: "0.7rem", fontWeight: 500 }}>
                      LINKED VENDOR
                    </span>
                    <strong style={{ color: "#0284c7" }}>{selectedLog.vendorName}</strong>
                  </div>
                )}
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "0.7rem", fontWeight: 500 }}>
                    TIME RECORDED
                  </span>
                  <span style={{ color: "#475569" }}>
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Message Content Bubble */}
              <div style={{ marginBottom: "1.25rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "0.4rem" }}>
                  Message Content ({selectedLog.messageType})
                </span>
                <div
                  style={{
                    backgroundColor: selectedLog.direction === "INBOUND" ? "#f0fdf4" : "#eff6ff",
                    border: `1px solid ${selectedLog.direction === "INBOUND" ? "#bbf7d0" : "#bfdbfe"}`,
                    padding: "0.875rem 1rem",
                    borderRadius: "0.75rem",
                    fontSize: "0.875rem",
                    color: "#1e293b",
                    lineHeight: "1.5",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {selectedLog.content || "<No text content>"}
                </div>
              </div>

              {/* Direct Reply Section */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "0.4rem" }}>
                  Send WhatsApp Reply to{" "}
                  <code style={{ color: "#16a34a" }}>
                    {selectedLog.direction === "INBOUND" ? selectedLog.senderNumber : selectedLog.recipientNumber}
                  </code>
                </label>
                <div style={{ position: "relative" }}>
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response here..."
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem",
                      color: "#1e293b",
                      boxSizing: "border-box",
                      outline: "none",
                      resize: "none",
                    }}
                  />
                </div>

                {replyStatus && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      padding: "0.4rem 0.6rem",
                      borderRadius: "0.375rem",
                      fontSize: "0.75rem",
                      backgroundColor: replyStatus.success ? "#dcfce7" : "#fee2e2",
                      color: replyStatus.success ? "#15803d" : "#991b1b",
                      border: `1px solid ${replyStatus.success ? "#86efac" : "#fca5a5"}`,
                    }}
                  >
                    {replyStatus.message}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    style={{
                      padding: "0.5rem 0.875rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#475569",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleSendDirectReply}
                    disabled={sendingReply || !replyText.trim()}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      backgroundColor: sendingReply || !replyText.trim() ? "#94a3b8" : "#16a34a",
                      color: "#ffffff",
                      fontSize: "0.8rem",
                      cursor: sendingReply || !replyText.trim() ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <Send size={14} />
                    {sendingReply ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}

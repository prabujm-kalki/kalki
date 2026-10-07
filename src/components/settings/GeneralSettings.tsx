"use client";

import { useState, useEffect, useRef } from "react";
import { useSessionView } from "@/components/AppShell";
import { Save, Settings, Smartphone, BellRing, UploadCloud, Music, CheckCircle2, MessageSquare } from "lucide-react";
import { KalkiPageHeader } from "@/components/ui/KalkiPageHeader";
import { KalkiSection } from "@/components/ui/KalkiSection";
import { KalkiButton } from "@/components/ui/KalkiButton";

export function GeneralSettings() {
  const { selected } = useSessionView();
  const [template, setTemplate] = useState("");
  const [enableMobilePush, setEnableMobilePush] = useState(false);
  const [notificationTone, setNotificationTone] = useState("level-1");
  const [customTones, setCustomTones] = useState<Record<string, string>>({});
  
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
          setEnableMobilePush(data.organization.enableMobilePushNotifications || false);
          setNotificationTone(data.organization.notificationTone || "level-1");
          setCustomTones(data.organization.customTones || {});
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
          enableMobilePushNotifications: enableMobilePush,
          notificationTone: notificationTone,
          customTones: customTones
        })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: "Settings saved successfully!" });
      } else {
        setMessage({ type: 'error', text: "Failed to save settings." });
      }
    } catch (e) {
      setMessage({ type: 'error', text: "An error occurred." });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleFileUpload = async (level: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setCustomTones(prev => ({ ...prev, [level]: data.url || file.name }));
        setMessage({ type: 'success', text: `Tone for ${level} uploaded!` });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setCustomTones(prev => ({ ...prev, [level]: `custom_${file.name}` }));
      }
    } catch (err) {
       setCustomTones(prev => ({ ...prev, [level]: `custom_${file.name}` }));
    }
  };

  if (!selected) return <div style={{ padding: '2rem' }}>Select an organization to view settings.</div>;

  const toneLevels = [
    { id: "level-1", label: "Level 1 - Default Bell" },
    { id: "level-2", label: "Level 2 - Sharp Beep" },
    { id: "level-3", label: "Level 3 - Soft Chime" },
    { id: "level-4", label: "Level 4 - Long Alert" },
    { id: "level-5", label: "Level 5 - Urgent Siren" }
  ];

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155' }}>
                    <BellRing size={16} color="#6366f1" /> Custom Notification Tones
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '1px solid #fcd34d', borderRadius: '50%', textAlign: 'center', lineHeight: '12px' }}>i</span>
                    Supported format: MP3, WAV (Max 2 MB)
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
                            <p style={{ margin: 0, fontSize: '0.75rem', color: customTones[level.id] ? '#059669' : '#94a3b8', marginTop: '0.1rem' }}>
                              {customTones[level.id] ? `Custom tone active` : "Using default system tone"}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="gs-action-btn gs-action-btn-play" onClick={() => alert("Preview playback not available in preview mode")}>
                            <span style={{ fontSize: '0.6rem' }}>▶</span> Play
                          </button>
                          <label>
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
    </>
  );
}

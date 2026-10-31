"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Camera,
  CheckCircle2,
  XCircle,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  Search,
  RefreshCw,
  QrCode,
  ArrowLeft,
  User,
  Users,
  Building2,
  Clock,
  Sparkles
} from "lucide-react";
import * as faceapi from "@vladmandic/face-api";
import {
  recordSelfiePunch,
  getSelfiePunchRoster,
  getDailyPunchState,
  getAttendanceSettings
} from "@/domains/attendance/actions";
import { scanForArucoStrict, drawArucoMarker } from "@/lib/aruco";
import { useSessionView } from "@/components/AppShell";
import "../attendance.css";

interface RosterEmployee {
  id: string;
  employeeCode: string;
  jobTitle?: string | null;
  isSelf: boolean;
  isDirectReport: boolean;
  person: {
    firstName: string;
    lastName?: string | null;
    displayName: string;
    photoUrl?: string | null;
  };
}

export default function SelfiePunchKiosk() {
  const { session, selected } = useSessionView();
  const organizationId = selected?.organizationId;
  const locationId = selected?.locationId;

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [employees, setEmployees] = useState<RosterEmployee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<RosterEmployee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "self" | "reports">("all");

  const [status, setStatus] = useState<
    "idle" | "loading-ai" | "ready" | "verifying" | "success" | "failed"
  >("loading-ai");

  const [failureCount, setFailureCount] = useState(0);
  const [failureMessage, setFailureMessage] = useState("");
  const [availableOptions, setAvailableOptions] = useState<string[]>(["PUNCH_IN"]);
  const [requireWallMarker, setRequireWallMarker] = useState(false);
  const [isMarkerDetected, setIsMarkerDetected] = useState(false);
  const [markerConfidence, setMarkerConfidence] = useState(0);
  const [showMarkerDialog, setShowMarkerDialog] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const markerCanvasRef = useRef<HTMLCanvasElement>(null);
  const arucoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const markerLatchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Digital clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 1. Load face models once
  useEffect(() => {
    let isMounted = true;
    async function loadModels() {
      try {
        // @ts-ignore
        if (faceapi.tf && faceapi.tf.setBackend) {
          // @ts-ignore
          await faceapi.tf.setBackend("webgl").catch(() => {});
          // @ts-ignore
          await faceapi.tf.ready().catch(() => {});
        }

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models/face"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models/face"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models/face"),
        ]);

        if (isMounted) {
          setModelsLoaded(true);
          setStatus("idle");
        }
      } catch (err) {
        console.error("Error loading face models:", err);
        if (isMounted) {
          setModelsLoaded(true); // Allow fallback if models already in memory
          setStatus("idle");
        }
      }
    }
    loadModels();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch hierarchy-aware roster & location attendance settings
  useEffect(() => {
    async function fetchRosterAndSettings() {
      if (!organizationId || !locationId) return;

      // 1. Fetch attendance settings (fail-safe)
      try {
        const settings = await getAttendanceSettings(organizationId, locationId);
        setRequireWallMarker(settings?.requireWallMarker ?? false);
      } catch (err) {
        console.warn("Failed to fetch location attendance settings, defaulting to direct selfie:", err);
        setRequireWallMarker(false);
      }

      // 2. Fetch roster with automatic fallback to /api/employees
      try {
        const roster = await getSelfiePunchRoster(organizationId, locationId);
        if (roster && roster.length > 0) {
          setEmployees(roster);
          return;
        }
      } catch (err) {
        console.warn("getSelfiePunchRoster failed, falling back to location employee directory:", err);
      }

      // Fallback: load employees from standard active directory for this location
      try {
        const res = await fetch(`/api/employees?organizationId=${organizationId}&locationId=${locationId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.employees)) {
            const mapped: RosterEmployee[] = data.employees
              .filter((emp: any) => {
                if (emp.status !== "ACTIVE") return false;
                const code = (emp.employeeCode || "").toUpperCase();
                const title = (emp.jobTitle || "").toLowerCase();
                const name = (emp.person?.displayName || "").toLowerCase();
                if (code.includes("OWNER") || code === "KAL-EMP-0002") return false;
                if (title.includes("owner") || title.includes("director") || title.includes("executive")) return false;
                if (name.includes("owner") || name.includes("prabha")) return false;
                return true;
              })
              .map((emp: any) => ({
                id: emp.id,
                employeeCode: emp.employeeCode,
                jobTitle: emp.jobTitle,
                isSelf: false,
                isDirectReport: false,
                person: {
                  firstName: emp.person?.firstName || "",
                  lastName: emp.person?.lastName || null,
                  displayName: emp.person?.displayName || `${emp.person?.firstName || ""} ${emp.person?.lastName || ""}`.trim() || emp.employeeCode,
                  photoUrl: emp.photoUrl || null,
                }
              }));
            setEmployees(mapped);
          }
        }
      } catch (fallbackErr) {
        console.error("Failed to load employees via directory fallback:", fallbackErr);
      }
    }
    fetchRosterAndSettings();
  }, [organizationId, locationId]);

  // 3. Check daily punch state when employee is selected
  useEffect(() => {
    async function checkState() {
      if (selectedEmployee && organizationId && locationId) {
        try {
          const punches = await getDailyPunchState(
            selectedEmployee.id,
            organizationId,
            locationId
          );
          if (punches.length === 0) {
            setAvailableOptions(["PUNCH_IN"]);
          } else {
            const last = punches[punches.length - 1];
            if (last === "PUNCH_IN")
              setAvailableOptions(["BREAK_IN", "BREAK_OUT", "PUNCH_OUT"]);
            else if (last === "BREAK_IN")
              setAvailableOptions(["BREAK_OUT", "PUNCH_OUT"]);
            else if (last === "BREAK_OUT")
              setAvailableOptions(["PUNCH_OUT"]);
            else if (last === "PUNCH_OUT")
              setAvailableOptions([]);
          }
        } catch (e) {
          console.error(e);
          setAvailableOptions(["PUNCH_IN", "BREAK_IN", "BREAK_OUT", "PUNCH_OUT"]);
        }
      }
    }
    checkState();
  }, [selectedEmployee, organizationId, locationId]);

  // 4. Start / Stop Camera Stream
  const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
        });
        setStatus("ready");

        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().catch(console.error);
            };
          }
        }, 100);
      } catch (err) {
        console.error("Camera access error:", err);
        alert("Camera not found or permission denied. Please allow camera access.");
        setSelectedEmployee(null);
        setStatus("idle");
      }
    } else {
      alert("Camera API not supported or requires HTTPS connection.");
      setSelectedEmployee(null);
      setStatus("idle");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (arucoIntervalRef.current) {
      clearInterval(arucoIntervalRef.current);
      arucoIntervalRef.current = null;
    }
    if (markerLatchTimerRef.current) {
      clearTimeout(markerLatchTimerRef.current);
      markerLatchTimerRef.current = null;
    }
    setIsMarkerDetected(false);
  };

  useEffect(() => {
    if (selectedEmployee) {
      startCamera();
      setFailureCount(0);
      setFailureMessage("");

      // If wall marker verification is disabled for this location, skip interval scanner
      if (!requireWallMarker) {
        setIsMarkerDetected(true);
        setMarkerConfidence(1);
        return;
      }

      // Start periodic visual marker scan every 300ms for smooth real-time response
      let scanning = false;
      arucoIntervalRef.current = setInterval(async () => {
        if (scanning) return;
        if (videoRef.current && videoRef.current.readyState >= 2) {
          scanning = true;
          try {
            const scan = await scanForArucoStrict(videoRef.current, 0);
            if (scan.detected) {
              setIsMarkerDetected(true);
              setMarkerConfidence(scan.confidence);
              // Cancel pending un-latch timer
              if (markerLatchTimerRef.current) {
                clearTimeout(markerLatchTimerRef.current);
                markerLatchTimerRef.current = null;
              }
            } else {
              // Grace latch: keep marker status verified for 2.0s before clearing
              // prevents momentary camera jitter or angle adjustment from immediately dropping out
              if (!markerLatchTimerRef.current) {
                markerLatchTimerRef.current = setTimeout(() => {
                  setIsMarkerDetected(false);
                  setMarkerConfidence(0);
                  markerLatchTimerRef.current = null;
                }, 2000);
              }
            }
          } finally {
            scanning = false;
          }
        }
      }, 300);
    } else {
      stopCamera();
      if (modelsLoaded) setStatus("idle");
    }
    return () => stopCamera();
  }, [selectedEmployee, modelsLoaded, requireWallMarker]);

  // Render Marker preview on modal
  useEffect(() => {
    if (showMarkerDialog && markerCanvasRef.current) {
      drawArucoMarker(0, 240, markerCanvasRef.current);
    }
  }, [showMarkerDialog]);

  // 5. Verification & Punch Processing
  const captureAndVerify = async (
    punchType: "PUNCH_IN" | "PUNCH_OUT" | "BREAK_IN" | "BREAK_OUT"
  ) => {
    if (!videoRef.current || !selectedEmployee) return;
    setStatus("verifying");

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const snapshotBase64 = canvas.toDataURL("image/jpeg", 0.75);

      // Strict Physical Wall Marker Gate: Anti-Spoofing Verification (if configured)
      let markerDetected = true;
      let markerConfidenceScore = 1;
      if (requireWallMarker) {
        const markerScan = await scanForArucoStrict(canvas, 0);
        markerDetected = markerScan.detected;
        markerConfidenceScore = markerScan.confidence;
        if (!markerScan.detected) {
          handleFailure("Wall Marker Not Detected. Please stand in front of the official entrance marker to punch.");
          return;
        }
      }

      // Face detection in current frame
      const detections = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        handleFailure("No face detected. Please ensure your face is inside the oval.");
        return;
      }

      // Check registered photo
      if (!selectedEmployee.person?.photoUrl) {
        // Fallback: If no photo is registered yet, accept punch with warning
        console.warn("No registered face photo on record. Proceeding with selfie record capture.");
      } else {
        try {
          const refImg = await faceapi.fetchImage(selectedEmployee.person.photoUrl);
          const refDetections = await faceapi
            .detectSingleFace(refImg, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (refDetections) {
            const distance = faceapi.euclideanDistance(
              detections.descriptor,
              refDetections.descriptor
            );

            // Distance threshold: 0.55 allows natural variance while blocking impostors
            if (distance > 0.55) {
              handleFailure("Face mismatch. Face does not match the registered profile.");
              return;
            }
          }
        } catch (err) {
          console.warn("Could not verify against registered photo, proceeding with snapshot recording:", err);
        }
      }

      // Record to server
      const result = await recordSelfiePunch({
        employeeId: selectedEmployee.id,
        punchType,
        snapshotBase64,
        organizationId: organizationId!,
        locationId: locationId!,
        markerVerified: markerDetected,
        confidence: markerConfidenceScore
      });

      if (result.success) {
        setStatus("success");
        setTimeout(() => {
          setSelectedEmployee(null);
          setStatus("idle");
        }, 2500);
      } else {
        handleFailure(result.error || "Punch could not be saved to server.");
      }
    } catch (err) {
      console.error("Capture & verification failed:", err);
      handleFailure(err instanceof Error ? err.message : "Verification error occurred.");
    }
  };

  const handleFailure = (msg: string) => {
    const nextCount = failureCount + 1;
    setFailureCount(nextCount);
    setFailureMessage(msg);
    if (nextCount >= 3) {
      setStatus("failed");
    } else {
      setStatus("ready");
    }
  };

  // Filtered roster lists
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const name = (emp.person.displayName || `${emp.person.firstName} ${emp.person.lastName || ""}`).toLowerCase();
      const code = (emp.employeeCode || "").toLowerCase();
      const matchQuery = name.includes(searchQuery.toLowerCase()) || code.includes(searchQuery.toLowerCase());
      if (!matchQuery) return false;

      if (activeTab === "self") return emp.isSelf;
      if (activeTab === "reports") return emp.isDirectReport;
      return true;
    });
  }, [employees, searchQuery, activeTab]);

  const hasSelf = employees.some((e) => e.isSelf);
  const hasReports = employees.some((e) => e.isDirectReport);

  if (!organizationId || !locationId) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
        <Building2 size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
        <h2>Location Required</h2>
        <p>Please select an organization and location from the top navigation to access the Selfie Punch Kiosk.</p>
      </div>
    );
  }

  return (
    <div style={{
      width: "100%",
      display: "flex",
      flexDirection: "column",
      fontFamily: "var(--font-inter), sans-serif",
      color: "#0f172a"
    }}>
      {/* Kiosk Top Bar */}
      <div style={{
        background: "#0f172a",
        color: "#ffffff",
        padding: "0.85rem 1.5rem",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        marginBottom: "1.25rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff"
          }}>
            <Camera size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              Kalki Selfie Attendance Kiosk
              <span style={{
                background: "#10b981",
                fontSize: "0.7rem",
                padding: "2px 8px",
                borderRadius: "12px",
                color: "#ffffff",
                fontWeight: 600
              }}>
                LIVE
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              {requireWallMarker ? "Visual Marker Verification • Fast Hierarchy Roster" : "Direct Selfie Verification • Fast Hierarchy Roster"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          {requireWallMarker && (
            <button
              onClick={() => setShowMarkerDialog(true)}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#e2e8f0",
                padding: "0.45rem 0.9rem",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.85rem",
                fontWeight: 500
              }}
            >
              <QrCode size={16} />
              Show Anti-Spoof Marker
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.95rem", fontWeight: 600, color: "#38bdf8" }}>
            <Clock size={18} />
            <span>{currentTime}</span>
          </div>
        </div>
      </div>

      {/* Main Kiosk Area */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.5rem 0"
      }}>
        {/* Loading AI State */}
        {status === "loading-ai" && (
          <div style={{
            background: "#ffffff",
            padding: "3rem",
            borderRadius: "16px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
            border: "1px solid #e2e8f0",
            textAlign: "center",
            maxWidth: "420px"
          }}>
            <div style={{
              width: "48px",
              height: "48px",
              border: "4px solid #e2e8f0",
              borderTopColor: "#3b82f6",
              borderRadius: "50%",
              margin: "0 auto 1.5rem",
              animation: "spin 1s linear infinite"
            }} />
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem", fontWeight: 700 }}>Initializing AI Models</h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
              Loading tiny face detector and facial landmark neural networks...
            </p>
          </div>
        )}

        {/* Idle State: Hierarchy Roster Selector */}
        {status === "idle" && (
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            border: "1px solid #e2e8f0",
            width: "100%",
            maxWidth: "760px",
            display: "flex",
            flexDirection: "column"
          }}>
            {/* Header */}
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>Select Your Profile</h2>
                  <p style={{ margin: "0.2rem 0 0 0", color: "#64748b", fontSize: "0.85rem" }}>
                    Tap your name below to start visual facial verification
                  </p>
                </div>
                <div style={{
                  background: "#eff6ff",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  color: "#1d4ed8",
                  fontWeight: 600
                }}>
                  {filteredEmployees.length} Available
                </div>
              </div>

              {/* Search Bar */}
              <div style={{ position: "relative", marginBottom: "0.75rem" }}>
                <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Search by employee name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.65rem 1rem 0.65rem 2.6rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.95rem",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Hierarchy Filter Tabs */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => setActiveTab("all")}
                  style={{
                    padding: "0.45rem 1rem",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "none",
                    background: activeTab === "all" ? "#0f172a" : "#f1f5f9",
                    color: activeTab === "all" ? "#ffffff" : "#475569"
                  }}
                >
                  All Staff
                </button>
                {hasSelf && (
                  <button
                    onClick={() => setActiveTab("self")}
                    style={{
                      padding: "0.45rem 1rem",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      background: activeTab === "self" ? "#3b82f6" : "#eff6ff",
                      color: activeTab === "self" ? "#ffffff" : "#1d4ed8"
                    }}
                  >
                    <User size={14} /> My Profile
                  </button>
                )}
                {hasReports && (
                  <button
                    onClick={() => setActiveTab("reports")}
                    style={{
                      padding: "0.45rem 1rem",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      background: activeTab === "reports" ? "#10b981" : "#ecfdf5",
                      color: activeTab === "reports" ? "#ffffff" : "#047857"
                    }}
                  >
                    <Users size={14} /> My Direct Reports
                  </button>
                )}
              </div>
            </div>

            {/* Roster List (Flows naturally without inner trapped scrollbar) */}
            <div style={{ padding: "1.25rem" }}>
              {filteredEmployees.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
                  <User size={40} style={{ margin: "0 auto 0.75rem", opacity: 0.4 }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>No matching staff members found.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  {filteredEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.85rem",
                        padding: "0.85rem",
                        borderRadius: "10px",
                        border: emp.isSelf ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                        background: emp.isSelf ? "#f0f7ff" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.06)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {/* Photo or Initials */}
                      <div style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        background: emp.isSelf ? "#3b82f6" : "#e2e8f0",
                        color: emp.isSelf ? "#ffffff" : "#475569",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        overflow: "hidden",
                        flexShrink: 0
                      }}>
                        {emp.person.photoUrl ? (
                          <img
                            src={emp.person.photoUrl}
                            alt={emp.person.displayName}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          emp.person.displayName.charAt(0).toUpperCase()
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {emp.person.displayName}
                          </span>
                          {emp.isSelf && (
                            <span style={{
                              background: "#3b82f6",
                              color: "#fff",
                              fontSize: "0.65rem",
                              padding: "1px 6px",
                              borderRadius: "10px",
                              fontWeight: 700
                            }}>
                              YOU
                            </span>
                          )}
                          {emp.isDirectReport && (
                            <span style={{
                              background: "#10b981",
                              color: "#fff",
                              fontSize: "0.65rem",
                              padding: "1px 6px",
                              borderRadius: "10px",
                              fontWeight: 700
                            }}>
                              REPORT
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                          {emp.employeeCode} {emp.jobTitle ? `• ${emp.jobTitle}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Camera & Punch Mode */}
        {selectedEmployee && (status === "ready" || status === "verifying") && (
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            border: "1px solid #e2e8f0",
            width: "100%",
            maxWidth: "520px",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}>
            {/* Top employee badge */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              marginBottom: "1rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  overflow: "hidden"
                }}>
                  {selectedEmployee.person.photoUrl ? (
                    <img
                      src={selectedEmployee.person.photoUrl}
                      alt={selectedEmployee.person.displayName}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    selectedEmployee.person.displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                    {selectedEmployee.person.displayName}
                  </h3>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    ID: {selectedEmployee.employeeCode}
                  </div>
                </div>
              </div>

              {/* Visual Marker Status Indicator (Only if required) */}
              {requireWallMarker && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  background: isMarkerDetected ? "#ecfdf5" : "#fffbeb",
                  color: isMarkerDetected ? "#047857" : "#b45309",
                  border: `1px solid ${isMarkerDetected ? "#a7f3d0" : "#fde68a"}`
                }}>
                  {isMarkerDetected ? (
                    <>
                      <ShieldCheck size={14} />
                      <span>Marker Verified</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={14} />
                      <span>Align with Wall Marker</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Video Viewport with Alignment Oval */}
            <div style={{
              position: "relative",
              width: "320px",
              height: "380px",
              borderRadius: "24px",
              overflow: "hidden",
              background: "#000000",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              marginBottom: "1.5rem"
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scaleX(-1)"
                }}
              />

              {/* Visual Face Oval Alignment Overlay */}
              <div style={{
                position: "absolute",
                top: "15%",
                left: "15%",
                width: "70%",
                height: "65%",
                borderRadius: "50%",
                border: status === "verifying" ? "3px solid #3b82f6" : (!requireWallMarker || isMarkerDetected) ? "3px dashed #10b981" : "3px dashed rgba(255,255,255,0.7)",
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.4)",
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s ease"
              }}>
                {status === "verifying" && (
                  <div style={{
                    width: "40px",
                    height: "40px",
                    border: "3px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#ffffff",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                )}
              </div>

              {/* Instruction Banner at bottom of camera */}
              <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "0.6rem",
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(4px)",
                color: "#ffffff",
                fontSize: "0.75rem",
                textAlign: "center"
              }}>
                {status === "verifying"
                  ? "Comparing face descriptors..."
                  : "Center your face in the oval"}
              </div>
            </div>

            {/* Error / Warning Alert */}
            {failureMessage && (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                padding: "0.6rem 1rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                marginBottom: "1rem",
                textAlign: "center",
                width: "100%",
                boxSizing: "border-box"
              }}>
                {failureMessage}
              </div>
            )}

            {/* Punch Action Buttons */}
            <div style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: availableOptions.length > 1 ? "1fr 1fr" : "1fr",
              gap: "0.75rem"
            }}>
              {availableOptions.length === 0 ? (
                <div style={{
                  gridColumn: "span 2",
                  textAlign: "center",
                  padding: "1rem",
                  background: "#f0fdf4",
                  borderRadius: "8px",
                  border: "1px solid #bbf7d0",
                  color: "#15803d"
                }}>
                  <strong style={{ fontSize: "1rem", display: "block" }}>Day Shift Concluded</strong>
                  <span style={{ fontSize: "0.85rem" }}>You have already punched out for today.</span>
                </div>
              ) : (
                <>
                  {availableOptions.includes("PUNCH_IN") && (
                    <button
                      onClick={() => captureAndVerify("PUNCH_IN")}
                      disabled={status === "verifying" || (requireWallMarker && !isMarkerDetected)}
                      title={requireWallMarker && !isMarkerDetected ? "Align camera with physical wall marker to punch" : ""}
                      style={{
                        padding: "0.85rem",
                        borderRadius: "8px",
                        background: (requireWallMarker && !isMarkerDetected) ? "#cbd5e1" : "#10b981",
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        border: "none",
                        cursor: (requireWallMarker && !isMarkerDetected) ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        opacity: (requireWallMarker && !isMarkerDetected) ? 0.7 : 1,
                        transition: "all 0.2s ease"
                      }}
                    >
                      <UserCheck size={18} />
                      Punch IN
                    </button>
                  )}
                  {availableOptions.includes("PUNCH_OUT") && (
                    <button
                      onClick={() => captureAndVerify("PUNCH_OUT")}
                      disabled={status === "verifying" || (requireWallMarker && !isMarkerDetected)}
                      title={requireWallMarker && !isMarkerDetected ? "Align camera with physical wall marker to punch" : ""}
                      style={{
                        padding: "0.85rem",
                        borderRadius: "8px",
                        background: (requireWallMarker && !isMarkerDetected) ? "#cbd5e1" : "#ef4444",
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        border: "none",
                        cursor: (requireWallMarker && !isMarkerDetected) ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        opacity: (requireWallMarker && !isMarkerDetected) ? 0.7 : 1,
                        transition: "all 0.2s ease"
                      }}
                    >
                      <UserCheck size={18} />
                      Punch OUT
                    </button>
                  )}
                  {availableOptions.includes("BREAK_IN") && (
                    <button
                      onClick={() => captureAndVerify("BREAK_IN")}
                      disabled={status === "verifying"}
                      style={{
                        padding: "0.85rem",
                        borderRadius: "8px",
                        background: "#f1f5f9",
                        color: "#0f172a",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        border: "1px solid #cbd5e1",
                        cursor: "pointer"
                      }}
                    >
                      Break IN
                    </button>
                  )}
                  {availableOptions.includes("BREAK_OUT") && (
                    <button
                      onClick={() => captureAndVerify("BREAK_OUT")}
                      disabled={status === "verifying"}
                      style={{
                        padding: "0.85rem",
                        borderRadius: "8px",
                        background: "#f1f5f9",
                        color: "#0f172a",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        border: "1px solid #cbd5e1",
                        cursor: "pointer"
                      }}
                    >
                      Break OUT
                    </button>
                  )}
                </>
              )}

              <button
                onClick={() => setSelectedEmployee(null)}
                disabled={status === "verifying"}
                style={{
                  gridColumn: availableOptions.length > 1 ? "span 2" : "auto",
                  padding: "0.6rem",
                  borderRadius: "8px",
                  background: "transparent",
                  color: "#64748b",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem"
                }}
              >
                <ArrowLeft size={16} /> Back to Staff List
              </button>
            </div>
          </div>
        )}

        {/* Success Modal Overlay */}
        {status === "success" && (
          <div style={{
            background: "#ffffff",
            padding: "3rem",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            border: "1px solid #bbf7d0",
            textAlign: "center",
            maxWidth: "420px"
          }}>
            <CheckCircle2 size={64} style={{ color: "#10b981", margin: "0 auto 1rem" }} />
            <h2 style={{ margin: "0 0 0.5rem 0", color: "#0f172a" }}>Punch Verified!</h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
              Attendance recorded successfully for {selectedEmployee?.person.displayName}.
            </p>
          </div>
        )}

        {/* Failed Lockout State */}
        {status === "failed" && (
          <div style={{
            background: "#ffffff",
            padding: "3rem",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            border: "1px solid #fecaca",
            textAlign: "center",
            maxWidth: "420px"
          }}>
            <XCircle size={64} style={{ color: "#ef4444", margin: "0 auto 1rem" }} />
            <h2 style={{ margin: "0 0 0.5rem 0", color: "#0f172a" }}>Verification Failed</h2>
            <p style={{ margin: "0 0 1.5rem 0", color: "#64748b", fontSize: "0.9rem" }}>
              Unable to verify face after 3 attempts. Please ensure proper room lighting or notify your supervisor.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button
                onClick={() => {
                  setFailureCount(0);
                  setFailureMessage("");
                  setStatus("ready");
                }}
                style={{
                  padding: "0.75rem 1.25rem",
                  background: "#3b82f6",
                  color: "#ffffff",
                  borderRadius: "8px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => setSelectedEmployee(null)}
                style={{
                  padding: "0.75rem 1.25rem",
                  background: "#f1f5f9",
                  color: "#0f172a",
                  borderRadius: "8px",
                  fontWeight: 600,
                  border: "1px solid #cbd5e1",
                  cursor: "pointer"
                }}
              >
                Switch Profile
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ArUco Wall Marker Print & Display Dialog */}
      {showMarkerDialog && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "#ffffff",
            padding: "2rem",
            borderRadius: "16px",
            maxWidth: "380px",
            width: "90%",
            textAlign: "center",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
          }}>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem", fontWeight: 700 }}>
              Physical Location Marker #0
            </h3>
            <p style={{ margin: "0 0 1.5rem 0", color: "#64748b", fontSize: "0.85rem" }}>
              Print or display this ArUco marker behind the kiosk stand to guarantee physical presence verification.
            </p>

            <div style={{
              display: "inline-block",
              padding: "1rem",
              background: "#ffffff",
              border: "2px solid #000000",
              borderRadius: "8px",
              marginBottom: "1.5rem"
            }}>
              <canvas ref={markerCanvasRef} width={240} height={240} />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button
                onClick={() => window.print()}
                style={{
                  padding: "0.6rem 1.2rem",
                  background: "#0f172a",
                  color: "#ffffff",
                  borderRadius: "6px",
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Print Marker
              </button>
              <button
                onClick={() => setShowMarkerDialog(false)}
                style={{
                  padding: "0.6rem 1.2rem",
                  background: "#f1f5f9",
                  color: "#475569",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation spinner style */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}

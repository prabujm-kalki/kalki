"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, XCircle, UserCheck } from "lucide-react";
import * as faceapi from "@vladmandic/face-api";
import { recordSelfiePunch, getKioskEmployees, getDailyPunchState } from "@/domains/attendance/actions";
import { useSessionView } from "@/components/AppShell";
// We reuse the existing attendance.css for styling as requested
import "../attendance.css";

export default function SelfiePunchKiosk() {
  const { session, selected } = useSessionView();
  const organizationId = selected?.organizationId;
  const locationId = selected?.locationId;

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  
  const [status, setStatus] = useState<
    "idle" | "loading-ai" | "ready" | "verifying" | "success" | "failed"
  >("loading-ai");
  
  const [failureCount, setFailureCount] = useState(0);
  const [availableOptions, setAvailableOptions] = useState<string[]>(["PUNCH_IN"]);

  useEffect(() => {
    async function checkState() {
      if (selectedEmployee && organizationId && locationId) {
        try {
          const punches = await getDailyPunchState(selectedEmployee.id, organizationId, locationId);
          if (punches.length === 0) {
            setAvailableOptions(["PUNCH_IN"]);
          } else {
            const last = punches[punches.length - 1];
            if (last === "PUNCH_IN") setAvailableOptions(["BREAK_IN", "BREAK_OUT", "PUNCH_OUT"]);
            else if (last === "BREAK_IN") setAvailableOptions(["BREAK_OUT", "PUNCH_OUT"]);
            else if (last === "BREAK_OUT") setAvailableOptions(["PUNCH_OUT"]);
            else if (last === "PUNCH_OUT") setAvailableOptions([]);
          }
        } catch (e) {
          console.error(e);
          setAvailableOptions(["PUNCH_IN", "BREAK_IN", "BREAK_OUT", "PUNCH_OUT"]);
        }
      }
    }
    checkState();
  }, [selectedEmployee, organizationId, locationId]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function loadModels() {
      try {
        // Initialize TensorFlow backend first
        // @ts-ignore
        await faceapi.tf.setBackend('webgl');
        // @ts-ignore
        await faceapi.tf.ready();
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models/face"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models/face"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models/face"),
        ]);
        setModelsLoaded(true);
        setStatus("idle");
      } catch (err) {
        console.error("Error loading models", err);
      }
    }
    loadModels();
  }, []);

  useEffect(() => {
    async function fetchEmployees() {
      if (!organizationId || !locationId) return;
      try {
        const kioskEmployees = await getKioskEmployees(organizationId, locationId);
        setEmployees(kioskEmployees);
      } catch (err) {
        console.error("Failed to fetch employees", err);
      }
    }
    fetchEmployees();
  }, [organizationId, locationId]);

  const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        // The <video> element is only rendered when status is "ready"
        setStatus("ready");
        
        // Wait for React to mount the video element into the DOM
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().catch(console.error);
            };
          }
        }, 100);
      } catch (err) {
        console.error("Error accessing camera", err);
        alert("Camera not found or permission denied. Please ensure a camera is connected and allowed.");
        setSelectedEmployee(null); // Reset selection
        setStatus("idle");
      }
    } else {
      alert("Camera API not supported in this browser.");
      setSelectedEmployee(null);
      setStatus("idle");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  useEffect(() => {
    if (selectedEmployee) {
      startCamera();
      setFailureCount(0);
    } else {
      stopCamera();
      if (modelsLoaded) setStatus("idle");
    }
    return () => stopCamera();
  }, [selectedEmployee, modelsLoaded]);

  const captureAndVerify = async (punchType: "PUNCH_IN" | "PUNCH_OUT" | "BREAK_IN" | "BREAK_OUT") => {
    if (!videoRef.current || !selectedEmployee) return;
    setStatus("verifying");

    try {
      // Create a canvas to capture the image
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const snapshotBase64 = canvas.toDataURL("image/jpeg", 0.7);

      // Detect face in current frame
      const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        handleFailure();
        return;
      }

      // Fetch the registered employee photo for comparison
      if (!selectedEmployee.person?.photoUrl) {
        alert("Verification failed: No registered photo found for this employee. Please update the employee profile first.");
        handleFailure();
        return;
      }

      try {
        const refImg = await faceapi.fetchImage(selectedEmployee.person.photoUrl);
        const refDetections = await faceapi.detectSingleFace(refImg, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!refDetections) {
          alert("Verification failed: The registered employee photo is invalid (no face detected).");
          handleFailure();
          return;
        }

        const distance = faceapi.euclideanDistance(detections.descriptor, refDetections.descriptor);
        
        // 0.6 is the standard threshold for face-api.js, we use 0.5 for slightly stricter verification
        if (distance > 0.5) {
          alert("Face verification failed: You do not match the registered employee photo.");
          handleFailure();
          return;
        }
      } catch (err) {
        console.error("Failed to load reference image or verify", err);
        alert("Verification failed: Unable to load or process the registered employee photo.");
        handleFailure();
        return;
      }

      // Call Server Action
      const result = await recordSelfiePunch({
        employeeId: selectedEmployee.id,
        punchType,
        snapshotBase64,
        organizationId: organizationId!,
        locationId: locationId!,
      });

      if (result.success) {
        setStatus("success");
        setTimeout(() => {
          setSelectedEmployee(null);
          setStatus("idle");
        }, 3000);
      } else {
        handleFailure();
      }

    } catch (err) {
      console.error(err);
      handleFailure();
    }
  };

  const handleFailure = () => {
    const newCount = failureCount + 1;
    setFailureCount(newCount);
    if (newCount >= 3) {
      setStatus("failed");
    } else {
      setStatus("ready");
      alert("Face not detected clearly or mismatch. Please try again.");
    }
  };

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  if (!organizationId || !locationId) return <div className="att-layout"><main className="att-content">Please select an organization and location.</main></div>;

  return (
    <div className="selfie-kiosk-container">
      <div className="kiosk-header">
        <h1><Camera size={24} /> Selfie Punch Kiosk</h1>
        <p>Position your face in the circle to verify attendance</p>
      </div>

      {status === "loading-ai" && (
        <div className="kiosk-status overlay-loading">
          <div className="spinner"></div>
          <h2>Loading AI models...</h2>
        </div>
      )}

      {status === "idle" && (
        <div className="kiosk-selector">
          <h2>Select Employee</h2>
          <select 
            className="employee-dropdown"
            onChange={(e) => {
              const emp = employees.find(emp => emp.id === e.target.value);
              setSelectedEmployee(emp || null);
            }}
            value={selectedEmployee?.id || ""}
          >
            <option value="">-- Choose Employee --</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.person?.displayName} ({emp.employeeCode})</option>
            ))}
          </select>
        </div>
      )}

      {selectedEmployee && (status === "ready" || status === "verifying") && (
        <div className="kiosk-camera-view">
          <h3>{selectedEmployee.person?.displayName}</h3>
          
          <div className="camera-wrapper">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="kiosk-video"
            />
            <div className="camera-overlay-circle"></div>
          </div>

          <div className="kiosk-actions" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {availableOptions.length === 0 ? (
              <div style={{ gridColumn: "span 2", textAlign: "center", padding: "1rem", color: "var(--att-success)" }}>
                <strong>Shift Completed</strong>
                <p style={{ fontSize: "0.875rem", margin: 0 }}>You have successfully punched out for the day.</p>
              </div>
            ) : (
              <>
                {availableOptions.includes("PUNCH_IN") && (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => captureAndVerify("PUNCH_IN")}
                    disabled={status === "verifying"}
                  >
                    {status === "verifying" ? "Verifying..." : "Punch IN"}
                  </button>
                )}
                {availableOptions.includes("PUNCH_OUT") && (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => captureAndVerify("PUNCH_OUT")}
                    disabled={status === "verifying"}
                    style={{ backgroundColor: "var(--att-destructive)", borderColor: "var(--att-destructive)" }}
                  >
                    {status === "verifying" ? "Verifying..." : "Punch OUT"}
                  </button>
                )}
                {availableOptions.includes("BREAK_IN") && (
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => captureAndVerify("BREAK_IN")}
                    disabled={status === "verifying"}
                  >
                    {status === "verifying" ? "Verifying..." : "Break IN"}
                  </button>
                )}
                {availableOptions.includes("BREAK_OUT") && (
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => captureAndVerify("BREAK_OUT")}
                    disabled={status === "verifying"}
                  >
                    {status === "verifying" ? "Verifying..." : "Break OUT"}
                  </button>
                )}
              </>
            )}
            <button 
              className="btn btn-text" 
              onClick={() => setSelectedEmployee(null)}
              disabled={status === "verifying"}
              style={{ gridColumn: "span 2" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {status === "success" && (
        <div className="kiosk-status overlay-success">
          <CheckCircle2 size={64} className="text-green-500" />
          <h2>Verification Successful</h2>
          <p>Your punch has been recorded.</p>
        </div>
      )}

      {status === "failed" && (
        <div className="kiosk-status overlay-error">
          <XCircle size={64} className="text-red-500" />
          <h2>Face Mismatch</h2>
          <p>Failed to verify identity 3 times.</p>
          <button 
            className="btn btn-primary mt-4" 
            onClick={() => {
              setFailureCount(0);
              setStatus("ready");
            }}
          >
            Please try again
          </button>
          <button 
            className="btn btn-text mt-4" 
            onClick={() => setSelectedEmployee(null)}
          >
            Switch Employee
          </button>
        </div>
      )}

      {/* Internal CSS for the kiosk view to keep it Vanilla CSS as requested */}
      <style dangerouslySetInnerHTML={{__html: `
        .selfie-kiosk-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 120px);
          background: #f8fafc;
          padding: 2rem;
          font-family: var(--font-inter), sans-serif;
        }
        .kiosk-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .kiosk-header h1 {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 2rem;
          color: #0f172a;
          margin-bottom: 0.5rem;
        }
        .kiosk-header p {
          color: #64748b;
        }
        .kiosk-selector {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          width: 100%;
          max-width: 400px;
          text-align: center;
        }
        .employee-dropdown {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          margin-top: 1rem;
          font-size: 1rem;
        }
        .kiosk-camera-view {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        .camera-wrapper {
          position: relative;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          overflow: hidden;
          margin: 1.5rem 0;
          background: #000;
          box-shadow: 0 0 0 4px #e2e8f0;
        }
        .kiosk-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }
        .camera-overlay-circle {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          border: 2px dashed rgba(255,255,255,0.5);
          border-radius: 50%;
          pointer-events: none;
        }
        .kiosk-actions {
          display: flex;
          gap: 1rem;
        }
        .kiosk-actions .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .btn-primary { background: #0ea5e9; color: white; }
        .btn-primary:hover { background: #0284c7; }
        .btn-secondary { background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1 !important; }
        .btn-secondary:hover { background: #e2e8f0; }
        .btn-text { background: transparent; color: #64748b; }
        .btn-text:hover { color: #0f172a; }
        
        .kiosk-status {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          text-align: center;
        }
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #0ea5e9;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        .overlay-success h2 { color: #10b981; margin-top: 1rem; }
        .overlay-error h2 { color: #ef4444; margin-top: 1rem; }
      `}} />
    </div>
  );
}

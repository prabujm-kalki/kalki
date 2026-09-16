"use client";

import { useState, type FormEvent } from "react";
import { apiSend } from "@/lib/api";
import { StatusMessage } from "@/components/StatusMessage";

type EmployeeFormProps = {
  organizationId: string;
  locationId: string;
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
};

export function EmployeeForm({ organizationId, locationId, initialData, onSuccess, onCancel }: EmployeeFormProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    jobTitle: initialData?.jobTitle || "",
    employmentStartDate: initialData?.employmentStartDate || new Date().toISOString().split("T")[0],
    firstName: initialData?.person?.firstName || "",
    lastName: initialData?.person?.lastName || "",
    displayName: initialData?.person?.displayName || "",
    phone: initialData?.person?.phone || "",
    email: initialData?.person?.email || "",
    dateOfBirth: initialData?.person?.dateOfBirth || "",
    status: initialData?.status || "DRAFT",
    aadhaarDocumentUrl: initialData?.aadhaarDocumentUrl || "",
    photoUrl: initialData?.photoUrl || "",
    applicationFormUrl: initialData?.applicationFormUrl || "",
    otherDocumentsUrl: initialData?.otherDocumentsUrl || "",
    biometricId: initialData?.biometricId || "",
    posId: initialData?.posId || "",
    category: initialData?.category || "",
    gender: initialData?.gender || "",
    maritalStatus: initialData?.maritalStatus || "",
    residentialAddress: initialData?.residentialAddress || "",
    bloodGroup: initialData?.bloodGroup || "",
    reportingEmployeeId: initialData?.reportingEmployeeId || "",
    secondaryMobile: initialData?.secondaryMobile || "",
  });

  const [files, setFiles] = useState<{
    aadhaar?: File;
    photo?: File;
    applicationForm?: File;
    otherDocuments?: File;
  }>({});

  const [provisionAccess, setProvisionAccess] = useState(false);
  const [provisionEmail, setProvisionEmail] = useState("");
  const [provisionPassword, setProvisionPassword] = useState("");

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "firstName" && !formData.displayName) {
      setFormData((prev) => ({ ...prev, displayName: value }));
    }
  }

  function handleFileChange(field: keyof typeof files, file: File | null) {
    setFiles((prev) => ({ ...prev, [field]: file || undefined }));
  }

  async function uploadFiles() {
    const uploadData = new FormData();
    let hasFiles = false;
    if (files.aadhaar) { uploadData.append("aadhaar", files.aadhaar); hasFiles = true; }
    if (files.photo) { uploadData.append("photo", files.photo); hasFiles = true; }
    if (files.applicationForm) { uploadData.append("applicationForm", files.applicationForm); hasFiles = true; }
    if (files.otherDocuments) { uploadData.append("otherDocuments", files.otherDocuments); hasFiles = true; }

    if (!hasFiles) return {};

    const res = await fetch("/api/upload", {
      method: "POST",
      body: uploadData,
    });
    if (!res.ok) throw new Error("File upload failed");
    const data = await res.json();
    return data.urls as Record<string, string>;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const uploadedUrls = await uploadFiles();

      const payload = {
        organizationId,
        locationId,
        jobTitle: formData.jobTitle || null,
        employmentStartDate: formData.employmentStartDate,
        category: formData.category || undefined,
        gender: formData.gender || undefined,
        maritalStatus: formData.maritalStatus || undefined,
        residentialAddress: formData.residentialAddress || null,
        bloodGroup: formData.bloodGroup || undefined,
        reportingEmployeeId: formData.reportingEmployeeId || null,
        secondaryMobile: formData.secondaryMobile || null,
        person: {
          firstName: formData.firstName,
          lastName: formData.lastName || null,
          displayName: formData.displayName,
          phone: formData.phone || null,
          email: formData.email || null,
          dateOfBirth: formData.dateOfBirth || null,
        },
        status: formData.status,
        aadhaarDocumentUrl: uploadedUrls.aadhaar || formData.aadhaarDocumentUrl || null,
        photoUrl: uploadedUrls.photo || formData.photoUrl || null,
        applicationFormUrl: uploadedUrls.applicationForm || formData.applicationFormUrl || null,
        otherDocumentsUrl: uploadedUrls.otherDocuments || formData.otherDocumentsUrl || null,
        biometricId: formData.biometricId,
        posId: formData.posId || null,
      };

      if (initialData?.id) {
        // Strip fields not allowed in update schema
        const updatePayload = {
          jobTitle: payload.jobTitle,
          status: payload.status,
          category: payload.category,
          gender: payload.gender,
          maritalStatus: payload.maritalStatus,
          residentialAddress: payload.residentialAddress,
          bloodGroup: payload.bloodGroup,
          reportingEmployeeId: payload.reportingEmployeeId,
          secondaryMobile: payload.secondaryMobile,
          aadhaarDocumentUrl: payload.aadhaarDocumentUrl,
          photoUrl: payload.photoUrl,
          applicationFormUrl: payload.applicationFormUrl,
          otherDocumentsUrl: payload.otherDocumentsUrl,
          biometricId: payload.biometricId,
          posId: payload.posId,
          person: payload.person,
        };
        await apiSend(`/api/employees?id=${initialData.id}`, "PATCH", updatePayload);
      } else {
        const createPayload = {
          ...payload,
          ...(provisionAccess && !initialData?.id ? {
            provisionAccess: {
              email: provisionEmail,
              password: provisionPassword,
            }
          } : {})
        };
        await apiSend("/api/employees", "POST", createPayload);
      }
      onSuccess();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to save employee");
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="panel stack">
      <div className="panel-header">
        <h3>{initialData ? "Edit Employee" : "Add New Employee"}</h3>
        <button type="button" className="secondary-button" onClick={onCancel} disabled={pending}>Cancel</button>
      </div>
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      
      <div className="grid-2">
        <div className="field">
          <label>First name *</label>
          <input required type="text" value={formData.firstName} onChange={(e) => handleChange("firstName", e.target.value)} disabled={pending} />
        </div>
        <div className="field">
          <label>Last name</label>
          <input type="text" value={formData.lastName} onChange={(e) => handleChange("lastName", e.target.value)} disabled={pending} />
        </div>
        <div className="field">
          <label>Display name *</label>
          <input required type="text" value={formData.displayName} onChange={(e) => handleChange("displayName", e.target.value)} disabled={pending} />
        </div>
        <div className="field">
          <label>Employee code</label>
          <input type="text" value={initialData?.employeeCode || "Auto-generated upon save"} disabled={true} />
        </div>
        <div className="field">
          <label>Job title</label>
          <input type="text" value={formData.jobTitle} onChange={(e) => handleChange("jobTitle", e.target.value)} disabled={pending} />
        </div>
        <div className="field">
          <label>Start date *</label>
          <input required type="date" value={formData.employmentStartDate} onChange={(e) => handleChange("employmentStartDate", e.target.value)} disabled={pending} />
        </div>
        <div className="field">
          <label>Phone</label>
          <input type="tel" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} disabled={pending} />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} disabled={pending} />
        </div>
        <div className="field">
          <label>Status</label>
          <select value={formData.status} onChange={(e) => handleChange("status", e.target.value)} disabled={pending}>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="EXITED">Exited</option>
          </select>
        </div>
        <div className="field">
          <label>Category</label>
          <select value={formData.category} onChange={(e) => handleChange("category", e.target.value)} disabled={pending}>
            <option value="">Select Category...</option>
            <option value="Permanent">Permanent</option>
            <option value="Temporary">Temporary</option>
            <option value="Part-time">Part-time</option>
          </select>
        </div>
        <div className="field">
          <label>Gender</label>
          <select value={formData.gender} onChange={(e) => handleChange("gender", e.target.value)} disabled={pending}>
            <option value="">Select Gender...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="field">
          <label>Marital Status</label>
          <select value={formData.maritalStatus} onChange={(e) => handleChange("maritalStatus", e.target.value)} disabled={pending}>
            <option value="">Select Status...</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </select>
        </div>
        <div className="field">
          <label>Blood Group</label>
          <select value={formData.bloodGroup} onChange={(e) => handleChange("bloodGroup", e.target.value)} disabled={pending}>
            <option value="">Select Blood Group...</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>
        <div className="field">
          <label>Date of Birth</label>
          <input type="date" value={formData.dateOfBirth} onChange={(e) => handleChange("dateOfBirth", e.target.value)} disabled={pending} />
        </div>
        <div className="field">
          <label>Secondary Mobile</label>
          <input type="tel" value={formData.secondaryMobile} onChange={(e) => handleChange("secondaryMobile", e.target.value)} disabled={pending} />
        </div>
        <div className="field">
          <label>Residential Address</label>
          <textarea value={formData.residentialAddress} onChange={(e) => handleChange("residentialAddress", e.target.value)} disabled={pending} />
        </div>
        <div className="field">
          <label>Biometric ID *</label>
          <input required type="text" value={formData.biometricId} onChange={(e) => handleChange("biometricId", e.target.value)} disabled={pending} />
        </div>
        <div className="field">
          <label>POS ID</label>
          <input type="text" value={formData.posId} onChange={(e) => handleChange("posId", e.target.value)} disabled={pending} />
        </div>
        <div className="field">
          <label>Reporting To (Employee ID)</label>
          <input type="text" value={formData.reportingEmployeeId} onChange={(e) => handleChange("reportingEmployeeId", e.target.value)} disabled={pending} />
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1.5rem" }}>
        <h4>Documents Gate</h4>
        <p className="muted" style={{ marginBottom: "1rem" }}>Upload required documents. Aadhaar and Photo must be uploaded to activate.</p>
        <div className="grid-2">
          <div className="field">
            <label>Aadhaar Document *</label>
            <input type="file" onChange={(e) => handleFileChange("aadhaar", e.target.files?.[0] || null)} disabled={pending} />
            {formData.aadhaarDocumentUrl && <p className="text-sm text-green-600 mt-1">Uploaded: {formData.aadhaarDocumentUrl}</p>}
          </div>
          <div className="field">
            <label>Profile Photo *</label>
            <input type="file" accept="image/*" onChange={(e) => handleFileChange("photo", e.target.files?.[0] || null)} disabled={pending} />
            {formData.photoUrl && <p className="text-sm text-green-600 mt-1">Uploaded: {formData.photoUrl}</p>}
          </div>
          <div className="field">
            <label>Application Form *</label>
            <input type="file" onChange={(e) => handleFileChange("applicationForm", e.target.files?.[0] || null)} disabled={pending} />
            {formData.applicationFormUrl && <p className="text-sm text-green-600 mt-1">Uploaded: {formData.applicationFormUrl}</p>}
          </div>
          <div className="field">
            <label>Other Documents</label>
            <input type="file" onChange={(e) => handleFileChange("otherDocuments", e.target.files?.[0] || null)} disabled={pending} />
            {formData.otherDocumentsUrl && <p className="text-sm text-green-600 mt-1">Uploaded: {formData.otherDocumentsUrl}</p>}
          </div>
        </div>
        {formData.status === "ACTIVE" && (!formData.aadhaarDocumentUrl && !files.aadhaar || !formData.photoUrl && !files.photo) && (
           <p className="text-red-500 text-sm mt-2">Aadhaar and Photo are required to set status to ACTIVE.</p>
        )}
      </div>

      {!initialData?.id && (
        <div className="panel" style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem" }}>
            <input type="checkbox" id="provisionAccess" checked={provisionAccess} onChange={(e) => setProvisionAccess(e.target.checked)} disabled={pending} />
            <label htmlFor="provisionAccess" style={{ margin: 0, fontWeight: "bold" }}>Provision System Access</label>
          </div>
          {provisionAccess && (
            <div className="grid-2">
              <div className="field">
                <label>Login Email *</label>
                <input required type="email" value={provisionEmail} onChange={(e) => setProvisionEmail(e.target.value)} disabled={pending} />
              </div>
              <div className="field">
                <label>Login Password *</label>
                <input required type="password" minLength={8} value={provisionPassword} onChange={(e) => setProvisionPassword(e.target.value)} disabled={pending} />
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="action-button" disabled={pending}>
          {pending ? "Saving…" : "Save Employee"}
        </button>
      </div>
    </form>
  );
}

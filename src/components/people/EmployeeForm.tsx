"use client";

import { useState, useEffect, type FormEvent } from "react";
import { apiSend } from "@/lib/api";
import { z } from "zod";
import { useToast } from "../ui/Toast";
import { KalkiInput } from "../ui/KalkiInput";
import { KalkiSelect } from "../ui/KalkiSelect";
import { KalkiTextarea } from "../ui/KalkiTextarea";
import { KalkiButton } from "../ui/KalkiButton";
import { KalkiSection } from "../ui/KalkiSection";
import { KalkiPageHeader } from "../ui/KalkiPageHeader";
import { KalkiActionBar } from "../ui/KalkiActionBar";
import { KalkiFileUpload } from "../ui/KalkiFileUpload";

type EmployeeFormProps = {
  organizationId: string;
  locationId: string;
  initialData?: any;
  isProposal?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
};

const mobileNumberRegex = /^[0-9]{10}$/;
const mobileNumberMessage = "Mobile number must be exactly 10 digits";
const optionalMobileSchema = z.string().regex(mobileNumberRegex, mobileNumberMessage).or(z.literal('')).optional();
const requiredMobileSchema = z.string().regex(mobileNumberRegex, mobileNumberMessage);

const formSchema = z.object({
  jobTitle: z.string().trim().optional(),
  employmentStartDate: z.string().min(1, "Start date is required"),
  category: z.string().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  residentialAddress: z.string().optional(),
  bloodGroup: z.string().optional(),
  reportingEmployeeId: z.string().optional(),
  secondaryMobile: optionalMobileSchema,
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().optional(),
  displayName: z.string().trim().min(1, "Display name is required"),
  phone: requiredMobileSchema,
  email: z.string().optional(),
  dateOfBirth: z.string().optional(),
  biometricId: z.string().trim().min(1, "Biometric ID is required"),
  posId: z.string().optional(),
  spouseName: z.string().optional(),
  spouseMobile: optionalMobileSchema,
  
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  
  // Salary fields
  salaryType: z.string().optional(),
  salaryAmount: z.number().optional(),
  salaryEffectiveFrom: z.string().optional(),
  paymentMethod: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.maritalStatus === "Married") {
    if (!data.spouseName || data.spouseName.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Spouse Name is required for married employees.", path: ["spouseName"] });
    }
    if (!data.spouseMobile || data.spouseMobile.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Spouse Mobile is required for married employees.", path: ["spouseMobile"] });
    } else if (!mobileNumberRegex.test(data.spouseMobile.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: mobileNumberMessage, path: ["spouseMobile"] });
    }
    }
  }
});

export function EmployeeForm({ organizationId, locationId, initialData, isProposal, onSuccess, onCancel }: EmployeeFormProps) {
  const { addToast } = useToast();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

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
    otherDocument1Url: initialData?.otherDocument1Url || "",
    otherDocument2Url: initialData?.otherDocument2Url || "",
    otherDocument3Url: initialData?.otherDocument3Url || "",
    biometricId: initialData?.biometricId || "",
    posId: initialData?.posId || "",
    category: initialData?.category || "",
    gender: initialData?.gender || "",
    maritalStatus: initialData?.maritalStatus || "",
    residentialAddress: initialData?.residentialAddress || "",
    bloodGroup: initialData?.bloodGroup || "",
    reportingEmployeeId: initialData?.reportingEmployeeId || "",
    secondaryMobile: initialData?.secondaryMobile || "",
    
    // Salary Data
    salaryType: initialData?.salaryType || "Monthly",
    salaryAmount: initialData?.salaryAmount || "",
    salaryEffectiveFrom: initialData?.salaryEffectiveFrom || new Date().toISOString().split("T")[0],
    paymentMethod: initialData?.paymentMethod || "Bank Transfer",
    paymentDetails: initialData?.paymentDetails || "",
  });

  const [files, setFiles] = useState<{
    aadhaar?: File;
    photo?: File;
    otherDocument1?: File;
    otherDocument2?: File;
    otherDocument3?: File;
  }>({});

  const [provisionAccess, setProvisionAccess] = useState(false);
  const [provisionPassword, setProvisionPassword] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  
  const [familyContacts, setFamilyContacts] = useState<any[]>(initialData?.familyContacts?.filter((c:any) => c.category === "EMERGENCY_CONTACT") || [
    { category: "EMERGENCY_CONTACT", name: "", mobile: "", relationship: "" }
  ]);
  const [spouseName, setSpouseName] = useState(initialData?.familyContacts?.find((c: any) => c.category === "SPOUSE")?.name || "");
  const [spouseMobile, setSpouseMobile] = useState(initialData?.familyContacts?.find((c: any) => c.category === "SPOUSE")?.mobile || "");
  
  const parentContact = initialData?.familyContacts?.find((c: any) => c.category === "PARENT");
  const [fatherName, setFatherName] = useState(parentContact?.fatherName || "");
  const [motherName, setMotherName] = useState(parentContact?.motherName || "");
  
  const initialChildren = initialData?.familyContacts?.filter((c: any) => c.category === "CHILD") || [];
  const [children, setChildren] = useState<any[]>(initialChildren);

  function addChild() {
    setIsDirty(true);
    setChildren([...children, { category: "CHILD", name: "" }]);
  }
  function removeChild(index: number) {
    setIsDirty(true);
    const updated = [...children];
    updated.splice(index, 1);
    setChildren(updated);
  }
  function handleChildChange(index: number, value: string) {
    setIsDirty(true);
    const updated = [...children];
    updated[index] = { ...updated[index], name: value };
    setChildren(updated);
  }

  const [rolesData, setRolesData] = useState<{ roles: any[] } | null>(null);
  const [reportingCandidatesData, setReportingCandidatesData] = useState<{ candidates: any[] } | null>(null);

  useEffect(() => {
    fetch(`/api/role-definitions?organizationId=${organizationId}&locationId=${locationId}`)
      .then(res => res.json())
      .then(data => setRolesData(data))
      .catch(console.error);
  }, [organizationId, locationId]);

  useEffect(() => {
    const queryRolesStr = roleIds.map(id => `roleId=${id}`).join("&");
    let url = `/api/employees/reporting-candidates`;
    const params = [];
    if (queryRolesStr) params.push(queryRolesStr);
    if (initialData?.id) params.push(`excludeEmployeeId=${initialData.id}`);
    if (params.length > 0) url += `?${params.join("&")}`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => setReportingCandidatesData(data))
      .catch(console.error);
  }, [roleIds]);

  function handleChange(field: string, value: string | number) {
    setIsDirty(true);
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "firstName" && !formData.displayName) {
      setFormData((prev) => ({ ...prev, displayName: value as string }));
    }
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined as any }));
    }
  }

  function handleFileChange(field: keyof typeof files, file: File | null) {
    setIsDirty(true);
    setFiles((prev) => ({ ...prev, [field]: file || undefined }));
  }

  function handleEmergencyContactChange(index: number, field: string, value: string) {
    setIsDirty(true);
    const updated = [...familyContacts];
    updated[index] = { ...updated[index], [field]: value };
    setFamilyContacts(updated);
  }

  function addEmergencyContact() {
    setIsDirty(true);
    setFamilyContacts([...familyContacts, { category: "EMERGENCY_CONTACT", name: "", mobile: "", relationship: "" }]);
  }

  function removeEmergencyContact(index: number) {
    setIsDirty(true);
    const updated = [...familyContacts];
    updated.splice(index, 1);
    setFamilyContacts(updated);
  }

  function handleCancel() {
    if (isDirty) {
      if (window.confirm("You have unsaved changes. Are you sure you want to cancel?")) {
        onCancel();
      }
    } else {
      onCancel();
    }
  }

  async function uploadFiles() {
    const uploadData = new FormData();
    let hasFiles = false;
    if (files.aadhaar) { uploadData.append("aadhaar", files.aadhaar); hasFiles = true; }
    if (files.photo) { uploadData.append("photo", files.photo); hasFiles = true; }
    if (files.otherDocument1) { uploadData.append("otherDocument1", files.otherDocument1); hasFiles = true; }
    if (files.otherDocument2) { uploadData.append("otherDocument2", files.otherDocument2); hasFiles = true; }
    if (files.otherDocument3) { uploadData.append("otherDocument3", files.otherDocument3); hasFiles = true; }

    if (!hasFiles) return {};

    const res = await fetch("/api/upload", { method: "POST", body: uploadData });
    if (!res.ok) throw new Error("File upload failed");
    const data = await res.json();
    return data.urls as Record<string, string>;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});

    const salaryAmountNum = formData.salaryAmount ? Number(formData.salaryAmount) : undefined;

    const validationResult = formSchema.safeParse({ 
      ...formData, 
      salaryAmount: salaryAmountNum,
      spouseName, 
      spouseMobile 
    });

    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.issues.forEach(issue => {
        if (issue.path.length > 0) {
          errors[issue.path[0] as string] = issue.message;
        }
      });
      setFieldErrors(errors);
      addToast({
        type: 'error',
        message: 'Employee could not be saved',
        description: `${Object.keys(errors).length} fields need attention.`
      });
      setTimeout(() => {
        const firstError = document.querySelector('.is-invalid') as HTMLElement;
        if (firstError) {
          firstError.focus();
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      setPending(false);
      return;
    }

    try {
      if (provisionAccess && roleIds.length === 0) {
        throw new Error("At least one role must be selected to provision access.");
      }

      const uploadedUrls = await uploadFiles();
      
      let hasEmergencyError = false;
      const newFieldErrors: Record<string, string> = {};
      const payloadContacts = [...familyContacts];
      const emergencyContacts = familyContacts.filter(c => c.category === "EMERGENCY_CONTACT");
      
      if (emergencyContacts.length === 0) {
        throw new Error("At least one emergency contact is required.");
      }
      
      familyContacts.forEach((c, index) => {
        if (c.category !== "EMERGENCY_CONTACT") return;
        if (!c.name || !c.name.trim()) { newFieldErrors[`emergency_name_${index}`] = "Mandatory field cannot be blank."; hasEmergencyError = true; }
        if (!c.relationship || !c.relationship.trim()) { newFieldErrors[`emergency_relationship_${index}`] = "Mandatory field cannot be blank."; hasEmergencyError = true; }
        if (!c.mobile || !c.mobile.trim()) { newFieldErrors[`emergency_mobile_${index}`] = "Mandatory field cannot be blank."; hasEmergencyError = true; }
        else if (!mobileNumberRegex.test(c.mobile.trim())) { newFieldErrors[`emergency_mobile_${index}`] = mobileNumberMessage; hasEmergencyError = true; }
      });
      
      if (hasEmergencyError) {
        setFieldErrors(prev => ({ ...prev, ...newFieldErrors }));
        addToast({ type: 'error', message: 'Employee could not be saved', description: 'Emergency contacts contain errors.' });
        setPending(false);
        return;
      }

      
      if (formData.maritalStatus === "Married") {
        payloadContacts.push({ category: "SPOUSE", name: spouseName, mobile: spouseMobile });
      }

      if (!fatherName || !fatherName.trim() || !motherName || !motherName.trim()) {
        throw new Error("Father Name and Mother Name are required.");
      }
      payloadContacts.push({ category: "PARENT", fatherName, motherName });

      children.forEach(c => {
        if (c.name && c.name.trim()) {
          payloadContacts.push({ category: "CHILD", name: c.name.trim() });
        }
      });

      const personPayload = {
        firstName: formData.firstName,
        lastName: formData.lastName || undefined,
        displayName: formData.displayName,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
      };

      const documentPayload = {
        aadhaarDocumentUrl: uploadedUrls.aadhaar || formData.aadhaarDocumentUrl || null,
        photoUrl: uploadedUrls.photo || formData.photoUrl || null,
        otherDocument1Url: uploadedUrls.otherDocument1 || formData.otherDocument1Url || null,
        otherDocument2Url: uploadedUrls.otherDocument2 || formData.otherDocument2Url || null,
        otherDocument3Url: uploadedUrls.otherDocument3Url || formData.otherDocument3Url || null,
      };

      const commonFields = {
        jobTitle: formData.jobTitle || undefined,
        category: formData.category || undefined,
        gender: formData.gender || undefined,
        maritalStatus: formData.maritalStatus || undefined,
        residentialAddress: formData.residentialAddress || undefined,
        bloodGroup: formData.bloodGroup || undefined,
        reportingEmployeeId: formData.reportingEmployeeId || undefined,
        secondaryMobile: formData.secondaryMobile || undefined,
        biometricId: formData.biometricId,
        posId: formData.posId || undefined,
        person: personPayload,
        ...documentPayload,
      };

      const salaryPayload = {
        salaryType: formData.salaryType || undefined,
        amount: salaryAmountNum !== undefined ? String(salaryAmountNum) : undefined,
        paymentMethod: formData.paymentMethod || undefined,
        accountHolderName: formData.paymentDetails || undefined,
      };

      if (initialData?.id) {
        if (isProposal) {
          const reason = prompt("Please provide a reason for proposing this change:");
          if (!reason) {
            setPending(false);
            return;
          }
          await apiSend(`/api/employees/proposals`, "POST", { employeeId: initialData.id, reason, ...commonFields, salary: salaryAmountNum ? salaryPayload : undefined });
        } else {
          await apiSend(`/api/employees?id=${initialData.id}`, "PATCH", { ...commonFields, familyContacts: payloadContacts, salary: salaryAmountNum ? salaryPayload : undefined });
        }
      } else {
        await apiSend("/api/employees", "POST", {
          organizationId, locationId, employmentStartDate: formData.employmentStartDate, familyContacts: payloadContacts, ...commonFields,
          ...(provisionAccess ? { provisionAccess: { phone: formData.phone, password: provisionPassword, roleIds } } : {})
        });
      }
      setIsDirty(false);
      addToast({ type: 'success', message: 'Employee saved successfully' });
      onSuccess();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unknown error';
      if (message.includes("Mobile number is already registered")) {
        setFieldErrors(prev => ({ ...prev, phone: message }));
      }
      addToast({ type: 'error', message: 'Failed to save employee', description: message });
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <KalkiPageHeader 
        title={initialData ? "Edit Employee" : "Add Employee"}
        description="Create a new employee in Kalki BOS."
        breadcrumbs={<button type="button" onClick={onCancel} style={{background: 'none', border: 'none', color: 'var(--kalki-primary)', cursor: 'pointer', padding: 0, fontWeight: 600, fontSize: '0.85rem'}}>&lt; Back to Employees</button>}
      />

      <div className="kalki-form-layout">
        {/* Main Content */}
        <div className="kalki-form-main">
          
          <KalkiSection title="Personal Information" icon="👤">
            <div className="kalki-grid-2-col">
              <KalkiInput label="First Name" required error={fieldErrors.firstName} value={formData.firstName} onChange={e => handleChange("firstName", e.target.value)} disabled={pending} />
              <KalkiInput label="Last Name" value={formData.lastName} onChange={e => handleChange("lastName", e.target.value)} disabled={pending} />
              <KalkiInput label="Display Name" required error={fieldErrors.displayName} value={formData.displayName} onChange={e => handleChange("displayName", e.target.value)} disabled={pending} />
              <KalkiInput label="Employee ID" value={initialData?.employeeCode || "Auto-generated upon save"} disabled />
              
              <KalkiInput label="Primary Mobile" required type="tel" value={formData.phone} onChange={e => handleChange("phone", e.target.value)} disabled={pending} />
              <KalkiInput label="Secondary Mobile" type="tel" value={formData.secondaryMobile} onChange={e => handleChange("secondaryMobile", e.target.value)} disabled={pending} />
              
              <KalkiInput label="Date of Birth" type="date" value={formData.dateOfBirth} onChange={e => handleChange("dateOfBirth", e.target.value)} disabled={pending} />
              <KalkiSelect label="Gender" required value={formData.gender} onChange={e => handleChange("gender", e.target.value)} disabled={pending}>
                <option value="">Select...</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
              </KalkiSelect>
              
              <KalkiSelect label="Blood Group" value={formData.bloodGroup} onChange={e => handleChange("bloodGroup", e.target.value)} disabled={pending}>
                <option value="">Select...</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="O+">O+</option><option value="O-">O-</option><option value="AB+">AB+</option><option value="AB-">AB-</option>
              </KalkiSelect>
              <KalkiSelect label="Marital Status" required value={formData.maritalStatus} onChange={e => handleChange("maritalStatus", e.target.value)} disabled={pending}>
                <option value="">Select...</option><option value="Single">Single</option><option value="Married">Married</option><option value="Divorced">Divorced</option><option value="Widowed">Widowed</option>
              </KalkiSelect>
            </div>
            <div style={{marginTop: '1rem'}}>
              <KalkiTextarea label="Residential Address" value={formData.residentialAddress} onChange={e => handleChange("residentialAddress", e.target.value)} disabled={pending} rows={2} />
            </div>
          </KalkiSection>

          <KalkiSection title="Family Details" icon="👥">
            {formData.maritalStatus === "Married" && (
              <div className="kalki-grid-2-col" style={{ marginBottom: '1rem' }}>
                <KalkiInput label="Spouse Name *" required error={fieldErrors.spouseName} value={spouseName} onChange={e => {setSpouseName(e.target.value); setIsDirty(true);}} disabled={pending} />
                <KalkiInput label="Spouse Mobile *" type="tel" required error={fieldErrors.spouseMobile} value={spouseMobile} onChange={e => {setSpouseMobile(e.target.value); setIsDirty(true);}} disabled={pending} />
              </div>
            )}
            
            <div className="kalki-grid-2-col" style={{ marginBottom: '1rem' }}>
              <KalkiInput label="Father Name *" required value={fatherName} onChange={e => {setFatherName(e.target.value); setIsDirty(true);}} disabled={pending} />
              <KalkiInput label="Mother Name *" required value={motherName} onChange={e => {setMotherName(e.target.value); setIsDirty(true);}} disabled={pending} />
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label className="kalki-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Children (Optional)</label>
              {children.map((child, index) => (
                <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <KalkiInput value={child.name} onChange={e => handleChildChange(index, e.target.value)} disabled={pending} placeholder="Child Name" style={{ flexGrow: 1, marginBottom: 0 }} />
                  <KalkiButton variant="ghost" size="sm" type="button" onClick={() => removeChild(index)} disabled={pending} style={{ color: 'var(--kalki-danger)' }}>Remove</KalkiButton>
                </div>
              ))}
              <KalkiButton variant="secondary" size="sm" type="button" onClick={addChild} disabled={pending}>+ Add Child</KalkiButton>
            </div>
          </KalkiSection>

          <KalkiSection title="Emergency Contacts" icon="📞">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', marginBottom: '1rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--kalki-border)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>Name *</th>
                    <th style={{ padding: '0.5rem' }}>Relationship *</th>
                    <th style={{ padding: '0.5rem' }}>Mobile *</th>
                    <th style={{ padding: '0.5rem', width: '80px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {familyContacts.map((contact, index) => {
                    if (contact.category !== "EMERGENCY_CONTACT") return null;
                    return (
                      <tr key={index} style={{ borderBottom: '1px solid var(--kalki-border)' }}>
                        <td style={{ padding: '0.5rem' }}>
                          <KalkiInput required error={fieldErrors[`emergency_name_${index}`]} value={contact.name} onChange={e => handleEmergencyContactChange(index, "name", e.target.value)} disabled={pending} style={{ marginBottom: 0 }} />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <KalkiInput required error={fieldErrors[`emergency_relationship_${index}`]} value={contact.relationship} onChange={e => handleEmergencyContactChange(index, "relationship", e.target.value)} disabled={pending} style={{ marginBottom: 0 }} />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <KalkiInput required type="tel" error={fieldErrors[`emergency_mobile_${index}`]} value={contact.mobile} onChange={e => handleEmergencyContactChange(index, "mobile", e.target.value)} disabled={pending} style={{ marginBottom: 0 }} />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <KalkiButton variant="ghost" size="sm" type="button" onClick={() => removeEmergencyContact(index)} disabled={pending || familyContacts.filter(c => c.category === "EMERGENCY_CONTACT").length <= 1} style={{ color: 'var(--kalki-danger)' }}>Remove</KalkiButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: 'left' }}>
              <KalkiButton variant="secondary" size="sm" type="button" onClick={addEmergencyContact} disabled={pending}>+ Add Contact</KalkiButton>
            </div>
          </KalkiSection>

          <KalkiSection title="Employment Information" icon="💼">
            <div className="kalki-grid-2-col">
              <KalkiSelect label="Category" required value={formData.category} onChange={e => handleChange("category", e.target.value)} disabled={pending}>
                <option value="">Select...</option><option value="Permanent">Permanent</option><option value="Temporary">Temporary</option><option value="Part-time">Part-time</option>
              </KalkiSelect>
              <KalkiInput label="Date of Joining" required type="date" error={fieldErrors.employmentStartDate} value={formData.employmentStartDate} onChange={e => handleChange("employmentStartDate", e.target.value)} disabled={pending} />
              
              <KalkiInput label="Job Title" value={formData.jobTitle} onChange={e => handleChange("jobTitle", e.target.value)} disabled={pending} />
              <KalkiSelect label="Reporting To" value={formData.reportingEmployeeId} onChange={e => handleChange("reportingEmployeeId", e.target.value)} disabled={pending}>
                <option value="">No Reporting Manager</option>
                {reportingCandidatesData?.candidates?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.displayName} ({c.jobTitle || c.roleIdentifier || 'Employee'})</option>
                ))}
              </KalkiSelect>
            </div>
          </KalkiSection>

          <KalkiSection title="Salary & Payment" icon="₹">
            <div className="kalki-grid-2-col">
              <KalkiSelect label="Salary Type" required value={formData.salaryType} onChange={e => handleChange("salaryType", e.target.value)} disabled={pending}>
                <option value="Monthly">Monthly</option>
                <option value="Weekly">Weekly</option>
                <option value="Daily">Daily</option>
              </KalkiSelect>
              <KalkiInput label="Salary Amount (₹)" required type="number" step="0.01" value={formData.salaryAmount} onChange={e => handleChange("salaryAmount", e.target.value)} disabled={pending} />
              <KalkiInput label="Effective From" required type="date" value={formData.salaryEffectiveFrom} onChange={e => handleChange("salaryEffectiveFrom", e.target.value)} disabled={pending} />
              <KalkiSelect label="Payment Method" required value={formData.paymentMethod} onChange={e => handleChange("paymentMethod", e.target.value)} disabled={pending}>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="GPAY">GPay / UPI</option>
                <option value="CASH">Cash</option>
              </KalkiSelect>
            </div>
            {formData.paymentMethod !== "CASH" && (
              <div style={{ marginTop: '1rem' }}>
                <KalkiInput label={formData.paymentMethod === "BANK_TRANSFER" ? "Bank Account Details" : "UPI ID / Phone Number"} value={formData.paymentDetails} onChange={e => handleChange("paymentDetails", e.target.value)} disabled={pending} />
              </div>
            )}
          </KalkiSection>

        </div>

        {/* Secondary Content */}
        <div className="kalki-form-secondary">
          <KalkiSection title="System Integration" icon="🔗">
            <div className="kalki-field">
              <KalkiInput label="Biometric ID" required value={formData.biometricId} onChange={e => handleChange("biometricId", e.target.value)} error={fieldErrors.biometricId} disabled={pending} />
            </div>
            <div className="kalki-field">
              <KalkiInput label="POS ID" value={formData.posId} onChange={e => handleChange("posId", e.target.value)} disabled={pending} />
            </div>
          </KalkiSection>

          <KalkiSection title="Documents" icon="📄">
            <div style={{background: 'var(--kalki-info-bg)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--kalki-primary)', marginBottom: '1rem'}}>
              Aadhaar and Profile Photo are mandatory for activation.
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <KalkiFileUpload label="Aadhaar Card" required onFileSelect={file => handleFileChange('aadhaar', file)} disabled={pending} />
              <KalkiFileUpload label="Profile Photo" required accept="image/*" onFileSelect={file => handleFileChange('photo', file)} disabled={pending} />
              <KalkiFileUpload label="Other Document 1" onFileSelect={file => handleFileChange('otherDocument1', file)} disabled={pending} />
              <KalkiFileUpload label="Other Document 2" onFileSelect={file => handleFileChange('otherDocument2', file)} disabled={pending} />
              <KalkiFileUpload label="Other Document 3" onFileSelect={file => handleFileChange('otherDocument3', file)} disabled={pending} />
            </div>
          </KalkiSection>

          {!initialData?.id && (
            <KalkiSection title="Access & Roles" icon="🛡️">
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}>
                <input type="checkbox" id="provisionAccess" checked={provisionAccess} onChange={e => {setProvisionAccess(e.target.checked); setIsDirty(true);}} disabled={pending} />
                <label htmlFor="provisionAccess" style={{fontWeight: 600, fontSize: '0.9rem', margin: 0}}>Provision System Access</label>
              </div>

              {provisionAccess && (
                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                  <div className="kalki-field">
                    <label className="kalki-label">Login Username</label>
                    <div style={{ padding: '0.5rem', background: 'var(--kalki-bg)', border: '1px solid var(--kalki-border)', borderRadius: 'var(--radius-sm)', color: 'var(--kalki-foreground-muted)' }}>
                      {formData.phone || "Please enter Primary Mobile"}
                    </div>
                  </div>
                  <KalkiInput label="Initial Password" required type="password" minLength={8} value={provisionPassword} onChange={e => {setProvisionPassword(e.target.value); setIsDirty(true);}} disabled={pending} />
                  
                  <div className="kalki-field">
                    <label className="kalki-label">Assign Roles *</label>
                    <select multiple size={5} value={roleIds} onChange={e => {
                        const selectedOptions = Array.from(e.target.selectedOptions).map(opt => opt.value);
                        setRoleIds(selectedOptions);
                        setIsDirty(true);
                      }} disabled={pending} className="kalki-select" style={{ fontSize: '0.85rem', padding: '0.25rem' }}>
                      {rolesData?.roles?.filter((r: any) => r.isActive).map((r: any) => (
                        <option key={r.id} value={r.id} style={{ padding: '0.25rem 0.5rem' }}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </KalkiSection>
          )}
        </div>
      </div>

      <div style={{ flexGrow: 1 }} />
      <KalkiActionBar>
        <KalkiButton variant="secondary" type="button" onClick={handleCancel} disabled={pending}>Cancel</KalkiButton>
        <KalkiButton variant="primary" type="submit" disabled={pending}>{pending ? "Saving..." : isProposal ? "Propose Change" : "Save Employee"}</KalkiButton>
      </KalkiActionBar>
    </form>
  );
}

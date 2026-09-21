
import { z } from "zod";

export const familyContactSchema = z.object({
  category: z.enum(["EMERGENCY_CONTACT", "SPOUSE", "PARENT", "CHILD"]),
  name: z.string().optional(),
  mobile: z.string().optional(),
  relationship: z.string().optional(),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
});
export const salaryInputSchema = z.object({
  salaryType: z.enum(["Daily", "Weekly", "Monthly"]),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  paymentMethod: z.enum(["BANK_TRANSFER", "GPAY", "CASH"]),
  accountHolderName: z.string().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  ifscCode: z.string().nullable().optional(),
  gpayNumber: z.string().nullable().optional(),
  bankingName: z.string().nullable().optional(),
});
const employeeInputSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  jobTitle: z.string().trim().max(200).nullable().optional(),
  employmentStartDate: z.string().date(),
  employmentEndDate: z.string().date().nullable().optional(),
  aadhaarDocumentUrl: z.string().trim().nullable().optional(),
  photoUrl: z.string().trim().nullable().optional(),
  otherDocument1Url: z.string().trim().nullable().optional(),
  otherDocument2Url: z.string().trim().nullable().optional(),
  otherDocument3Url: z.string().trim().nullable().optional(),
  biometricId: z.string().trim().min(1),
  posId: z.string().trim().nullable().optional(),
  reportingEmployeeId: z.string().uuid().nullable().optional(),
  category: z.enum(["Permanent", "Temporary", "Part-time"]).optional(),
  provisionAccess: z.object({
    phone: z.string().min(1),
    password: z.string().min(8),
    roleIds: z.array(z.string().uuid()).optional(),
  }).optional(),
  person: z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().max(100).nullable().optional(),
    displayName: z.string().trim().min(1).max(200),
    phone: z.string().trim().max(50).nullable().optional(),
    email: z.string().email().max(320).or(z.literal("")).nullable().optional(),
    dateOfBirth: z.string().date().nullable().optional(),
  }),
  familyContacts: z.array(familyContactSchema).optional(),
});

const employeeUpdateSchema = z
  .object({
    jobTitle: z.string().trim().max(200).nullable().optional(),
    employmentEndDate: z.string().date().nullable().optional(),
    aadhaarDocumentUrl: z.string().trim().nullable().optional(),
    photoUrl: z.string().trim().max(1024).nullable().optional(),
    otherDocument1Url: z.string().trim().max(1024).nullable().optional(),
    otherDocument2Url: z.string().trim().max(1024).nullable().optional(),
    otherDocument3Url: z.string().trim().max(1024).nullable().optional(),
    biometricId: z.string().trim().max(100).nullable().optional(),
    posId: z.string().trim().nullable().optional(),
    reportingEmployeeId: z.string().uuid().nullable().optional(),
    category: z.enum(["Permanent", "Temporary", "Part-time"]).optional(),
    gender: z.enum(["Male", "Female", "Other"]).optional(),
    maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"]).optional(),
    residentialAddress: z.string().nullable().optional(),
    bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
    secondaryMobile: z.string().trim().max(50).nullable().optional(),
    person: z
      .object({
        firstName: z.string().trim().min(1).max(100).optional(),
        lastName: z.string().trim().max(100).nullable().optional(),
        displayName: z.string().trim().min(1).max(200).optional(),
        phone: z.string().trim().max(50).nullable().optional(),
        email: z.string().email().max(320).or(z.literal("")).nullable().optional(),
        dateOfBirth: z.string().date().nullable().optional(),
      })
      .optional(),
    familyContacts: z.array(familyContactSchema).optional(),
    salary: salaryInputSchema.optional(),
  })
  .strict();

const payloadContacts = [
  { category: "EMERGENCY_CONTACT", name: "E", mobile: "M", relationship: "R" },
  { category: "PARENT", fatherName: "F", motherName: "M" }
];

const personPayload = {
  firstName: "Jane",
  displayName: "Jane Doe",
  phone: "1234567890",
  email: undefined,
  dateOfBirth: "1990-01-01"
};

const documentPayload = {
  aadhaarDocumentUrl: "https://example.com/a.pdf",
  photoUrl: "https://example.com/p.jpg",
  otherDocument1Url: null,
  otherDocument2Url: null,
  otherDocument3Url: null,
};

const commonFields = {
  jobTitle: "Dev",
  category: "Permanent",
  gender: "Female",
  maritalStatus: "Single",
  residentialAddress: "123 St",
  bloodGroup: "O+",
  secondaryMobile: undefined,
  biometricId: "BIO-123",
  person: personPayload,
  ...documentPayload
};

const createPayload = {
  organizationId: "123e4567-e89b-12d3-a456-426614174000",
  locationId: "123e4567-e89b-12d3-a456-426614174000",
  employmentStartDate: "2026-09-19",
  familyContacts: payloadContacts,
  ...commonFields
};

const res1 = employeeInputSchema.safeParse(createPayload);
console.log("Create Payload:");
if (!res1.success) console.log(JSON.stringify(res1.error.issues, null, 2));
else console.log("Success");

const res2 = employeeUpdateSchema.safeParse(commonFields);
console.log("Update Payload:");
if (!res2.success) console.log(JSON.stringify(res2.error.issues, null, 2));
else console.log("Success");


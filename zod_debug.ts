
import { z } from "zod";
export const familyContactSchema = z.object({
  category: z.enum(["EMERGENCY_CONTACT", "SPOUSE", "PARENT", "CHILD"]),
  name: z.string().optional(),
  mobile: z.string().optional(),
  relationship: z.string().optional(),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
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
const testPayload = {
  organizationId: "123e4567-e89b-12d3-a456-426614174000",
  locationId: "123e4567-e89b-12d3-a456-426614174000",
  employmentStartDate: "2026-09-19",
  familyContacts: [
    { category: "EMERGENCY_CONTACT", name: "Test Emergency", mobile: "1234567890", relationship: "Brother" },
    { category: "PARENT", fatherName: "Test Father", motherName: "Test Mother" }
  ],
  jobTitle: "Tester",
  category: "Permanent",
  gender: "Male",
  maritalStatus: "Single",
  residentialAddress: "123 Test St",
  bloodGroup: "O+",
  biometricId: "1234",
  person: {
    firstName: "Test",
    displayName: "Test User",
    phone: "1234567890",
    email: ""
  },
  aadhaarDocumentUrl: null,
  photoUrl: null
};
const result = employeeInputSchema.safeParse(testPayload);
if (!result.success) {
  console.log(JSON.stringify(result.error.issues, null, 2));
} else {
  console.log("Success");
}


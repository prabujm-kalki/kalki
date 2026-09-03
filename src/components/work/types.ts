export type SessionScope = {
  organizationId: string;
  locationId: string;
  organizationName: string;
  locationName: string;
  organizationCode: string;
  locationCode: string;
  permissions: string[];
};

export type SessionContext = {
  user: { id: string; name: string | null; email: string | null };
  isOwner: boolean;
  scopes: SessionScope[];
};

export type AssignedEmployeeView = {
  id: string;
  employeeCode: string;
  locationId: string;
  isActive: boolean;
  person: { displayName: string };
};

export type WorkInstanceView = {
  id: string;
  state: "SEEN" | "ACKNOWLEDGED" | "COMPLETED" | "VERIFIED";
  assignedEmployeeId: string | null;
  assignedEmployee: AssignedEmployeeView | null;
  sourceReference: string | null;
  definitionSnapshot: {
    title?: string;
    description?: string;
    triggerCategory?: string;
    severity?: string | null;
    reminderEscalationStages?: Array<{ stage: string; position: number }>;
  };
  evidenceRequired: boolean;
  verificationRequired: boolean;
  evidencePresence: { id: string } | null;
  verificationPresence: { id: string } | null;
  allowedNextState: "ACKNOWLEDGED" | "COMPLETED" | "VERIFIED" | null;
  nextTransitionReady: boolean;
};

export const workStates = ["SEEN", "ACKNOWLEDGED", "COMPLETED", "VERIFIED"] as const;

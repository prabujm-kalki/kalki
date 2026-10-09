export type PermissionConfig = {
  module: string;
  submodule: string;
  actions: string[];
};

export const SYSTEM_PERMISSIONS: PermissionConfig[] = [
  // Dashboard / Command Center
  { module: "command-center", submodule: "overview", actions: ["read"] },
  
  // People
  { module: "employee", submodule: "my_profile", actions: ["read"] },
  { module: "employee", submodule: "my_advances", actions: ["read"] },
  { module: "employee", submodule: "directory", actions: ["read", "create", "update", "delete"] },
  { module: "employee", submodule: "compensation", actions: ["read", "update"] },
  
  // Attendance
  { module: "attendance", submodule: "overview", actions: ["read"] },
  { module: "attendance", submodule: "my_time", actions: ["read", "create", "update"] },
  { module: "attendance", submodule: "approvals", actions: ["read", "approve"] },
  { module: "attendance", submodule: "reports", actions: ["read"] },
  { module: "attendance", submodule: "configuration", actions: ["read", "update"] },
  { module: "attendance", submodule: "selfie_punch", actions: ["create"] },
  
  // Payroll
  { module: "payroll", submodule: "processing", actions: ["read", "create", "update", "approve"] },
  { module: "payroll", submodule: "advances", actions: ["read", "create", "update", "approve"] },
  { module: "payroll", submodule: "configuration", actions: ["read", "create", "update"] },
  { module: "payroll", submodule: "payslips", actions: ["read"] },
  { module: "payroll", submodule: "settlements", actions: ["read", "create", "update", "approve"] },
  
  // Purchasing
  { module: "purchasing", submodule: "dashboard", actions: ["read"] },
  { module: "purchasing", submodule: "create_po", actions: ["read", "create", "update", "delete", "approve"] },
  { module: "purchasing", submodule: "items", actions: ["read", "create", "update", "delete"] },
  { module: "purchasing", submodule: "vendors", actions: ["read", "create", "update", "delete"] },
  { module: "purchasing", submodule: "reports", actions: ["read"] },
  { module: "purchasing", submodule: "configuration", actions: ["read", "create", "update"] },
  { module: "purchasing", submodule: "manual", actions: ["read"] },
  
  // Inventory
  { module: "inventory", submodule: "stock", actions: ["read", "create", "update", "delete"] },
  
  // Sales
  { module: "sales", submodule: "overview", actions: ["read"] },
  { module: "sales", submodule: "orders", actions: ["read", "create", "update", "delete", "approve"] },
  { module: "sales", submodule: "invoices", actions: ["read", "create", "update", "delete", "approve"] },
  { module: "sales", submodule: "returns_&_credit_notes", actions: ["read", "create", "update", "delete", "approve"] },
  { module: "sales", submodule: "reports", actions: ["read"] },
  { module: "sales", submodule: "settings", actions: ["read", "update"] },
  
  // CRM
  { module: "crm", submodule: "customers", actions: ["read", "create", "update", "delete"] },
  
  // Finance
  { module: "finance", submodule: "dashboard", actions: ["read"] },
  { module: "finance", submodule: "sales_&_receivables", actions: ["read", "create", "update", "delete", "approve"] },
  { module: "finance", submodule: "purchases_&_payables", actions: ["read", "create", "update", "delete", "approve"] },
  { module: "finance", submodule: "banking_&_cash", actions: ["read", "create", "update", "delete", "approve"] },
  { module: "finance", submodule: "accounting", actions: ["read", "create", "update", "delete"] },
  { module: "finance", submodule: "reports", actions: ["read"] },
  { module: "finance", submodule: "settings", actions: ["read", "create", "update"] },
  
  // Task Engine
  { module: "tasks", submodule: "tasks", actions: ["read", "create", "update", "delete"] },
  
  // Settings
  { module: "settings", submodule: "organization_chart", actions: ["read", "update"] },
  { module: "settings", submodule: "data_master", actions: ["read", "create", "update", "delete"] },
  { module: "settings", submodule: "roles", actions: ["read", "create", "update", "delete"] },
  { module: "settings", submodule: "users", actions: ["read", "create", "update", "delete"] },
  { module: "settings", submodule: "statutory_settings", actions: ["read", "update"] }
];

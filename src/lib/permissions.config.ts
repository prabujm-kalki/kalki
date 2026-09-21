export type PermissionConfig = {
  module: string;
  submodule: string;
  actions: string[];
};

export const SYSTEM_PERMISSIONS: PermissionConfig[] = [
  // Employee / People
  { module: "employee", submodule: "general", actions: ["read", "create", "update", "approve"] },
  
  // Command Center
  { module: "command-center", submodule: "dashboard", actions: ["read"] },
  
  // Attendance
  { module: "attendance", submodule: "records", actions: ["read", "create", "update", "delete", "approve"] },
  
  // Payroll
  { module: "payroll", submodule: "salary", actions: ["read", "create", "update", "approve"] },
  
  // Purchasing
  { module: "purchasing", submodule: "dashboard", actions: ["read"] },
  { module: "purchasing", submodule: "items", actions: ["read", "create", "update", "delete"] },
  { module: "purchasing", submodule: "vendors", actions: ["read", "create", "update", "delete"] },
  { module: "purchasing", submodule: "configuration", actions: ["read", "create", "update"] },
  { module: "purchasing", submodule: "manual", actions: ["read"] },
  
  // Inventory
  { module: "inventory", submodule: "stock", actions: ["read", "create", "update", "delete"] },
  
  // Sales
  { module: "sales", submodule: "orders", actions: ["read", "create", "update", "delete", "approve"] },
  
  // CRM
  { module: "crm", submodule: "customers", actions: ["read", "create", "update", "delete"] },
  
  // Finance
  { module: "finance", submodule: "transactions", actions: ["read", "create", "update", "approve"] },
  
  // Settings
  { module: "settings", submodule: "roles", actions: ["read", "create", "update", "delete"] },
  { module: "settings", submodule: "organization", actions: ["read", "update"] }
];

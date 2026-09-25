export type PermissionDefinition = {
  code: string;
  name: string;
};

export const PERMISSIONS_REGISTRY: PermissionDefinition[] = [
  // Settings Module
  { code: "settings.roles:read", name: "View Roles" },
  { code: "settings.roles:create", name: "Create Roles" },
  { code: "settings.roles:update", name: "Update Roles" },
  { code: "settings.roles:delete", name: "Delete Roles" },

  // Attendance Module
  { code: "attendance.my_time:read", name: "View My Time" },
  { code: "attendance.my_time:create", name: "Submit Leave Requests" },
  { code: "attendance.approvals:read", name: "View Leave Approvals" },
  { code: "attendance.approvals:approve", name: "Approve Leave Requests" },
  { code: "attendance.configuration:read", name: "View Leave Configuration" },
  { code: "attendance.configuration:create", name: "Create Leave Configuration" },
  { code: "attendance.configuration:update", name: "Update Leave Configuration" },
  { code: "attendance.records:read", name: "View Attendance Records" },
  { code: "attendance.selfie_punch:execute", name: "Selfie Punch Kiosk" },

  // People Module
  { code: "people.employees:read", name: "View Employees" },
  { code: "people.employees:create", name: "Create Employees" },
  { code: "people.employees:update", name: "Update Employees" },
  { code: "people.employees:delete", name: "Delete Employees" },

  // Command Center
  { code: "command_center:read", name: "View Command Center" },

  // CRM Module
  { code: "crm.customers:read", name: "View Customers" },
  { code: "crm.customers:write", name: "Manage Customers" },

  // Inventory Module
  { code: "inventory.items:read", name: "View Inventory Items" },
  { code: "inventory.items:write", name: "Manage Inventory Items" },

  // Work Module
  { code: "work.tasks:read", name: "View Tasks" },
  { code: "work.tasks:write", name: "Manage Tasks" },

  // Purchasing Module
  { code: "purchasing.orders:read", name: "View Purchase Orders" },
  { code: "purchasing.orders:write", name: "Manage Purchase Orders" },

  // Sales Module
  { code: "sales.orders:read", name: "View Sales Orders" },
  { code: "sales.orders:write", name: "Manage Sales Orders" },

  // Finance Module
  { code: "finance.invoices:read", name: "View Invoices" },
  { code: "finance.invoices:write", name: "Manage Invoices" },

  // Payroll Module
  { code: "payroll.runs:read", name: "View Payroll Runs" },
  { code: "payroll.runs:write", name: "Manage Payroll Runs" },

  // Hall Booking Module
  { code: "hall_booking.bookings:read", name: "View Hall Bookings" },
  { code: "hall_booking.bookings:write", name: "Manage Hall Bookings" },
];

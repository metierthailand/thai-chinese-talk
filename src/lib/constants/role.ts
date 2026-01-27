// Role enum values - synced with prisma/schema.prisma
// Update this file when Role enum changes in schema

// Role enum values (must match prisma/schema.prisma)
export const ROLE_VALUES = ["SUPER_ADMIN", "ADMIN", "SALES", "STAFF"] as const;

export type Role = (typeof ROLE_VALUES)[number];

// Role display labels mapping
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  SALES: "Sales",
  STAFF: "Staff",
};

// Helper function to get role label
export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as Role] || role;
}

export const USER_STATUS_VALUES = ["ACTIVE", "INACTIVE"] as const;
export type UserStatus = (typeof USER_STATUS_VALUES)[number];

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

export function getUserStatusLabel(status: string): string {
  return USER_STATUS_LABELS[status as UserStatus] || status;
}

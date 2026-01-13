// Lead status change validation rules
import { LeadStatus } from "@prisma/client";
import { isSystemLeadStatus, isManualLeadStatus } from "./lead";

export interface StatusChangeResult {
  allowed: boolean;
  warning?: string;
  requiresReason?: boolean;
  autoChange?: boolean;
}

// Status order for validation (manual states only)
const STATUS_ORDER: Record<string, number> = {
  INTERESTED: 0,
  BOOKED: 1,
  COMPLETED: 2,
  CANCELLED: 0, // Can be set from any status
};

/**
 * Check if status change is allowed and return validation result
 */
export function validateStatusChange(
  currentStatus: LeadStatus | string,
  newStatus: LeadStatus | string,
  hasActiveBookings: boolean = false
): StatusChangeResult {
  // Same status - always allowed
  if (currentStatus === newStatus) {
    return { allowed: true };
  }

  const current = currentStatus as LeadStatus;
  const next = newStatus as LeadStatus;

  // Prevent manual changes to system-managed statuses if has active bookings
  if (hasActiveBookings && isSystemLeadStatus(next)) {
    return {
      allowed: false,
      warning: "Cannot manually change to this status when there are active bookings. Status is managed automatically by the system.",
    };
  }

  // Prevent changing FROM system-managed statuses if has active bookings
  if (hasActiveBookings && isSystemLeadStatus(current)) {
    return {
      allowed: false,
      warning: "Cannot change status when there are active bookings. Cancel all bookings first.",
    };
  }

  // Check if statuses are valid
  if (STATUS_ORDER[current] === undefined || STATUS_ORDER[next] === undefined) {
    return { allowed: false };
  }

  const currentOrder = STATUS_ORDER[current];
  const nextOrder = STATUS_ORDER[next];

  // Moving forward normally (next step)
  if (nextOrder === currentOrder + 1) {
    return { allowed: true };
  }

  // Moving forward but skipping steps
  if (nextOrder > currentOrder + 1 && isManualLeadStatus(next)) {
    return {
      allowed: true,
      warning: "คุณกำลังข้ามขั้นตอน กรุณาระบุเหตุผล",
      requiresReason: true,
    };
  }

  // Moving backward (reverting) - only for manual statuses
  if (nextOrder < currentOrder && isManualLeadStatus(next)) {
    return {
      allowed: true,
      warning: "คุณกำลังย้อน status กลับไป คุณแน่ใจหรือไม่?",
      requiresReason: true,
    };
  }

  // Moving to CANCELLED from any status
  if (String(next) === "CANCELLED") {
    return {
      allowed: true,
      warning: "คุณกำลังยกเลิก lead กรุณาระบุเหตุผล",
      requiresReason: true,
    };
  }

  // Moving to BOOKED - should be automatic via booking
  if (String(next) === "BOOKED") {
    return {
      allowed: true,
      warning: "Normally, BOOKED is set automatically when a booking is created. Are you sure you want to set this manually?",
      requiresReason: true,
    };
  }

  // Moving to COMPLETED - should be automatic
  if (String(next) === "COMPLETED") {
    return {
      allowed: true,
      warning: "Normally, COMPLETED is set automatically when all bookings are completed. Are you sure you want to set this manually?",
      requiresReason: true,
    };
  }

  return { allowed: true };
}

/**
 * Get status change description for UI
 */
export function getStatusChangeDescription(
  currentStatus: LeadStatus | string,
  newStatus: LeadStatus | string
): string {
  const descriptions: Record<string, string> = {
    "INTERESTED → BOOKED": "จองทริปแล้ว",
    "BOOKED → COMPLETED": "ทริปเสร็จสมบูรณ์",
    "INTERESTED → CANCELLED": "ยกเลิก lead",
    "BOOKED → CANCELLED": "ยกเลิกการจอง",
  };

  const key = `${currentStatus} → ${newStatus}`;
  return descriptions[key] || `เปลี่ยน status จาก ${currentStatus} เป็น ${newStatus}`;
}

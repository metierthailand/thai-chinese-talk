// Lead enum values - synced with prisma/schema.prisma via Prisma enums
// Importing Prisma enums keeps this file aligned with schema automatically
import { LeadStatus, LeadSource } from "@prisma/client";

// LeadStatus enum values (derived from Prisma)
export const LEAD_STATUS_VALUES = Object.values(LeadStatus) as LeadStatus[];

// LeadStatus display labels mapping
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  INTERESTED: "Interested",
  BOOKED: "Booked",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// Manual Lead Statuses (Agent can control)
export const MANUAL_LEAD_STATUSES: LeadStatus[] = ["INTERESTED", "CANCELLED"];

// System Lead Statuses (System manages automatically)
export const SYSTEM_LEAD_STATUSES: LeadStatus[] = ["BOOKED", "COMPLETED"];

// Helper function to get lead status label
export function getLeadStatusLabel(status: string): string {
  return LEAD_STATUS_LABELS[status as LeadStatus] || status.replace("_", " ");
}

// Helper function to check if status is manual
export function isManualLeadStatus(status: string): boolean {
  return MANUAL_LEAD_STATUSES.includes(status as LeadStatus);
}

// Helper function to check if status is system-managed
export function isSystemLeadStatus(status: string): boolean {
  return SYSTEM_LEAD_STATUSES.includes(status as LeadStatus);
}

// LeadSource enum values (derived from Prisma)
export const LEAD_SOURCE_VALUES = Object.values(LeadSource) as LeadSource[];

// LeadSource display labels mapping
export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  FACEBOOK: "Facebook",
  YOUTUBE: "YouTube",
  TIKTOK: "TikTok",
  FRIEND: "Friend",
};

// Helper function to get lead source label
export function getLeadSourceLabel(source: string): string {
  return LEAD_SOURCE_LABELS[source as LeadSource] || source;
}

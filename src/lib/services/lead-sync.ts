import { prisma } from "@/lib/prisma";
import { LeadStatus, BookingStatus } from "@prisma/client";
import { MANUAL_LEAD_STATUSES, SYSTEM_LEAD_STATUSES } from "@/lib/constants/lead";

/**
 * Sync Lead status based on associated Bookings
 * @param leadId - Lead ID to sync
 */
export async function syncLeadStatusFromBooking(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      bookings: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!lead) {
    throw new Error("Lead not found");
  }

  // Check if all bookings are completed
  const allCompleted = lead.bookings.length > 0 && 
    lead.bookings.every((booking) => booking.status === "COMPLETED");

  // If all bookings are completed → COMPLETED
  if (allCompleted && lead.status !== "COMPLETED") {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "COMPLETED",
      },
    });
    return "COMPLETED";
  }

  // If has active booking (confirmed or pending) → BOOKED
  const hasConfirmedOrPending = lead.bookings.some((booking) =>
    ["PENDING", "CONFIRMED"].includes(booking.status)
  );

  if (hasConfirmedOrPending && lead.status !== "BOOKED") {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "BOOKED",
      },
    });
    return "BOOKED";
  }

  // If all bookings are cancelled/refunded → CANCELLED
  const allCancelled = lead.bookings.length > 0 && 
    lead.bookings.every((booking) =>
      ["CANCELLED", "REFUNDED"].includes(booking.status)
    );

  if (allCancelled && lead.status !== "CANCELLED") {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "CANCELLED",
      },
    });
    return "CANCELLED";
  }

  return lead.status;
}

/**
 * Auto-update Lead to BOOKED when booking is created
 * @param leadId - Lead ID to update
 */
export async function autoUpdateLeadToClosedWon(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    throw new Error("Lead not found");
  }

  // Only update if not already booked
  if (lead.status !== "BOOKED") {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "BOOKED",
      },
    });
  }
}

/**
 * Auto-update Lead to CANCELLED if no active bookings
 * @param leadId - Lead ID to check and update
 */
export async function autoUpdateLeadToClosedLost(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      bookings: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!lead) {
    throw new Error("Lead not found");
  }

  // Check if there are any active bookings
  const hasActiveBooking = lead.bookings.some((booking) =>
    ["PENDING", "CONFIRMED", "COMPLETED"].includes(booking.status)
  );

  // Only update to CANCELLED if no active bookings
  if (!hasActiveBooking && lead.status !== "CANCELLED") {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "CANCELLED",
      },
    });
  }
}

/**
 * Check and update abandoned leads (no activity > 30 days)
 * This should be run as a cron job
 * Note: With new schema, we use updatedAt instead of lastActivityAt
 */
export async function checkAbandonedLeads() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Find leads that haven't been updated in 30 days and are not closed
  const abandonedLeads = await prisma.lead.findMany({
    where: {
      updatedAt: {
        lt: thirtyDaysAgo,
      },
      status: {
        notIn: ["BOOKED", "COMPLETED", "CANCELLED"],
      },
    },
  });

  // Update them to CANCELLED (no abandoned status in new schema)
  const updatePromises = abandonedLeads.map((lead) =>
    prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: "CANCELLED",
      },
    })
  );

  await Promise.all(updatePromises);

  return abandonedLeads.length;
}

/**
 * Check if Lead can be manually updated (not locked by bookings)
 * @param leadId - Lead ID to check
 * @returns true if can be updated, false otherwise
 */
export async function canUpdateLeadStatus(leadId: string): Promise<boolean> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      bookings: {
        where: {
          status: {
            in: ["PENDING", "CONFIRMED", "COMPLETED"] as BookingStatus[],
          },
        },
      },
    },
  });

  if (!lead) {
    return false;
  }

  // Cannot update if there are active bookings
  return lead.bookings.length === 0;
}

/**
 * Get manual lead statuses (that agents can set)
 */
export function getManualLeadStatuses(): LeadStatus[] {
  return MANUAL_LEAD_STATUSES;
}

/**
 * Get system lead statuses (that system manages)
 */
export function getSystemLeadStatuses(): LeadStatus[] {
  return SYSTEM_LEAD_STATUSES;
}

/**
 * Check if a status is a manual status
 */
export function isManualLeadStatus(status: LeadStatus): boolean {
  return getManualLeadStatuses().includes(status);
}

/**
 * Check if a status is a system status
 */
export function isSystemLeadStatus(status: LeadStatus): boolean {
  return getSystemLeadStatuses().includes(status);
}

import { prisma } from "@/lib/prisma";
import { CommissionStatus } from "@prisma/client";
import Decimal from "decimal.js";

/**
 * Calculate and create commission for a booking
 * Commission is calculated when paymentStatus is FULLY_PAID
 */
export async function calculateCommission(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      trip: { select: { standardPrice: true, startDate: true } },
      firstPayment: { select: { amount: true } },
      secondPayment: { select: { amount: true } },
      thirdPayment: { select: { amount: true } },
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  // Commission is only calculated for FULLY_PAID bookings
  if (booking.paymentStatus !== "FULLY_PAID") {
    console.log(`Booking ${bookingId} is not FULLY_PAID (status: ${booking.paymentStatus}), skipping commission calculation`);
    return null;
  }

  // Check if commission already exists
  const existingCommission = await prisma.commission.findFirst({
    where: { bookingId },
  });

  if (existingCommission) {
    console.log(`Commission already exists for booking ${bookingId}`);
    return existingCommission;
  }

  // Calculate total amount from trip + extras - discount
  const basePrice = Number(booking.trip.standardPrice) || 0;
  const extraSingle = booking.extraPriceForSingleTraveller ? Number(booking.extraPriceForSingleTraveller) : 0;
  const extraBedPrice = booking.extraPricePerBed ? Number(booking.extraPricePerBed) : 0;
  const extraSeatPrice = booking.extraPricePerSeat ? Number(booking.extraPricePerSeat) : 0;
  const extraBagPrice = booking.extraPricePerBag ? Number(booking.extraPricePerBag) : 0;
  const discount = booking.discountPrice ? Number(booking.discountPrice) : 0;
  const totalAmount = basePrice + extraSingle + extraBedPrice + extraSeatPrice + extraBagPrice - discount;

  // Calculate paid amount
  const firstAmount = booking.firstPayment ? Number(booking.firstPayment.amount) : 0;
  const secondAmount = booking.secondPayment ? Number(booking.secondPayment.amount) : 0;
  const thirdAmount = booking.thirdPayment ? Number(booking.thirdPayment.amount) : 0;
  const paidAmount = firstAmount + secondAmount + thirdAmount;

  // Get commission agent - use salesUserId (SALES role user)
  const salesUser = await prisma.user.findUnique({
    where: { id: booking.salesUserId },
    select: {
      id: true,
      commissionPerHead: true,
    },
  });

  if (!salesUser) {
    console.log(`Sales user not found for booking ${bookingId}`);
    return null;
  }

  const commissionRate = salesUser.commissionPerHead
    ? new Decimal(salesUser.commissionPerHead.toString()).toNumber()
    : 0;

  if (commissionRate === 0) {
    console.log(`Sales user ${salesUser.id} has no commission rate, skipping commission calculation`);
    return null;
  }

  // Calculate commission amount
  // commissionPerHead is a fixed amount per booking (not a percentage)
  const amount = new Decimal(commissionRate);

  // Commission status is APPROVED when fully paid
  const status: CommissionStatus = "APPROVED";

  // Create commission with createdAt = trip startDate so commission filter by "created date range" = filter by trip start date
  const tripStartDate = new Date(booking.trip.startDate);
  const commission = await prisma.commission.create({
    data: {
      bookingId,
      agentId: salesUser.id,
      amount: amount.toNumber(),
      status,
      note: `Auto-generated commission for sales user (FULLY_PAID)`,
      createdAt: tripStartDate,
    },
  });

  return commission;
}

/**
 * Update commission status based on booking payment status
 */
export async function updateCommissionStatus(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      trip: { select: { standardPrice: true } },
      firstPayment: { select: { amount: true } },
      secondPayment: { select: { amount: true } },
      thirdPayment: { select: { amount: true } },
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  const commission = await prisma.commission.findFirst({
    where: { bookingId },
  });

  if (!commission) {
    console.log(`No commission found for booking ${bookingId}`);
    return null;
  }

  // Calculate total amount and paid amount
  const basePrice = Number(booking.trip.standardPrice) || 0;
  const extraSingle = booking.extraPriceForSingleTraveller ? Number(booking.extraPriceForSingleTraveller) : 0;
  const extraBedPrice = booking.extraPricePerBed ? Number(booking.extraPricePerBed) : 0;
  const extraSeatPrice = booking.extraPricePerSeat ? Number(booking.extraPricePerSeat) : 0;
  const extraBagPrice = booking.extraPricePerBag ? Number(booking.extraPricePerBag) : 0;
  const discount = booking.discountPrice ? Number(booking.discountPrice) : 0;
  const totalAmount = basePrice + extraSingle + extraBedPrice + extraSeatPrice + extraBagPrice - discount;

  const firstAmount = booking.firstPayment ? Number(booking.firstPayment.amount) : 0;
  const secondAmount = booking.secondPayment ? Number(booking.secondPayment.amount) : 0;
  const thirdAmount = booking.thirdPayment ? Number(booking.thirdPayment.amount) : 0;
  const paidAmount = firstAmount + secondAmount + thirdAmount;

  const isFullyPaid = booking.paymentStatus === "FULLY_PAID";

  // Update commission status
  let newStatus: CommissionStatus = commission.status;

  if (isFullyPaid && commission.status === "PENDING") {
    newStatus = "APPROVED";
  } else if (!isFullyPaid && commission.status === "APPROVED") {
    newStatus = "PENDING";
  }

  // If booking is cancelled, keep commission as PENDING (not eligible for payment)
  if (booking.paymentStatus === "CANCELLED") {
    newStatus = "PENDING";
  }

  if (newStatus !== commission.status) {
    const updatedCommission = await prisma.commission.update({
      where: { id: commission.id },
      data: { status: newStatus },
    });
    return updatedCommission;
  }

  return commission;
}

/**
 * Mark commission as paid
 */
export async function markCommissionAsPaid(commissionId: string) {
  const commission = await prisma.commission.findUnique({
    where: { id: commissionId },
  });

  if (!commission) {
    throw new Error("Commission not found");
  }

  if (commission.status !== "APPROVED") {
    throw new Error("Commission must be APPROVED before marking as PAID");
  }

  return await prisma.commission.update({
    where: { id: commissionId },
    data: {
      status: "PAID",
      paidAt: new Date(),
    },
  });
}

/**
 * Get total commission for an agent
 */
export async function getAgentCommissionSummary(agentId: string) {
  const commissions = await prisma.commission.findMany({
    where: { agentId },
    include: {
      booking: {
        select: {
          paymentStatus: true,
          firstPayment: { select: { amount: true } },
          secondPayment: { select: { amount: true } },
          thirdPayment: { select: { amount: true } },
        },
      },
    },
  });

  const pending = commissions
    .filter((c) => c.status === "PENDING")
    .reduce((sum, c) => sum.plus(c.amount.toString()), new Decimal(0));

  const approved = commissions
    .filter((c) => c.status === "APPROVED")
    .reduce((sum, c) => sum.plus(c.amount.toString()), new Decimal(0));

  const paid = commissions
    .filter((c) => c.status === "PAID")
    .reduce((sum, c) => sum.plus(c.amount.toString()), new Decimal(0));

  const total = pending.plus(approved).plus(paid);

  return {
    total: total.toNumber(),
    pending: pending.toNumber(),
    approved: approved.toNumber(),
    paid: paid.toNumber(),
    count: commissions.length,
  };
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { bookingId, amount, paymentType, proofOfPayment } = body;

    if (!bookingId || !amount || !paymentType) {
      return new NextResponse("Missing required fields: bookingId, amount, and paymentType are required", {
        status: 400,
      });
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return new NextResponse("Invalid amount", { status: 400 });
    }

    if (paymentType !== "secondPayment" && paymentType !== "thirdPayment") {
      return new NextResponse("Invalid paymentType: must be 'secondPayment' or 'thirdPayment'", { status: 400 });
    }

    // Use transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check booking exists and get current payment status
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          secondPaymentId: true,
          thirdPaymentId: true,
          paymentStatus: true,
        },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }

      // 2. Validate payment type
      if (paymentType === "secondPayment" && booking.secondPaymentId) {
        throw new Error("Second payment already exists for this booking");
      }
      if (paymentType === "thirdPayment" && booking.thirdPaymentId) {
        throw new Error("Third payment already exists for this booking");
      }
      if (paymentType === "thirdPayment" && !booking.secondPaymentId) {
        throw new Error("Second payment must be created before third payment");
      }

      // 3. Create Payment
      const payment = await tx.payment.create({
        data: {
          bookingId,
          amount: paymentAmount,
          proofOfPayment: proofOfPayment || null,
        } as unknown as Prisma.PaymentCreateInput,
      });

      // 4. Update Booking with paymentId
      const updateData: Prisma.BookingUpdateInput = {};
      if (paymentType === "secondPayment") {
        updateData.secondPaymentId = payment.id as unknown as string;
      } else if (paymentType === "thirdPayment") {
        updateData.thirdPaymentId = payment.id as unknown as string;
      }

      // 5. Get all payments to calculate total paid
      const bookingWithPayments = await tx.booking.findUnique({
        where: { id: bookingId },
        select: {
          firstPaymentId: true,
          secondPaymentId: true,
          thirdPaymentId: true,
        },
      });

      if (!bookingWithPayments) {
        throw new Error("Booking not found");
      }

      // Get all payment amounts
      const payments = await Promise.all([
        bookingWithPayments.firstPaymentId
          ? tx.payment.findUnique({
              where: { id: bookingWithPayments.firstPaymentId },
              select: { amount: true },
            })
          : null,
        bookingWithPayments.secondPaymentId
          ? tx.payment.findUnique({
              where: { id: bookingWithPayments.secondPaymentId },
              select: { amount: true },
            })
          : null,
        bookingWithPayments.thirdPaymentId
          ? tx.payment.findUnique({
              where: { id: bookingWithPayments.thirdPaymentId },
              select: { amount: true },
            })
          : null,
      ]);

      const firstAmount = payments[0] ? Number(payments[0].amount) : 0;
      const secondAmount = payments[1] ? Number(payments[1].amount) : 0;
      const thirdAmount = payments[2] ? Number(payments[2].amount) : 0;
      const totalPaid = firstAmount + secondAmount + thirdAmount;

      // Get booking total (calculate from trip + extras - discount)
      const bookingWithDetails = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          trip: { select: { standardPrice: true } },
        },
      });

      if (bookingWithDetails) {
        const basePrice = Number(bookingWithDetails.trip.standardPrice) || 0;
        const extraSingle = bookingWithDetails.extraPriceForSingleTraveller
          ? Number(bookingWithDetails.extraPriceForSingleTraveller)
          : 0;
        const extraBedPrice =
          bookingWithDetails.extraBed && bookingWithDetails.extraPricePerBed
            ? Number(bookingWithDetails.extraPricePerBed)
            : 0;
        const extraSeatPrice = bookingWithDetails.extraPricePerSeat
          ? Number(bookingWithDetails.extraPricePerSeat)
          : 0;
        const extraBagPrice = bookingWithDetails.extraPricePerBag ? Number(bookingWithDetails.extraPricePerBag) : 0;
        const discount = bookingWithDetails.discountPrice ? Number(bookingWithDetails.discountPrice) : 0;
        const totalAmount = basePrice + extraSingle + extraBedPrice + extraSeatPrice + extraBagPrice - discount;

        // Update payment status
        if (totalPaid >= totalAmount) {
          updateData.paymentStatus = "FULLY_PAID" as unknown as Prisma.BookingUpdateInput["paymentStatus"];
        } else if (totalPaid > 0) {
          updateData.paymentStatus = "DEPOSIT_PAID" as unknown as Prisma.BookingUpdateInput["paymentStatus"];
        }
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: updateData as unknown as Prisma.BookingUpdateInput,
      });

      return payment;
    });

    // Calculate commission if fully paid
    if (result) {
      try {
        const updatedBooking = await prisma.booking.findUnique({
          where: { id: bookingId },
          select: {
            paymentStatus: true,
            salesUserId: true,
          },
        });

        if (updatedBooking?.paymentStatus === "FULLY_PAID") {
          // Import commission calculator dynamically to avoid circular dependency
          const { calculateCommission } = await import("@/lib/services/commission-calculator");
          await calculateCommission(bookingId);
        }
      } catch (commissionError) {
        console.error("[COMMISSION_CALCULATION_ERROR]", commissionError);
        // Don't fail the payment creation if commission calculation fails
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[PAYMENTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

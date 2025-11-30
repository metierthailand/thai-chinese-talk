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
    const { bookingId, amount, method, note } = body;

    if (!bookingId || !amount) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return new NextResponse("Invalid amount", { status: 400 });
    }

    // Use transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Payment
      const payment = await tx.payment.create({
        data: {
          bookingId,
          amount: paymentAmount,
          method: method || "OTHER",
          note,
        },
      });

      // 2. Update Booking paidAmount
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { paidAmount: true, totalAmount: true },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }

      const newPaidAmount = Number(booking.paidAmount) + paymentAmount;

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          paidAmount: newPaidAmount,
        },
      });

      return payment;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[PAYMENTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

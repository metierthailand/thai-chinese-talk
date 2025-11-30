import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";
import Decimal from "decimal.js";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        commissionRate: true,
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Query bookings where the user is the assigned agent
    const bookings = await prisma.booking.findMany({
      where: {
        agentId: session.user.id,
        status: {
          in: ["CONFIRMED", "COMPLETED"] as BookingStatus[],
        },
      },
      select: {
        id: true,
        totalAmount: true,
        paidAmount: true,
        createdAt: true,
        customer: {
          select: {
            firstNameTh: true,
            lastNameTh: true,
            firstNameEn: true,
            lastNameEn: true,
          },
        },
        trip: {
          select: {
            name: true,
            destination: true,
          },
        },
      },
    });

    console.log("bookings", bookings);

    // Calculate commission using decimal.js for precision
    // Rule: Commission is calculated based on Total Sales of bookings that are fully paid (or meet specific criteria)
    // For now, let's assume we count all CONFIRMED/COMPLETED bookings, 
    // OR strictly follow the user's snippet: "if (paid >= total)"
    
    const totalSales = bookings.reduce((sum, booking) => {
      const paidAmount = new Decimal(booking.paidAmount.toString());
      const totalAmount = new Decimal(booking.totalAmount.toString());
      
      // Only count if fully paid
      if (paidAmount.gte(totalAmount)) {
        return sum.plus(totalAmount);
      }
      return sum;
    }, new Decimal(0));

    const commissionRate = user.commissionRate ? new Decimal(user.commissionRate.toString()) : new Decimal(0);
    const totalCommission = totalSales.mul(commissionRate).div(100);

    // Get bookings with details
    const bookingDetails = bookings.map((booking) => {
      const paidAmount = new Decimal(booking.paidAmount.toString());
      const totalAmount = new Decimal(booking.totalAmount.toString());
      const isFullyPaid = paidAmount.gte(totalAmount);
      
      // Calculate potential commission for this booking
      const potentialCommission = totalAmount.mul(commissionRate).div(100);
      
      return {
        id: booking.id,
        customerName: `${booking.customer.firstNameTh} ${booking.customer.lastNameTh}`,
        tripName: booking.trip.name,
        destination: booking.trip.destination,
        totalAmount: totalAmount.toNumber(),
        paidAmount: paidAmount.toNumber(),
        commission: isFullyPaid ? potentialCommission.toNumber() : 0, // Only show commission if fully paid?
        isEligible: isFullyPaid,
        createdAt: booking.createdAt,
      };
    });

    // Sort by date (newest first)
    bookingDetails.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      commissionRate: commissionRate.toNumber(),
      totalSales: totalSales.toNumber(),
      totalCommission: totalCommission.toNumber(),
      totalBookings: bookingDetails.length,
      bookings: bookingDetails,
    });
  } catch (error) {
    console.error("[MY_COMMISSION]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}


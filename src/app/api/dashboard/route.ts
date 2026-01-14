import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const [
      customerCount,
      activeLeadsCount,
      pendingBookingsCount,
      bookingsForRevenue,
      recentLeads,
      recentBookings
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.lead.count({
        where: {
          status: {
            notIn: ["CANCELLED", "BOOKED"],
          },
        },
      }),
      prisma.booking.count({
        where: {
          paymentStatus: "DEPOSIT_PENDING",
        },
      }),
      prisma.booking.findMany({
        where: {
          paymentStatus: {
            in: ["DEPOSIT_PAID", "FULLY_PAID"],
          },
        },
        include: {
          trip: {
            select: {
              standardPrice: true,
            },
          },
          firstPayment: {
            select: {
              amount: true,
            },
          },
          secondPayment: {
            select: {
              amount: true,
            },
          },
          thirdPayment: {
            select: {
              amount: true,
            },
          },
        },
      }),
      prisma.lead.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { customer: { select: { firstNameTh: true, lastNameTh: true } } },
      }),
      prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
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
            },
          },
          firstPayment: {
            select: {
              amount: true,
            },
          },
          secondPayment: {
            select: {
              amount: true,
            },
          },
          thirdPayment: {
            select: {
              amount: true,
            },
          },
        },
      }),
    ]);

    // Calculate total revenue from paid amounts
    const totalRevenue = bookingsForRevenue.reduce((sum, booking) => {
      const firstAmount = booking.firstPayment ? Number(booking.firstPayment.amount) : 0;
      const secondAmount = booking.secondPayment ? Number(booking.secondPayment.amount) : 0;
      const thirdAmount = booking.thirdPayment ? Number(booking.thirdPayment.amount) : 0;
      return sum + firstAmount + secondAmount + thirdAmount;
    }, 0);

    // Calculate total amount for each recent booking
    const recentBookingsWithTotal = recentBookings.map((booking) => {
      const firstAmount = booking.firstPayment ? Number(booking.firstPayment.amount) : 0;
      const secondAmount = booking.secondPayment ? Number(booking.secondPayment.amount) : 0;
      const thirdAmount = booking.thirdPayment ? Number(booking.thirdPayment.amount) : 0;
      const totalAmount = firstAmount + secondAmount + thirdAmount;
      return {
        ...booking,
        totalAmount,
      };
    });

    return NextResponse.json({
      customerCount,
      activeLeadsCount,
      pendingBookingsCount,
      totalRevenue,
      recentLeads,
      recentBookings: recentBookingsWithTotal,
    });
  } catch (error) {
    console.error("[DASHBOARD_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

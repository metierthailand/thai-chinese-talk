import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Get user with commissionPerHead
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        commissionPerHead: true,
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Get all commissions for this user (as agent)
    const commissions = await prisma.commission.findMany({
      where: {
        agentId: session.user.id,
      },
      include: {
        booking: {
          include: {
            trip: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            customer: {
              select: {
                id: true,
                firstNameEn: true,
                lastNameEn: true,
                firstNameTh: true,
                lastNameTh: true,
              },
            },
            companionCustomers: {
              select: {
                customer: {
                  select: {
                    firstNameEn: true,
                    lastNameEn: true,
                    firstNameTh: true,
                    lastNameTh: true,
                  },
                },
              },
            },
            payments: {
              select: {
                amount: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate totals
    const totalSales = commissions.reduce((sum, commission) => {
      const bookingTotal = commission.booking.payments.reduce(
        (paymentSum, payment) => paymentSum + Number(payment.amount),
        0
      );
      return sum + bookingTotal;
    }, 0);

    const totalCommission = commissions.reduce(
      (sum, commission) => sum + Number(commission.amount),
      0
    );

    // Format bookings for response
    const bookings = commissions.map((commission) => {
      const customer = commission.booking.customer;
      const customerName = customer.firstNameTh && customer.lastNameTh
        ? `${customer.firstNameTh} ${customer.lastNameTh}`
        : `${customer.firstNameEn} ${customer.lastNameEn}`;
      
      const trip = commission.booking.trip;
      const destination = trip.name;
      
      const totalAmount = commission.booking.payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      );
      
      const paidAmount = totalAmount; // All payments are already paid if commission exists

      return {
        id: commission.booking.id,
        customerName,
        tripName: trip.name,
        tripCode: trip.code,
        destination,
        totalAmount,
        paidAmount,
        commission: Number(commission.amount),
        createdAt: commission.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      commissionRate: user.commissionPerHead ? Number(user.commissionPerHead) : 0,
      totalSales,
      totalCommission,
      totalBookings: commissions.length,
      bookings,
    });
  } catch (error) {
    console.error("[MY_COMMISSION_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

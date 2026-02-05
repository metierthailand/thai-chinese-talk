import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "5", 10);
    const skip = (page - 1) * pageSize;

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

    // Get total count for pagination
    const total = await prisma.commission.count({
      where: {
        agentId: session.user.id,
      },
    });

    // Get all commissions for totals calculation (need all for accurate totals)
    const allCommissions = await prisma.commission.findMany({
      where: {
        agentId: session.user.id,
      },
      include: {
        booking: {
          select: {
            paidAmount: true, // Use cached paidAmount field for better performance
          },
        },
      },
    });

    // Calculate totals from all commissions using cached paidAmount
    const totalSales = allCommissions.reduce((sum, commission) => {
      return sum + Number(commission.booking.paidAmount || 0);
    }, 0);

    const totalCommission = allCommissions.reduce(
      (sum, commission) => sum + Number(commission.amount),
      0
    );

    // Get paginated commissions for bookings list
    const commissions = await prisma.commission.findMany({
      where: {
        agentId: session.user.id,
      },
      skip,
      take: pageSize,
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
            companionGroup: {
              include: {
                bookings: {
                  include: {
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
      totalBookings: total,
      bookings,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[MY_COMMISSION_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

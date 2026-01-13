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
      totalRevenue,
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
          status: "PENDING",
        },
      }),
      prisma.booking.aggregate({
        _sum: {
          totalAmount: true,
        },
        where: {
          status: {
            in: ["CONFIRMED", "COMPLETED"],
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
        include: { customer: { select: { firstNameTh: true, lastNameTh: true } } },
      }),
    ]);

    return NextResponse.json({
      customerCount,
      activeLeadsCount,
      pendingBookingsCount,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      recentLeads,
      recentBookings,
    });
  } catch (error) {
    console.error("[DASHBOARD_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

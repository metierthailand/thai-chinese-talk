import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Only ADMIN and SUPER_ADMIN can access
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const { agentId } = await params;
    const { searchParams } = new URL(req.url);
    const createdAtFrom = searchParams.get("createdAtFrom") || "";
    const createdAtTo = searchParams.get("createdAtTo") || "";

    const parseDateGte = (v: string) =>
      v.includes("T") ? new Date(v) : new Date(`${v}T00:00:00.000Z`);
    const parseDateLte = (v: string) =>
      v.includes("T") ? new Date(v) : new Date(`${v}T23:59:59.999Z`);

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (createdAtFrom) dateFilter.gte = parseDateGte(createdAtFrom);
    if (createdAtTo) dateFilter.lte = parseDateLte(createdAtTo);

    const where: Prisma.CommissionWhereInput = {
      agentId,
      ...(Object.keys(dateFilter).length > 0 && {
        createdAt: dateFilter,
      }),
    };

    // Fetch commission details for this agent
    const commissions = await prisma.commission.findMany({
      where,
      include: {
        booking: {
          include: {
            trip: {
              select: {
                code: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
            customer: {
              select: {
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
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform to detail format
    const details = commissions.map((commission) => {
      const customer = commission.booking.customer;
      const customerName =
        customer.firstNameTh && customer.lastNameTh
          ? `${customer.firstNameTh} ${customer.lastNameTh}`
          : `${customer.firstNameEn} ${customer.lastNameEn}`;

      return {
        id: commission.id,
        tripCode: commission.booking.trip.code,
        customerName,
        totalPeople: 1, // Only count the main customer, not companions
        commissionAmount: Number(commission.amount),
        trip: {
          code: commission.booking.trip.code,
          name: commission.booking.trip.name,
          startDate: commission.booking.trip.startDate,
          endDate: commission.booking.trip.endDate,
        },
      };
    });

    return NextResponse.json(details);
  } catch (error) {
    console.error("[COMMISSIONS_DETAIL_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

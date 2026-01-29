import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Only ADMIN and SUPER_ADMIN can access
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const createdAtFrom = searchParams.get("createdAtFrom") || "";
    const createdAtTo = searchParams.get("createdAtTo") || "";

    // Date range: support both ISO (user TZ range) and YYYY-MM-DD (UTC day).
    const parseDateGte = (v: string) =>
      v.includes("T") ? new Date(v) : new Date(`${v}T00:00:00.000Z`);
    const parseDateLte = (v: string) =>
      v.includes("T") ? new Date(v) : new Date(`${v}T23:59:59.999Z`);

    // Build where clause for date range filter
    // Filter commissions by createdAt within the date range
    // Commission is only created when booking paymentStatus is FULLY_PAID
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (createdAtFrom) dateFilter.gte = parseDateGte(createdAtFrom);
    if (createdAtTo) dateFilter.lte = parseDateLte(createdAtTo);

    // Build where clause
    const where: Prisma.CommissionWhereInput = {
      ...(Object.keys(dateFilter).length > 0 && {
        createdAt: dateFilter,
      }),
      ...(search.trim().length > 0 && {
        agent: {
          OR: [
            {
              firstName: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              lastName: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        },
      }),
    };

    // Get all commissions with necessary data in one query
    const commissions = await prisma.commission.findMany({
      where,
      select: {
        id: true,
        agentId: true,
        bookingId: true,
        amount: true,
        booking: {
          select: {
            tripId: true,
          },
        },
      },
    });

    if (commissions.length === 0) {
      return NextResponse.json([]);
    }

    // Group by agent and calculate aggregates in memory (faster than multiple queries)
    const commissionGroups = new Map<
      string,
      {
        agentId: string;
        tripIds: Set<string>;
        totalCommissionAmount: number;
        bookingIds: string[];
      }
    >();

    commissions.forEach((c) => {
      if (!commissionGroups.has(c.agentId)) {
        commissionGroups.set(c.agentId, {
          agentId: c.agentId,
          tripIds: new Set<string>(),
          totalCommissionAmount: 0,
          bookingIds: [],
        });
      }

      const group = commissionGroups.get(c.agentId)!;
      group.totalCommissionAmount += Number(c.amount);
      if (!group.bookingIds.includes(c.bookingId)) {
        group.bookingIds.push(c.bookingId);
      }
      // Track unique trip IDs
      if (c.booking.tripId) {
        group.tripIds.add(c.booking.tripId);
      }
    });

    // Get agent details
    const agentIds = Array.from(commissionGroups.keys());

    const agents = await prisma.user.findMany({
      where: {
        id: { in: agentIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    // Create map for quick lookup
    const agentMap = new Map(agents.map((a) => [a.id, a]));

    // Calculate total people for each agent
    const result = Array.from(commissionGroups.values())
      .map((group) => {
        const agent = agentMap.get(group.agentId);
        if (!agent) return null;

        const totalPeople = group.bookingIds.length; // 1 customer per booking (not including companions)

        return {
          agentId: group.agentId,
          agentName: `${agent.firstName} ${agent.lastName}`,
          totalTrips: group.tripIds.size, // Count unique trips
          totalPeople,
          totalCommissionAmount: group.totalCommissionAmount,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.agentName.localeCompare(b.agentName));

    return NextResponse.json(result);
  } catch (error) {
    console.error("[COMMISSIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

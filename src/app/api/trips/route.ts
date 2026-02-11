import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { calculateTripStatus } from "@/lib/services/trip-status";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  const VIEW_ROLES = ["SUPER_ADMIN", "ADMIN", "SALES", "STAFF"] as const;
  if (!session || !VIEW_ROLES.includes(session.user.role as (typeof VIEW_ROLES)[number])) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const skip = (page - 1) * pageSize;

    const search = searchParams.get("search") || "";
    const tripDateFrom = searchParams.get("tripDateFrom") || "";
    const tripDateTo = searchParams.get("tripDateTo") || "";
    const type = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";

    const searchFilter: Prisma.TripWhereInput =
      search.trim().length > 0
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                code: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                airlineAndAirport: {
                  code: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : {};

    // Date range filter: trip overlaps with selected date range
    // A trip overlaps if: trip.startDate <= tripDateTo AND trip.endDate >= tripDateFrom
    const parseDateGte = (v: string) =>
      v.includes("T") ? new Date(v) : new Date(`${v}T00:00:00.000Z`);
    const parseDateLte = (v: string) =>
      v.includes("T") ? new Date(v) : new Date(`${v}T23:59:59.999Z`);

    const dateFilter: Prisma.TripWhereInput =
      tripDateFrom || tripDateTo
        ? {
            AND: [
              // Trip must start before or on the end of selected range
              ...(tripDateTo
                ? [{ startDate: { lte: parseDateLte(tripDateTo) } }]
                : []),
              // Trip must end after or on the start of selected range
              ...(tripDateFrom
                ? [{ endDate: { gte: parseDateGte(tripDateFrom) } }]
                : []),
            ],
          }
        : {};

    const typeFilter: Prisma.TripWhereInput =
      type && type !== "ALL"
        ? {
            type: type as "GROUP_TOUR" | "PRIVATE_TOUR",
          }
        : {};

    const where: Prisma.TripWhereInput = {
      AND: [searchFilter, dateFilter, typeFilter],
    };

    // Get total count for pagination
    const total = await prisma.trip.count({ where });

    // Fetch paginated trips
    const trips = await prisma.trip.findMany({
      skip,
      take: pageSize,
      where,
      orderBy: {
        // startDate: "asc",
        createdAt: "desc",
      },
      include: {
        airlineAndAirport: true,
        _count: {
          select: {
            bookings: {
              where: {
                paymentStatus: {
                  not: "CANCELLED",
                },
              },
            },
          },
        },
      },
    });

    const tripIds = trips.map((t) => t.id);
    // Count bookings without CANCELLED status per trip
    const paidCounts =
      tripIds.length > 0
        ? await prisma.booking.groupBy({
            by: ["tripId"],
            where: {
              tripId: { in: tripIds },
              paymentStatus: {
                not: "CANCELLED",
              },
            },
            _count: { id: true },
          })
        : [];
    const paidCountByTripId = Object.fromEntries(
      paidCounts.map((p) => [p.tripId, p._count.id])
    );

    // Calculate trip status for each trip
    const now = new Date();
    let tripsWithStatus = trips.map((trip) => {
      const status = calculateTripStatus(
        trip.startDate,
        trip.endDate,
        trip._count.bookings,
        trip.pax,
        now
      );
      const paidBookingsCount = paidCountByTripId[trip.id] ?? 0;

      return {
        ...trip,
        status,
        paidBookingsCount,
      };
    });

    // Filter by status if provided
    if (status && status !== "ALL") {
      tripsWithStatus = tripsWithStatus.filter((trip) => trip.status === status);
    }

    // Recalculate total after status filter
    const finalTotal = status && status !== "ALL" ? tripsWithStatus.length : total;
    const totalPages = Math.ceil(finalTotal / pageSize);

    return NextResponse.json({
      data: tripsWithStatus,
      total: finalTotal,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error("[TRIPS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "SUPER_ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      type,
      code,
      name,
      startDate,
      endDate,
      pax,
      foc,
      tl,
      tg,
      staff,
      standardPrice,
      extraPricePerPerson,
      note,
      airlineAndAirportId,
    } = body;

    if (!code || !name || !startDate || !endDate || !airlineAndAirportId) {
      return new NextResponse("Missing required fields: code, name, startDate, endDate, airlineAndAirportId", {
        status: 400,
      });
    }

    // Check if code already exists
    const existingTrip = await prisma.trip.findUnique({
      where: { code },
    });

    if (existingTrip) {
      return NextResponse.json(
        { message: "This trip code already exists.", field: "code" },
        { status: 409 }
      );
    }

    const trip = await prisma.trip.create({
      data: {
        type: type || "GROUP_TOUR",
        code,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        pax: pax ? parseInt(pax) : 1,
        foc: foc ? parseInt(foc) : 1,
        tl: tl || null,
        tg: tg || null,
        staff: staff || null,
        standardPrice: standardPrice ? parseFloat(standardPrice) : 0,
        extraPricePerPerson: extraPricePerPerson ? parseFloat(extraPricePerPerson) : 0,
        note: note || null,
        airlineAndAirportId,
      },
      include: {
        airlineAndAirport: true,
        _count: {
          select: { bookings: true },
        },
      },
    });

    return NextResponse.json(trip);
  } catch (error) {
    console.error("[TRIPS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

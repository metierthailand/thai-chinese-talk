import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const skip = (page - 1) * pageSize;

    const search = searchParams.get("search") || "";
    const selectedDate = searchParams.get("selectedDate") || "";
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

    const dateFilter: Prisma.TripWhereInput =
      selectedDate
        ? {
            AND: [
              {
                startDate: {
                  lte: new Date(new Date(selectedDate).setHours(23, 59, 59, 999)),
                },
              },
              {
                endDate: {
                  gte: new Date(new Date(selectedDate).setHours(0, 0, 0, 0)),
                },
              },
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

    // Calculate trip status for each trip
    const now = new Date();
    let tripsWithStatus = trips.map((trip) => {
      const startDate = new Date(trip.startDate);
      const endDate = new Date(trip.endDate);
      const activeBookingsCount = trip._count.bookings;
      const pax = trip.pax;

      let status: "UPCOMING" | "SOLD_OUT" | "COMPLETED" | "ON_TRIP" | "CANCELLED";
      
      // Check if trip has started (startDate <= now)
      if (startDate <= now) {
        // Cancelled: When the start date has been reached but the trip have no any bookings
        // This status persists even after endDate passes
        if (activeBookingsCount === 0) {
          status = "CANCELLED";
        }
        // Trip has bookings
        else {
          // Completed: When the end date has been passed and there are bookings
          if (endDate < now) {
            status = "COMPLETED";
          }
          // On trip: When the trip is ongoing (startDate <= now <= endDate) and there are bookings
          else {
            status = "ON_TRIP";
          }
        }
      }
      // Start date has not been reached (startDate > now)
      else {
        // Sold out: When the start date has not been reached but the trip have been fully booked
        if (activeBookingsCount >= pax) {
          status = "SOLD_OUT";
        } else {
          // Upcoming: When the start date has not been reached
          status = "UPCOMING";
        }
      }

      return {
        ...trip,
        status,
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

  if (!session) {
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

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
    const startDateFrom = searchParams.get("startDateFrom") || "";
    const startDateTo = searchParams.get("startDateTo") || "";

    const searchFilter: Prisma.TripWhereInput =
      search.trim().length > 0
        ? {
            name: {
              contains: search,
              mode: "insensitive" as const,
            },
          }
        : {};

    const dateFilter: Prisma.TripWhereInput =
      startDateFrom || startDateTo
        ? {
            startDate: {
              ...(startDateFrom ? { gte: new Date(startDateFrom) } : {}),
              ...(startDateTo ? { lte: new Date(startDateTo) } : {}),
            },
          }
        : {};

    const where: Prisma.TripWhereInput = {
      AND: [searchFilter, dateFilter],
    };

    // Get total count for pagination
    const total = await prisma.trip.count({ where });

    // Fetch paginated trips
    const trips = await prisma.trip.findMany({
      skip,
      take: pageSize,
      where,
      orderBy: {
        startDate: "asc",
      },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    return NextResponse.json({
      data: trips,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
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
    const { name, destination, startDate, endDate, maxCapacity, description, price } = body;

    if (!name || !destination || !startDate || !endDate || !maxCapacity) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const trip = await prisma.trip.create({
      data: {
        name,
        destination,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        maxCapacity: parseInt(maxCapacity),
        description,
        price: price ? parseFloat(price) : null,
      },
    });

    return NextResponse.json(trip);
  } catch (error) {
    console.error("[TRIPS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Prisma.AirlineAndAirportWhereInput = search.trim().length > 0
      ? {
          OR: [
            {
              code: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {};

    // Get total count for pagination
    const total = await prisma.airlineAndAirport.count({ where });

    // Fetch paginated airline and airports
    const airlineAndAirports = await prisma.airlineAndAirport.findMany({
      skip,
      take: pageSize,
      where,
      orderBy: {
        code: "asc",
      },
      include: {
        _count: {
          select: { trips: true },
        },
      },
    });

    return NextResponse.json({
      data: airlineAndAirports,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[AIRLINE_AND_AIRPORTS_GET]", error);
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
    const { code, name } = body;

    if (!code || !name) {
      return new NextResponse("Code and name are required", { status: 400 });
    }

    // Check if code already exists
    const existing = await prisma.airlineAndAirport.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { message: "This IATA code already exists.", field: "code" },
        { status: 409 }
      );
    }

    const airlineAndAirport = await prisma.airlineAndAirport.create({
      data: {
        code,
        name,
      },
    });

    return NextResponse.json(airlineAndAirport);
  } catch (error) {
    console.error("[AIRLINE_AND_AIRPORTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

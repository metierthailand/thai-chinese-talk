import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const trip = await prisma.trip.findUnique({
      where: {
        id: id,
      },
      include: {
        airlineAndAirport: true,
        _count: {
          select: { bookings: true },
        },
      },
    });

    if (!trip) {
      return new NextResponse("Trip not found", { status: 404 });
    }

    return NextResponse.json(trip);
  } catch (error) {
    console.error("[TRIP_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

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

    // Check if code already exists (excluding current trip)
    const existingTrip = await prisma.trip.findUnique({
      where: { code },
    });

    if (existingTrip && existingTrip.id !== id) {
      return NextResponse.json(
        { message: "This trip code already exists.", field: "code" },
        { status: 409 }
      );
    }

    const trip = await prisma.trip.update({
      where: {
        id: id,
      },
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
    console.error("[TRIP_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}


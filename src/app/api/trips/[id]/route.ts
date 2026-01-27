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

    if (!trip) {
      return new NextResponse("Trip not found", { status: 404 });
    }

    // Calculate trip status
    const now = new Date();
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

    return NextResponse.json({
      ...trip,
      status,
    });
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

    // Calculate trip status
    const now = new Date();
    const startDateObj = new Date(trip.startDate);
    const endDateObj = new Date(trip.endDate);
    const activeBookingsCount = trip._count.bookings;
    const tripPax = trip.pax;

    let status: "UPCOMING" | "SOLD_OUT" | "COMPLETED" | "ON_TRIP" | "CANCELLED";
    
    // Check if trip has started (startDate <= now)
    if (startDateObj <= now) {
      // Cancelled: When the start date has been reached but the trip have no any bookings
      // This status persists even after endDate passes
      if (activeBookingsCount === 0) {
        status = "CANCELLED";
      }
      // Trip has bookings
      else {
        // Completed: When the end date has been passed and there are bookings
        if (endDateObj < now) {
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
      if (activeBookingsCount >= tripPax) {
        status = "SOLD_OUT";
      } else {
        // Upcoming: When the start date has not been reached
        status = "UPCOMING";
      }
    }

    return NextResponse.json({
      ...trip,
      status,
    });
  } catch (error) {
    console.error("[TRIP_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}


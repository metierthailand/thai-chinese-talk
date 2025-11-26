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
    const trips = await prisma.trip.findMany({
      orderBy: {
        startDate: "asc",
      },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    return NextResponse.json(trips);
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

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const airlineAndAirport = await prisma.airlineAndAirport.findUnique({
      where: {
        id: id,
      },
      include: {
        _count: {
          select: { trips: true },
        },
      },
    });

    if (!airlineAndAirport) {
      return new NextResponse("Airline/Airport not found", { status: 404 });
    }

    return NextResponse.json(airlineAndAirport);
  } catch (error) {
    console.error("[AIRLINE_AND_AIRPORT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { code, name } = body;

    if (!code || !name) {
      return new NextResponse("Code and name are required", { status: 400 });
    }

    // Check if code already exists (excluding current)
    const existing = await prisma.airlineAndAirport.findUnique({
      where: { code },
    });

    if (existing && existing.id !== id) {
      return NextResponse.json(
        { message: "This IATA code already exists.", field: "code" },
        { status: 409 }
      );
    }

    const airlineAndAirport = await prisma.airlineAndAirport.update({
      where: { id },
      data: {
        code,
        name,
      },
      include: {
        _count: {
          select: { trips: true },
        },
      },
    });

    return NextResponse.json(airlineAndAirport);
  } catch (error) {
    console.error("[AIRLINE_AND_AIRPORT_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    // Check if used in any trips
    const tripsCount = await prisma.trip.count({
      where: { airlineAndAirportId: id },
    });

    if (tripsCount > 0) {
      return NextResponse.json(
        { message: "Deleted unsuccessfully. This IATA code is in use" },
        { status: 400 }
      );
    }

    await prisma.airlineAndAirport.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AIRLINE_AND_AIRPORT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

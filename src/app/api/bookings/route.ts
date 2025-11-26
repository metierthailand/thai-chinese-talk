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
    const bookings = await prisma.booking.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        trip: {
          select: {
            name: true,
            destination: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error("[BOOKINGS_GET]", error);
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
      customerId,
      tripId,
      totalAmount,
      paidAmount,
      status,
      visaStatus,
    } = body;

    if (!customerId || !tripId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const booking = await prisma.booking.create({
      data: {
        customerId,
        tripId,
        totalAmount: parseFloat(totalAmount),
        paidAmount: parseFloat(paidAmount || 0),
        status: status || "PENDING",
        visaStatus: visaStatus || "NOT_REQUIRED",
      },
    });

    return NextResponse.json(booking);
  } catch (error) {
    console.error("[BOOKINGS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

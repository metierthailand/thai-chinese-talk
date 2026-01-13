import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BookingStatus, Prisma, VisaStatus } from "@prisma/client";
import { calculateCommission } from "@/lib/services/commission-calculator";
import { autoUpdateLeadToClosedWon } from "@/lib/services/lead-sync";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const visaStatus = searchParams.get("visaStatus") || "";
    const tripStartDateFrom = searchParams.get("tripStartDateFrom") || "";
    const tripStartDateTo = searchParams.get("tripStartDateTo") || "";
    const tripId = searchParams.get("tripId") || "";
    const skip = (page - 1) * pageSize;

    // Build where clause for optional customer name search
    const searchFilter: Prisma.BookingWhereInput =
      search.trim().length > 0
        ? {
            customer: {
              is: {
                OR: [
                  {
                    firstNameTh: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    lastNameTh: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    firstNameEn: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    lastNameEn: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            },
          }
        : {};

    // Build where clause for status filter
    const statusFilter: Prisma.BookingWhereInput = status
      ? { status: status as BookingStatus }
      : {};

    // Build where clause for visa status filter
    const visaStatusFilter: Prisma.BookingWhereInput = visaStatus
      ? { visaStatus: visaStatus as VisaStatus }
      : {};

    // Build where clause for trip start date range filter
    const tripDateFilter: Prisma.BookingWhereInput =
      tripStartDateFrom || tripStartDateTo
        ? {
            trip: {
              is: {
                startDate: {
                  ...(tripStartDateFrom ? { gte: new Date(tripStartDateFrom) } : {}),
                  ...(tripStartDateTo ? { lte: new Date(tripStartDateTo) } : {}),
                },
              },
            },
          }
        : {};

    // Build where clause for tripId filter
    const tripIdFilter: Prisma.BookingWhereInput = tripId
      ? { tripId }
      : {};

    // Combine all filters
    const where: Prisma.BookingWhereInput = {
      AND: [searchFilter, statusFilter, visaStatusFilter, tripDateFilter, tripIdFilter],
    };

    // Get total count for pagination
    const total = await prisma.booking.count({
      where,
    });

    // Fetch paginated bookings
    const bookings = await prisma.booking.findMany({
      skip,
      take: pageSize,
      where,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: {
          select: {
            firstNameTh: true,
            lastNameTh: true,
            firstNameEn: true,
            lastNameEn: true,
            email: true,
          },
        },
        trip: {
          select: {
            name: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    return NextResponse.json({
      data: bookings,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
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
      leadId,
      totalAmount,
      paidAmount,
      status,
      visaStatus,
    } = body;

    let finalCustomerId = customerId;
    let finalLeadId = leadId;

    // If leadId is provided but customerId is missing, try to find customer from lead
    if (leadId && !finalCustomerId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { customerId: true },
      });

      if (lead) {
        finalCustomerId = lead.customerId;
      } else {
        return new NextResponse("Invalid Lead ID", { status: 400 });
      }
    }

    if (!finalCustomerId || !tripId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Get trip to use its price if totalAmount is not provided
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { standardPrice: true },
    });

    if (!trip) {
      return new NextResponse("Trip not found", { status: 404 });
    }

    // Use trip.price if totalAmount is not provided or is 0
    let finalTotalAmount: number;
    if (totalAmount && parseFloat(totalAmount) > 0) {
      finalTotalAmount = parseFloat(totalAmount);
    } else if (trip.standardPrice) {
      finalTotalAmount = Number(trip.standardPrice);
    } else {
      return new NextResponse("Total amount is required (trip has no price)", { status: 400 });
    }

    // Determine agentId
    let agentId = body.agentId;
    if (!agentId && leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { agentId: true },
      });
      if (lead) {
        agentId = lead.agentId;
      }
    }
    // If still no agentId, and the creator is an AGENT, assign them
    if (!agentId && session.user.role === "AGENT") {
      agentId = session.user.id;
    }

    // Use transaction to ensure data integrity
    const booking = await prisma.$transaction(async (tx) => {
      // 1. Auto-create Lead for walk-in if no leadId provided
      if (!finalLeadId && agentId) {
        const newLead = await tx.lead.create({
          data: {
            customerId: finalCustomerId,
            agentId,
            source: "FACEBOOK",
            status: "BOOKED",
            leadNote: "Auto-created from booking",
            sourceNote: "Auto-created from booking",
            tripInterest: "Auto-created from booking",
            salesUserId: session.user.id,
            pax: 1,
          },
        });
        finalLeadId = newLead.id;
      }

      // 2. Create Booking with 0 paidAmount initially
      const newBooking = await tx.booking.create({
        data: {
          customerId: finalCustomerId,
          tripId,
          leadId: finalLeadId,
          agentId,
          totalAmount: finalTotalAmount,
          paidAmount: 0, // Will be updated if there's a payment
          status: status || "PENDING",
          visaStatus: visaStatus || "NOT_REQUIRED",
        },
      });

      // 3. If paidAmount is provided, create a Payment record
      const initialPaidAmount = parseFloat(paidAmount || 0);
      if (initialPaidAmount > 0) {
        await tx.payment.create({
          data: {
            bookingId: newBooking.id,
            amount: initialPaidAmount,
            method: "OTHER", // Default or need input
            note: "Initial payment at booking creation",
          },
        });

        // Update Booking paidAmount
        await tx.booking.update({
          where: { id: newBooking.id },
          data: { paidAmount: initialPaidAmount },
        });
        
        newBooking.paidAmount = new Prisma.Decimal(initialPaidAmount);
      }

      // 4. Auto-update Lead status to CLOSED_WON if leadId is provided
      if (finalLeadId) {
        await tx.lead.update({
          where: { id: finalLeadId },
          data: {
            status: "BOOKED",
          },
        });
      }

      return newBooking;
    });

    // 5. Calculate and create Commission (outside transaction for better error handling)
    try {
      await calculateCommission(booking.id);
    } catch (commissionError) {
      console.error("[COMMISSION_CALCULATION_ERROR]", commissionError);
      // Don't fail the booking creation if commission calculation fails
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("[BOOKINGS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

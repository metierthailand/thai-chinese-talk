import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma, Role } from "@prisma/client";
import { calculateCommission } from "@/lib/services/commission-calculator";

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

    // Build where clause for payment status filter
    const paymentStatusFilter: Prisma.BookingWhereInput = status
      ? ({ paymentStatus: status } as unknown as Prisma.BookingWhereInput)
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
    const tripIdFilter: Prisma.BookingWhereInput = tripId ? { tripId } : {};

    // Combine all filters
    const where: Prisma.BookingWhereInput = {
      AND: [searchFilter, paymentStatusFilter, tripDateFilter, tripIdFilter],
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
        salesUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        companionCustomers: {
          include: {
            customer: {
              select: {
                id: true,
                firstNameTh: true,
                lastNameTh: true,
                firstNameEn: true,
                lastNameEn: true,
              },
            },
          },
        },
        trip: {
          select: {
            name: true,
            startDate: true,
            endDate: true,
            standardPrice: true,
            code: true,
          },
        },
        firstPayment: {
          select: {
            id: true,
            amount: true,
            paidAt: true,
          },
        },
        secondPayment: {
          select: {
            id: true,
            amount: true,
            paidAt: true,
          },
        },
        thirdPayment: {
          select: {
            id: true,
            amount: true,
            paidAt: true,
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
      salesUserId,
      passportId,
      companionCustomerIds,
      agentId,
      note,
      extraPriceForSingleTraveller,
      roomType,
      extraPricePerBed,
      roomNote,
      seatType,
      seatClass,
      extraPricePerSeat,
      seatNote,
      extraPricePerBag,
      bagNote,
      discountPrice,
      discountNote,
      paymentStatus,
      firstPaymentRatio,
      firstPaymentAmount,
      firstPaymentProof,
    } = body;

    if (!customerId || !tripId || !salesUserId || !passportId) {
      return new NextResponse("Missing required fields: customerId, tripId, salesUserId, and passportId are required", {
        status: 400,
      });
    }

    // Validate salesUserId is a user with SALES role
    const salesUser = await prisma.user.findUnique({
      where: { id: salesUserId },
      select: { role: true, isActive: true },
    });

    if (!salesUser || salesUser.role !== Role.SALES || !salesUser.isActive) {
      return new NextResponse("Invalid salesUserId: must be an active user with SALES role", { status: 400 });
    }

    // Validate companion customers if provided
    if (companionCustomerIds && Array.isArray(companionCustomerIds) && companionCustomerIds.length > 0) {
      // Check if companion customers exist and are booked in the same trip
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        select: { id: true },
      });

      if (!trip) {
        return new NextResponse("Trip not found", { status: 404 });
      }

      // Validate that companion customers are already booked in this trip
      const companionBookings = await prisma.booking.findMany({
        where: {
          tripId,
          customerId: { in: companionCustomerIds },
        },
        select: { customerId: true },
      });

      const bookedCompanionIds = companionBookings.map((b) => b.customerId);
      const invalidCompanions = companionCustomerIds.filter((id: string) => !bookedCompanionIds.includes(id));

      if (invalidCompanions.length > 0) {
        return new NextResponse(
          `Invalid companion customers: ${invalidCompanions.join(", ")} must be booked in the same trip first`,
          { status: 400 },
        );
      }
    }

    // Get trip to calculate base price
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { standardPrice: true },
    });

    if (!trip) {
      return new NextResponse("Trip not found", { status: 404 });
    }

    // Calculate total amount from trip price + extra prices - discount
    const basePrice = Number(trip.standardPrice) || 0;
    const extraSingle = extraPriceForSingleTraveller ? Number(extraPriceForSingleTraveller) : 0;
    const extraBedPrice = extraPricePerBed ? Number(extraPricePerBed) : 0;
    const extraSeatPrice = extraPricePerSeat ? Number(extraPricePerSeat) : 0;
    const extraBagPrice = extraPricePerBag ? Number(extraPricePerBag) : 0;
    const discount = discountPrice ? Number(discountPrice) : 0;
    const totalAmount = basePrice + extraSingle + extraBedPrice + extraSeatPrice + extraBagPrice - discount;

    // Validate firstPaymentRatio and firstPaymentAmount
    if (!firstPaymentRatio) {
      return new NextResponse("firstPaymentRatio is required", { status: 400 });
    }

    if (!firstPaymentAmount || Number(firstPaymentAmount) <= 0) {
      return new NextResponse("firstPaymentAmount is required and must be greater than 0", { status: 400 });
    }

    // Validate firstPaymentAmount matches ratio
    let expectedFirstPayment: number;
    switch (firstPaymentRatio) {
      case "FIRST_PAYMENT_100":
        expectedFirstPayment = totalAmount;
        break;
      case "FIRST_PAYMENT_50":
        expectedFirstPayment = totalAmount * 0.5;
        break;
      case "FIRST_PAYMENT_30":
        expectedFirstPayment = totalAmount * 0.3;
        break;
      default:
        return new NextResponse("Invalid firstPaymentRatio", { status: 400 });
    }

    const firstPaymentAmountNum = Number(firstPaymentAmount);
    if (Math.abs(firstPaymentAmountNum - expectedFirstPayment) > 0.01) {
      return new NextResponse(
        `firstPaymentAmount (${firstPaymentAmountNum}) does not match firstPaymentRatio (${firstPaymentRatio}). Expected: ${expectedFirstPayment.toFixed(2)}`,
        { status: 400 },
      );
    }

    // Determine agentId: use provided agentId, or default to session user if they have agent role
    let finalAgentId: string | null = agentId || null;
    
    // If no agentId provided, use session user as agent if they have appropriate role
    if (!finalAgentId && session.user.id) {
      const sessionUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, isActive: true },
      });
      
      // Set agentId to session user if they are ADMIN, SUPER_ADMIN, or STAFF
      if (sessionUser && sessionUser.isActive && (sessionUser.role === Role.ADMIN || sessionUser.role === Role.SUPER_ADMIN || sessionUser.role === Role.STAFF)) {
        finalAgentId = session.user.id;
      }
    }

    // Use transaction to ensure data integrity
    const booking = await prisma.$transaction(async (tx) => {
      // 1. Create Booking first (without firstPaymentId, it's now optional)
      const newBooking = await tx.booking.create({
        data: {
          customerId,
          salesUserId,
          tripId,
          agentId: finalAgentId,
          passportId: passportId,
          note: note || null,
          extraPriceForSingleTraveller: extraPriceForSingleTraveller ? Number(extraPriceForSingleTraveller) : null,
          roomType: roomType || "DOUBLE_BED",
          extraPricePerBed: extraPricePerBed ? Number(extraPricePerBed) : 0,
          roomNote: roomNote || null,
          seatType: seatType || "WINDOW",
          seatClass: seatClass || null,
          extraPricePerSeat: extraPricePerSeat ? Number(extraPricePerSeat) : null,
          seatNote: seatNote || null,
          extraPricePerBag: extraPricePerBag ? Number(extraPricePerBag) : null,
          bagNote: bagNote || null,
          discountPrice: discountPrice ? Number(discountPrice) : null,
          discountNote: discountNote || null,
          paymentStatus: (paymentStatus || "DEPOSIT_PENDING") as
            | "DEPOSIT_PENDING"
            | "DEPOSIT_PAID"
            | "FULLY_PAID"
            | "CANCELLED",
          firstPaymentRatio: firstPaymentRatio as "FIRST_PAYMENT_100" | "FIRST_PAYMENT_50" | "FIRST_PAYMENT_30",
        },
      });

      // 2. Create first payment with bookingId
      const firstPayment = await tx.payment.create({
        data: {
          bookingId: newBooking.id,
          amount: firstPaymentAmountNum,
          proofOfPayment: firstPaymentProof || null,
        } as unknown as Prisma.PaymentCreateInput,
      });

      // 3. Update Booking with firstPaymentId
      await tx.booking.update({
        where: { id: newBooking.id },
        data: { firstPaymentId: firstPayment.id } as unknown as Prisma.BookingUpdateInput,
      });

      // 4. Create symmetric companion relationships using explicit join table
      // If A is companion of B, then B should also be companion of A
      if (companionCustomerIds && companionCustomerIds.length > 0) {
        // Find bookings of companion customers in the same trip
        const companionBookings = await tx.booking.findMany({
          where: {
            tripId,
            customerId: { in: companionCustomerIds },
          },
          select: { id: true },
        });

        // Create companion relationships: this booking -> companion customers
        const companionRelations = companionCustomerIds.map((companionCustomerId: string) => ({
          bookingId: newBooking.id,
          customerId: companionCustomerId,
        }));

        // Create reverse companion relationships: companion bookings -> this customer
        const reverseCompanionRelations = companionBookings.map((companionBooking) => ({
          bookingId: companionBooking.id,
          customerId: customerId,
        }));

        // Create all relationships at once
        // Using type assertion because Prisma client will have bookingCompanion after migration
        await (tx as unknown as { bookingCompanion: { createMany: (args: { data: Array<{ bookingId: string; customerId: string }>; skipDuplicates: boolean }) => Promise<unknown> } }).bookingCompanion.createMany({
          data: [...companionRelations, ...reverseCompanionRelations],
          skipDuplicates: true,
        });
      }

      // Return the updated booking
      const updatedBooking = await tx.booking.findUnique({
        where: { id: newBooking.id },
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
          salesUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          agent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          companionCustomers: {
            include: {
              customer: {
                select: {
                  id: true,
                  firstNameTh: true,
                  lastNameTh: true,
                  firstNameEn: true,
                  lastNameEn: true,
                },
              },
            },
          },
          trip: {
            select: {
              name: true,
              startDate: true,
              endDate: true,
              standardPrice: true,
            },
          },
          firstPayment: {
            select: {
              id: true,
              amount: true,
              paidAt: true,
            },
          },
          secondPayment: {
            select: {
              id: true,
              amount: true,
              paidAt: true,
            },
          },
          thirdPayment: {
            select: {
              id: true,
              amount: true,
              paidAt: true,
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              paidAt: true,
              proofOfPayment: true,
            },
          },
        },
      });

      if (!updatedBooking) {
        throw new Error("Failed to fetch created booking");
      }

      return updatedBooking;
    });

    if (!booking) {
      return new NextResponse("Failed to create booking", { status: 500 });
    }

    // 4. Calculate and create Commission (outside transaction for better error handling)
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

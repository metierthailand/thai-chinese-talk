import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma, Role } from "@prisma/client";
import { calculateCommission } from "@/lib/services/commission-calculator";
import { updateBookingPaidAmount } from "@/lib/services/booking-payment";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  const VIEW_ROLES = ["SUPER_ADMIN", "ADMIN", "SALES"] as const;
  if (!session || !VIEW_ROLES.includes(session.user.role as (typeof VIEW_ROLES)[number])) {
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

    // Trip start date range: support both ISO (user TZ range) and YYYY-MM-DD (UTC day).
    const parseDateGte = (v: string) =>
      v.includes("T") ? new Date(v) : new Date(`${v}T00:00:00.000Z`);
    const parseDateLte = (v: string) =>
      v.includes("T") ? new Date(v) : new Date(`${v}T23:59:59.999Z`);

    // Build where clause for trip start date range filter
    const tripDateFilter: Prisma.BookingWhereInput =
      tripStartDateFrom || tripStartDateTo
        ? {
            trip: {
              is: {
                startDate: {
                  ...(tripStartDateFrom ? { gte: parseDateGte(tripStartDateFrom) } : {}),
                  ...(tripStartDateTo ? { lte: parseDateLte(tripStartDateTo) } : {}),
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
        companionGroup: {
          include: {
            bookings: {
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

    const isAdmin = session.user.role === "ADMIN";
    const data = isAdmin
      ? bookings.map((b) => ({
          ...b,
          trip: b.trip ? { ...b.trip, standardPrice: null } : b.trip,
          extraPriceForSingleTraveller: null,
          extraPricePerBed: null,
          extraPricePerSeat: null,
          extraPricePerBag: null,
          discountPrice: null,
          firstPayment: b.firstPayment ? { ...b.firstPayment, amount: null } : b.firstPayment,
          secondPayment: b.secondPayment ? { ...b.secondPayment, amount: null } : b.secondPayment,
          thirdPayment: b.thirdPayment ? { ...b.thirdPayment, amount: null } : b.thirdPayment,
        }))
      : bookings;

    return NextResponse.json({
      data,
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

  const WRITE_ROLES = ["SUPER_ADMIN", "SALES"] as const;
  if (!session || !WRITE_ROLES.includes(session.user.role as (typeof WRITE_ROLES)[number])) {
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
      roommateBookingIds,
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
      payments,
      isRechecked,
    } = body;

    if (!customerId || !tripId || !salesUserId || !roomType || !seatType) {
      return new NextResponse("Missing required fields: customerId, tripId, salesUserId, roomType, and seatType are required", {
        status: 400,
      });
    }

    // Validate passport belongs to the customer (only if passportId provided)
    if (passportId && passportId.trim() !== "") {
      const passport = await prisma.passport.findUnique({
        where: { id: passportId },
        select: { customerId: true },
      });
      if (!passport || passport.customerId !== customerId) {
        return new NextResponse(
          JSON.stringify({ message: "The selected passport does not belong to the customer." }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    // Prevent duplicate: same customer cannot have more than one booking in the same trip
    const existingBooking = await prisma.booking.findFirst({
      where: { tripId, customerId },
      select: { id: true },
    });
    if (existingBooking) {
      return new NextResponse(
        JSON.stringify({ message: "This customer already has a booking in the selected trip." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
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

    // Validate firstPaymentRatio
    if (!firstPaymentRatio) {
      return new NextResponse("firstPaymentRatio is required", { status: 400 });
    }

    // Calculate expected first payment amount based on ratio
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

    // Validate payment proofs if provided
    const validProofs = (payments || []).filter(
      (proof: { amount?: string; proofOfPayment?: string }) => 
        proof?.proofOfPayment && proof.proofOfPayment.trim() !== ""
    );

    if (validProofs.length > 0) {
      // Validate first payment amount if provided
      const firstProof = validProofs[0];
      if (firstProof.amount && firstProof.amount.trim() !== "") {
        const firstPaymentAmountNum = parseFloat(firstProof.amount);
        if (isNaN(firstPaymentAmountNum) || firstPaymentAmountNum <= 0) {
          return new NextResponse("First payment amount must be greater than 0", { status: 400 });
        }
        if (Math.abs(firstPaymentAmountNum - expectedFirstPayment) > 0.01) {
          return new NextResponse(
            `First payment amount (${firstPaymentAmountNum}) does not match firstPaymentRatio (${firstPaymentRatio}). Expected: ${expectedFirstPayment.toFixed(2)}`,
            { status: 400 },
          );
        }
      }
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
          passportId: passportId && passportId.trim() !== "" ? passportId : null,
          note: note || null,
          extraPriceForSingleTraveller: extraPriceForSingleTraveller ? Number(extraPriceForSingleTraveller) : null,
          roomType: roomType as "DOUBLE_BED" | "TWIN_BED",
          extraPricePerBed: extraPricePerBed ? Number(extraPricePerBed) : 0,
          roomNote: roomNote || null,
          seatType: seatType as "WINDOW" | "MIDDLE" | "AISLE" | "NOT_SPECIFIED",
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
          isRechecked: isRechecked === true,
        },
      });

      // 2. Create payment proofs (up to 3) and payments
      const validProofs = (payments || []).filter(
        (proof: { amount?: string; proofOfPayment?: string }) => 
          proof?.amount && proof.amount.trim() !== ""
      ).slice(0, 3);
      
      // Create payments from payment proofs
      const createdPayments = [];
      for (let i = 0; i < validProofs.length; i++) {
        const proof = validProofs[i];
        const amount = proof.amount && proof.amount.trim() !== "" 
          ? parseFloat(proof.amount) 
          : (i === 0 ? expectedFirstPayment : 0); // Use expectedFirstPayment for first payment if amount not provided
        
        const payment = await tx.payment.create({
          data: {
            bookingId: newBooking.id,
            amount: amount,
            proofOfPayment: proof.proofOfPayment || null,
          } as unknown as Prisma.PaymentCreateInput,
        });
        createdPayments.push(payment);
      }

      // 3. Update Booking with payment IDs
      const updateData: Prisma.BookingUpdateInput = {};
      if (createdPayments.length > 0) {
        updateData.firstPayment = { connect: { id: createdPayments[0].id } };
      }
      if (createdPayments.length > 1) {
        updateData.secondPayment = { connect: { id: createdPayments[1].id } };
      }
      if (createdPayments.length > 2) {
        updateData.thirdPayment = { connect: { id: createdPayments[2].id } };
      }

      if (Object.keys(updateData).length > 0) {
        await tx.booking.update({
          where: { id: newBooking.id },
          data: updateData,
        });
      }

      // Update paidAmount after creating payments
      if (createdPayments.length > 0) {
        await updateBookingPaidAmount(newBooking.id, tx);
      }

      // 4. Companion group: one group per trip; assign all bookings (main + companions) to same group
      if (companionCustomerIds && companionCustomerIds.length > 0) {
        const fullGroupCustomerIds = Array.from(
          new Set<string>([customerId, ...companionCustomerIds])
        );

        const bookingsInGroup = await tx.booking.findMany({
          where: {
            tripId,
            customerId: { in: fullGroupCustomerIds },
          },
          select: { id: true, customerId: true, companionGroupId: true },
        });

        const existingGroupId = bookingsInGroup.find((b) => b.companionGroupId)?.companionGroupId;
        let groupId: string;
        if (existingGroupId) {
          groupId = existingGroupId;
        } else {
          const newGroup = await tx.bookingCompanion.create({
            data: { tripId },
          });
          groupId = newGroup.id;
        }

        await tx.booking.updateMany({
          where: { id: { in: bookingsInGroup.map((b) => b.id) } },
          data: { companionGroupId: groupId },
        });
      }

      // 5. Roommate group: only within same companion group.
      // Allow multiple roommate groups within one companion group, e.g. A+B and C+D.
      if (roommateBookingIds && roommateBookingIds.length > 0) {
        const afterCompanion = await tx.booking.findUnique({
          where: { id: newBooking.id },
          select: { companionGroupId: true },
        });
        const cgId = afterCompanion?.companionGroupId ?? null;

        // If there is no companion group, roommates are not allowed
        if (!cgId) {
          throw new Error("ROOMMATE_SAME_COMPANION");
        }

        const allRoomIds = [newBooking.id, ...roommateBookingIds];
        const inSameCompanion = await tx.booking.findMany({
          where: { id: { in: allRoomIds }, companionGroupId: cgId },
          select: { id: true },
        });
        if (inSameCompanion.length !== allRoomIds.length) {
          throw new Error("ROOMMATE_SAME_COMPANION");
        }

        // Determine roommate group to use based on existing assignments of these bookings.
        const existingRoommates = await tx.booking.findMany({
          where: { id: { in: allRoomIds } },
          select: { id: true, roommateGroupId: true },
        });
        const groupIds = Array.from(
          new Set(existingRoommates.map((b) => b.roommateGroupId).filter((id): id is string => !!id)),
        );

        let roommateGroupId: string;
        if (groupIds.length === 1) {
          // All in the same existing group (or none but same id) – reuse it.
          roommateGroupId = groupIds[0];
        } else {
          // No existing group or conflicting groups – create a fresh group for this set.
          const roommateGroup = await tx.bookingRoommateGroup.create({
            data: { companionGroupId: cgId },
            select: { id: true },
          });
          roommateGroupId = roommateGroup.id;
        }

        // Assign selected bookings to the chosen roommate group
        await tx.booking.updateMany({
          where: { id: { in: allRoomIds } },
          data: { roommateGroupId },
        });

        // Remove any bookings that were previously in this roommate group but are no longer in the set
        const leftInRoom = await tx.booking.findMany({
          where: {
            roommateGroupId,
            id: { notIn: allRoomIds },
          },
          select: { id: true },
        });
        if (leftInRoom.length > 0) {
          await tx.booking.updateMany({
            where: { id: { in: leftInRoom.map((b) => b.id) } },
            data: { roommateGroupId: null },
          });
        }
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
          companionGroup: {
            include: {
              bookings: {
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
    if (error instanceof Error && error.message === "ROOMMATE_SAME_COMPANION") {
      return new NextResponse(
        JSON.stringify({ message: "All roommates must be in the same companion group." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}

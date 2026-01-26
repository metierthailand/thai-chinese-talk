import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma, Role } from "@prisma/client";
import { syncLeadStatusFromBooking } from "@/lib/services/lead-sync";
import { calculateCommission, updateCommissionStatus } from "@/lib/services/commission-calculator";

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
    const booking = await prisma.booking.findUnique({
      where: {
        id: id,
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

    if (!booking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("[BOOKING_GET]", error);
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
    } = body;

    // Get current booking to check existing data
    const currentBooking = await prisma.booking.findUnique({
      where: { id },
      select: {
        tripId: true,
        salesUserId: true,
        paymentStatus: true,
        customerId: true,
        companionCustomers: {
          select: {
            customerId: true,
          },
        },
      },
    });

    if (!currentBooking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    // Validate salesUserId if provided
    if (salesUserId) {
      const salesUser = await prisma.user.findUnique({
        where: { id: salesUserId },
        select: { role: true, isActive: true },
      });

      if (!salesUser || salesUser.role !== Role.SALES || !salesUser.isActive) {
        return new NextResponse("Invalid salesUserId: must be an active user with SALES role", { status: 400 });
      }
    }

    // Validate companion customers if provided
    const finalTripId = tripId || currentBooking.tripId;
    if (companionCustomerIds && Array.isArray(companionCustomerIds) && companionCustomerIds.length > 0 && finalTripId) {
      const companionBookings = await prisma.booking.findMany({
        where: {
          tripId: finalTripId,
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

    // Build update data
    const updateData: Prisma.BookingUpdateInput = {};

    if (customerId !== undefined && customerId !== "") updateData.customer = { connect: { id: customerId } };
    if (salesUserId !== undefined && salesUserId !== "") updateData.salesUser = { connect: { id: salesUserId } };
    if (tripId !== undefined && tripId !== "") updateData.trip = { connect: { id: tripId } };
    if (agentId !== undefined) updateData.agent = { connect: { id: agentId } };
    if (passportId !== undefined && passportId !== "") {
      updateData.passport = { connect: { id: passportId } };
    }

    // Handle companion customers separately using explicit join table
    // Don't include in updateData as we'll handle it manually

    if (note !== undefined) updateData.note = note || null;
    if (extraPriceForSingleTraveller !== undefined)
      updateData.extraPriceForSingleTraveller = extraPriceForSingleTraveller ? Number(extraPriceForSingleTraveller) : null;
    if (roomType !== undefined) updateData.roomType = roomType;
    if (extraPricePerBed !== undefined) updateData.extraPricePerBed = extraPricePerBed ? Number(extraPricePerBed) : 0;
    if (roomNote !== undefined) updateData.roomNote = roomNote || null;
    if (seatType !== undefined) updateData.seatType = seatType;
    if (seatClass !== undefined) updateData.seatClass = seatClass || null;
    if (extraPricePerSeat !== undefined)
      updateData.extraPricePerSeat = extraPricePerSeat ? Number(extraPricePerSeat) : null;
    if (seatNote !== undefined) updateData.seatNote = seatNote || null;
    if (extraPricePerBag !== undefined)
      updateData.extraPricePerBag = extraPricePerBag ? Number(extraPricePerBag) : null;
    if (bagNote !== undefined) updateData.bagNote = bagNote || null;
    if (discountPrice !== undefined) updateData.discountPrice = discountPrice ? Number(discountPrice) : null;
    if (discountNote !== undefined) updateData.discountNote = discountNote || null;
    if (paymentStatus !== undefined)
      updateData.paymentStatus = paymentStatus as "DEPOSIT_PENDING" | "DEPOSIT_PAID" | "FULLY_PAID" | "CANCELLED";
    if (firstPaymentRatio !== undefined)
      updateData.firstPaymentRatio = firstPaymentRatio as "FIRST_PAYMENT_100" | "FIRST_PAYMENT_50" | "FIRST_PAYMENT_30";

    const booking = await prisma.$transaction(async (tx) => {
      // Update booking
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: updateData as unknown as Prisma.BookingUpdateInput,
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

      // Handle Lead status sync based on paymentStatus changes
      if (updateData.paymentStatus && currentBooking.paymentStatus !== updateData.paymentStatus) {
        // Find leads associated with this booking's customer
        const leads = await tx.lead.findMany({
          where: {
            customerId: updatedBooking.customerId,
          },
          select: { id: true },
        });

        // Sync lead status for each associated lead
        for (const lead of leads) {
          await syncLeadStatusFromBooking(lead.id);
        }
      }

      // Handle symmetric companion relationship when companionCustomerIds is updated
      if (companionCustomerIds !== undefined) {
        const finalTripIdForCompanion = tripId || currentBooking.tripId;
        const currentCustomerId = customerId || currentBooking.customerId;
        const newCompanionIds = companionCustomerIds || [];
        const oldCompanionIds = currentBooking.companionCustomers.map((c) => c.customerId);

        // Delete old companion relationships (both directions)
        const toRemove = oldCompanionIds.filter((id) => !newCompanionIds.includes(id));
        if (toRemove.length > 0) {
          // Delete: this booking -> old companions
          // Using type assertion because Prisma client will have bookingCompanion after migration
          const txWithBookingCompanion = tx as unknown as {
            bookingCompanion: {
              deleteMany: (args: { where: Record<string, unknown> }) => Promise<unknown>;
              createMany: (args: { data: Array<{ bookingId: string; customerId: string }>; skipDuplicates: boolean }) => Promise<unknown>;
            };
          };
          
          await txWithBookingCompanion.bookingCompanion.deleteMany({
            where: {
              bookingId: id,
              customerId: { in: toRemove },
            },
          });

          // Delete: old companion bookings -> this customer
          const oldCompanionBookings = await tx.booking.findMany({
            where: {
              tripId: finalTripIdForCompanion,
              customerId: { in: toRemove },
            },
            select: { id: true },
          });

          await txWithBookingCompanion.bookingCompanion.deleteMany({
            where: {
              bookingId: { in: oldCompanionBookings.map((b) => b.id) },
              customerId: currentCustomerId,
            },
          });
        }

        // Create new companion relationships (both directions)
        const toAdd = newCompanionIds.filter((id: string) => !oldCompanionIds.includes(id));
        if (toAdd.length > 0) {
          // Create: this booking -> new companions
          const txWithBookingCompanion = tx as unknown as {
            bookingCompanion: {
              createMany: (args: { data: Array<{ bookingId: string; customerId: string }>; skipDuplicates: boolean }) => Promise<unknown>;
            };
          };
          
          await txWithBookingCompanion.bookingCompanion.createMany({
            data: toAdd.map((companionCustomerId: string) => ({
              bookingId: id,
              customerId: companionCustomerId,
            })),
            skipDuplicates: true,
          });

          // Create: new companion bookings -> this customer
          const newCompanionBookings = await tx.booking.findMany({
            where: {
              tripId: finalTripIdForCompanion,
              customerId: { in: toAdd },
            },
            select: { id: true },
          });

          await txWithBookingCompanion.bookingCompanion.createMany({
            data: newCompanionBookings.map((companionBooking) => ({
              bookingId: companionBooking.id,
              customerId: currentCustomerId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return updatedBooking;
    });

    // Calculate or update commission if paymentStatus changed
    try {
      // Check if paymentStatus changed to FULLY_PAID
      if (paymentStatus && paymentStatus === "FULLY_PAID" && currentBooking.paymentStatus !== "FULLY_PAID") {
        // Calculate and create commission if it doesn't exist
        await calculateCommission(id);
      } else if (paymentStatus && currentBooking.paymentStatus !== paymentStatus) {
        // Update commission status if paymentStatus changed but not to FULLY_PAID
        await updateCommissionStatus(id);
      }
    } catch (commissionError) {
      console.error("[COMMISSION_ERROR]", commissionError);
      // Don't fail the booking update if commission calculation/update fails
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("[BOOKING_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}


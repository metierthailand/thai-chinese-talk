import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma, Role } from "@prisma/client";
import { syncLeadStatusFromBooking } from "@/lib/services/lead-sync";
import { calculateCommission, updateCommissionStatus } from "@/lib/services/commission-calculator";
import { updateBookingPaidAmount } from "@/lib/services/booking-payment";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  const VIEW_ROLES = ["SUPER_ADMIN", "ADMIN", "SALES"] as const;
  if (!session || !VIEW_ROLES.includes(session.user.role as (typeof VIEW_ROLES)[number])) {
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
        roommateGroup: {
          include: {
            bookings: {
              select: {
                id: true,
                customerId: true,
                customer: {
                  select: {
                    id: true,
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

  const WRITE_ROLES = ["SUPER_ADMIN", "SALES"] as const;
  if (!session || !WRITE_ROLES.includes(session.user.role as (typeof WRITE_ROLES)[number])) {
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

    // Get current booking to check existing data
    const currentBooking = await prisma.booking.findUnique({
      where: { id },
      select: {
        tripId: true,
        customerId: true,
        companionGroupId: true,
        roommateGroupId: true,
        companionGroup: {
          select: {
            id: true,
            bookings: { select: { customerId: true } },
          },
        },
        salesUserId: true,
        paymentStatus: true,
      },
    });

    if (!currentBooking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    const finalTripId = tripId ?? currentBooking.tripId;
    const finalCustomerId = customerId ?? currentBooking.customerId;
    if (finalTripId && finalCustomerId) {
      const existingOther = await prisma.booking.findFirst({
        where: {
          tripId: finalTripId,
          customerId: finalCustomerId,
          id: { not: id },
        },
        select: { id: true },
      });
      if (existingOther) {
        return new NextResponse(
          JSON.stringify({ message: "This customer already has a booking in the selected trip." }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    // Validate passportId belongs to the customer if both provided
    if (passportId && passportId !== "" && finalCustomerId) {
      const passport = await prisma.passport.findUnique({
        where: { id: passportId },
        select: { customerId: true },
      });
      if (!passport || passport.customerId !== finalCustomerId) {
        return new NextResponse(
          JSON.stringify({ message: "The selected passport does not belong to the customer." }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
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
    if (isRechecked !== undefined) updateData.isRechecked = isRechecked;

    const updatedBooking = await prisma.$transaction(async (tx) => {
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
          roommateGroup: {
            include: {
              bookings: {
                select: {
                  id: true,
                  customerId: true,
                  customer: {
                    select: {
                      id: true,
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

      // Companion group: one group per trip; all bookings in group share companionGroupId
      if (companionCustomerIds !== undefined) {
        const finalTripIdForCompanion = tripId || currentBooking.tripId;
        const currentCustomerId = customerId || currentBooking.customerId;
        const newCompanionIds = companionCustomerIds || [];
        const fullGroupCustomerIds = Array.from(
          new Set<string>([currentCustomerId, ...newCompanionIds])
        );

        const bookingsInGroup = await tx.booking.findMany({
          where: {
            tripId: finalTripIdForCompanion,
            customerId: { in: fullGroupCustomerIds },
          },
          select: { id: true, customerId: true, companionGroupId: true },
        });

        if (fullGroupCustomerIds.length === 0 || bookingsInGroup.length === 0) {
          const oldGroupId = currentBooking.companionGroupId;
          if (oldGroupId) {
            await tx.booking.updateMany({
              where: { companionGroupId: oldGroupId },
              data: { companionGroupId: null },
            });
          }
        } else {
          const existingGroupId =
            currentBooking.companionGroupId ??
            bookingsInGroup.find((b) => b.companionGroupId)?.companionGroupId;

          let groupId: string;
          if (existingGroupId) {
            groupId = existingGroupId;
          } else {
            const newGroup = await tx.bookingCompanion.create({
              data: { tripId: finalTripIdForCompanion },
            });
            groupId = newGroup.id;
          }

          await tx.booking.updateMany({
            where: { id: { in: bookingsInGroup.map((b) => b.id) } },
            data: { companionGroupId: groupId },
          });

          const leftGroupBookingIds = (
            await tx.booking.findMany({
              where: { companionGroupId: groupId },
              select: { id: true, customerId: true },
            })
          )
            .filter((b) => !fullGroupCustomerIds.includes(b.customerId))
            .map((b) => b.id);
          if (leftGroupBookingIds.length > 0) {
            await tx.booking.updateMany({
              where: { id: { in: leftGroupBookingIds } },
              data: { companionGroupId: null },
            });
          }
        }
      }

      // Roommate group: only within same companion; assign this booking + roommateBookingIds to same room
      if (roommateBookingIds !== undefined) {
        const afterCompanion = await tx.booking.findUnique({
          where: { id },
          select: { companionGroupId: true },
        });
        const cgId = afterCompanion?.companionGroupId ?? null;

        if (!cgId) {
          await tx.booking.update({
            where: { id },
            data: { roommateGroupId: null },
          });
          if (currentBooking.roommateGroupId) {
            const othersInOldRoom = await tx.booking.findMany({
              where: { roommateGroupId: currentBooking.roommateGroupId, id: { not: id } },
              select: { id: true },
            });
            if (othersInOldRoom.length > 0) {
              await tx.booking.updateMany({
                where: { id: { in: othersInOldRoom.map((b) => b.id) } },
                data: { roommateGroupId: null },
              });
            }
          }
        } else {
          const allRoomIds = [id, ...(roommateBookingIds || [])];
          const inSameCompanion = await tx.booking.findMany({
            where: { id: { in: allRoomIds }, companionGroupId: cgId },
            select: { id: true },
          });
          if (inSameCompanion.length !== allRoomIds.length) {
            throw new Error("ROOMMATE_SAME_COMPANION");
          }
          let roommateGroup = await tx.bookingRoommateGroup.findFirst({
            where: { companionGroupId: cgId },
            select: { id: true },
          });
          if (!roommateGroup) {
            roommateGroup = await tx.bookingRoommateGroup.create({
              data: { companionGroupId: cgId },
              select: { id: true },
            });
          }
          await tx.booking.updateMany({
            where: { id: { in: allRoomIds } },
            data: { roommateGroupId: roommateGroup.id },
          });
          if (currentBooking.roommateGroupId && currentBooking.roommateGroupId !== roommateGroup.id) {
            const leftInOldRoom = await tx.booking.findMany({
              where: {
                roommateGroupId: currentBooking.roommateGroupId,
                id: { notIn: allRoomIds },
              },
              select: { id: true },
            });
            if (leftInOldRoom.length > 0) {
              await tx.booking.updateMany({
                where: { id: { in: leftInOldRoom.map((b) => b.id) } },
                data: { roommateGroupId: null },
              });
            }
          }
        }
      }

      // Handle payments update if provided
      if (payments !== undefined) {
        // Get existing payments for this booking
        const existingPayments = await tx.payment.findMany({
          where: { bookingId: id },
          orderBy: { createdAt: "asc" },
        });

        // Filter valid payments (up to 3) - only those with amount
        const validPayments = (payments || []).filter(
          (payment: { id?: string; amount?: string; proofOfPayment?: string }) =>
            payment?.amount && payment.amount.trim() !== ""
        ).slice(0, 3);

        // Get IDs of payments that should be kept (from form data)
        const paymentIdsToKeep = validPayments
          .map((p: { id?: string }) => p.id)
          .filter(Boolean) as string[];

        // Delete payments that are no longer in the form (by ID)
        const paymentsToDelete = existingPayments.filter(
          (p) => !paymentIdsToKeep.includes(p.id)
        );
        
        if (paymentsToDelete.length > 0) {
          await tx.payment.deleteMany({
            where: {
              id: { in: paymentsToDelete.map((p) => p.id) },
            },
          });
        }

        // Create or update payments
        const createdPayments = [];
        for (let i = 0; i < validPayments.length; i++) {
          const paymentData = validPayments[i] as { id?: string; amount?: string; proofOfPayment?: string };
          const amount = paymentData.amount && paymentData.amount.trim() !== ""
            ? parseFloat(paymentData.amount)
            : 0;

          // Check if payment exists by ID (existing payment from edit mode)
          const existingPayment = paymentData.id
            ? existingPayments.find((p) => p.id === paymentData.id)
            : null;

          if (existingPayment) {
            // Update existing payment
            const updatedPayment = await tx.payment.update({
              where: { id: existingPayment.id },
              data: {
                amount: amount,
                proofOfPayment: paymentData.proofOfPayment || null,
              } as unknown as Prisma.PaymentUpdateInput,
            });
            createdPayments.push(updatedPayment);
          } else {
            // Create new payment (no ID means it's a new payment)
            const newPayment = await tx.payment.create({
              data: {
                bookingId: id,
                amount: amount,
                proofOfPayment: paymentData.proofOfPayment || null,
              } as unknown as Prisma.PaymentCreateInput,
            });
            createdPayments.push(newPayment);
          }
        }

        // Update booking with payment IDs based on order
        const paymentUpdateData: {
          firstPaymentId?: string | null;
          secondPaymentId?: string | null;
          thirdPaymentId?: string | null;
        } = {};
        if (createdPayments.length > 0) {
          paymentUpdateData.firstPaymentId = createdPayments[0].id;
        } else {
          paymentUpdateData.firstPaymentId = null;
        }
        if (createdPayments.length > 1) {
          paymentUpdateData.secondPaymentId = createdPayments[1].id;
        } else {
          paymentUpdateData.secondPaymentId = null;
        }
        if (createdPayments.length > 2) {
          paymentUpdateData.thirdPaymentId = createdPayments[2].id;
        } else {
          paymentUpdateData.thirdPaymentId = null;
        }

        await tx.booking.update({
          where: { id },
          data: paymentUpdateData as unknown as Prisma.BookingUpdateInput,
        });

        // Update paidAmount after payment changes
        await updateBookingPaidAmount(id, tx);
      }

      const finalBooking = await tx.booking.findUnique({
        where: { id },
        include: {
          customer: { select: { firstNameTh: true, lastNameTh: true, firstNameEn: true, lastNameEn: true, email: true } },
          salesUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          agent: { select: { id: true, firstName: true, lastName: true, email: true } },
          companionGroup: {
            include: {
              bookings: {
                include: {
                  customer: {
                    select: { id: true, firstNameTh: true, lastNameTh: true, firstNameEn: true, lastNameEn: true },
                  },
                },
              },
            },
          },
          roommateGroup: {
            include: {
              bookings: {
                select: {
                  id: true,
                  customerId: true,
                  customer: { select: { id: true, firstNameEn: true, lastNameEn: true } },
                },
              },
            },
          },
          trip: { select: { name: true, startDate: true, endDate: true, standardPrice: true } },
          firstPayment: { select: { id: true, amount: true, paidAt: true } },
          secondPayment: { select: { id: true, amount: true, paidAt: true } },
          thirdPayment: { select: { id: true, amount: true, paidAt: true } },
          payments: { select: { id: true, amount: true, paidAt: true, proofOfPayment: true } },
        },
      });
      return finalBooking ?? updatedBooking;
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

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error("[BOOKING_PUT]", error);
    if (error instanceof Error && error.message === "ROOMMATE_SAME_COMPANION") {
      return new NextResponse(
        JSON.stringify({ message: "All roommates must be in the same companion group." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}


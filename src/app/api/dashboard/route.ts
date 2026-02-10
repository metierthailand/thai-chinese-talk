import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateTripStatus } from "@/lib/services/trip-status";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (session.user.role !== "SUPER_ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const upcomingTripsPage = parseInt(searchParams.get("upcomingTripsPage") || "1", 10);
    const upcomingTripsPageSize = parseInt(searchParams.get("upcomingTripsPageSize") || "5", 10);
    const upcomingTripsSkip = (upcomingTripsPage - 1) * upcomingTripsPageSize;

    const now = new Date();
    const [
      customerCount,
      activeLeadsCount,
      openBookingsCount,
      bookingsForRevenue,
      allBookingsForCustomerRevenue,
      upcomingTripsTotal,
      tripsRaw
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.lead.count({
        where: {
          status: {
            in: ["INTERESTED", "BOOKED"],
          },
        },
      }),
      prisma.booking.count({
        where: {
          paymentStatus: {
            in: ["DEPOSIT_PENDING", "DEPOSIT_PAID"],
          },
        },
      }),
      // Fetch bookings for revenue calculation
      // NOTE: This fetches ALL paid bookings. Consider using database aggregation (SUM) 
      // or adding date filters if performance becomes an issue with large datasets
      prisma.booking.findMany({
        where: {
          paymentStatus: {
            in: ["DEPOSIT_PAID", "FULLY_PAID"],
          },
        },
        select: {
          paidAmount: true, // Use cached paidAmount field for better performance
        },
      }),
      // Fetch bookings for outstanding and top customers calculation
      // NOTE: This fetches ALL non-cancelled bookings. This could be slow with large datasets.
      // Consider:
      // 1. Adding date filters (e.g., only last 2 years)
      // 2. Using database aggregation/groupBy for top customers
      // 3. Caching results if data doesn't change frequently
      prisma.booking.findMany({
        where: {
          paymentStatus: {
            notIn: ["CANCELLED"],
          },
        },
        select: {
          customer: {
            select: {
              id: true,
              firstNameTh: true,
              lastNameTh: true,
              firstNameEn: true,
              lastNameEn: true,
            },
          },
          trip: {
            select: {
              standardPrice: true,
            },
          },
          extraPriceForSingleTraveller: true,
          extraPricePerBed: true,
          extraPricePerSeat: true,
          extraPricePerBag: true,
          discountPrice: true,
          firstPayment: {
            select: {
              amount: true,
            },
          },
          secondPayment: {
            select: {
              amount: true,
            },
          },
          thirdPayment: {
            select: {
              amount: true,
            },
          },
          payments: {
            select: {
              amount: true,
            },
          },
        },
      }),
      // Get total count of upcoming trips for pagination
      prisma.trip.count({
        where: {
          startDate: {
            gt: now, // Only count trips that haven't started yet
          },
        },
      }),
      // Fetch upcoming trips with pagination
      prisma.trip.findMany({
        where: {
          startDate: {
            gt: now, // Only fetch trips that haven't started yet (for upcoming trips)
          },
        },
        orderBy: { startDate: "asc" }, // Order by startDate for upcoming trips
        skip: upcomingTripsSkip,
        take: upcomingTripsPageSize,
        include: {
          airlineAndAirport: {
            select: {
              code: true,
              name: true,
            },
          },
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
      }),
    ]);

    // Calculate total revenue from paid amounts
    // Use paidAmount field for better performance (cached value)
    const totalRevenue = bookingsForRevenue.reduce((sum, booking) => {
      return sum + Number(booking.paidAmount || 0);
    }, 0);

    // Calculate total outstanding (remaining unpaid amounts)
    const totalOutstanding = (allBookingsForCustomerRevenue || []).reduce((sum: number, booking) => {
      // Calculate total amount for this booking
      const basePrice = Number(booking.trip?.standardPrice) || 0;
      const extraSingle = Number(booking.extraPriceForSingleTraveller) || 0;
      const extraBedPrice = Number(booking.extraPricePerBed) || 0;
      const extraSeatPrice = Number(booking.extraPricePerSeat) || 0;
      const extraBagPrice = Number(booking.extraPricePerBag) || 0;
      const discount = Number(booking.discountPrice) || 0;
      const totalAmount = basePrice + extraSingle + extraBedPrice + extraSeatPrice + extraBagPrice - discount;

      // Calculate paid amount from payments relation (includes first/second/third payments)
      // Note: payments relation already includes all payments (first, second, third, and any additional)
      // so we should NOT add firstPayment + secondPayment + thirdPayment separately
      const paidAmount = booking.payments?.reduce((acc: number, p) => acc + Number(p.amount), 0) || 0;

      // Calculate remaining amount
      const remaining = totalAmount - paidAmount;
      
      // Only add positive remaining amounts (ignore fully paid or overpaid)
      return sum + Math.max(0, remaining);
    }, 0);

    // Calculate trip status for upcoming trips using shared utility function
    // Filter for UPCOMING status only (since we already filtered by startDate > now)
    const upcomingTrips = tripsRaw
      .map((trip) => {
        const status = calculateTripStatus(
          trip.startDate,
          trip.endDate,
          trip._count.bookings,
          trip.pax,
          now
        );

        return {
          id: trip.id,
          name: trip.name,
          pax: trip.pax,
          status,
        };
      })
      .filter((trip) => trip.status === "UPCOMING");

    // Calculate top 5 customers by revenue
    const customerRevenueMap = new Map<string, {
      customerId: string;
      firstNameTh: string;
      lastNameTh: string;
      firstNameEn: string;
      lastNameEn: string;
      totalRevenue: number;
    }>();

    (allBookingsForCustomerRevenue || []).forEach((booking) => {
      if (!booking.customer) return;

      // Calculate paid amount from payments relation (includes first/second/third payments)
      // Note: payments relation already includes all payments (first, second, third, and any additional)
      // so we should NOT add firstPayment + secondPayment + thirdPayment separately
      const paidAmount = booking.payments?.reduce((acc: number, p) => acc + Number(p.amount), 0) || 0;

      // Use paid amount as revenue (only count what's actually paid)
      const revenue = paidAmount;

      const customerId = booking.customer.id;
      if (customerRevenueMap.has(customerId)) {
        const existing = customerRevenueMap.get(customerId)!;
        existing.totalRevenue += revenue;
      } else {
        customerRevenueMap.set(customerId, {
          customerId: booking.customer.id,
          firstNameTh: booking.customer.firstNameTh || "",
          lastNameTh: booking.customer.lastNameTh || "",
          firstNameEn: booking.customer.firstNameEn,
          lastNameEn: booking.customer.lastNameEn,
          totalRevenue: revenue,
        });
      }
    });

    // Sort by revenue descending and take top 5
    const topCustomersByRevenue = Array.from(customerRevenueMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    return NextResponse.json({
      customerCount,
      activeLeadsCount,
      openBookingsCount,
      totalRevenue,
      totalOutstanding,
      upcomingTrips,
      upcomingTripsTotal,
      upcomingTripsPage,
      upcomingTripsPageSize,
      upcomingTripsTotalPages: Math.ceil(upcomingTripsTotal / upcomingTripsPageSize),
      topCustomersByRevenue,
    });
  } catch (error) {
    console.error("[DASHBOARD_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

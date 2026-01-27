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
    const now = new Date();
    const [
      customerCount,
      activeLeadsCount,
      openBookingsCount,
      bookingsForRevenue,
      allBookingsForCustomerRevenue,
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
      prisma.trip.findMany({
        where: {
          startDate: {
            gt: now, // Only fetch trips that haven't started yet (for upcoming trips)
          },
        },
        orderBy: { startDate: "asc" }, // Order by startDate for upcoming trips
        take: 100, // Limit to 100 trips to avoid loading too many
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
    const totalRevenue = bookingsForRevenue.reduce((sum, booking) => {
      const firstAmount = booking.firstPayment ? Number(booking.firstPayment.amount) : 0;
      const secondAmount = booking.secondPayment ? Number(booking.secondPayment.amount) : 0;
      const thirdAmount = booking.thirdPayment ? Number(booking.thirdPayment.amount) : 0;
      return sum + firstAmount + secondAmount + thirdAmount;
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

      // Calculate paid amount
      const firstAmount = booking.firstPayment ? Number(booking.firstPayment.amount) : 0;
      const secondAmount = booking.secondPayment ? Number(booking.secondPayment.amount) : 0;
      const thirdAmount = booking.thirdPayment ? Number(booking.thirdPayment.amount) : 0;
      const additionalPayments = booking.payments?.reduce((acc: number, p) => acc + Number(p.amount), 0) || 0;
      const paidAmount = firstAmount + secondAmount + thirdAmount + additionalPayments;

      // Calculate remaining amount
      const remaining = totalAmount - paidAmount;
      
      // Only add positive remaining amounts (ignore fully paid or overpaid)
      return sum + Math.max(0, remaining);
    }, 0);

    // Calculate trip status for upcoming trips (same logic as /api/trips/route.ts)
    const upcomingTrips = tripsRaw
      .map((trip) => {
        const startDate = new Date(trip.startDate);
        const endDate = new Date(trip.endDate);
        const activeBookingsCount = trip._count.bookings;
        const pax = trip.pax;

        let status: "UPCOMING" | "SOLD_OUT" | "COMPLETED" | "ON_TRIP" | "CANCELLED";
        
        // Check if trip has started (startDate <= now)
        if (startDate <= now) {
          // Cancelled: When the start date has been reached but the trip have no any bookings
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

        return {
          id: trip.id,
          name: trip.name,
          pax: trip.pax,
          status,
        };
      })
      .filter((trip) => trip.status === "UPCOMING")
      .slice(0, 5); // Limit to 5 trips

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

      // Calculate paid amount
      const firstAmount = booking.firstPayment ? Number(booking.firstPayment.amount) : 0;
      const secondAmount = booking.secondPayment ? Number(booking.secondPayment.amount) : 0;
      const thirdAmount = booking.thirdPayment ? Number(booking.thirdPayment.amount) : 0;
      const additionalPayments = booking.payments?.reduce((acc: number, p) => acc + Number(p.amount), 0) || 0;
      const paidAmount = firstAmount + secondAmount + thirdAmount + additionalPayments;

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
      topCustomersByRevenue,
    });
  } catch (error) {
    console.error("[DASHBOARD_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

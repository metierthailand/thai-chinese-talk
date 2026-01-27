import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { differenceInDays } from "date-fns";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const selectedDate = searchParams.get("selectedDate") || "";
    const type = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";

    const searchFilter: Prisma.TripWhereInput =
      search.trim().length > 0
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                code: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                airlineAndAirport: {
                  code: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : {};

    const dateFilter: Prisma.TripWhereInput =
      selectedDate
        ? {
            AND: [
              {
                startDate: {
                  lte: new Date(new Date(selectedDate).setHours(23, 59, 59, 999)),
                },
              },
              {
                endDate: {
                  gte: new Date(new Date(selectedDate).setHours(0, 0, 0, 0)),
                },
              },
            ],
          }
        : {};

    const typeFilter: Prisma.TripWhereInput =
      type && type !== "ALL"
        ? {
            type: type as "GROUP_TOUR" | "PRIVATE_TOUR",
          }
        : {};

    const where: Prisma.TripWhereInput = {
      AND: [searchFilter, dateFilter, typeFilter],
    };

    // Fetch all trips (no pagination for export)
    const tripsRaw = await prisma.trip.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        airlineAndAirport: true,
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
    });

    // Calculate trip status for each trip
    const now = new Date();
    let trips = tripsRaw.map((trip) => {
      const startDate = new Date(trip.startDate);
      const endDate = new Date(trip.endDate);
      const activeBookingsCount = trip._count.bookings;
      const pax = trip.pax;

      let tripStatus: "UPCOMING" | "SOLD_OUT" | "COMPLETED" | "ON_TRIP" | "CANCELLED";
      
      // Check if trip has started (startDate <= now)
      if (startDate <= now) {
        // Cancelled: When the start date has been reached but the trip have no any bookings
        // This status persists even after endDate passes
        if (activeBookingsCount === 0) {
          tripStatus = "CANCELLED";
        }
        // Trip has bookings
        else {
          // Completed: When the end date has been passed and there are bookings
          if (endDate < now) {
            tripStatus = "COMPLETED";
          }
          // On trip: When the trip is ongoing (startDate <= now <= endDate) and there are bookings
          else {
            tripStatus = "ON_TRIP";
          }
        }
      }
      // Start date has not been reached (startDate > now)
      else {
        // Sold out: When the start date has not been reached but the trip have been fully booked
        if (activeBookingsCount >= pax) {
          tripStatus = "SOLD_OUT";
        } else {
          // Upcoming: When the start date has not been reached
          tripStatus = "UPCOMING";
        }
      }

      return {
        ...trip,
        status: tripStatus,
      };
    });

    // Filter by status if provided
    if (status && status !== "ALL") {
      trips = trips.filter((trip) => trip.status === status);
    }

    // Helper function to split names by comma and trim
    const splitNames = (names: string | null | undefined): string[] => {
      if (!names || !names.trim()) return [];
      return names.split(",").map((name) => name.trim()).filter(Boolean);
    };

    // Find maximum number of names in tl, tg, staff across all trips
    let maxTlCount = 0;
    let maxTgCount = 0;
    let maxStaffCount = 0;

    trips.forEach((trip) => {
      const tlNames = splitNames(trip.tl);
      const tgNames = splitNames(trip.tg);
      const staffNames = splitNames(trip.staff);
      
      maxTlCount = Math.max(maxTlCount, tlNames.length);
      maxTgCount = Math.max(maxTgCount, tgNames.length);
      maxStaffCount = Math.max(maxStaffCount, staffNames.length);
    });

    // Format trips for CSV
    const csvRows = trips.map((trip, index) => {
      const startDate = new Date(trip.startDate);
      const endDate = new Date(trip.endDate);
      
      // Calculate days and nights
      const days = differenceInDays(endDate, startDate) + 1; // Include both start and end date
      const nights = differenceInDays(endDate, startDate);
      const dayNight = `${days}D${nights}N`;

      // Format dates
      const startDay = String(startDate.getDate()).padStart(2, "0");
      const startMonth = String(startDate.getMonth() + 1).padStart(2, "0");
      const startYear = startDate.getFullYear();
      const endDay = String(endDate.getDate()).padStart(2, "0");
      const endMonth = String(endDate.getMonth() + 1).padStart(2, "0");

      // Format START-END DATE (e.g., 2026010711)
      const startEndDate = `${startYear}${startMonth}${startDay}${endMonth}${endDay}`;

      // Format TYPE (GROUP or PRIVATE)
      const type = trip.type === "GROUP_TOUR" ? "GROUP" : "PRIVATE";

      // Format prices with Thai number format (comma separator)
      const standardPrice = trip.standardPrice
        ? Number(trip.standardPrice).toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "";
      const singlePrice = trip.extraPricePerPerson
        ? Number(trip.extraPricePerPerson).toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "";

      // Split names by comma
      const tlNames = splitNames(trip.tl);
      const tgNames = splitNames(trip.tg);
      const staffNames = splitNames(trip.staff);

      // Pad arrays to max length with empty strings
      const paddedTlNames = [...tlNames, ...Array(maxTlCount - tlNames.length).fill("")];
      const paddedTgNames = [...tgNames, ...Array(maxTgCount - tgNames.length).fill("")];
      const paddedStaffNames = [...staffNames, ...Array(maxStaffCount - staffNames.length).fill("")];

      return [
        index + 1, // NO.
        trip.name || "", // TRIP NAME
        type, // TYPE
        trip.airlineAndAirport.code || "", // IATA CODE
        startDay, // START
        endDay, // END
        startMonth, // MONTH
        startYear, // YEAR
        startEndDate, // START-END DATE
        days, // DAY
        nights, // NIGHT
        dayNight, // D/N
        trip.pax || "", // PAX
        trip.foc || "", // FOC
        ...paddedTlNames, // TL columns (dynamic)
        ...paddedTgNames, // TG columns (dynamic)
        ...paddedStaffNames, // STAFF columns (dynamic)
        standardPrice ? `"${standardPrice}"` : "", // STANDARD PRICE (with quotes for comma)
        singlePrice ? `"${singlePrice}"` : "", // SINGLE PRICE (with quotes for comma)
        trip.note || "", // NOTE
      ];
    });

    // CSV Header - dynamically create TL, TG, STAFF headers (repeated)
    const tlHeaders = Array.from({ length: maxTlCount }, () => "TL");
    const tgHeaders = Array.from({ length: maxTgCount }, () => "TG");
    const staffHeaders = Array.from({ length: maxStaffCount }, () => "STAFF");

    const header = [
      "NO.",
      "TRIP NAME",
      "TYPE",
      "IATA CODE",
      "START",
      "END",
      "MONTH",
      "YEAR",
      "START-END DATE",
      "DAY",
      "NIGHT",
      "D/N",
      "PAX",
      "FOC",
      ...tlHeaders, // TL columns (dynamic)
      ...tgHeaders, // TG columns (dynamic)
      ...staffHeaders, // STAFF columns (dynamic)
      "STANDARD PRICE",
      "SINGLE PRICE",
      "NOTE",
    ];

    // Combine header and rows
    const csvContent = [header, ...csvRows]
      .map((row) => row.map((cell) => String(cell)).join(","))
      .join("\n");

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="trips-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("[TRIPS_EXPORT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

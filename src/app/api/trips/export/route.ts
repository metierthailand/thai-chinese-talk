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
    const startDateFrom = searchParams.get("startDateFrom") || "";
    const startDateTo = searchParams.get("startDateTo") || "";

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
      startDateFrom || startDateTo
        ? {
            startDate: {
              ...(startDateFrom ? { gte: new Date(startDateFrom) } : {}),
              ...(startDateTo ? { lte: new Date(startDateTo) } : {}),
            },
          }
        : {};

    const where: Prisma.TripWhereInput = {
      AND: [searchFilter, dateFilter],
    };

    // Fetch all trips (no pagination for export)
    const trips = await prisma.trip.findMany({
      where,
      orderBy: {
        startDate: "desc",
      },
      include: {
        airlineAndAirport: true,
      },
    });

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

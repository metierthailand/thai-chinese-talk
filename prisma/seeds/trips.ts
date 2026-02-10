import { PrismaClient, TripType } from "@prisma/client";
import Decimal from "decimal.js";

export async function seedTrips(prisma: PrismaClient) {
  // Get existing airline and airports
  const airlineAndAirports = await prisma.airlineAndAirport.findMany({
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  if (airlineAndAirports.length === 0) {
    console.log("⚠️  No airline and airports found. Skipping trip seeding.");
    return [];
  }

  // Find specific airlines/airports by code
  const bkk = airlineAndAirports.find((a) => a.code === "BKK");
  const sin = airlineAndAirports.find((a) => a.code === "SIN");
  const hkg = airlineAndAirports.find((a) => a.code === "HKG");
  const nrt = airlineAndAirports.find((a) => a.code === "NRT");

  // Use first available if specific ones not found
  const defaultAirline = bkk || airlineAndAirports[0];

  // Calculate dates (upcoming trips)
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1); // First day of next month

  // Helper to create a date at midnight UTC (avoid local timezone offsets)
  const makeUtcDate = (year: number, month: number, day: number) =>
    new Date(Date.UTC(year, month, day));

  const trips = [
    {
      type: TripType.GROUP_TOUR,
      code: "TG2025-001",
      name: "Bangkok to Singapore 5 Days 4 Nights",
      startDate: makeUtcDate(nextMonth.getFullYear(), nextMonth.getMonth(), 5),
      endDate: makeUtcDate(nextMonth.getFullYear(), nextMonth.getMonth(), 9),
      pax: 20,
      foc: 1,
      tl: "John Doe",
      tg: "Jane Smith",
      staff: "Staff A, Staff B",
      standardPrice: new Decimal(25000),
      extraPricePerPerson: new Decimal(5000),
      note: "Group tour to Singapore, includes hotel and meals",
      airlineAndAirportId: defaultAirline.id,
    },
    {
      type: TripType.GROUP_TOUR,
      code: "TG2025-002",
      name: "Bangkok to Hong Kong 4 Days 3 Nights",
      startDate: makeUtcDate(nextMonth.getFullYear(), nextMonth.getMonth(), 15),
      endDate: makeUtcDate(nextMonth.getFullYear(), nextMonth.getMonth(), 18),
      pax: 15,
      foc: 1,
      tl: "Alice Johnson",
      tg: "Bob Williams",
      standardPrice: new Decimal(30000),
      extraPricePerPerson: new Decimal(6000),
      note: "Group tour to Hong Kong, shopping and sightseeing",
      airlineAndAirportId: hkg?.id || defaultAirline.id,
    },
    {
      type: TripType.PRIVATE_TOUR,
      code: "PVT2025-001",
      name: "Private Tour to Tokyo 7 Days 6 Nights",
      startDate: makeUtcDate(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 1),
      endDate: makeUtcDate(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 7),
      pax: 4,
      foc: 0,
      tl: "Mike Chen",
      standardPrice: new Decimal(50000),
      extraPricePerPerson: new Decimal(0),
      note: "Private tour for small group, customizable itinerary",
      airlineAndAirportId: nrt?.id || defaultAirline.id,
    },
    {
      type: TripType.GROUP_TOUR,
      code: "TG2025-003",
      name: "Bangkok to Seoul 6 Days 5 Nights",
      startDate: makeUtcDate(nextMonth.getFullYear(), nextMonth.getMonth() + 2, 10),
      endDate: makeUtcDate(nextMonth.getFullYear(), nextMonth.getMonth() + 2, 15),
      pax: 25,
      foc: 2,
      tl: "Sarah Lee",
      tg: "Tom Brown",
      staff: "Staff C",
      standardPrice: new Decimal(35000),
      extraPricePerPerson: new Decimal(7000),
      note: "Group tour to Seoul, includes K-pop experience",
      airlineAndAirportId: defaultAirline.id,
    },
    {
      type: TripType.PRIVATE_TOUR,
      code: "PVT2025-002",
      name: "Private Tour to Singapore 3 Days 2 Nights",
      startDate: makeUtcDate(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 20),
      endDate: makeUtcDate(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 22),
      pax: 2,
      foc: 0,
      standardPrice: new Decimal(40000),
      extraPricePerPerson: new Decimal(0),
      note: "Private tour for couple, romantic getaway",
      airlineAndAirportId: sin?.id || defaultAirline.id,
    },
    {
      type: TripType.GROUP_TOUR,
      code: "TG2025-004",
      name: "Bangkok to Taipei 5 Days 4 Nights",
      startDate: makeUtcDate(nextMonth.getFullYear(), nextMonth.getMonth() + 3, 5),
      endDate: makeUtcDate(nextMonth.getFullYear(), nextMonth.getMonth() + 3, 9),
      pax: 18,
      foc: 1,
      tl: "David Kim",
      tg: "Lisa Wang",
      standardPrice: new Decimal(28000),
      extraPricePerPerson: new Decimal(5500),
      note: "Group tour to Taipei, night market and temple visits",
      airlineAndAirportId: defaultAirline.id,
    },
  ];

  const createdTrips = [];
  for (const tripData of trips) {
    try {
      // Check if trip code already exists
      const existingTrip = await prisma.trip.findUnique({
        where: { code: tripData.code },
      });

      if (existingTrip) {
        console.warn(`⚠️  Trip code "${tripData.code}" already exists. Skipping.`);
        continue;
      }

      const trip = await prisma.trip.create({
        data: {
          type: tripData.type,
          code: tripData.code,
          name: tripData.name,
          startDate: tripData.startDate,
          endDate: tripData.endDate,
          pax: tripData.pax,
          foc: tripData.foc,
          tl: tripData.tl || null,
          tg: tripData.tg || null,
          staff: tripData.staff || null,
          standardPrice: tripData.standardPrice,
          extraPricePerPerson: tripData.extraPricePerPerson,
          note: tripData.note || null,
          airlineAndAirportId: tripData.airlineAndAirportId,
        },
        include: {
          airlineAndAirport: true,
        },
      });
      createdTrips.push(trip);
    } catch (error) {
      console.warn(`⚠️  Error creating trip "${tripData.code}":`, error);
    }
  }

  console.log(`✅ Seeded ${createdTrips.length} trips`);
  return createdTrips;
}

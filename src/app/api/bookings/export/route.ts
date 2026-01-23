import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { format } from "date-fns";

// Title mapping to Thai
const TITLE_TH_MAP: Record<string, string> = {
  MR: "นาย",
  MRS: "นาง",
  MISS: "นางสาว",
  MASTER: "เด็กชาย",
  OTHER: "",
};

// Title mapping to English
const TITLE_EN_MAP: Record<string, string> = {
  MR: "MR",
  MRS: "MRS",
  MISS: "MISS",
  MASTER: "MASTER",
  OTHER: "",
};

// Room type mapping
const ROOM_TYPE_MAP: Record<string, string> = {
  DOUBLE_BED: "DOUBLE BED 双",
  TWIN_BED: "TWINS BED 双",
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const tripStartDateFrom = searchParams.get("tripStartDateFrom") || "";
    const tripStartDateTo = searchParams.get("tripStartDateTo") || "";

    // Build where clause (same as GET /api/bookings)
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

    const paymentStatusFilter: Prisma.BookingWhereInput = status
      ? ({ paymentStatus: status } as unknown as Prisma.BookingWhereInput)
      : {};

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

    const where: Prisma.BookingWhereInput = {
      AND: [searchFilter, paymentStatusFilter, tripDateFilter],
    };

    // Fetch all bookings (no pagination for export)
    const bookings = await prisma.booking.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: {
          select: {
            title: true,
            firstNameTh: true,
            lastNameTh: true,
            firstNameEn: true,
            lastNameEn: true,
            dateOfBirth: true,
            passports: {
              where: {
                isPrimary: true,
              },
              take: 1,
            },
          },
        },
        companionCustomers: {
          select: {
            title: true,
            firstNameTh: true,
            lastNameTh: true,
            firstNameEn: true,
            lastNameEn: true,
            dateOfBirth: true,
            passports: {
              where: {
                isPrimary: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    // Format bookings for CSV - each booking can have multiple rows (customer + companions)
    const csvRows: string[][] = [];
    let rowNumber = 1;

    for (const booking of bookings) {
      // Add row for main customer
      const mainCustomer = booking.customer;
      const mainPassport = mainCustomer.passports[0];
      
      csvRows.push([
        rowNumber.toString(),
        mainCustomer.title ? TITLE_TH_MAP[mainCustomer.title] || "" : "",
        mainCustomer.firstNameTh || "",
        mainCustomer.lastNameTh || "",
        mainCustomer.title ? TITLE_EN_MAP[mainCustomer.title] || "" : "",
        mainCustomer.firstNameEn || "",
        mainCustomer.lastNameEn || "",
        mainPassport?.passportNumber || "",
        mainPassport?.issuingDate ? format(new Date(mainPassport.issuingDate), "d-MMM-yyyy") : "",
        mainPassport?.expiryDate ? format(new Date(mainPassport.expiryDate), "d-MMM-yyyy") : "",
        mainCustomer.dateOfBirth ? format(new Date(mainCustomer.dateOfBirth), "d-MMM-yyyy") : "",
        booking.roomType ? ROOM_TYPE_MAP[booking.roomType] || booking.roomType : "",
        "", // ROOM NO. - empty
        booking.roomNote || booking.note || "",
      ]);

      rowNumber++;

      // Add rows for companion customers
      for (const companion of booking.companionCustomers) {
        const companionPassport = companion.passports[0];
        
        csvRows.push([
          rowNumber.toString(),
          companion.title ? TITLE_TH_MAP[companion.title] || "" : "",
          companion.firstNameTh || "",
          companion.lastNameTh || "",
          companion.title ? TITLE_EN_MAP[companion.title] || "" : "",
          companion.firstNameEn || "",
          companion.lastNameEn || "",
          companionPassport?.passportNumber || "",
          companionPassport?.issuingDate ? format(new Date(companionPassport.issuingDate), "d-MMM-yyyy") : "",
          companionPassport?.expiryDate ? format(new Date(companionPassport.expiryDate), "d-MMM-yyyy") : "",
          companion.dateOfBirth ? format(new Date(companion.dateOfBirth), "d-MMM-yyyy") : "",
          booking.roomType ? ROOM_TYPE_MAP[booking.roomType] || booking.roomType : "",
          "", // ROOM NO. - empty
          booking.roomNote || booking.note || "",
        ]);

        rowNumber++;
      }
    }

    // CSV Header
    const header = [
      "NO",
      "คำนำหน้า",
      "ชื่อ",
      "นามสกุล",
      "TITLE",
      "FIRST NAME",
      "LAST NAME",
      "PASSPORT NO.",
      "DATE OF ISSUE",
      "DATE OF EXPIRY",
      "DATE OF BIRTH",
      "ROOM TYPE",
      "ROOM NO.",
      "REMARK",
    ];

    // Combine header and rows
    const csvContent = [header, ...csvRows]
      .map((row) => row.map((cell) => String(cell)).join(","))
      .join("\n");

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bookings-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("[BOOKINGS_EXPORT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

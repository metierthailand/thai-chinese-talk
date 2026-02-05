import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import ExcelJS from "exceljs";

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
  DOUBLE_BED: "Double bed 大",
  TWIN_BED: "Twin bed 双",
};

// Payment status label for export
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  DEPOSIT_PENDING: "Deposit pending",
  DEPOSIT_PAID: "Deposit paid",
  FULLY_PAID: "Fully paid",
  CANCELLED: "Cancelled",
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
    const tripId = searchParams.get("tripId") || "";
    const bookingIdsParam = searchParams.get("bookingIds") || "";

    const parseDateGte = (v: string) =>
      v.includes("T") ? new Date(v) : new Date(`${v}T00:00:00.000Z`);
    const parseDateLte = (v: string) =>
      v.includes("T") ? new Date(v) : new Date(`${v}T23:59:59.999Z`);

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
                  ...(tripStartDateFrom ? { gte: parseDateGte(tripStartDateFrom) } : {}),
                  ...(tripStartDateTo ? { lte: parseDateLte(tripStartDateTo) } : {}),
                },
              },
            },
          }
        : {};

    const tripIdFilter: Prisma.BookingWhereInput = tripId ? { tripId } : {};

    const hasSelectedBookingIds = bookingIdsParam && bookingIdsParam.trim().length > 0;

    const idFilter: Prisma.BookingWhereInput = hasSelectedBookingIds
      ? {
          id: {
            in: bookingIdsParam
              .split(",")
              .map((id) => id.trim())
              .filter(Boolean),
          },
        }
      : {};

    const where: Prisma.BookingWhereInput = {
      AND: [searchFilter, paymentStatusFilter, tripDateFilter, tripIdFilter, idFilter],
    };

    // When filtered by trip, get trip name and date for title
    let tripTitle: string | null = null;
    if (tripId) {
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        select: { name: true, startDate: true, endDate: true },
      });
      if (trip) {
        const startStr = format(new Date(trip.startDate), "dd MMM yyyy");
        const endStr = format(new Date(trip.endDate), "dd MMM yyyy");
        tripTitle = `(${trip.name} - ${startStr} - ${endStr})`;
      }
    }

    // Fetch all bookings (no pagination for export)
    let bookings = await prisma.booking.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: {
          select: {
            id: true,
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

    // If user selected specific bookings, expand to include full companion groups (same companionGroupId)
    if (hasSelectedBookingIds && bookings.length > 0) {
      const initialIds = bookings.map((b) => b.id);
      const groupIdsToExpand = Array.from(
        new Set(
          bookings
            .map((b) => b.companionGroupId)
            .filter((id): id is string => !!id),
        ),
      );

      if (groupIdsToExpand.length > 0) {
        const extraBookings = await prisma.booking.findMany({
          where: {
            companionGroupId: { in: groupIdsToExpand },
            id: { notIn: initialIds },
          },
          orderBy: { createdAt: "desc" },
          include: {
            customer: {
              select: {
                id: true,
                title: true,
                firstNameTh: true,
                lastNameTh: true,
                firstNameEn: true,
                lastNameEn: true,
                dateOfBirth: true,
                passports: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        });

        if (extraBookings.length > 0) {
          bookings = [...bookings, ...extraBookings];
        }
      }
    }

    // Assign companion group key: same companionGroupId = same group; singles use own booking id
    const groupKeyOf = (b: (typeof bookings)[0]) => {
      return b.companionGroupId ?? b.id;
    };
    const keyToIndex = new Map<string, number>();
    let nextGroupIndex = 0;
    for (const b of bookings) {
      const key = groupKeyOf(b);
      if (!keyToIndex.has(key)) keyToIndex.set(key, ++nextGroupIndex);
    }

    // Sort: same companion group together, then by customer name
    const sortedBookings = [...bookings].sort((a, b) => {
      const ga = keyToIndex.get(groupKeyOf(a)) ?? 0;
      const gb = keyToIndex.get(groupKeyOf(b)) ?? 0;
      if (ga !== gb) return ga - gb;
      const nameA = `${a.customer.firstNameEn} ${a.customer.lastNameEn}`;
      const nameB = `${b.customer.firstNameEn} ${b.customer.lastNameEn}`;
      return nameA.localeCompare(nameB);
    });

    // Build Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Bookings");

    // Header row
    const headerRowValues = [
      "NO",
      "Group",
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
      "PAYMENT STATUS",
      "REMARK",
    ];
    const headerRow = worksheet.addRow(headerRowValues);
    headerRow.font = { bold: true };

    // Data rows, one per booking
    let rowNumber = 1;
    for (const booking of sortedBookings) {
      const mainCustomer = booking.customer;
      const mainPassport = mainCustomer.passports[0];
      const groupIndex = keyToIndex.get(groupKeyOf(booking)) ?? 0;

      const rowValues = [
        rowNumber,
        groupIndex,
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
        booking.paymentStatus ? PAYMENT_STATUS_LABELS[booking.paymentStatus] || booking.paymentStatus : "",
        booking.roomNote || booking.note || "",
      ];

      const row = worksheet.addRow(rowValues);

      // Alternate fill color by group index (blue / white) to visually group companions
      if (groupIndex > 0) {
        const isBlue = groupIndex % 2 === 1;
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: isBlue ? "FFD9F7FF" : "FFFFFFFF" }, // light blue / white
          };
        });
      }

      rowNumber++;
    }

    // Auto-fit columns roughly
    worksheet.columns.forEach((column) => {
      if (!column) return;
      let maxLength = 10;
      if (!column.eachCell) return;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : "";
        maxLength = Math.max(maxLength, cellValue.length + 2);
      });
      column.width = maxLength;
    });

    const baseName = "ThaiChinese Tour Bookings";
    const filenameSuffix = tripTitle
      ? ` - ${tripTitle.replace(/[/\\:*?"<>|]/g, "-")}`
      : `-${new Date().toISOString().split("T")[0]}`;
    const filename = `${baseName}${filenameSuffix}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[BOOKINGS_EXPORT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { format, differenceInDays } from "date-fns";
import ExcelJS from "exceljs";

// Title mapping to Thai (sample uses คุณ for display)
const TITLE_TH_DISPLAY: Record<string, string> = {
  MR: "คุณ",
  MRS: "คุณ",
  MISS: "คุณ",
  MASTER: "คุณ",
  OTHER: "คุณ",
};

// Title mapping to English
const TITLE_EN_MAP: Record<string, string> = {
  MR: "MR",
  MRS: "MRS",
  MISS: "MISS",
  MASTER: "MASTER",
  OTHER: "",
};

// Room type mapping (Communication Metier style)
const ROOM_TYPE_MAP: Record<string, string> = {
  DOUBLE_BED: "DOUBLE BED 大",
  TWIN_BED: "TWINS BED 双",
};

// Food allergy type labels (sample: DIARY, EGGS, etc.)
const FOOD_ALLERGY_LABELS: Record<string, string> = {
  DIARY: "DIARY",
  EGGS: "EGGS",
  FISH: "FISH",
  CRUSTACEAN: "CRUSTACEAN",
  GLUTEN: "GLUTEN",
  PEANUT_AND_NUTS: "PEANUT AND NUTS",
  OTHER: "OTHER",
};

function calculateAge(dateOfBirth: Date | string | null): number | "" {
  if (!dateOfBirth) return "";
  const birth = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** Format trip duration e.g. 5D4N from start/end dates */
function formatTripDuration(startDate: Date, endDate: Date): string {
  const days = differenceInDays(endDate, startDate) + 1;
  const nights = days - 1;
  return `${days}D${nights}N`;
}

/** Format number with comma thousands for export (e.g. 44900 -> "44,900"). Returns "-" if 0 or invalid. */
function formatPriceForExport(value: unknown): string {
  const n = Number(value);
  if (value == null || Number.isNaN(n) || n === 0) return "-";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

/** Seat class display (e.g. FIRST_CLASS -> "FIRST CLASS") */
function formatSeatClass(value: string | null | undefined): string {
  if (!value) return "-";
  return value.replace(/_/g, " ");
}

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

    // When filtered by trip, get full trip for summary block
    let tripForExport: {
      code: string;
      name: string;
      startDate: Date;
      endDate: Date;
      pax: number;
      foc: number;
      standardPrice: unknown;
      extraPricePerPerson: unknown;
      tl: string | null;
      tg: string | null;
      staff: string | null;
      note: string | null;
    } | null = null;
    let tripTitle: string | null = null;
    if (tripId) {
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        select: {
          code: true,
          name: true,
          startDate: true,
          endDate: true,
          pax: true,
          foc: true,
          standardPrice: true,
          extraPricePerPerson: true,
          tl: true,
          tg: true,
          staff: true,
          note: true,
        },
      });
      if (trip) {
        tripForExport = trip;
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
            lineId: true,
            phoneNumber: true,
            email: true,
            addresses: {
              take: 1,
              select: { address: true, subDistrict: true, district: true, province: true, postalCode: true },
            },
            passports: {
              where: { isPrimary: true },
              take: 1,
            },
            foodAllergies: {
              select: { note: true, types: true },
            },
          },
        },
        passport: { select: { issuingCountry: true } },
        trip: { select: { standardPrice: true } },
        firstPayment: { select: { amount: true } },
        secondPayment: { select: { amount: true } },
        thirdPayment: { select: { amount: true } },
        roommateGroup: {
          include: {
            bookings: {
              select: {
                id: true,
                customerId: true,
                customer: {
                  select: { firstNameEn: true, lastNameEn: true },
                },
              },
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
                lineId: true,
                phoneNumber: true,
                email: true,
                addresses: { take: 1, select: { address: true, subDistrict: true, district: true, province: true, postalCode: true } },
                passports: { where: { isPrimary: true }, take: 1 },
                foodAllergies: { select: { note: true, types: true } },
              },
            },
            passport: { select: { issuingCountry: true } },
            trip: { select: { standardPrice: true } },
            firstPayment: { select: { amount: true } },
            secondPayment: { select: { amount: true } },
            thirdPayment: { select: { amount: true } },
            roommateGroup: {
              include: {
                bookings: {
                  select: {
                    id: true,
                    customerId: true,
                    customer: { select: { firstNameEn: true, lastNameEn: true } },
                  },
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

    type BookingForSort = (typeof bookings)[0] & { roommateGroupId?: string | null };
    // Companion group key: same companionGroupId = same group; singles use own booking id
    const companionKeyOf = (b: BookingForSort) => b.companionGroupId ?? b.id;
    // Roommate group key within same companion: same roommateGroupId = same room; else own id
    const roommateKeyOf = (b: BookingForSort) => b.roommateGroupId ?? b.id;

    const companionKeyToIndex = new Map<string, number>();
    let nextCompanionIndex = 0;
    for (const b of bookings) {
      const key = companionKeyOf(b as BookingForSort);
      if (!companionKeyToIndex.has(key)) companionKeyToIndex.set(key, ++nextCompanionIndex);
    }

    const roommateKeyToIndex = new Map<string, number>();
    let nextRoommateIndex = 0;
    for (const b of bookings) {
      const key = roommateKeyOf(b as BookingForSort);
      if (!roommateKeyToIndex.has(key)) roommateKeyToIndex.set(key, ++nextRoommateIndex);
    }

    // Sort: companion groups together, then within companion roommate groups together, then by customer name
    const sortedBookings = [...bookings].sort((a, b) => {
      const ca = companionKeyToIndex.get(companionKeyOf(a as BookingForSort)) ?? 0;
      const cb = companionKeyToIndex.get(companionKeyOf(b as BookingForSort)) ?? 0;
      if (ca !== cb) return ca - cb;
      const ra = roommateKeyToIndex.get(roommateKeyOf(a as BookingForSort)) ?? 0;
      const rb = roommateKeyToIndex.get(roommateKeyOf(b as BookingForSort)) ?? 0;
      if (ra !== rb) return ra - rb;
      const nameA = `${a.customer.firstNameEn} ${a.customer.lastNameEn}`;
      const nameB = `${b.customer.firstNameEn} ${b.customer.lastNameEn}`;
      return nameA.localeCompare(nameB);
    });

    // Build Excel workbook (Communication Metier style)
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Bookings");

    if (tripForExport) {
      const startDate = new Date(tripForExport.startDate);
      const endDate = new Date(tripForExport.endDate);
      const duration = formatTripDuration(startDate, endDate);
      const tripNameDisplay =
        tripForExport.code || tripForExport.name || "";
      const tripDateStr = `${format(startDate, "dd MMM")} - ${format(endDate, "dd MMM yyyy")}`.toUpperCase();
      const standardPriceStr = String(Number(tripForExport.standardPrice) ?? "");
      const singlePriceStr = String(Number(tripForExport.extraPricePerPerson) ?? "");

      worksheet.addRow(["TRIP NAME", tripNameDisplay]);
      worksheet.addRow(["TRIP DATE", tripDateStr]);
      worksheet.addRow(["TRIP DURATION", duration, "PAX", tripForExport.pax]);
      worksheet.addRow(["STANDARD PRICE", standardPriceStr, "SINGLE PRICE", singlePriceStr]);
      worksheet.addRow(["FOC", tripForExport.foc]);
      worksheet.addRow(["TOUR LEADER", tripForExport.tl || "-"]);
      worksheet.addRow(["TOUR GUIDE", tripForExport.tg || "-"]);
      worksheet.addRow(["STAFF", tripForExport.staff || "-"]);
      worksheet.addRow(["NOTE FOR TRIP", tripForExport.note || "-"]);
      worksheet.addRow([]);

      const statusCounts = {
        DEPOSIT_PENDING: 0,
        DEPOSIT_PAID: 0,
        FULLY_PAID: 0,
        CANCELLED: 0,
      };
      for (const b of sortedBookings) {
        const s = b.paymentStatus as keyof typeof statusCounts;
        if (s in statusCounts) statusCounts[s]++;
      }
      const paxSummary = `${sortedBookings.length}/${tripForExport.pax}`;
      const remaining = Math.max(0, tripForExport.pax - sortedBookings.length);

      worksheet.addRow([
        "PAX",
        "DEPOSIT PENDING",
        "DEPOSIT PAID",
        "FULLY PAID",
        "CANCELLED",
        "REMAINING",
      ]);
      worksheet.addRow([
        paxSummary,
        statusCounts.DEPOSIT_PENDING,
        statusCounts.DEPOSIT_PAID,
        statusCounts.FULLY_PAID,
        statusCounts.CANCELLED,
        remaining,
      ]);
      worksheet.addRow([]);
    }

    // Table header (Communication Metier style)
    const headerRowValues = [
      "NO",
      "Group",
      "คุณ",
      "ชื่อ",
      "นามสกุล",
      "TITLE",
      "FIRST NAME",
      "LAST NAME",
      "PASSPORT",
      "ISSUING COUNTRY",
      "DATE OF ISSUE",
      "DATE OF EXPIRY",
      "DATE OF BIRTH",
      "AGE",
      "FOOD ALLERGIES",
      "NOTE FOR FOOD ALLERGIES",
      "NOTE FOR CUSTOMER",
      "ROOM TYPE",
      "ROOM NO.",
      "ROOMMATES",
      "NOTE FOR ROOM",
      "",
      "LINE ID",
      "PHONE",
      "EMAIL",
      "ADDRESS",
      "",
      "STANDARD",
      "SG.",
      "EXTRA BED",
      "SEAT TYPE",
      "SEAT UPGRADE TYPE",
      "SEAT UPGRADE",
      "NOTE FOR SEAT",
      "EXTRA BAG",
      "NOTE FOR BAG",
      "DISCOUNT",
      "NOTE FOR DISCOUNT",
      "NOTE FOR BOOKING",
      "TOTAL",
      "1ST PAYMENT",
      "2ND PAYMENT",
      "3RD PAYMENT",
      "BALANCE",
      "PAYMENT STATUS"
    ];
    const SEPARATOR_COLUMN = 22; // 1-based: empty "" column between NOTE FOR ROOM and LINE ID
    const SEPARATOR_COLUMN_2 = 27; // 1-based: empty "" column between ADDRESS and STANDARD
    const SEPARATOR_COLOR = "FF525252";
    // Alignment: name columns = left, money columns = right, rest = center
    const NAME_COLUMNS = new Set([3, 4, 5, 7, 8, 20, 26]); // คุณ, ชื่อ, นามสกุล, FIRST NAME, LAST NAME, ROOMMATES, ADDRESS
    const MONEY_COLUMNS = new Set([40, 41, 42, 43, 44]); // TOTAL, 1ST/2ND/3RD PAYMENT, BALANCE

    const headerRow = worksheet.addRow(headerRowValues);
    headerRow.font = { bold: true, color: { argb: "FF000000" } };
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      const col = Number(cell.col);
      const isSeparator = col === SEPARATOR_COLUMN || col === SEPARATOR_COLUMN_2;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isSeparator ? SEPARATOR_COLOR : "FFC0C0C0" },
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Data rows
    let rowNumber = 1;
    for (const booking of sortedBookings) {
      const mainCustomer = booking.customer as typeof booking.customer & {
        lineId?: string | null;
        phoneNumber?: string | null;
        email?: string | null;
        foodAllergies?: Array<{ note: string | null; types: string[] }>;
      };
      const mainPassport = mainCustomer.passports?.[0];
      const issuingCountry = (booking as { passport?: { issuingCountry: string } }).passport?.issuingCountry ?? "";
      const groupIndex = companionKeyToIndex.get(companionKeyOf(booking as BookingForSort)) ?? 0;

      const foodAllergies = mainCustomer.foodAllergies ?? [];
      const allergyTypes = foodAllergies.flatMap((a) => (a.types || []).map((t) => FOOD_ALLERGY_LABELS[t] ?? t));
      const foodAllergiesStr = allergyTypes.length ? allergyTypes.join(", ") : "";
      const foodAllergyNote = foodAllergies.map((a) => a.note).filter(Boolean).join("; ") || "";

      const rg = (booking as { roommateGroup?: { bookings: Array<{ id: string; customer: { firstNameEn: string; lastNameEn: string } }> } }).roommateGroup;
      const roommateNames =
        rg?.bookings
          ?.filter((rb) => rb.id !== booking.id)
          ?.map((rb) => `${rb.customer.firstNameEn} ${rb.customer.lastNameEn}`.trim())
          .filter(Boolean) ?? [];
      const roommatesStr = roommateNames.length ? roommateNames.join(", ") : "-";

      const roomTypeDisplay = booking.roomType
        ? `${ROOM_TYPE_MAP[booking.roomType] ?? booking.roomType}${booking.extraPricePerBed && Number(booking.extraPricePerBed) > 0 ? " + EXTRA BED" : ""}`
        : "";

      const rowValues = [
        rowNumber,
        groupIndex,
        mainCustomer.title ? TITLE_TH_DISPLAY[mainCustomer.title] || "คุณ" : "คุณ",
        mainCustomer.firstNameTh || "",
        mainCustomer.lastNameTh || "",
        mainCustomer.title ? TITLE_EN_MAP[mainCustomer.title] || "" : "",
        mainCustomer.firstNameEn || "",
        mainCustomer.lastNameEn || "",
        mainPassport?.passportNumber || "",
        issuingCountry,
        mainPassport?.issuingDate ? format(new Date(mainPassport.issuingDate), "d MMM yyyy").toUpperCase() : "",
        mainPassport?.expiryDate ? format(new Date(mainPassport.expiryDate), "d MMM yyyy").toUpperCase() : "",
        mainCustomer.dateOfBirth ? format(new Date(mainCustomer.dateOfBirth), "d MMM yyyy").toUpperCase() : "",
        mainCustomer.dateOfBirth ? String(calculateAge(mainCustomer.dateOfBirth)) : "",
        foodAllergiesStr,
        foodAllergyNote,
        booking.note || "-",
        roomTypeDisplay,
        "", // ROOM NO.
        roommatesStr,
        booking.roomNote || "-",
        "",
        mainCustomer.lineId || "",
        mainCustomer.phoneNumber || "",
        mainCustomer.email || "",
        (() => {
          const addrs = (mainCustomer as { addresses?: Array<{ address: string; subDistrict: string; district: string; province: string; postalCode: string }> }).addresses;
          if (!addrs?.length) return "";
          const a = addrs[0];
          return [a.address, a.subDistrict, a.district, a.province, a.postalCode].filter(Boolean).join(" ");
        })(),
        "", // separator column before price block
        formatPriceForExport((booking as { trip?: { standardPrice: unknown } }).trip?.standardPrice),
        formatPriceForExport(booking.extraPriceForSingleTraveller),
        formatPriceForExport(booking.extraPricePerBed),
        booking.seatType ? String(booking.seatType) : "-",
        formatSeatClass(booking.seatClass ?? undefined),
        formatPriceForExport(booking.extraPricePerSeat),
        booking.seatNote || "-",
        formatPriceForExport(booking.extraPricePerBag),
        booking.bagNote || "-",
        formatPriceForExport(booking.discountPrice),
        booking.discountNote || "-",
        booking.note || "-",
        (() => {
          const standard = Number((booking as { trip?: { standardPrice: unknown } }).trip?.standardPrice) || 0;
          const single = Number(booking.extraPriceForSingleTraveller) || 0;
          const bed = Number(booking.extraPricePerBed) || 0;
          const seat = Number(booking.extraPricePerSeat) || 0;
          const bag = Number(booking.extraPricePerBag) || 0;
          const discount = Number(booking.discountPrice) || 0;
          const total = standard + single + bed + seat + bag - discount;
          return total.toLocaleString("en-US", { maximumFractionDigits: 0, minimumFractionDigits: 0 });
        })(),
        formatPriceForExport((booking as { firstPayment?: { amount: unknown } }).firstPayment?.amount),
        formatPriceForExport((booking as { secondPayment?: { amount: unknown } }).secondPayment?.amount),
        formatPriceForExport((booking as { thirdPayment?: { amount: unknown } }).thirdPayment?.amount),
        (() => {
          const standard = Number((booking as { trip?: { standardPrice: unknown } }).trip?.standardPrice) || 0;
          const single = Number(booking.extraPriceForSingleTraveller) || 0;
          const bed = Number(booking.extraPricePerBed) || 0;
          const seat = Number(booking.extraPricePerSeat) || 0;
          const bag = Number(booking.extraPricePerBag) || 0;
          const discount = Number(booking.discountPrice) || 0;
          const total = standard + single + bed + seat + bag - discount;
          const first = Number((booking as { firstPayment?: { amount: unknown } }).firstPayment?.amount) || 0;
          const second = Number((booking as { secondPayment?: { amount: unknown } }).secondPayment?.amount) || 0;
          const third = Number((booking as { thirdPayment?: { amount: unknown } }).thirdPayment?.amount) || 0;
          const paid = first + second + third;
          const balance = total - paid;
          return balance > 0 ? formatPriceForExport(balance) : "-";
        })(),
        booking.paymentStatus ? String(booking.paymentStatus).replace(/_/g, " ") : "-",
      ];

      const row = worksheet.addRow(rowValues);
      row.height = 28; // row height for padding

      const isBlue = groupIndex > 0 ? groupIndex % 2 === 1 : false;
      const thinBorder = {
        top: { style: "thin" as const },
        left: { style: "thin" as const },
        bottom: { style: "thin" as const },
        right: { style: "thin" as const },
      };
      row.eachCell((cell) => {
        const col = Number(cell.col);
        const isSeparator = col === SEPARATOR_COLUMN || col === SEPARATOR_COLUMN_2;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: isSeparator ? SEPARATOR_COLOR : isBlue ? "FFDBF6FF" : "FFFFE6F0",
          },
        };
        const horizontalAlign = NAME_COLUMNS.has(col) ? "left" : MONEY_COLUMNS.has(col) ? "right" : "center";
        cell.alignment = {
          horizontal: horizontalAlign,
          vertical: "middle",
          wrapText: true,
        };
        cell.border = thinBorder;
      });
      // Bold payment columns when they have a value (not "-")
      const paymentBoldCols = [41, 42, 43, 44]; // 1ST PAYMENT, 2ND PAYMENT, 3RD PAYMENT, BALANCE (1-based)
      paymentBoldCols.forEach((col) => {
        const cell = row.getCell(col);
        const v = cell.value;
        if (v != null && String(v).trim() !== "" && String(v) !== "-") {
          cell.font = { ...(cell.font as object), bold: true };
        }
      });

      rowNumber++;
    }

    // Auto-fit columns roughly
    worksheet.columns.forEach((column) => {
      if (!column) return;
      let maxLength = 10;
      if (!column.eachCell) return;
      column.eachCell((cell) => {
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

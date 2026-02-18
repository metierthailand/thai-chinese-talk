import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { format, differenceInDays } from "date-fns";
import ExcelJS from "exceljs";

const TITLE_TH_DISPLAY: Record<string, string> = {
  MR: "คุณ",
  MRS: "คุณ",
  MISS: "คุณ",
  MASTER: "คุณ",
  OTHER: "คุณ",
};

const TITLE_EN_MAP: Record<string, string> = {
  MR: "MR",
  MRS: "MRS",
  MISS: "MISS",
  MASTER: "MASTER",
  OTHER: "",
};

const ROOM_TYPE_MAP: Record<string, string> = {
  DOUBLE_BED: "DOUBLE BED 大",
  TWIN_BED: "TWINS BED 双",
};

const FOOD_ALLERGY_LABELS: Record<string, string> = {
  DIARY: "DIARY",
  EGGS: "EGGS",
  FISH: "FISH",
  CRUSTACEAN: "CRUSTACEAN",
  GLUTEN: "GLUTEN",
  PEANUT_AND_NUTS: "PEANUT AND NUTS",
  OTHER: "OTHER",
};

const HEADER_ROW_VALUES = [
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
  "PAYMENT STATUS",
];

const SEPARATOR_COLUMN = 22;
const SEPARATOR_COLUMN_2 = 27;
const SEPARATOR_COLOR = "FF525252";
const NAME_COLUMNS = new Set([3, 4, 5, 7, 8, 20, 26]);
const MONEY_COLUMNS = new Set([28, 29, 30, 33, 35, 37, 40, 41, 42, 43, 44]);

function calculateAge(dateOfBirth: Date | string | null): number | "" {
  if (!dateOfBirth) return "";
  const birth = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatTripDuration(startDate: Date, endDate: Date): string {
  const days = differenceInDays(endDate, startDate) + 1;
  const nights = days - 1;
  return `${days}D${nights}N`;
}

function formatPriceForExport(value: unknown): string {
  const n = Number(value);
  if (value == null || Number.isNaN(n) || n === 0) return "-";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

function formatSeatClass(value: string | null | undefined): string {
  if (!value) return "-";
  return value.replace(/_/g, " ");
}

/** Build sheet name like 2025111620_TRIP_TRIPNAME_5D4N_30FOC3 (max 31 chars for Excel) */
function buildSheetName(trip: {
  startDate: Date;
  endDate: Date;
  code: string;
  name: string;
  pax: number;
  foc: number;
}): string {
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const datePart = format(start, "yyyyMMdd");
  const hourPart = format(start, "HH");
  const tripName = (trip.code || trip.name || "trip").replace(/[/\\*?:[\]\s]+/g, "_").trim() || "trip";
  const duration = formatTripDuration(start, end);
  const paxFoc = `${trip.pax}FOC${trip.foc}`;
  const full = `${datePart}${hourPart}_TRIP_${tripName}_${duration}_${paxFoc}`;
  return full.slice(0, 31);
}

const BOOKING_INCLUDE = {
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
} as const;

type BookingWithInclude = Awaited<
  ReturnType<typeof prisma.booking.findMany<{ include: typeof BOOKING_INCLUDE }>>
>[number];

type TripForSheet = {
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
};

function addBookingsSheet(
  worksheet: ExcelJS.Worksheet,
  trip: TripForSheet,
  sortedBookings: BookingWithInclude[],
  companionKeyToIndex: Map<string, number>,
  companionKeyOf: (b: BookingWithInclude & { roommateGroupId?: string | null }) => string,
  maskPricesForAdmin = false,
) {
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const duration = formatTripDuration(startDate, endDate);
  const tripNameDisplay = trip.name || "";
  const tripDateStr = `${format(startDate, "dd MMM")} - ${format(endDate, "dd MMM yyyy")}`.toUpperCase();
  const standardPriceStr = maskPricesForAdmin ? "*****" : formatPriceForExport(trip.standardPrice);
  const singlePriceStr = maskPricesForAdmin ? "*****" : formatPriceForExport(trip.extraPricePerPerson);

  const VALUE_SPAN = 5;
  const tripSummaryRows: (string | number)[][] = [
    ["TRIP NAME", tripNameDisplay],
    ["TRIP DATE", tripDateStr],
    ["TRIP DURATION", duration, "PAX", trip.pax],
    ["STANDARD PRICE", standardPriceStr, "SINGLE PRICE", singlePriceStr],
    ["FOC", trip.foc],
    ["TOUR LEADER", trip.tl || "-"],
    ["TOUR GUIDE", trip.tg || "-"],
    ["STAFF", trip.staff || "-"],
    ["NOTE FOR TRIP", trip.note || "-"],
  ];

  for (let r = 0; r < tripSummaryRows.length; r++) {
    const cells = tripSummaryRows[r];
    const rowNum = r + 1;

    if (cells.length === 2) {
      const [label, value] = cells;
      const row = worksheet.addRow([label, value]);
      row.height = 28;
      row.eachCell((cell, colNumber) => {
        const isLabel = colNumber === 1;
        if (isLabel) cell.font = { bold: true, color: { argb: "FF000000" } };
        cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
      worksheet.mergeCells(rowNum, 2, rowNum, 2 + VALUE_SPAN - 1);
    } else {
      const [label1, value1, label2, value2] = cells;
      // First value spans 5 columns; second value (PAX / SINGLE PRICE) stays 1 column
      const rowData: (string | number)[] = [
        label1,
        value1,
        ...Array(VALUE_SPAN - 1).fill(""),
        label2,
        value2,
      ];
      const row = worksheet.addRow(rowData);
      row.height = 28;
      row.eachCell((cell, colNumber) => {
        const isLabel = colNumber === 1 || colNumber === 2 + VALUE_SPAN;
        if (isLabel) cell.font = { bold: true, color: { argb: "FF000000" } };
        cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
      worksheet.mergeCells(rowNum, 2, rowNum, 2 + VALUE_SPAN - 1);
    }
  }
  worksheet.addRow([]);

  const statusCounts = { DEPOSIT_PENDING: 0, DEPOSIT_PAID: 0, FULLY_PAID: 0, CANCELLED: 0 };
  for (const b of sortedBookings) {
    const s = b.paymentStatus as keyof typeof statusCounts;
    if (s in statusCounts) statusCounts[s]++;
  }
  const paxSummary = `${sortedBookings.length}/${trip.pax}`;
  const remaining = Math.max(0, trip.pax - sortedBookings.length);
  const paxHeaderRow = worksheet.addRow(["PAX", "DEPOSIT PENDING", "DEPOSIT PAID", "FULLY PAID", "CANCELLED", "REMAINING"]);
  paxHeaderRow.font = { bold: true, color: { argb: "FF000000" } };
  paxHeaderRow.height = 28;
  paxHeaderRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFC0C0C0" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  const paxDataRow = worksheet.addRow([
    paxSummary,
    statusCounts.DEPOSIT_PENDING,
    statusCounts.DEPOSIT_PAID,
    statusCounts.FULLY_PAID,
    statusCounts.CANCELLED,
    remaining,
  ]);
  paxDataRow.height = 30;
  paxDataRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFFFF" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  worksheet.addRow([]);

  const headerRow = worksheet.addRow(HEADER_ROW_VALUES);
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
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  const thinBorder = {
    top: { style: "thin" as const },
    left: { style: "thin" as const },
    bottom: { style: "thin" as const },
    right: { style: "thin" as const },
  };

  let rowNumber = 1;
  for (const booking of sortedBookings) {
    const mainCustomer = booking.customer as typeof booking.customer & {
      lineId?: string | null;
      phoneNumber?: string | null;
      email?: string | null;
      foodAllergies?: Array<{ note: string | null; types: string[] }>;
    };
    const mainPassport = mainCustomer.passports?.[0];
    const hasData =
      [mainCustomer?.firstNameTh, mainCustomer?.lastNameTh, mainCustomer?.firstNameEn, mainCustomer?.lastNameEn].some(
        (s) => s != null && String(s).trim() !== "",
      ) || (mainPassport?.passportNumber != null && String(mainPassport.passportNumber).trim() !== "");
    if (!hasData) continue;

    const issuingCountry = (booking as { passport?: { issuingCountry: string } }).passport?.issuingCountry ?? "";
    const groupIndex = companionKeyToIndex.get(companionKeyOf(booking as BookingWithInclude & { roommateGroupId?: string | null })) ?? 0;

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

    const addrs = (mainCustomer as { addresses?: Array<{ address: string; subDistrict: string; district: string; province: string; postalCode: string }> }).addresses;
    const addressStr = !addrs?.length ? "" : [addrs[0].address, addrs[0].subDistrict, addrs[0].district, addrs[0].province, addrs[0].postalCode].filter(Boolean).join(" ");

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
    const balance = total - (first + second + third);

    const priceStr = (v: unknown) => (maskPricesForAdmin ? "*****" : formatPriceForExport(v));
    const totalStr = maskPricesForAdmin ? "*****" : total.toLocaleString("en-US", { maximumFractionDigits: 0, minimumFractionDigits: 0 });
    const balanceStr = maskPricesForAdmin ? "*****" : balance > 0 ? formatPriceForExport(balance) : "-";

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
      "",
      roommatesStr,
      booking.roomNote || "-",
      "",
      mainCustomer.lineId || "",
      mainCustomer.phoneNumber || "",
      mainCustomer.email || "",
      addressStr,
      "",
      priceStr((booking as { trip?: { standardPrice: unknown } }).trip?.standardPrice),
      priceStr(booking.extraPriceForSingleTraveller),
      priceStr(booking.extraPricePerBed),
      booking.seatType ? String(booking.seatType) : "-",
      formatSeatClass(booking.seatClass ?? undefined),
      priceStr(booking.extraPricePerSeat),
      booking.seatNote || "-",
      priceStr(booking.extraPricePerBag),
      booking.bagNote || "-",
      priceStr(booking.discountPrice),
      booking.discountNote || "-",
      booking.note || "-",
      totalStr,
      priceStr((booking as { firstPayment?: { amount: unknown } }).firstPayment?.amount),
      priceStr((booking as { secondPayment?: { amount: unknown } }).secondPayment?.amount),
      priceStr((booking as { thirdPayment?: { amount: unknown } }).thirdPayment?.amount),
      balanceStr,
      booking.paymentStatus ? String(booking.paymentStatus).replace(/_/g, " ") : "-",
    ];

    const row = worksheet.addRow(rowValues);
    row.height = 28;
    const isBlue = groupIndex > 0 ? groupIndex % 2 === 1 : false;
    row.eachCell((cell) => {
      const col = Number(cell.col);
      const isSeparator = col === SEPARATOR_COLUMN || col === SEPARATOR_COLUMN_2;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isSeparator ? SEPARATOR_COLOR : isBlue ? "FFDBF6FF" : "FFFFE6F0" },
      };
      const horizontalAlign = NAME_COLUMNS.has(col) ? "left" : MONEY_COLUMNS.has(col) ? "right" : "center";
      cell.alignment = { horizontal: horizontalAlign, vertical: "middle", wrapText: true };
      cell.border = thinBorder;
    });
    [41, 42, 43, 44].forEach((col) => {
      const cell = row.getCell(col);
      const v = cell.value;
      if (v != null && String(v).trim() !== "" && String(v) !== "-") {
        cell.font = { ...(cell.font as object), bold: true };
      }
    });
    rowNumber++;
  }

  const summaryEndRow = 13;
  const summaryColCount = 12; // summary uses cols 1–12 (merged value spans 5 cols each)

  const summaryColWidths: Record<number, number> = {
    1: 18,
    2: 14,
    3: 14,
    4: 14,
    5: 14,
    6: 14,
    7: 14,
    8: 14,
    9: 14,
    10: 14,
    11: 14,
    12: 14,
  };
  for (let col = 1; col <= summaryColCount; col++) {
    const w = summaryColWidths[col];
    if (w != null) {
      const c = worksheet.getColumn(col);
      if (c) c.width = w;
    }
  }

  worksheet.columns.forEach((column, index) => {
    if (!column?.eachCell) return;
    const colNumber = index + 1;
    if (colNumber <= summaryColCount) return;
    let maxLength = 10;
    column.eachCell((cell, cellRow) => {
      if (cellRow <= summaryEndRow) return;
      const cellValue = cell.value ? cell.value.toString() : "";
      maxLength = Math.max(maxLength, cellValue.length + 2);
    });
    column.width = maxLength;
  });
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const maskPricesForAdmin = session.user.role === "ADMIN";

  try {
    const { searchParams } = new URL(request.url);
    const tripIdsParam = searchParams.get("tripIds") || "";
    const tripIds = tripIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (tripIds.length === 0) {
      return new NextResponse("tripIds is required (comma-separated)", { status: 400 });
    }

    const workbook = new ExcelJS.Workbook();

    let filenameStartDate: string | null = null;
    let filenameType: string | null = null;
    let filenameIata: string | null = null;

    for (const tid of tripIds) {
      const trip = await prisma.trip.findUnique({
        where: { id: tid },
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
          type: true,
          airlineAndAirport: { select: { code: true } },
        },
      });
      if (!trip) continue;

      if (filenameStartDate === null) {
        filenameStartDate = format(new Date(trip.startDate), "yyyyMMdd");
        filenameType = trip.type === "GROUP_TOUR" ? "GROUP" : "PRIVATE";
        filenameIata = trip.airlineAndAirport?.code ?? "";
      }

      let bookings = await prisma.booking.findMany({
        where: { tripId: tid },
        orderBy: { createdAt: "desc" },
        include: BOOKING_INCLUDE,
      });

      const initialIds = bookings.map((b) => b.id);
      const groupIdsToExpand = Array.from(
        new Set(bookings.map((b) => b.companionGroupId).filter((id): id is string => !!id)),
      );
      if (groupIdsToExpand.length > 0) {
        const extraBookings = await prisma.booking.findMany({
          where: { companionGroupId: { in: groupIdsToExpand }, id: { notIn: initialIds } },
          orderBy: { createdAt: "desc" },
          include: BOOKING_INCLUDE,
        });
        if (extraBookings.length > 0) bookings = [...bookings, ...extraBookings];
      }

      type BookingForSort = (typeof bookings)[0] & { roommateGroupId?: string | null };
      const companionKeyOf = (b: BookingForSort) => b.companionGroupId ?? b.id;
      // Order companion groups by "first person" in group = earliest createdAt (oldest at top)
      const companionKeys = [...new Set(bookings.map((b) => companionKeyOf(b as BookingForSort)))];
      const keyToMinCreated = new Map<string, number>();
      for (const key of companionKeys) {
        const groupBookings = bookings.filter((b) => companionKeyOf(b as BookingForSort) === key);
        const minCreated = Math.min(...groupBookings.map((b) => new Date(b.createdAt).getTime()));
        keyToMinCreated.set(key, minCreated);
      }
      const companionKeysByFirstCreated = [...companionKeys].sort(
        (ka, kb) => (keyToMinCreated.get(ka) ?? 0) - (keyToMinCreated.get(kb) ?? 0),
      );
      const companionKeyToIndex = new Map<string, number>();
      companionKeysByFirstCreated.forEach((key, i) => companionKeyToIndex.set(key, i + 1));

      const sortedBookings = [...bookings].sort((a, b) => {
        const ca = companionKeyToIndex.get(companionKeyOf(a as BookingForSort)) ?? 0;
        const cb = companionKeyToIndex.get(companionKeyOf(b as BookingForSort)) ?? 0;
        if (ca !== cb) return ca - cb;
        // Within same companion group: order by createdAt ascending (created first = first row)
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        return ta - tb;
      });

      const sheetName = buildSheetName(trip);
      const worksheet = workbook.addWorksheet(sheetName);
      addBookingsSheet(
        worksheet,
        trip as TripForSheet,
        sortedBookings,
        companionKeyToIndex,
        companionKeyOf as (b: BookingWithInclude & { roommateGroupId?: string | null }) => string,
        maskPricesForAdmin,
      );
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `${filenameStartDate ?? "export"}-${filenameType ?? "GROUP"}-${filenameIata ?? "N/A"}-${format(new Date(), "yyyyMMdd")}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[TRIPS_EXPORT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

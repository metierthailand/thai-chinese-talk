import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { format } from "date-fns";

// Sarabun (Thai-capable) from Google Fonts via jsDelivr
const SARABUN_REGULAR_URL =
  "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/sarabun/Sarabun-Regular.ttf";
const SARABUN_BOLD_URL =
  "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/sarabun/Sarabun-Bold.ttf";

const ROOM_TYPE_LABELS: Record<string, string> = {
  DOUBLE_BED: "Double bed",
  TWIN_BED: "Twin bed",
};

const SEAT_TYPE_LABELS: Record<string, string> = {
  WINDOW: "Window",
  MIDDLE: "Middle",
  AISLE: "Aisle",
  NOT_SPECIFIED: "Not specified",
};

const SEAT_CLASS_LABELS: Record<string, string> = {
  FIRST_CLASS: "First class",
  BUSINESS_CLASS: "Business class",
  LONG_LEG: "Long leg",
  OTHER: "Other",
};

function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "object" && "toNumber" in (v as { toNumber?: () => number }))
    return (v as { toNumber: () => number }).toNumber();
  return Number(v) || 0;
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

/** Format number with thousand separators, e.g. 1000000 => "1,000,000.00" */
function formatPrice(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Keep only WinAnsi-encodable chars (for StandardFonts fallback when Thai font fails to load) */
function toWinAnsi(s: string): string {
  return s.replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

const MARGIN = 50;
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

function drawHorizontalLine(page: PDFPage, y: number) {
  const fromX = MARGIN;
  const toX = A4_WIDTH - MARGIN;
  page.drawLine({
    start: { x: fromX, y },
    end: { x: toX, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
}

function drawCenteredTitle(
  page: PDFPage,
  font: PDFFont,
  text: string,
  y: number,
  size: number,
  sanitize?: (s: string) => string
): number {
  const t = sanitize ? sanitize(text) : text;
  const textWidth = font.widthOfTextAtSize(t, size);
  const x = (A4_WIDTH - textWidth) / 2;
  page.drawText(t, { x, y, size, font });
  return y - (size + 8);
}

const UNDERLINE_OFFSET = 2;
const UNDERLINE_THICKNESS = 0.5;

function drawLine(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  text: string,
  x: number,
  y: number,
  opts?: { bold?: boolean; size?: number; sanitize?: (s: string) => string }
) {
  const size = opts?.size ?? 14;
  const f = opts?.bold ? fontBold : font;
  const t = opts?.sanitize ? opts.sanitize(text) : text;
  page.drawText(t, { x, y, size, font: f });
  const textWidth = f.widthOfTextAtSize(t, size);
  const underlineY = y - UNDERLINE_OFFSET;
  page.drawLine({
    start: { x, y: underlineY },
    end: { x: x + textWidth, y: underlineY },
    thickness: UNDERLINE_THICKNESS,
    color: rgb(0, 0, 0),
  });
  return y - (size + 2);
}

function drawLabelValue(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  label: string,
  value: string,
  x: number,
  y: number,
  sanitize?: (s: string) => string
): number {
  const cy = y;
  const labelText = `• ${label}: `;
  const labelSafe = sanitize ? sanitize(labelText) : labelText;
  const valueSafe = sanitize ? sanitize(value || "-") : value || "-";
  page.drawText(labelSafe, { x, y: cy, size: 11, font: fontBold });
  const labelW = fontBold.widthOfTextAtSize(labelSafe, 11);
  page.drawText(valueSafe, { x: x + labelW, y: cy, size: 11, font });
  return cy - 16;
}

async function loadThaiFonts(
  pdfDoc: PDFDocument
): Promise<{ font: PDFFont; fontBold: PDFFont }> {
  pdfDoc.registerFontkit(fontkit);
  const [regularRes, boldRes] = await Promise.all([
    fetch(SARABUN_REGULAR_URL),
    fetch(SARABUN_BOLD_URL),
  ]);
  if (!regularRes.ok || !boldRes.ok) throw new Error("Failed to fetch Thai fonts");
  const [regularBytes, boldBytes] = await Promise.all([
    regularRes.arrayBuffer(),
    boldRes.arrayBuffer(),
  ]);
  const font = await pdfDoc.embedFont(new Uint8Array(regularBytes));
  const fontBold = await pdfDoc.embedFont(new Uint8Array(boldBytes));
  return { font, fontBold };
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bookingIdsParam = searchParams.get("bookingIds") || "";
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const tripStartDateFrom = searchParams.get("tripStartDateFrom") || "";
  const tripStartDateTo = searchParams.get("tripStartDateTo") || "";
  const tripId = searchParams.get("tripId") || "";

  const ids = bookingIdsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const parseDateGte = (v: string) =>
    v.includes("T") ? new Date(v) : new Date(`${v}T00:00:00.000Z`);
  const parseDateLte = (v: string) =>
    v.includes("T") ? new Date(v) : new Date(`${v}T23:59:59.999Z`);

  const searchFilter: Prisma.BookingWhereInput =
    search.trim().length > 0
      ? {
        customer: {
          is: {
            OR: [
              { firstNameTh: { contains: search, mode: "insensitive" } },
              { lastNameTh: { contains: search, mode: "insensitive" } },
              { firstNameEn: { contains: search, mode: "insensitive" } },
              { lastNameEn: { contains: search, mode: "insensitive" } },
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
  const idFilter: Prisma.BookingWhereInput =
    ids.length > 0 ? { id: { in: ids } } : {};

  const where: Prisma.BookingWhereInput = {
    AND: [searchFilter, paymentStatusFilter, tripDateFilter, tripIdFilter, idFilter],
  };

  try {
    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: {
            firstNameEn: true,
            lastNameEn: true,
            firstNameTh: true,
            lastNameTh: true,
          },
        },
        passport: {
          select: {
            passportNumber: true,
            issuingCountry: true,
            expiryDate: true,
          },
        },
        companionGroup: {
          include: {
            bookings: {
              include: {
                customer: {
                  select: {
                    firstNameEn: true,
                    lastNameEn: true,
                    firstNameTh: true,
                    lastNameTh: true,
                  },
                },
              },
            },
          },
        },
        trip: {
          select: {
            code: true,
            name: true,
            startDate: true,
            endDate: true,
            standardPrice: true,
          },
        },
        salesUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        firstPayment: { select: { amount: true } },
        secondPayment: { select: { amount: true } },
        thirdPayment: { select: { amount: true } },
      },
    });

    if (bookings.length === 0) {
      return new NextResponse("No bookings found", { status: 404 });
    }

    const pdfDoc = await PDFDocument.create();
    let font: PDFFont;
    let fontBold: PDFFont;
    let sanitize: ((s: string) => string) | undefined;
    try {
      const thai = await loadThaiFonts(pdfDoc);
      font = thai.font;
      fontBold = thai.fontBold;
    } catch {
      // Fallback to StandardFonts if Thai font fetch fails (e.g. offline)
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      sanitize = toWinAnsi;
    }

    for (let i = 0; i < bookings.length; i++) {
      const b = bookings[i];
      const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      let y = A4_HEIGHT - MARGIN;
      const x = MARGIN;

      // Title at top center (slightly larger font)
      y = drawCenteredTitle(page, fontBold, "ThaiChinese Tour", y, 16, sanitize);
      y -= 20;

      // Booking Information
      y = drawLine(page, font, fontBold, "Booking Information", x, y, { bold: true, size: 14, sanitize });
      y -= 12;

      const trip = b.trip;
      const tripCode = trip?.code ?? "";
      const tripName = trip?.name ?? "";
      const startStr = trip?.startDate ? format(new Date(trip.startDate), "dd MMM yyyy") : "";
      const endStr = trip?.endDate ? format(new Date(trip.endDate), "dd MMM yyyy") : "";
      y = drawLabelValue(page, font, fontBold, "Trip name", `${tripCode} ${tripName} (${startStr} - ${endStr})`, x, y, sanitize);

      const cust = b.customer;
      const customerName = cust
        ? `${str(cust.firstNameEn)} ${str(cust.lastNameEn)}`.trim() || `${str(cust.firstNameTh)} ${str(cust.lastNameTh)}`.trim()
        : "";
      y = drawLabelValue(page, font, fontBold, "Customer", customerName, x, y, sanitize);

      const pass = b.passport;
      if (pass) {
        const exp = pass.expiryDate ? format(new Date(pass.expiryDate), "dd MMM yyyy") : "";
        y = drawLabelValue(page, font, fontBold, "Passport", `${str(pass.passportNumber)} ${str(pass.issuingCountry)}`, x, y, sanitize);
        y = drawLabelValue(page, font, fontBold, "Passport Expired date", exp, x, y, sanitize);
      } else {
        y = drawLabelValue(page, font, fontBold, "Passport", "-", x, y, sanitize);
      }

      const otherInGroup = b.companionGroup?.bookings.filter((bb) => bb.customerId !== b.customerId) ?? [];
      const companions = otherInGroup.map(
        (cc) => `${str(cc.customer?.firstNameEn)} ${str(cc.customer?.lastNameEn)}`.trim() || `${str(cc.customer?.firstNameTh)} ${str(cc.customer?.lastNameTh)}`.trim()
      ).filter(Boolean);
      y = drawLabelValue(page, font, fontBold, "Companion", companions.length ? companions.join(", ") : "-", x, y, sanitize);
      y -= 12;

      drawHorizontalLine(page, y);
      y -= 32;

      // Cost summary
      y = drawLine(page, font, fontBold, "Cost Summary", x, y, { bold: true, size: 14, sanitize });
      y -= 12;

      const standardPrice = num(trip?.standardPrice);
      const extraSingle = num(b.extraPriceForSingleTraveller);
      const extraBed = num(b.extraPricePerBed);
      const extraSeat = num(b.extraPricePerSeat);
      const extraBag = num(b.extraPricePerBag);
      const discount = num(b.discountPrice);
      const totalAmount = standardPrice + extraSingle + extraBed + extraSeat + extraBag - discount;

      y = drawLabelValue(page, font, fontBold, "Total amount", `${formatPrice(totalAmount)} THB`, x, y);
      y = drawLabelValue(page, font, fontBold, "Extra price for single traveller", extraSingle > 0 ? formatPrice(extraSingle) : "-", x, y, sanitize);
      y -= 12
      y = drawLabelValue(page, font, fontBold, "Room type", ROOM_TYPE_LABELS[b.roomType] ?? b.roomType ?? "-", x, y, sanitize);
      y = drawLabelValue(page, font, fontBold, "Extra price for extra bed", extraBed > 0 ? formatPrice(extraBed) : "-", x, y, sanitize);
      y = drawLabelValue(page, font, fontBold, "Note for room", str(b.roomNote) || "-", x, y, sanitize);
      y -= 12
      y = drawLabelValue(page, font, fontBold, "Seat type", SEAT_TYPE_LABELS[b.seatType] ?? b.seatType ?? "-", x, y, sanitize);
      y = drawLabelValue(page, font, fontBold, "Seat upgrade type", b.seatClass ? (SEAT_CLASS_LABELS[b.seatClass] ?? b.seatClass) : "-", x, y, sanitize);
      y = drawLabelValue(page, font, fontBold, "Extra price for seat upgrade", extraSeat > 0 ? formatPrice(extraSeat) : "-", x, y, sanitize);
      y = drawLabelValue(page, font, fontBold, "Note for seat", str(b.seatNote) || "-", x, y, sanitize);
      y -= 12
      y = drawLabelValue(page, font, fontBold, "Extra price for bag upgrade", extraBag > 0 ? formatPrice(extraBag) : "-", x, y, sanitize);
      y = drawLabelValue(page, font, fontBold, "Note for bag", str(b.bagNote) || "-", x, y, sanitize);
      y -= 12
      y = drawLabelValue(page, font, fontBold, "Discount price", discount > 0 ? formatPrice(discount) : "-", x, y, sanitize);
      y = drawLabelValue(page, font, fontBold, "Note for discount", str(b.discountNote) || "-", x, y, sanitize);
      y -= 12
      const salesName = b.salesUser
        ? `${str(b.salesUser.firstName)} ${str(b.salesUser.lastName)}`.trim()
        : "";
      y = drawLabelValue(page, font, fontBold, "Sales", salesName || "-", x, y, sanitize);
      y = drawLabelValue(page, font, fontBold, "Note for booking", str(b.note) || "-", x, y, sanitize);
      y -= 12;

      drawHorizontalLine(page, y);
      y -= 32;

      // Payment summary
      y = drawLine(page, font, fontBold, "Payment Summary", x, y, { bold: true, size: 14, sanitize });
      y -= 12;

      const paidAmount = num(b.paidAmount);
      const remaining = totalAmount - paidAmount;
      y = drawLabelValue(page, font, fontBold, "Total amount", `${formatPrice(totalAmount)} THB`, x, y, sanitize);
      y = drawLabelValue(page, font, fontBold, "Paid amount", `${formatPrice(paidAmount)} THB`, x, y, sanitize);
      y = drawLabelValue(page, font, fontBold, "Balance", `${formatPrice(remaining)} THB`, x, y, sanitize);
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    const filename = `bookings-export-${format(new Date(), "yyyy-MM-dd")}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    console.error("[BOOKINGS_EXPORT_PDF]", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

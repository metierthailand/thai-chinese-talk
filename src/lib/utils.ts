import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import DecimalJS, { Decimal } from "decimal.js"
import { Decimal as PrismaDecimal } from "@prisma/client/runtime/client"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const getInitials = (str: string): string => {
  if (typeof str !== "string" || !str.trim()) return "?";

  return (
    str
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?"
  );
};

export function formatCurrency(
  amount: number,
  opts?: {
    currency?: string;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    noDecimals?: boolean;
  },
) {
  const { currency = "USD", locale = "en-US", minimumFractionDigits, maximumFractionDigits, noDecimals } = opts ?? {};

  const formatOptions: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    minimumFractionDigits: noDecimals ? 0 : minimumFractionDigits,
    maximumFractionDigits: noDecimals ? 0 : maximumFractionDigits,
  };

  return new Intl.NumberFormat(locale, formatOptions).format(amount);
}

/**
 * Format Decimal value (Prisma Decimal, decimal.js Decimal, string, number) to currency string
 * @param amount - The amount to format (Prisma Decimal, decimal.js Decimal, string, number, null, or undefined)
 * @param opts - Formatting options
 * @returns Formatted currency string
 */
export function formatDecimal(
  amount: PrismaDecimal | Decimal | string | number | null | undefined,
  opts?: {
    currency?: string;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    noDecimals?: boolean;
  },
): string {
  const { currency = "THB", locale = "th-TH", minimumFractionDigits, maximumFractionDigits, noDecimals } = opts ?? {};

  if (amount === null || amount === undefined) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: noDecimals ? 0 : minimumFractionDigits,
      maximumFractionDigits: noDecimals ? 0 : maximumFractionDigits,
    }).format(0);
  }

  let decimalValue: DecimalJS;
  try {
    if (typeof amount === "string") {
      decimalValue = new DecimalJS(amount);
    } else if (amount instanceof PrismaDecimal) {
      // Prisma Decimal to decimal.js
      decimalValue = new DecimalJS(amount.toString());
    } else if (amount instanceof Decimal) {
      // decimal.js Decimal
      decimalValue = amount;
    } else {
      // number
      decimalValue = new DecimalJS(amount);
    }
  } catch {
    decimalValue = new DecimalJS(0);
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: noDecimals ? 0 : minimumFractionDigits,
    maximumFractionDigits: noDecimals ? 0 : maximumFractionDigits,
  }).format(decimalValue.toNumber());
}

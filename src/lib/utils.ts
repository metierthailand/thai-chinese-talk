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

/**
 * Calculate age from date of birth
 * @param dateOfBirth - Date of birth (string in YYYY-MM-DD format or Date object)
 * @returns Age as a number
 */
export function calculateAge(dateOfBirth: string | Date): number {
  const birthDate = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  // If birthday hasn't occurred this year yet, subtract 1 from age
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

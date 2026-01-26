import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const passportSchema = z.object({
  customerId: z.string(),
  passportNumber: z.string().min(1, "Passport number is required"),
  issuingCountry: z.string().min(1, "Issuing country is required"),
  issuingDate: z.string(), // ISO date string
  expiryDate: z.string(), // ISO date string
  imageUrl: z.string().nullable().optional(),
  isPrimary: z.boolean().default(false),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = passportSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // Count total passports for this customer (including the one being created)
      const existingPassportsCount = await tx.passport.count({
        where: { customerId: validated.customerId },
      });

      // If this will be the only passport, force isPrimary to true
      const finalIsPrimary = existingPassportsCount === 0 ? true : validated.isPrimary;

      // If setting as primary, unset others first
      if (finalIsPrimary) {
        await tx.passport.updateMany({
          where: { customerId: validated.customerId },
          data: { isPrimary: false },
        });
      }

      const passport = await tx.passport.create({
        data: {
          customerId: validated.customerId,
          passportNumber: validated.passportNumber,
          issuingCountry: validated.issuingCountry,
          issuingDate: new Date(validated.issuingDate),
          expiryDate: new Date(validated.expiryDate),
          imageUrl: validated.imageUrl || null,
          isPrimary: finalIsPrimary,
        },
      });

      return passport;
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({ error: error.issues }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("[PASSPORT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return new NextResponse("customerId is required", { status: 400 });
    }

    const passports = await prisma.passport.findMany({
      where: { customerId },
      orderBy: [
        { isPrimary: "desc" },
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json(passports);
  } catch (error) {
    console.error("[PASSPORT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}


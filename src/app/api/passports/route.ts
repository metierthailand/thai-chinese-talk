import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const passportSchema = z.object({
  customerId: z.string(),
  passportNumber: z.string().min(1, "Passport number is required"),
  issuingCountry: z.string().min(1, "Issuing country is required"),
  expiryDate: z.string(), // ISO date string
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
      // If setting as primary, unset others first
      if (validated.isPrimary) {
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
          expiryDate: new Date(validated.expiryDate),
          isPrimary: validated.isPrimary,
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


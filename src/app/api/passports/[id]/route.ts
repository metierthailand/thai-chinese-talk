import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const updatePassportSchema = z.object({
  passportNumber: z.string().min(1, "Passport number is required").optional(),
  issuingCountry: z.string().min(1, "Issuing country is required").optional(),
  expiryDate: z.string().optional(), // ISO date string
  isPrimary: z.boolean().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const validated = updatePassportSchema.parse(body);

    // Get current passport to check customerId
    const currentPassport = await prisma.passport.findUnique({
      where: { id },
      select: { customerId: true, isPrimary: true },
    });

    if (!currentPassport) {
      return new NextResponse("Passport not found", { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // If setting as primary, unset others first
      if (validated.isPrimary && !currentPassport.isPrimary) {
        await tx.passport.updateMany({
          where: {
            customerId: currentPassport.customerId,
            id: { not: id },
          },
          data: { isPrimary: false },
        });
      }

      const updateData: {
        passportNumber?: string;
        issuingCountry?: string;
        expiryDate?: Date;
        isPrimary?: boolean;
      } = {};

      if (validated.passportNumber !== undefined) {
        updateData.passportNumber = validated.passportNumber;
      }
      if (validated.issuingCountry !== undefined) {
        updateData.issuingCountry = validated.issuingCountry;
      }
      if (validated.expiryDate !== undefined) {
        updateData.expiryDate = new Date(validated.expiryDate);
      }
      if (validated.isPrimary !== undefined) {
        updateData.isPrimary = validated.isPrimary;
      }

      const passport = await tx.passport.update({
        where: { id },
        data: updateData,
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
    console.error("[PASSPORT_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.passport.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[PASSPORT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}


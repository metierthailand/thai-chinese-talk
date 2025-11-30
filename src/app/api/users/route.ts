import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendResetPasswordEmail } from "@/lib/email";
import Decimal from "decimal.js";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        commissionRate: true,
        createdAt: true,
        leads: {
          select: {
            bookings: {
              where: {
                status: "COMPLETED",
              },
              select: {
                totalAmount: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const usersWithCommission = users.map((user) => {
      const totalSales = user.leads.reduce((acc, lead) => {
        const leadTotal = lead.bookings.reduce((sum, booking) => {
          return sum.plus(new Decimal(booking.totalAmount.toString()));
        }, new Decimal(0));
        return acc.plus(leadTotal);
      }, new Decimal(0));

      const commissionRate = user.commissionRate ? new Decimal(user.commissionRate.toString()) : new Decimal(0);
      const totalCommission = totalSales.mul(commissionRate).div(100);

      // Remove leads from the response to keep it clean, or keep it if needed.
      // For the table, we just need the calculated value.
      const { leads, ...userData } = user;

      return {
        ...userData,
        totalCommission: totalCommission.toNumber(),
      };
    });

    return NextResponse.json(usersWithCommission);
  } catch (error) {
    console.error("[USERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role, commissionRate } = body;

    if (!name || !email || !role) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return new NextResponse("User already exists", { status: 409 });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 24); // Token expires in 24 hours

    // Create user without password (password is optional in schema)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        // password is omitted - user will set it via reset password link
        role,
        commissionRate: commissionRate ? new Decimal(commissionRate).toNumber() : null,
        isActive: true,
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send reset password email
    let resetUrl: string | undefined;
    try {
      resetUrl = await sendResetPasswordEmail(user.email, user.name, resetToken);
    } catch (emailError) {
      console.error("Failed to send reset password email:", emailError);
      // Don't fail user creation if email fails
    }

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    // In development mode, include reset URL in response for testing
    const response = { ...userWithoutPassword } as typeof userWithoutPassword & { resetPasswordUrl?: string };
    if (process.env.NODE_ENV === "development" && resetUrl) {
      response.resetPasswordUrl = resetUrl;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[USERS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

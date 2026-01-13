import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendResetPasswordEmail } from "@/lib/email";
import Decimal from "decimal.js";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        commissionPerHead: true,
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
      // Count completed bookings from leads
      const completedBookingsCount = user.leads.reduce((acc, lead) => {
        return acc + lead.bookings.length;
      }, 0);

      // Calculate commission: fixed amount per completed booking
      const commissionPerHead = user.commissionPerHead ? new Decimal(user.commissionPerHead) : new Decimal(0);
      const totalCommission = commissionPerHead.mul(completedBookingsCount);

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

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { firstName, lastName, email, phoneNumber, role, commissionPerHead } = body;

    if (!firstName || !lastName || !email || !role) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const existingEmail = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingEmail) {
      return new NextResponse("This email already exists.", { status: 409 });
    }

    const existingPhoneNumber = await prisma.user.findUnique({
      where: {
        phoneNumber,
      },
    });

    if (existingPhoneNumber) {
      return new NextResponse("This phone number already exists.", { status: 409 });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 24); // Token expires in 24 hours

    // Create user without password (password is optional in schema)
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phoneNumber: phoneNumber || null,
        // password is omitted - user will set it via reset password link
        role,
        commissionPerHead: commissionPerHead ? new Decimal(commissionPerHead) : null,
        isActive: true,
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send reset password email
    let resetUrl: string | undefined;
    try {
      const fullName = `${user.firstName} ${user.lastName}`;
      resetUrl = await sendResetPasswordEmail(user.email, fullName, resetToken);
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

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendResetPasswordEmail } from "@/lib/email";
import Decimal from "decimal.js";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const status = searchParams.get("status") || "";
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    // Add search filter
    if (search.trim().length > 0) {
      where.OR = [
        {
          firstName: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
        {
          lastName: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
        {
          email: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
        {
          phoneNumber: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
      ];
    }

    // Add role filter
    if (role && role !== "ALL") {
      where.role = role as "SUPER_ADMIN" | "ADMIN" | "SALES" | "STAFF";
    }

    // Add status filter
    if (status && status !== "ALL") {
      if (status === "ACTIVE") {
        where.isActive = true;
      } else if (status === "INACTIVE") {
        where.isActive = false;
      }
    }

    // Get total count for pagination
    const total = await prisma.user.count({ where });

    // Fetch paginated users
    const users = await prisma.user.findMany({
      skip,
      take: pageSize,
      where,
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      data: users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
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

    // Check for duplicate email and phone number
    const existingEmail = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    const existingPhoneNumber = phoneNumber
      ? await prisma.user.findUnique({
          where: {
            phoneNumber,
          },
        })
      : null;

    // Collect all errors
    const errors: { field: string; message: string }[] = [];
    if (existingEmail) {
      errors.push({ field: "email", message: "This email already exists." });
    }
    if (existingPhoneNumber) {
      errors.push({ field: "phoneNumber", message: "This phone number already exists." });
    }

    // If there are errors, return them all
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 409 });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 24); // Token expires in 24 hours

    // Create user without password (password is optional in schema)
    // User will be inactive until they set their password
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phoneNumber: phoneNumber || null,
        // password is omitted - user will set it via reset password link
        role,
        commissionPerHead: commissionPerHead ? new Decimal(commissionPerHead) : null,
        isActive: false, // User is inactive until they set their password
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

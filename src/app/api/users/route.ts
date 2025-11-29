import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "SUPER_ADMIN") {
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
          return sum + Number(booking.totalAmount);
        }, 0);
        return acc + leadTotal;
      }, 0);

      const commissionRate = user.commissionRate ? Number(user.commissionRate) : 0;
      const totalCommission = (totalSales * commissionRate) / 100;

      // Remove leads from the response to keep it clean, or keep it if needed.
      // For the table, we just need the calculated value.
      const { leads, ...userData } = user;

      return {
        ...userData,
        totalCommission,
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

  if (!session || session.user.role !== "SUPER_ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role, commissionRate } = body;

    if (!name || !email || !password || !role) {
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

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        commissionRate: commissionRate ? parseFloat(commissionRate) : null,
        isActive: true,
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("[USERS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

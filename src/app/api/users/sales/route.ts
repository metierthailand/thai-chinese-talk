import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        role: Role.SALES,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
      },
      orderBy: {
        firstName: "asc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("[SALES_USERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

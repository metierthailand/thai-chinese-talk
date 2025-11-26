import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const customer = await prisma.customer.findUnique({
      where: {
        id: id,
      },
      include: {
        tags: { include: { tag: true } },
        passports: true,
        interactions: {
          orderBy: { date: "desc" },
          include: { agent: { select: { name: true } } },
        },
        leads: {
          orderBy: { updatedAt: "desc" },
        },
        bookings: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) {
      return new NextResponse("Customer not found", { status: 404 });
    }

    // Also fetch tasks related to this customer
    const tasks = await prisma.task.findMany({
      where: {
        relatedCustomerId: id,
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    return NextResponse.json({ ...customer, tasks });
  } catch (error) {
    console.error("[CUSTOMER_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

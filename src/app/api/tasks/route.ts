import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, description, dueDate, priority, relatedCustomerId } = body;

    if (!title || !dueDate) {
      return new NextResponse("Title and Due Date are required", { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        agentId: session.user.id,
        title,
        description,
        dueDate: new Date(dueDate),
        priority: priority || "MEDIUM",
        relatedCustomerId,
      },
    });

    // Create notification for the agent
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: "SYSTEM",
        title: "New Task Created",
        message: `Task "${title}" has been created successfully.`,
        link: relatedCustomerId ? `/dashboard/customers/${relatedCustomerId}?tab=tasks` : undefined,
        entityId: task.id,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("[TASKS_POST]", error);
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
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const customerId = searchParams.get("customerId") || "";
    const isCompleted = searchParams.get("isCompleted");

    const where: {
      agentId: string;
      relatedCustomerId?: string;
      isCompleted?: boolean;
    } = {
      agentId: session.user.id,
    };

    if (customerId) {
      where.relatedCustomerId = customerId;
    }

    if (isCompleted !== null && isCompleted !== undefined) {
      where.isCompleted = isCompleted === "true";
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: {
          dueDate: "asc",
        },
        include: {
          agent: {
            select: { name: true },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.task.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      data: tasks,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error("[TASKS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

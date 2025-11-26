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
    const tasks = await prisma.task.findMany({
      where: {
        agentId: session.user.id,
        isCompleted: false,
      },
      orderBy: {
        dueDate: "asc",
      },
      include: {
        agent: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("[TASKS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

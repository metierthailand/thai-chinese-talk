import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
    const { title, description, dueDate, priority, isCompleted } = body;

    const updateData: {
      title?: string;
      description?: string;
      dueDate?: Date;
      priority?: "LOW" | "MEDIUM" | "HIGH";
      isCompleted?: boolean;
    } = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (priority !== undefined) {
      if (priority === "LOW" || priority === "MEDIUM" || priority === "HIGH") {
        updateData.priority = priority;
      }
    }
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        agent: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("[TASKS_PUT]", error);
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
    await prisma.task.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[TASKS_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}


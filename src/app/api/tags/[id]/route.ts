import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const tag = await prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    return NextResponse.json(tag);
  } catch (error) {
    console.error("Error fetching tag:", error);
    return NextResponse.json({ error: "Failed to fetch tag" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, order } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }

    // Get current tag to check old order
    const currentTag = await prisma.tag.findUnique({
      where: { id },
      select: { order: true },
    });

    if (!currentTag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const updateData: { name: string; order?: number } = {
      name: name.trim(),
    };

    // If order is provided and different from current order
    if (order !== undefined && order !== currentTag.order) {
      const newOrder = Number(order);

      // If new order conflicts with existing order, shift tags
      const existingTag = await prisma.tag.findFirst({
        where: {
          order: newOrder,
          id: { not: id },
        },
      });

      if (existingTag) {
        if (newOrder > currentTag.order) {
          // Moving down: shift tags between old and new position up
          await prisma.tag.updateMany({
            where: {
              order: {
                gt: currentTag.order,
                lte: newOrder,
              },
              id: { not: id },
            },
            data: {
              order: {
                decrement: 1,
              },
            },
          });
        } else {
          // Moving up: shift tags between new and old position down
          await prisma.tag.updateMany({
            where: {
              order: {
                gte: newOrder,
                lt: currentTag.order,
              },
              id: { not: id },
            },
            data: {
              order: {
                increment: 1,
              },
            },
          });
        }
      }

      updateData.order = newOrder;
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(tag);
  } catch (error: unknown) {
    console.error("Error updating tag:", error);
    
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This tag name already exists." }, { status: 409 });
      }
      
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Tag not found" }, { status: 404 });
      }
    }
    
    return NextResponse.json({ error: "Failed to update tag" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.tag.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting tag:", error);
    
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Tag not found" }, { status: 404 });
      }
    }
    
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const UPDATE_ROLES = ["SUPER_ADMIN"] as const;
    if (!UPDATE_ROLES.includes(session.user.role as (typeof UPDATE_ROLES)[number])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tags } = body;

    if (!Array.isArray(tags)) {
      return NextResponse.json({ error: "Tags array is required" }, { status: 400 });
    }

    // Update all tags with their new order values
    // Use transaction to ensure all updates succeed or fail together
    await prisma.$transaction(
      tags.map((tag: { id: string; order: number }) =>
        prisma.tag.update({
          where: { id: tag.id },
          data: { order: tag.order },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error reordering tags:", error);

    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Tag not found" }, { status: 404 });
      }
    }

    return NextResponse.json({ error: "Failed to reorder tags" }, { status: 500 });
  }
}


import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";
    const search = searchParams.get("search") || "";

    // If all=true, return all tags without pagination (for order selection)
    if (all) {
      const tags = await prisma.tag.findMany({
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          order: true,
        },
      });

      return NextResponse.json(tags);
    }

    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const skip = (page - 1) * pageSize;

    const where =
      search.trim().length > 0
        ? {
            name: {
              contains: search,
              mode: "insensitive" as const,
            },
          }
        : {};

    // Get total count for pagination
    const total = await prisma.tag.count({ where });

    // Fetch paginated tags
    const tags = await prisma.tag.findMany({
      skip,
      take: pageSize,
      where,
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: { customers: true },
        },
      },
    });

    return NextResponse.json({
      data: tags,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, order } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }

    // Get the maximum order value to set as default if not provided
    const maxOrderTag = await prisma.tag.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const newOrder = order !== undefined ? Number(order) : (maxOrderTag?.order ?? -1) + 1;

    // If order is provided and conflicts with existing order, shift existing tags
    if (order !== undefined) {
      const existingTag = await prisma.tag.findFirst({
        where: { order: newOrder },
      });

      if (existingTag) {
        // Shift all tags with order >= newOrder by 1
        await prisma.tag.updateMany({
          where: {
            order: {
              gte: newOrder,
            },
          },
          data: {
            order: {
              increment: 1,
            },
          },
        });
      }
    }

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        order: newOrder,
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating tag:", error);
    
    // Handle unique constraint violation
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2002") {
        return NextResponse.json({ error: "This tag name already exists." }, { status: 409 });
      }
    }
    
    return NextResponse.json({ error: "Failed to create tag" }, { status: 500 });
  }
}

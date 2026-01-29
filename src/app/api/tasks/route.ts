import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TaskStatus, ContactType, Prisma } from "@prisma/client";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { topic, description, deadline, status, contact, relatedCustomerId, userId } = body;

    if (!topic) {
      return new NextResponse("Topic is required", { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        topic,
        description: description || null,
        deadline: deadline ? new Date(deadline) : null,
        status: (status && Object.values(TaskStatus).includes(status as TaskStatus))
          ? (status as TaskStatus)
          : TaskStatus.TODO,
        contact: (contact && Object.values(ContactType).includes(contact as ContactType))
          ? (contact as ContactType)
          : null,
        relatedCustomerId: relatedCustomerId || null,
        userId: userId || session.user.id,
      },
      include: {
        relatedCustomer: {
          select: {
            id: true,
            firstNameTh: true,
            lastNameTh: true,
            firstNameEn: true,
            lastNameEn: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create notification for the user
    // await prisma.notification.create({
    //   data: {
    //     userId: userId || session.user.id,
    //     type: "SYSTEM",
    //     title: "New Task Created",
    //     message: `Task "${topic}" has been created successfully.`,
    //     link: relatedCustomerId ? `/dashboard/customers/${relatedCustomerId}?tab=tasks` : "/dashboard/tasks",
    //     entityId: task.id,
    //   },
    // });

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
    const status = searchParams.get("status");
    const contact = searchParams.get("contact");
    const userId = searchParams.get("userId");
    const deadlineFrom = searchParams.get("deadlineFrom");
    const deadlineTo = searchParams.get("deadlineTo");
    const search = searchParams.get("search");

    // Deadline range: support both ISO (user TZ range) and YYYY-MM-DD (UTC day).
    // Frontend sends ISO for "this calendar day in my timezone" so 31 Jan in Bangkok
    // becomes 2026-01-30T17:00:00.000Z–2026-01-31T16:59:59.999Z and tasks like
    // 2026-01-30T17:00:00.000Z (31 Jan 00:00 Bangkok) are included.
    const parseDeadlineGte = (v: string) =>
      v.includes("T") ? new Date(v) : new Date(`${v}T00:00:00.000Z`);
    const parseDeadlineLte = (v: string) =>
      v.includes("T") ? new Date(v) : new Date(`${v}T23:59:59.999Z`);

    // Build where clause with proper types
    const where: Prisma.TaskWhereInput = {
      ...(userId
        ? { userId }
        : !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)
          ? { userId: session.user.id }
          : {}),
      ...(customerId ? { relatedCustomerId: customerId } : {}),
      ...(status && Object.values(TaskStatus).includes(status as TaskStatus)
        ? { status: status as TaskStatus }
        : {}),
      ...(contact && Object.values(ContactType).includes(contact as ContactType)
        ? { contact: contact as ContactType }
        : {}),
      ...(deadlineFrom || deadlineTo
        ? {
            deadline: {
              ...(deadlineFrom ? { gte: parseDeadlineGte(deadlineFrom) } : {}),
              ...(deadlineTo ? { lte: parseDeadlineLte(deadlineTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                topic: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                relatedCustomer: {
                  OR: [
                    { firstNameEn: { contains: search, mode: "insensitive" as const } },
                    { lastNameEn: { contains: search, mode: "insensitive" as const } },
                    { firstNameTh: { contains: search, mode: "insensitive" as const } },
                    { lastNameTh: { contains: search, mode: "insensitive" as const } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: [
          // { deadline: "asc" },
          { createdAt: "desc" },
        ],
        include: {
          relatedCustomer: {
            select: {
              id: true,
              firstNameTh: true,
              lastNameTh: true,
              firstNameEn: true,
              lastNameEn: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
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

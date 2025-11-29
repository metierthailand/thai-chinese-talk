import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const passportExpiryFrom = searchParams.get("passportExpiryFrom") || "";
    const passportExpiryTo = searchParams.get("passportExpiryTo") || "";
    const skip = (page - 1) * pageSize;

    // Build where clause for search
    const searchFilter: Prisma.CustomerWhereInput =
      search.trim().length > 0
        ? {
            OR: [
              {
                firstNameTh: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                lastNameTh: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                firstNameEn: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                lastNameEn: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                phone: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {};

    const typeFilter: Prisma.CustomerWhereInput =
      type === "INDIVIDUAL" || type === "CORPORATE"
        ? { type }
        : {};

    const passportFilter: Prisma.CustomerWhereInput =
      passportExpiryFrom || passportExpiryTo
        ? {
            passports: {
              some: {
                isPrimary: true,
                expiryDate: {
                  ...(passportExpiryFrom
                    ? { gte: new Date(passportExpiryFrom) }
                    : {}),
                  ...(passportExpiryTo
                    ? { lte: new Date(passportExpiryTo) }
                    : {}),
                },
              },
            },
          }
        : {};

    const where: Prisma.CustomerWhereInput = {
      AND: [searchFilter, typeFilter, passportFilter],
    };

    // Get total count for pagination
    const total = await prisma.customer.count({ where });

    // Fetch paginated customers
    const customers = await prisma.customer.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json({
      data: customers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[CUSTOMERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      firstNameTh,
      lastNameTh,
      firstNameEn,
      lastNameEn,
      title,
      nickname,
      email,
      phone,
      lineId,
      nationality,
      dateOfBirth,
      preferences,
      type,
      tagIds,
    } = body;

    if (!firstNameTh || !lastNameTh || !firstNameEn || !lastNameEn) {
      return new NextResponse("First name and last name (both Thai and English) are required", { status: 400 });
    }

    const customer = await prisma.customer.create({
      data: {
        firstNameTh,
        lastNameTh,
        firstNameEn,
        lastNameEn,
        title: title || undefined,
        nickname: nickname || undefined,
        email: email || undefined,
        phone: phone || undefined,
        lineId: lineId || undefined,
        nationality: nationality || undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        preferences: preferences || undefined,
        type: type || "INDIVIDUAL",
        tags: tagIds && tagIds.length > 0 ? {
          create: tagIds.map((tagId: string) => ({
            tagId,
          })),
        } : undefined,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error("[CUSTOMERS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

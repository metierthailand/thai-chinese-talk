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
                phoneNumber: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {};

    const passportFilter: Prisma.CustomerWhereInput =
      passportExpiryFrom || passportExpiryTo
        ? {
            passports: {
              some: {
                isPrimary: true,
                expiryDate: {
                  ...(passportExpiryFrom ? { gte: new Date(passportExpiryFrom) } : {}),
                  ...(passportExpiryTo ? { lte: new Date(passportExpiryTo) } : {}),
                },
              },
            },
          }
        : {};

    const where: Prisma.CustomerWhereInput = {
      AND: [searchFilter, passportFilter],
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
      phoneNumber,
      lineId,
      dateOfBirth,
      note,
      tagIds,
      addresses,
      passports,
      foodAllergies,
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
        phoneNumber: phoneNumber || undefined,
        lineId: lineId || undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        note: note || undefined,
        tags:
          tagIds && tagIds.length > 0
            ? {
                create: tagIds.map((tagId: string) => ({
                  tagId,
                })),
              }
            : undefined,
        addresses:
          addresses && addresses.length > 0
            ? {
                create: addresses,
              }
            : undefined,
        passports:
          passports && passports.length > 0
            ? {
                create: passports.map((p: any) => ({
                  passportNumber: p.passportNumber,
                  issuingCountry: p.issuingCountry,
                  issuingDate: new Date(p.issuingDate),
                  expiryDate: new Date(p.expiryDate),
                  imageUrl: p.imageUrl || null,
                  isPrimary: p.isPrimary || false,
                })),
              }
            : undefined,
        foodAllergies:
          foodAllergies && foodAllergies.length > 0
            ? {
                create: foodAllergies,
              }
            : undefined,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        addresses: true,
        passports: true,
        foodAllergies: true,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error("[CUSTOMERS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

interface PassportInput {
  passportNumber: string;
  issuingCountry: string;
  issuingDate: string | Date;
  expiryDate: string | Date;
  imageUrl?: string | null;
  isPrimary?: boolean;
}

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
    const passportExpiryFrom = searchParams.get("passportExpiryFrom") || "";
    const passportExpiryTo = searchParams.get("passportExpiryTo") || "";
    const tagIdsParam = searchParams.get("tagIds") || "";
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

    const tagFilter: Prisma.CustomerWhereInput =
      tagIdsParam
        ? {
            tags: {
              some: {
                tagId: {
                  in: tagIdsParam.split(",").filter(Boolean),
                },
              },
            },
          }
        : {};

    const where: Prisma.CustomerWhereInput = {
      AND: [searchFilter, passportFilter, tagFilter],
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
        _count: {
          select: { bookings: true },
        },
      },
    });

    // Attach totalTrips from bookings count for each customer and transform phoneNumber to phone
    const customersWithTotals = customers.map((customer) => {
      const { _count, ...rest } = customer;
      return {
        ...rest,
        totalTrips: _count?.bookings ?? 0,
      };
    });

    return NextResponse.json({
      data: customersWithTotals,
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

    if (!firstNameEn || !lastNameEn) {
      return new NextResponse("First name and last name (English) are required", { status: 400 });
    }

    // Check for duplicate email and phone number
    const existingEmail = email
      ? await prisma.customer.findFirst({
          where: {
            email,
          },
        })
      : null;

    const existingPhoneNumber = phoneNumber
      ? await prisma.customer.findFirst({
          where: {
            phoneNumber,
          },
        })
      : null;

    // Check for duplicate passport numbers
    const duplicatePassportNumbers: string[] = [];
    if (passports && Array.isArray(passports) && passports.length > 0) {
      const passportNumbers = (passports as PassportInput[]).map((p) => p.passportNumber).filter(Boolean);
      
      for (const passportNumber of passportNumbers) {
        const existingPassport = await prisma.passport.findFirst({
          where: {
            passportNumber,
          },
        });
        
        if (existingPassport) {
          duplicatePassportNumbers.push(passportNumber);
        }
      }
    }

    // Collect all errors
    const errors: { field: string; message: string }[] = [];
    if (existingEmail) {
      errors.push({ field: "email", message: "This email already exists." });
    }
    if (existingPhoneNumber) {
      errors.push({ field: "phoneNumber", message: "This phone number already exists." });
    }
    if (duplicatePassportNumbers.length > 0) {
      duplicatePassportNumbers.forEach((passportNumber) => {
        errors.push({ 
          field: "passports", 
          message: `Passport number ${passportNumber} already exists.` 
        });
      });
    }

    // If there are errors, return them all
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 409 });
    }

    const customer = await prisma.customer.create({
      data: {
        firstNameTh: firstNameTh || null,
        lastNameTh: lastNameTh || null,
        firstNameEn,
        lastNameEn,
        title: title || undefined,
        email: email || undefined,
        phoneNumber: phoneNumber || undefined,
        lineId: lineId || undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date(),
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
                create: (passports as PassportInput[]).map((p, index) => ({
                  passportNumber: p.passportNumber,
                  issuingCountry: p.issuingCountry,
                  issuingDate: new Date(p.issuingDate),
                  expiryDate: new Date(p.expiryDate),
                  imageUrl: p.imageUrl || null,
                  isPrimary: p.isPrimary !== undefined ? p.isPrimary : index === 0,
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

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LeadSource, LeadStatus, Prisma, Role } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const skip = (page - 1) * pageSize;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const source = searchParams.get("source") || "";
    const customerId = searchParams.get("customerId") || "";

    const nameFilter: Prisma.LeadWhereInput =
      search.trim().length > 0
        ? {
            OR: [
              // Search in customer name (if customer exists)
              {
                customer: {
                  is: {
                    OR: [
                      {
                        firstNameTh: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                      {
                        lastNameTh: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                      {
                        firstNameEn: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                      {
                        lastNameEn: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                    ],
                  },
                },
              },
              // Search in customer phone number (if customer exists)
              {
                customer: {
                  is: {
                    phoneNumber: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
              // Search in customer email (if customer exists)
              {
                customer: {
                  is: {
                    email: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
              // Search in new customer fields (if newCustomer = true)
              {
                firstName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                lastName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              // Search in lead phone number
              {
                phoneNumber: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              // Search in lead email
              {
                email: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                tripInterest: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              // Search in sales user name
              {
                salesUser: {
                  is: {
                    OR: [
                      {
                        firstName: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                      {
                        lastName: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                    ],
                  },
                },
              },
            ],
          }
        : {};

    const customerFilter: Prisma.LeadWhereInput = customerId ? { customerId } : {};

    const { LEAD_STATUS_VALUES, LEAD_SOURCE_VALUES } = await import("@/lib/constants/lead");

    const statusFilter: Prisma.LeadWhereInput =
      status && LEAD_STATUS_VALUES.includes(status as LeadStatus) ? { status: status as LeadStatus } : {};

    const sourceFilter: Prisma.LeadWhereInput =
      source && LEAD_SOURCE_VALUES.includes(source as LeadSource) ? { source: source as LeadSource } : {};

    const where: Prisma.LeadWhereInput = {
      AND: [nameFilter, customerFilter, statusFilter, sourceFilter].filter(Boolean),
    };

    const total = await prisma.lead.count({ where });

    const leads = await prisma.lead.findMany({
      skip,
      take: pageSize,
      where,
      orderBy: {
        // updatedAt: "desc",
        createdAt: "desc",
      },
      include: {
        customer: {
          select: {
            id: true,
            firstNameTh: true,
            lastNameTh: true,
            firstNameEn: true,
            lastNameEn: true,
            email: true,
            phoneNumber: true,
          },
        },
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        salesUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      data: leads,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[LEADS_GET]", error);
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
      newCustomer,
      customerId,
      firstName,
      lastName,
      phoneNumber,
      email,
      lineId,
      salesUserId,
      source,
      status,
      tripInterest,
      pax,
      leadNote,
      sourceNote,
    } = body;

    // Validation: newCustomer logic
    if (newCustomer === true) {
      // If newCustomer = true, firstName and lastName are required
      if (!firstName || !lastName) {
        return new NextResponse("First name and last name are required for new customers", { status: 400 });
      }
      // customerId should not be provided
      if (customerId) {
        return new NextResponse("Customer ID should not be provided for new customers", { status: 400 });
      }
    } else {
      // If newCustomer = false, customerId is required
      if (!customerId) {
        return new NextResponse("Customer ID is required for existing customers", { status: 400 });
      }
      // firstName and lastName should not be provided
      if (firstName || lastName) {
        return new NextResponse("First name and last name should not be provided for existing customers", {
          status: 400,
        });
      }
    }

    // Validate salesUserId exists and has SALES role
    if (!salesUserId) {
      return new NextResponse("Sales user ID is required", { status: 400 });
    }

    const salesUser = await prisma.user.findUnique({
      where: { id: salesUserId },
      select: { role: true },
    });

    if (!salesUser) {
      return new NextResponse("Sales user not found", { status: 404 });
    }

    if (salesUser.role !== Role.SALES) {
      return new NextResponse("Selected user must have SALES role", { status: 400 });
    }

    // Validate tripInterest is required
    if (!tripInterest) {
      return new NextResponse("Trip interest is required", { status: 400 });
    }

    // Validate source and status enums
    const validSource: LeadSource | undefined =
      source && Object.values(LeadSource).includes(source as LeadSource) ? (source as LeadSource) : undefined;

    const validStatus =
      status && Object.values(LeadStatus).includes(status as LeadStatus)
        ? (status as LeadStatus)
        : LeadStatus.INTERESTED;

    // If newCustomer = true, check for duplicate email and phoneNumber in customers
    const errors: { field: string; message: string }[] = [];
    if (newCustomer === true) {
      if (email && email.trim()) {
        const existingEmail = await prisma.customer.findFirst({
          where: { email: email.trim() },
        });
        if (existingEmail) {
          errors.push({ field: "email", message: "This email already exists." });
        }
      }
      if (phoneNumber && phoneNumber.trim()) {
        const existingPhoneNumber = await prisma.customer.findFirst({
          where: { phoneNumber: phoneNumber.trim() },
        });
        if (existingPhoneNumber) {
          errors.push({ field: "phoneNumber", message: "This phone number already exists." });
        }
      }
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      return new NextResponse(JSON.stringify({ errors }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    const lead = await prisma.lead.create({
      data: {
        newCustomer: newCustomer || false,
        customerId: newCustomer ? null : customerId,
        firstName: newCustomer ? firstName : null,
        lastName: newCustomer ? lastName : null,
        phoneNumber: phoneNumber || null,
        email: email || null,
        lineId: lineId || null,
        agentId: session.user.id, // Agent who created the lead
        salesUserId,
        source: validSource as LeadSource | null,
        status: validStatus,
        tripInterest,
        pax: pax ? parseInt(pax) : 1,
        leadNote: leadNote || null,
        sourceNote: sourceNote || null,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstNameTh: true,
            lastNameTh: true,
            firstNameEn: true,
            lastNameEn: true,
            email: true,
            phoneNumber: true,
          },
        },
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        salesUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(lead);
  } catch (error) {
    console.error("[LEADS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

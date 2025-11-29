import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LeadSource, LeadStatus, Prisma } from "@prisma/client";

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
    const minPotential = searchParams.get("minPotential") || "";
    const maxPotential = searchParams.get("maxPotential") || "";

    const nameFilter: Prisma.LeadWhereInput =
      search.trim().length > 0
        ? {
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
          }
        : {};

    const validStatuses = [
      "NEW",
      "QUOTED",
      "FOLLOW_UP",
      "CLOSED_WON",
      "CLOSED_LOST",
    ];
    const statusFilter: Prisma.LeadWhereInput =
      status && validStatuses.includes(status)
        ? { status: status as LeadStatus }
        : {};

    const validSources = [
      "WEBSITE",
      "WALKIN",
      "REFERRAL",
      "SOCIAL",
      "LINE",
      "OTHER",
    ];
    const sourceFilter: Prisma.LeadWhereInput =
      source && validSources.includes(source)
        ? { source: source as LeadSource }
        : {};

    const potentialFilter: Prisma.LeadWhereInput =
      minPotential || maxPotential
        ? {
            potentialValue: {
              ...(minPotential
                ? { gte: parseFloat(minPotential) }
                : {}),
              ...(maxPotential
                ? { lte: parseFloat(maxPotential) }
                : {}),
            },
          }
        : {};

    const where: Prisma.LeadWhereInput = {
      AND: [nameFilter, statusFilter, sourceFilter, potentialFilter],
    };

    const total = await prisma.lead.count({ where });

    const leads = await prisma.lead.findMany({
      skip,
      take: pageSize,
      where,
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        customer: true,
        agent: {
          select: {
            name: true,
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
      customerId,
      source,
      status,
      potentialValue,
      destinationInterest,
      travelDateEstimate,
      notes,
    } = body;

    if (!customerId) {
      return new NextResponse("Customer ID is required", { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        customerId,
        agentId: session.user.id, // Assign to current user
        source: source || "WEBSITE",
        status: status || "NEW",
        potentialValue: potentialValue ? parseFloat(potentialValue) : null,
        destinationInterest,
        travelDateEstimate: travelDateEstimate ? new Date(travelDateEstimate) : null,
        notes,
      },
    });

    return NextResponse.json(lead);
  } catch (error) {
    console.error("[LEADS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma, LeadSource, LeadStatus, Role } from "@prisma/client";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;
    if (!id) {
      return new NextResponse("Lead ID is required", { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
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
        bookings: {
          include: {
            trip: {
              select: {
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!lead) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("[LEAD_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;
    if (!id) {
      return new NextResponse("Lead ID is required", { status: 400 });
    }

    // Get current lead to check newCustomer status
    const currentLead = await prisma.lead.findUnique({
      where: { id },
      select: { newCustomer: true },
    });

    if (!currentLead) {
      return new NextResponse("Lead not found", { status: 404 });
    }

    const body = await request.json();
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
    const isNewCustomer = newCustomer !== undefined ? newCustomer : currentLead.newCustomer;

    if (isNewCustomer === true) {
      // If newCustomer = true, firstName and lastName are required
      if (firstName !== undefined && !firstName) {
        return new NextResponse("First name is required for new customers", { status: 400 });
      }
      if (lastName !== undefined && !lastName) {
        return new NextResponse("Last name is required for new customers", { status: 400 });
      }
      // customerId should not be provided
      if (customerId !== undefined && customerId) {
        return new NextResponse("Customer ID should not be provided for new customers", { status: 400 });
      }
    } else {
      // If newCustomer = false, customerId is required
      if (customerId !== undefined && !customerId) {
        return new NextResponse("Customer ID is required for existing customers", { status: 400 });
      }
      // firstName and lastName should not be provided
      if ((firstName !== undefined && firstName) || (lastName !== undefined && lastName)) {
        return new NextResponse("First name and last name should not be provided for existing customers", { status: 400 });
      }
    }

    // Validate salesUserId if provided
    if (salesUserId !== undefined) {
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
    }

    // Prepare update data
    const updateData: Prisma.LeadUpdateInput = {};

    if (newCustomer !== undefined) {
      updateData.newCustomer = newCustomer;
    }

    if (isNewCustomer) {
      // For new customers
      if (customerId !== undefined) {
        updateData.customer = customerId ? { connect: { id: customerId } } : { disconnect: true };
      }
      if (firstName !== undefined) updateData.firstName = firstName || null;
      if (lastName !== undefined) updateData.lastName = lastName || null;
    } else {
      // For existing customers
      if (customerId !== undefined) {
        updateData.customer = customerId ? { connect: { id: customerId } } : { disconnect: true };
      }
      if (firstName !== undefined) updateData.firstName = null;
      if (lastName !== undefined) updateData.lastName = null;
    }

    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber || null;
    if (email !== undefined) updateData.email = email || null;
    if (lineId !== undefined) updateData.lineId = lineId || null;
    if (salesUserId !== undefined) updateData.salesUser = { connect: { id: salesUserId } };
    if (source !== undefined && Object.values(LeadSource).includes(source as LeadSource)) {
      updateData.source = source as LeadSource;
    }
    if (status !== undefined && Object.values(LeadStatus).includes(status as LeadStatus)) {
      updateData.status = status as LeadStatus;
    }
    if (tripInterest !== undefined) updateData.tripInterest = tripInterest;
    if (pax !== undefined) updateData.pax = pax;
    if (leadNote !== undefined) updateData.leadNote = leadNote || null;
    if (sourceNote !== undefined) updateData.sourceNote = sourceNote || null;

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error("[LEAD_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

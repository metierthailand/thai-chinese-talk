import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const leads = await prisma.lead.findMany({
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

    return NextResponse.json(leads);
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

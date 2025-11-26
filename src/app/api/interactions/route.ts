import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { customerId, type, content } = body;

    if (!customerId || !type || !content) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const interaction = await prisma.interaction.create({
      data: {
        customerId,
        agentId: session.user.id,
        type,
        content,
      },
      include: {
        agent: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(interaction);
  } catch (error) {
    console.error("[INTERACTIONS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  const VIEW_ROLES = ["SUPER_ADMIN", "ADMIN", "SALES", "STAFF"] as const;
  if (!session || !VIEW_ROLES.includes(session.user.role as (typeof VIEW_ROLES)[number])) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const family = await prisma.family.findUnique({
      where: {
        id: id,
      },
      include: {
        customers: {
          include: {
            customer: {
              include: {
                tags: {
                  include: {
                    tag: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!family) {
      return new NextResponse("Family not found", { status: 404 });
    }

    return NextResponse.json(family);
  } catch (error) {
    console.error("[FAMILY_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  const WRITE_ROLES = ["SUPER_ADMIN", "SALES"] as const;
  if (!session || !WRITE_ROLES.includes(session.user.role as (typeof WRITE_ROLES)[number])) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, phoneNumber, lineId, email, note, customerIds } = body;

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    // Use transaction to update family and customer relations atomically
    const family = await prisma.$transaction(async (tx) => {
      // Update family data
      await tx.family.update({
        where: { id },
        data: {
          name,
          phoneNumber: phoneNumber || null,
          lineId: lineId || null,
          email: email || null,
          note: note || null,
        },
      });

      // Handle customer updates if customerIds is provided
      if (customerIds !== undefined) {
        // Delete existing customer relations
        await tx.customerFamily.deleteMany({
          where: { familyId: id },
        });

        // Create new customer relations
        if (customerIds.length > 0) {
          await tx.customerFamily.createMany({
            data: customerIds.map((customerId: string) => ({
              familyId: id,
              customerId,
            })),
          });
        }
      }

      // Fetch updated family with all relations
      return await tx.family.findUnique({
        where: { id },
        include: {
          customers: {
            include: {
              customer: {
                include: {
                  tags: {
                    include: {
                      tag: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    return NextResponse.json(family);
  } catch (error) {
    console.error("[FAMILY_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  const DELETE_ROLES = ["SUPER_ADMIN", "SALES"] as const;
  if (!session || !DELETE_ROLES.includes(session.user.role as (typeof DELETE_ROLES)[number])) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.family.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FAMILY_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const customer = await prisma.customer.findUnique({
      where: {
        id: id,
      },
      include: {
        tags: { include: { tag: true } },
        addresses: true,
        passports: true,
        foodAllergies: true,
        interactions: {
          orderBy: { date: "desc" },
          include: { agent: { select: { firstName: true, lastName: true } } },
        },
        leads: {
          orderBy: { updatedAt: "desc" },
        },
        bookings: {
          orderBy: { createdAt: "desc" },
          include: {
            trip: true,
          },
        },
      },
    });

    if (!customer) {
      return new NextResponse("Customer not found", { status: 404 });
    }

    // Also fetch tasks related to this customer
    const tasks = await prisma.task.findMany({
      where: {
        relatedCustomerId: id,
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    return NextResponse.json({ ...customer, tasks });
  } catch (error) {
    console.error("[CUSTOMER_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

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

    // Use transaction to update customer and tags atomically
    const customer = await prisma.$transaction(async (tx) => {
      // Update customer data
      await tx.customer.update({
        where: { id },
        data: {
          firstNameTh,
          lastNameTh,
          firstNameEn,
          lastNameEn,
          title: title || null,
          nickname: nickname || null,
          email: email || null,
          phoneNumber: phoneNumber || null,
          lineId: lineId || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          note: note || null,
        },
      });

      // Handle tag updates if tagIds is provided
      if (tagIds !== undefined) {
        // Delete existing tags
        await tx.customerTag.deleteMany({
          where: { customerId: id },
        });

        // Create new tags
        if (tagIds.length > 0) {
          await tx.customerTag.createMany({
            data: tagIds.map((tagId: string) => ({
              customerId: id,
              tagId,
            })),
          });
        }
      }

      // Handle addresses updates if addresses is provided
      if (addresses !== undefined) {
        // Delete existing addresses
        await tx.address.deleteMany({
          where: { customerId: id },
        });

        // Create new addresses
        if (addresses.length > 0) {
          await tx.address.createMany({
            data: addresses.map((addr: any) => ({
              customerId: id,
              address: addr.address,
              province: addr.province,
              district: addr.district,
              subDistrict: addr.subDistrict,
              postalCode: addr.postalCode,
            })),
          });
        }
      }

      // Handle passports updates if passports is provided
      if (passports !== undefined) {
        // Delete existing passports
        await tx.passport.deleteMany({
          where: { customerId: id },
        });

        // Create new passports
        if (passports.length > 0) {
          // If setting any as primary, unset others first
          const hasPrimary = passports.some((p: any) => p.isPrimary);
          if (hasPrimary) {
            // This is handled in the create below
          }

          await tx.passport.createMany({
            data: passports.map((p: any) => ({
              customerId: id,
              passportNumber: p.passportNumber,
              issuingCountry: p.issuingCountry,
              issuingDate: new Date(p.issuingDate),
              expiryDate: new Date(p.expiryDate),
              imageUrl: p.imageUrl || null,
              isPrimary: p.isPrimary || false,
            })),
          });
        }
      }

      // Handle food allergies updates if foodAllergies is provided
      if (foodAllergies !== undefined) {
        // Delete existing food allergies
        await tx.foodAllergy.deleteMany({
          where: { customerId: id },
        });

        // Create new food allergies
        if (foodAllergies.length > 0) {
          await tx.foodAllergy.createMany({
            data: foodAllergies.map((fa: any) => ({
              customerId: id,
              types: fa.types,
              note: fa.note || null,
            })),
          });
        }
      }

      // Fetch updated customer with all relations
      return await tx.customer.findUnique({
        where: { id },
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
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error("[CUSTOMER_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

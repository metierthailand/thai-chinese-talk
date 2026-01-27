import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { FoodAllergyType } from "@prisma/client";

interface PassportInput {
  passportNumber: string;
  issuingCountry: string;
  issuingDate: string | Date;
  expiryDate: string | Date;
  imageUrl?: string | null;
  isPrimary?: boolean;
}

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
        leads: {
          orderBy: { updatedAt: "desc" },
        },
        bookings: {
          orderBy: { createdAt: "desc" },
          include: {
            trip: true,
          },
        },
        _count: {
          select: { bookings: true },
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
      orderBy: [
        { deadline: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      ...customer,
      totalTrips: customer._count?.bookings ?? 0,
      tasks,
    });
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

    // Check for duplicate email and phone number (excluding current customer)
    const existingEmail = email
      ? await prisma.customer.findFirst({
          where: {
            email,
            id: { not: id },
          },
        })
      : null;

    const existingPhoneNumber = phoneNumber
      ? await prisma.customer.findFirst({
          where: {
            phoneNumber,
            id: { not: id },
          },
        })
      : null;

    // Check for duplicate passport numbers (excluding current customer's passports)
    const duplicatePassportNumbers: string[] = [];
    if (passports && Array.isArray(passports) && passports.length > 0) {
      const currentCustomerPassports = await prisma.passport.findMany({
        where: { customerId: id },
        select: { passportNumber: true },
      });
      const currentPassportNumbers = new Set(currentCustomerPassports.map((p) => p.passportNumber));
      
      const passportNumbers = (passports as PassportInput[]).map((p) => p.passportNumber).filter(Boolean);
      
      for (const passportNumber of passportNumbers) {
        // Skip if it's the same passport number (already belongs to this customer)
        if (currentPassportNumbers.has(passportNumber)) {
          continue;
        }
        
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

    // Use transaction to update customer and tags atomically
    const customer = await prisma.$transaction(async (tx) => {
      // Update customer data
      await tx.customer.update({
        where: { id },
        data: {
          firstNameTh: firstNameTh || null,
          lastNameTh: lastNameTh || null,
          firstNameEn,
          lastNameEn,
          title: title || null,
          email: email || null,
          phoneNumber: phoneNumber || null,
          lineId: lineId || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
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
            data: (addresses as Array<{
              address: string;
              province: string;
              district: string;
              subDistrict: string;
              postalCode: string;
            }>).map((addr) => ({
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
        // Get existing passports
        const existingPassports = await tx.passport.findMany({
          where: { customerId: id },
          include: {
            bookings: {
              select: { id: true },
            },
          },
        });

        // Create maps for easier lookup
        const existingPassportMap = new Map(
          existingPassports.map((p) => [p.passportNumber, p])
        );
        // const newPassportMap = new Map(
        //   (passports as Array<{ passportNumber: string }>).map((p) => [p.passportNumber, p])
        // );

        // Process each new passport
        const newPassports = passports as Array<{
          passportNumber: string;
          issuingCountry: string;
          issuingDate: string | Date;
          expiryDate: string | Date;
          imageUrl?: string | null;
          isPrimary?: boolean;
        }>;

        for (let index = 0; index < newPassports.length; index++) {
          const newPassport = newPassports[index];
          const existingPassport = existingPassportMap.get(newPassport.passportNumber);

          if (existingPassport) {
            // Update existing passport
            await tx.passport.update({
              where: { id: existingPassport.id },
              data: {
                issuingCountry: newPassport.issuingCountry,
                issuingDate: new Date(newPassport.issuingDate),
                expiryDate: new Date(newPassport.expiryDate),
                imageUrl: newPassport.imageUrl || null,
                isPrimary: newPassport.isPrimary !== undefined ? newPassport.isPrimary : index === 0,
              },
            });
          } else {
            // Create new passport
            await tx.passport.create({
              data: {
                customerId: id,
                passportNumber: newPassport.passportNumber,
                issuingCountry: newPassport.issuingCountry,
                issuingDate: new Date(newPassport.issuingDate),
                expiryDate: new Date(newPassport.expiryDate),
                imageUrl: newPassport.imageUrl || null,
                isPrimary: newPassport.isPrimary !== undefined ? newPassport.isPrimary : index === 0,
              },
            });
          }
        }

        // Delete passports that are no longer in the new list and not used in bookings
        const newPassportNumbers = new Set(newPassports.map((p) => p.passportNumber));
        for (const existingPassport of existingPassports) {
          if (!newPassportNumbers.has(existingPassport.passportNumber)) {
            // Check if passport is used in any booking
            if (existingPassport.bookings.length === 0) {
              // Safe to delete - not used in any booking
              await tx.passport.delete({
                where: { id: existingPassport.id },
              });
            }
            // If passport is used in bookings, we keep it (can't delete due to foreign key constraint)
          }
        }

        // Ensure at least one passport is primary if there are any passports
        if (newPassports.length > 0) {
          const hasPrimary = newPassports.some((p) => p.isPrimary);
          if (!hasPrimary) {
            // Set the first passport as primary
            const firstPassportNumber = newPassports[0].passportNumber;
            const firstPassport = await tx.passport.findFirst({
              where: {
                customerId: id,
                passportNumber: firstPassportNumber,
              },
            });
            if (firstPassport) {
              // Unset all other passports as primary
              await tx.passport.updateMany({
                where: {
                  customerId: id,
                  id: { not: firstPassport.id },
                },
                data: { isPrimary: false },
              });
              // Set first passport as primary
              await tx.passport.update({
                where: { id: firstPassport.id },
                data: { isPrimary: true },
              });
            }
          } else {
            // Ensure only one passport is primary
            const primaryPassportNumber = newPassports.find((p) => p.isPrimary)?.passportNumber;
            if (primaryPassportNumber) {
              const primaryPassport = await tx.passport.findFirst({
                where: {
                  customerId: id,
                  passportNumber: primaryPassportNumber,
                },
              });
              if (primaryPassport) {
                // Unset all other passports as primary
                await tx.passport.updateMany({
                  where: {
                    customerId: id,
                    id: { not: primaryPassport.id },
                  },
                  data: { isPrimary: false },
                });
                // Ensure this one is primary
                await tx.passport.update({
                  where: { id: primaryPassport.id },
                  data: { isPrimary: true },
                });
              }
            }
          }
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
            data: (foodAllergies as Array<{
              types: string[];
              note?: string | null;
            }>).map((fa) => ({
              customerId: id,
              types: fa.types as FoodAllergyType[],
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

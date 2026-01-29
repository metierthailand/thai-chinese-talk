import { PrismaClient, Title, FoodAllergyType } from "@prisma/client";

export async function seedCustomers(prisma: PrismaClient) {
  // Get existing tags to use for customer tags
  const tags = await prisma.tag.findMany();
  const vipTag = tags.find((t) => t.name === "VIP");
  const regularTag = tags.find((t) => t.name === "Regular");
  const newCustomerTag = tags.find((t) => t.name === "New Customer");
  const repeatCustomerTag = tags.find((t) => t.name === "Repeat Customer");

  const customers = [
    {
      firstNameEn: "John",
      lastNameEn: "Smith",
      firstNameTh: "จอห์น",
      lastNameTh: "สมิธ",
      title: Title.MR,
      email: "john.smith@example.com",
      phoneNumber: "0812345678",
      lineId: "johnsmith",
      dateOfBirth: new Date("1985-05-15"),
      note: "Regular customer, prefers window seats",
      tagIds: regularTag ? [regularTag.id] : [],
      addresses: [
        {
          address: "123 Sukhumvit Road",
          province: "กรุงเทพมหานคร",
          district: "วัฒนา",
          subDistrict: "คลองเตยเหนือ",
          postalCode: "10110",
        },
      ],
      passports: [
        {
          passportNumber: "A12345678",
          issuingCountry: "Thailand",
          issuingDate: new Date("2020-01-15"),
          expiryDate: new Date("2030-01-14"),
          isPrimary: true,
        },
      ],
      foodAllergies: [],
    },
    {
      firstNameEn: "Sarah",
      lastNameEn: "Johnson",
      firstNameTh: "ซาร่า",
      lastNameTh: "จอห์นสัน",
      title: Title.MRS,
      email: "sarah.johnson@example.com",
      phoneNumber: "0823456789",
      lineId: "sarahj",
      dateOfBirth: new Date("1990-08-22"),
      note: "VIP customer, frequent traveler",
      tagIds: vipTag ? [vipTag.id] : [],
      addresses: [
        {
          address: "456 Silom Road",
          province: "กรุงเทพมหานคร",
          district: "บางรัก",
          subDistrict: "สีลม",
          postalCode: "10500",
        },
      ],
      passports: [
        {
          passportNumber: "B98765432",
          issuingCountry: "Thailand",
          issuingDate: new Date("2019-06-10"),
          expiryDate: new Date("2029-06-09"),
          isPrimary: true,
        },
      ],
      foodAllergies: [
        {
          types: [FoodAllergyType.PEANUT_AND_NUTS],
          note: "Severe allergy to peanuts and tree nuts",
        },
      ],
    },
    {
      firstNameEn: "Michael",
      lastNameEn: "Chen",
      firstNameTh: "ไมเคิล",
      lastNameTh: "เฉิน",
      title: Title.MR,
      email: "michael.chen@example.com",
      phoneNumber: "0834567890",
      dateOfBirth: new Date("1988-12-03"),
      note: "New customer, interested in group tours",
      tagIds: newCustomerTag ? [newCustomerTag.id] : [],
      addresses: [
        {
          address: "789 Ratchadamri Road",
          province: "กรุงเทพมหานคร",
          district: "ปทุมวัน",
          subDistrict: "ลุมพินี",
          postalCode: "10330",
        },
      ],
      passports: [
        {
          passportNumber: "C11111111",
          issuingCountry: "Thailand",
          issuingDate: new Date("2021-03-20"),
          expiryDate: new Date("2031-03-19"),
          isPrimary: true,
        },
      ],
      foodAllergies: [
        {
          types: [FoodAllergyType.CRUSTACEAN, FoodAllergyType.FISH],
          note: "Allergic to seafood",
        },
      ],
    },
    {
      firstNameEn: "Emily",
      lastNameEn: "Wang",
      firstNameTh: "เอมิลี่",
      lastNameTh: "หวัง",
      title: Title.MISS,
      email: "emily.wang@example.com",
      phoneNumber: "0845678901",
      lineId: "emilyw",
      dateOfBirth: new Date("1995-02-14"),
      note: "Repeat customer, prefers aisle seats",
      tagIds: repeatCustomerTag ? [repeatCustomerTag.id] : [],
      addresses: [
        {
          address: "321 Phayathai Road",
          province: "กรุงเทพมหานคร",
          district: "ราชเทวี",
          subDistrict: "ทุ่งพญาไท",
          postalCode: "10400",
        },
      ],
      passports: [
        {
          passportNumber: "D22222222",
          issuingCountry: "Thailand",
          issuingDate: new Date("2022-07-05"),
          expiryDate: new Date("2032-07-04"),
          isPrimary: true,
        },
      ],
      foodAllergies: [],
    },
    {
      firstNameEn: "David",
      lastNameEn: "Kim",
      firstNameTh: "เดวิด",
      lastNameTh: "คิม",
      title: Title.MR,
      email: "david.kim@example.com",
      phoneNumber: "0856789012",
      dateOfBirth: new Date("1982-11-30"),
      note: "Corporate client, group bookings",
      tagIds: [],
      addresses: [
        {
          address: "654 Sathorn Road",
          province: "กรุงเทพมหานคร",
          district: "สาทร",
          subDistrict: "ทุ่งมหาเมฆ",
          postalCode: "10120",
        },
      ],
      passports: [
        {
          passportNumber: "E33333333",
          issuingCountry: "Thailand",
          issuingDate: new Date("2020-09-12"),
          expiryDate: new Date("2030-09-11"),
          isPrimary: true,
        },
      ],
      foodAllergies: [
        {
          types: [FoodAllergyType.GLUTEN],
          note: "Gluten-free diet required",
        },
      ],
    },
    {
      firstNameEn: "Lisa",
      lastNameEn: "Anderson",
      firstNameTh: "ลิซ่า",
      lastNameTh: "แอนเดอร์สัน",
      title: Title.MISS,
      email: "lisa.anderson@example.com",
      phoneNumber: "0867890123",
      lineId: "lisaa",
      dateOfBirth: new Date("1992-04-18"),
      note: "Regular customer",
      tagIds: regularTag ? [regularTag.id] : [],
      addresses: [
        {
          address: "111 Wireless Road",
          province: "กรุงเทพมหานคร",
          district: "ปทุมวัน",
          subDistrict: "ลุมพินี",
          postalCode: "10330",
        },
      ],
      passports: [
        {
          passportNumber: "F44444444",
          issuingCountry: "Thailand",
          issuingDate: new Date("2021-11-01"),
          expiryDate: new Date("2031-10-31"),
          isPrimary: true,
        },
      ],
      foodAllergies: [],
    },
    {
      firstNameEn: "Robert",
      lastNameEn: "Taylor",
      firstNameTh: "โรเบิร์ต",
      lastNameTh: "เทย์เลอร์",
      title: Title.MR,
      email: "robert.taylor@example.com",
      phoneNumber: "0878901234",
      dateOfBirth: new Date("1987-07-25"),
      note: "New customer",
      tagIds: newCustomerTag ? [newCustomerTag.id] : [],
      addresses: [
        {
          address: "222 Rama IV Road",
          province: "กรุงเทพมหานคร",
          district: "สาทร",
          subDistrict: "ยานนาวา",
          postalCode: "10120",
        },
      ],
      passports: [
        {
          passportNumber: "G55555555",
          issuingCountry: "Thailand",
          issuingDate: new Date("2022-02-14"),
          expiryDate: new Date("2032-02-13"),
          isPrimary: true,
        },
      ],
      foodAllergies: [
        {
          types: [FoodAllergyType.EGGS],
          note: "Allergic to eggs",
        },
      ],
    },
    {
      firstNameEn: "Jennifer",
      lastNameEn: "Brown",
      firstNameTh: "เจนนิเฟอร์",
      lastNameTh: "บราวน์",
      title: Title.MRS,
      email: "jennifer.brown@example.com",
      phoneNumber: "0889012345",
      lineId: "jenniferb",
      dateOfBirth: new Date("1989-09-10"),
      note: "VIP customer",
      tagIds: vipTag ? [vipTag.id] : [],
      addresses: [
        {
          address: "333 Asoke Road",
          province: "กรุงเทพมหานคร",
          district: "วัฒนา",
          subDistrict: "คลองเตยเหนือ",
          postalCode: "10110",
        },
      ],
      passports: [
        {
          passportNumber: "H66666666",
          issuingCountry: "Thailand",
          issuingDate: new Date("2020-05-20"),
          expiryDate: new Date("2030-05-19"),
          isPrimary: true,
        },
      ],
      foodAllergies: [],
    },
    {
      firstNameEn: "James",
      lastNameEn: "Wilson",
      firstNameTh: "เจมส์",
      lastNameTh: "วิลสัน",
      title: Title.MR,
      email: "james.wilson@example.com",
      phoneNumber: "0890123456",
      dateOfBirth: new Date("1984-03-08"),
      note: "Repeat customer",
      tagIds: repeatCustomerTag ? [repeatCustomerTag.id] : [],
      addresses: [
        {
          address: "444 Phetchaburi Road",
          province: "กรุงเทพมหานคร",
          district: "ราชเทวี",
          subDistrict: "ทุ่งพญาไท",
          postalCode: "10400",
        },
      ],
      passports: [
        {
          passportNumber: "I77777777",
          issuingCountry: "Thailand",
          issuingDate: new Date("2021-08-15"),
          expiryDate: new Date("2031-08-14"),
          isPrimary: true,
        },
      ],
      foodAllergies: [
        {
          types: [FoodAllergyType.DIARY],
          note: "Lactose intolerant",
        },
      ],
    },
    {
      firstNameEn: "Maria",
      lastNameEn: "Garcia",
      firstNameTh: "มาเรีย",
      lastNameTh: "การ์เซีย",
      title: Title.MISS,
      email: "maria.garcia@example.com",
      phoneNumber: "0901234567",
      lineId: "mariag",
      dateOfBirth: new Date("1993-12-20"),
      note: "Regular customer",
      tagIds: regularTag ? [regularTag.id] : [],
      addresses: [
        {
          address: "555 Ladprao Road",
          province: "กรุงเทพมหานคร",
          district: "จตุจักร",
          subDistrict: "จตุจักร",
          postalCode: "10900",
        },
      ],
      passports: [
        {
          passportNumber: "J88888888",
          issuingCountry: "Thailand",
          issuingDate: new Date("2022-01-10"),
          expiryDate: new Date("2032-01-09"),
          isPrimary: true,
        },
      ],
      foodAllergies: [],
    },
    {
      firstNameEn: "William",
      lastNameEn: "Martinez",
      firstNameTh: "วิลเลียม",
      lastNameTh: "มาร์ติเนซ",
      title: Title.MR,
      email: "william.martinez@example.com",
      phoneNumber: "0912345678",
      dateOfBirth: new Date("1986-06-12"),
      note: "New customer",
      tagIds: newCustomerTag ? [newCustomerTag.id] : [],
      addresses: [
        {
          address: "666 Ratchaprarop Road",
          province: "กรุงเทพมหานคร",
          district: "ราชเทวี",
          subDistrict: "ทุ่งพญาไท",
          postalCode: "10400",
        },
      ],
      passports: [
        {
          passportNumber: "K99999999",
          issuingCountry: "Thailand",
          issuingDate: new Date("2021-04-25"),
          expiryDate: new Date("2031-04-24"),
          isPrimary: true,
        },
      ],
      foodAllergies: [
        {
          types: [FoodAllergyType.OTHER],
          note: "Allergic to shellfish",
        },
      ],
    },
    {
      firstNameEn: "Patricia",
      lastNameEn: "Lee",
      firstNameTh: "แพทริเซีย",
      lastNameTh: "ลี",
      title: Title.MRS,
      email: "patricia.lee@example.com",
      phoneNumber: "0923456789",
      lineId: "patricial",
      dateOfBirth: new Date("1991-10-05"),
      note: "VIP customer",
      tagIds: vipTag ? [vipTag.id] : [],
      addresses: [
        {
          address: "777 Thonglor Road",
          province: "กรุงเทพมหานคร",
          district: "วัฒนา",
          subDistrict: "คลองตันเหนือ",
          postalCode: "10110",
        },
      ],
      passports: [
        {
          passportNumber: "L10101010",
          issuingCountry: "Thailand",
          issuingDate: new Date("2020-12-01"),
          expiryDate: new Date("2030-11-30"),
          isPrimary: true,
        },
      ],
      foodAllergies: [],
    },
    {
      firstNameEn: "Richard",
      lastNameEn: "White",
      firstNameTh: "ริชาร์ด",
      lastNameTh: "ไวท์",
      title: Title.MR,
      email: "richard.white@example.com",
      phoneNumber: "0934567890",
      dateOfBirth: new Date("1983-01-28"),
      note: "Repeat customer",
      tagIds: repeatCustomerTag ? [repeatCustomerTag.id] : [],
      addresses: [
        {
          address: "888 Ekkamai Road",
          province: "กรุงเทพมหานคร",
          district: "วัฒนา",
          subDistrict: "คลองตันเหนือ",
          postalCode: "10110",
        },
      ],
      passports: [
        {
          passportNumber: "M20202020",
          issuingCountry: "Thailand",
          issuingDate: new Date("2022-06-18"),
          expiryDate: new Date("2032-06-17"),
          isPrimary: true,
        },
      ],
      foodAllergies: [
        {
          types: [FoodAllergyType.GLUTEN],
          note: "Celiac disease",
        },
      ],
    },
    {
      firstNameEn: "Jessica",
      lastNameEn: "Harris",
      firstNameTh: "เจสสิก้า",
      lastNameTh: "แฮร์ริส",
      title: Title.MISS,
      email: "jessica.harris@example.com",
      phoneNumber: "0945678901",
      dateOfBirth: new Date("1994-05-15"),
      note: "Regular customer",
      tagIds: regularTag ? [regularTag.id] : [],
      addresses: [
        {
          address: "999 On Nut Road",
          province: "กรุงเทพมหานคร",
          district: "สวนหลวง",
          subDistrict: "อ่อนนุช",
          postalCode: "10250",
        },
      ],
      passports: [
        {
          passportNumber: "N30303030",
          issuingCountry: "Thailand",
          issuingDate: new Date("2021-09-12"),
          expiryDate: new Date("2031-09-11"),
          isPrimary: true,
        },
      ],
      foodAllergies: [],
    },
    {
      firstNameEn: "Thomas",
      lastNameEn: "Clark",
      firstNameTh: "โทมัส",
      lastNameTh: "คลาร์ก",
      title: Title.MR,
      email: "thomas.clark@example.com",
      phoneNumber: "0956789012",
      lineId: "thomasc",
      dateOfBirth: new Date("1985-11-22"),
      note: "New customer",
      tagIds: newCustomerTag ? [newCustomerTag.id] : [],
      addresses: [
        {
          address: "1010 Bangna-Trad Road",
          province: "กรุงเทพมหานคร",
          district: "บางนา",
          subDistrict: "บางนาเหนือ",
          postalCode: "10260",
        },
      ],
      passports: [
        {
          passportNumber: "O40404040",
          issuingCountry: "Thailand",
          issuingDate: new Date("2022-03-08"),
          expiryDate: new Date("2032-03-07"),
          isPrimary: true,
        },
      ],
      foodAllergies: [
        {
          types: [FoodAllergyType.PEANUT_AND_NUTS],
          note: "Allergic to all nuts",
        },
      ],
    },
    {
      firstNameEn: "Susan",
      lastNameEn: "Lewis",
      firstNameTh: "ซูซาน",
      lastNameTh: "ลูอิส",
      title: Title.MRS,
      email: "susan.lewis@example.com",
      phoneNumber: "0967890123",
      dateOfBirth: new Date("1988-08-30"),
      note: "VIP customer",
      tagIds: vipTag ? [vipTag.id] : [],
      addresses: [
        {
          address: "1111 Srinakarin Road",
          province: "กรุงเทพมหานคร",
          district: "สวนหลวง",
          subDistrict: "สวนหลวง",
          postalCode: "10250",
        },
      ],
      passports: [
        {
          passportNumber: "P50505050",
          issuingCountry: "Thailand",
          issuingDate: new Date("2020-07-22"),
          expiryDate: new Date("2030-07-21"),
          isPrimary: true,
        },
      ],
      foodAllergies: [],
    },
    {
      firstNameEn: "Charles",
      lastNameEn: "Robinson",
      firstNameTh: "ชาร์ลส์",
      lastNameTh: "โรบินสัน",
      title: Title.MR,
      email: "charles.robinson@example.com",
      phoneNumber: "0978901234",
      dateOfBirth: new Date("1981-02-14"),
      note: "Repeat customer",
      tagIds: repeatCustomerTag ? [repeatCustomerTag.id] : [],
      addresses: [
        {
          address: "1212 Lat Krabang Road",
          province: "กรุงเทพมหานคร",
          district: "ลาดกระบัง",
          subDistrict: "ลาดกระบัง",
          postalCode: "10520",
        },
      ],
      passports: [
        {
          passportNumber: "Q60606060",
          issuingCountry: "Thailand",
          issuingDate: new Date("2021-12-05"),
          expiryDate: new Date("2031-12-04"),
          isPrimary: true,
        },
      ],
      foodAllergies: [
        {
          types: [FoodAllergyType.FISH],
          note: "Allergic to fish",
        },
      ],
    },
    {
      firstNameEn: "Karen",
      lastNameEn: "Walker",
      firstNameTh: "คาเรน",
      lastNameTh: "วอล์คเกอร์",
      title: Title.MISS,
      email: "karen.walker@example.com",
      phoneNumber: "0989012345",
      lineId: "karenw",
      dateOfBirth: new Date("1996-04-03"),
      note: "Regular customer",
      tagIds: regularTag ? [regularTag.id] : [],
      addresses: [
        {
          address: "1313 Ramkhamhaeng Road",
          province: "กรุงเทพมหานคร",
          district: "ห้วยขวาง",
          subDistrict: "ห้วยขวาง",
          postalCode: "10310",
        },
      ],
      passports: [
        {
          passportNumber: "R70707070",
          issuingCountry: "Thailand",
          issuingDate: new Date("2022-05-20"),
          expiryDate: new Date("2032-05-19"),
          isPrimary: true,
        },
      ],
      foodAllergies: [],
    },
    {
      firstNameEn: "Daniel",
      lastNameEn: "Young",
      firstNameTh: "แดเนียล",
      lastNameTh: "ยัง",
      title: Title.MR,
      email: "daniel.young@example.com",
      phoneNumber: "0990123456",
      dateOfBirth: new Date("1989-07-17"),
      note: "New customer",
      tagIds: newCustomerTag ? [newCustomerTag.id] : [],
      addresses: [
        {
          address: "1414 Vibhavadi Rangsit Road",
          province: "กรุงเทพมหานคร",
          district: "จตุจักร",
          subDistrict: "จตุจักร",
          postalCode: "10900",
        },
      ],
      passports: [
        {
          passportNumber: "S80808080",
          issuingCountry: "Thailand",
          issuingDate: new Date("2021-10-30"),
          expiryDate: new Date("2031-10-29"),
          isPrimary: true,
        },
      ],
      foodAllergies: [
        {
          types: [FoodAllergyType.CRUSTACEAN],
          note: "Allergic to shrimp and crab",
        },
      ],
    },
    {
      firstNameEn: "Nancy",
      lastNameEn: "King",
      firstNameTh: "แนนซี่",
      lastNameTh: "คิง",
      title: Title.MRS,
      email: "nancy.king@example.com",
      phoneNumber: "0801234567",
      lineId: "nancyk",
      dateOfBirth: new Date("1990-09-25"),
      note: "VIP customer",
      tagIds: vipTag ? [vipTag.id] : [],
      addresses: [
        {
          address: "1515 Phahonyothin Road",
          province: "กรุงเทพมหานคร",
          district: "จตุจักร",
          subDistrict: "จตุจักร",
          postalCode: "10900",
        },
      ],
      passports: [
        {
          passportNumber: "T90909090",
          issuingCountry: "Thailand",
          issuingDate: new Date("2020-11-15"),
          expiryDate: new Date("2030-11-14"),
          isPrimary: true,
        },
      ],
      foodAllergies: [],
    },
  ];

  const createdCustomers = [];
  for (const customerData of customers) {
    try {
      const customer = await prisma.customer.create({
        data: {
          firstNameEn: customerData.firstNameEn,
          lastNameEn: customerData.lastNameEn,
          firstNameTh: customerData.firstNameTh || null,
          lastNameTh: customerData.lastNameTh || null,
          title: customerData.title || undefined,
          email: customerData.email || undefined,
          phoneNumber: customerData.phoneNumber || undefined,
          lineId: customerData.lineId || undefined,
          dateOfBirth: customerData.dateOfBirth,
          note: customerData.note || undefined,
          tags:
            customerData.tagIds.length > 0
              ? {
                  create: customerData.tagIds.map((tagId: string) => ({
                    tagId,
                  })),
                }
              : undefined,
          addresses:
            customerData.addresses && customerData.addresses.length > 0
              ? {
                  create: customerData.addresses,
                }
              : undefined,
          passports:
            customerData.passports && customerData.passports.length > 0
              ? {
                  create: customerData.passports.map((p, index) => ({
                    passportNumber: p.passportNumber,
                    issuingCountry: p.issuingCountry,
                    issuingDate: p.issuingDate,
                    expiryDate: p.expiryDate,
                    isPrimary: p.isPrimary !== undefined ? p.isPrimary : index === 0,
                  })),
                }
              : undefined,
          foodAllergies:
            customerData.foodAllergies && customerData.foodAllergies.length > 0
              ? {
                  create: customerData.foodAllergies,
                }
              : undefined,
        },
      });
      createdCustomers.push(customer);
    } catch (error) {
      // Skip if customer already exists (duplicate email/phone/passport)
      console.warn(`⚠️  Skipped customer ${customerData.firstNameEn} ${customerData.lastNameEn}:`, error);
    }
  }

  console.log(`✅ Seeded ${createdCustomers.length} customers`);
  return createdCustomers;
}

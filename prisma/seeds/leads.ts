import { PrismaClient, LeadStatus, LeadSource, Role } from "@prisma/client";

export async function seedLeads(prisma: PrismaClient) {
  // Get existing users (need SALES role for salesUserId and any user for agentId)
  const users = await prisma.user.findMany({
    select: {
      id: true,
      role: true,
      firstName: true,
      lastName: true,
    },
  });

  const salesUsers = users.filter((u) => u.role === Role.SALES);
  const agentUsers = users.filter((u) => u.role === Role.SALES || u.role === Role.STAFF || u.role === Role.ADMIN);

  if (salesUsers.length === 0 || agentUsers.length === 0) {
    console.log("⚠️  No sales users or agent users found. Skipping lead seeding.");
    return [];
  }

  // Get existing customers
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      firstNameEn: true,
      lastNameEn: true,
    },
    take: 10, // Use first 10 customers
  });

  // Get existing trips for tripInterest
  const trips = await prisma.trip.findMany({
    select: {
      id: true,
      name: true,
      code: true,
    },
    take: 5,
  });

  if (customers.length === 0 || trips.length === 0) {
    console.log("⚠️  No customers or trips found. Skipping lead seeding.");
    return [];
  }

  const leads = [
    // Existing customers leads
    {
      newCustomer: false,
      customerId: customers[0]?.id,
      salesUserId: salesUsers[0]?.id,
      agentId: agentUsers[0]?.id,
      source: LeadSource.FACEBOOK,
      status: LeadStatus.INTERESTED,
      tripInterest: trips[0]?.name || "Bangkok to Singapore",
      pax: 2,
      leadNote: "Interested in group tour",
      sourceNote: "Found through Facebook",
    },
    {
      newCustomer: false,
      customerId: customers[1]?.id,
      salesUserId: salesUsers[0]?.id,
      agentId: agentUsers[0]?.id,
      source: LeadSource.YOUTUBE,
      status: LeadStatus.INTERESTED,
      tripInterest: trips[1]?.name || "Bangkok to Hong Kong",
      pax: 4,
      leadNote: "Family trip",
      sourceNote: "YouTube ad",
    },
    {
      newCustomer: false,
      customerId: customers[2]?.id,
      salesUserId: salesUsers[0]?.id,
      agentId: agentUsers[0]?.id,
      source: LeadSource.FRIEND,
      status: LeadStatus.BOOKED,
      tripInterest: trips[0]?.name || "Bangkok to Singapore",
      pax: 1,
      leadNote: "Referred by existing customer",
      sourceNote: "Friend referral",
    },
    {
      newCustomer: false,
      customerId: customers[3]?.id,
      salesUserId: salesUsers[0]?.id,
      agentId: agentUsers[0]?.id,
      source: LeadSource.TIKTOK,
      status: LeadStatus.INTERESTED,
      tripInterest: trips[2]?.name || "Private Tour to Tokyo",
      pax: 2,
      leadNote: "Looking for private tour",
      sourceNote: "TikTok video",
    },
    // New customers leads
    {
      newCustomer: true,
      firstName: "Alex",
      lastName: "Thompson",
      phoneNumber: "0901111111",
      email: "alex.thompson@example.com",
      lineId: "alexth",
      salesUserId: salesUsers[0]?.id,
      agentId: agentUsers[0]?.id,
      source: LeadSource.FACEBOOK,
      status: LeadStatus.INTERESTED,
      tripInterest: trips[0]?.name || "Bangkok to Singapore",
      pax: 3,
      leadNote: "New customer inquiry",
      sourceNote: "Facebook contact",
    },
    {
      newCustomer: true,
      firstName: "Sophie",
      lastName: "Martin",
      phoneNumber: "0902222222",
      email: "sophie.martin@example.com",
      salesUserId: salesUsers[0]?.id,
      agentId: agentUsers[0]?.id,
      source: LeadSource.YOUTUBE,
      status: LeadStatus.INTERESTED,
      tripInterest: trips[1]?.name || "Bangkok to Hong Kong",
      pax: 2,
      leadNote: "Interested in shopping tour",
      sourceNote: "YouTube comment",
    },
    {
      newCustomer: true,
      firstName: "Ryan",
      lastName: "Davis",
      phoneNumber: "0903333333",
      email: "ryan.davis@example.com",
      lineId: "ryand",
      salesUserId: salesUsers[0]?.id,
      agentId: agentUsers[0]?.id,
      source: LeadSource.FRIEND,
      status: LeadStatus.BOOKED,
      tripInterest: trips[2]?.name || "Private Tour to Tokyo",
      pax: 1,
      leadNote: "Booked private tour",
      sourceNote: "Friend referral",
    },
    {
      newCustomer: false,
      customerId: customers[4]?.id,
      salesUserId: salesUsers[0]?.id,
      agentId: agentUsers[0]?.id,
      source: LeadSource.TIKTOK,
      status: LeadStatus.COMPLETED,
      tripInterest: trips[0]?.name || "Bangkok to Singapore",
      pax: 2,
      leadNote: "Completed trip",
      sourceNote: "TikTok ad",
    },
    {
      newCustomer: false,
      customerId: customers[5]?.id,
      salesUserId: salesUsers[0]?.id,
      agentId: agentUsers[0]?.id,
      source: null,
      status: LeadStatus.INTERESTED,
      tripInterest: trips[3]?.name || "Bangkok to Seoul",
      pax: 5,
      leadNote: "Group of 5 people",
      sourceNote: null,
    },
    {
      newCustomer: true,
      firstName: "Emma",
      lastName: "Wilson",
      phoneNumber: "0904444444",
      email: "emma.wilson@example.com",
      salesUserId: salesUsers[0]?.id,
      agentId: agentUsers[0]?.id,
      source: LeadSource.FACEBOOK,
      status: LeadStatus.CANCELLED,
      tripInterest: trips[1]?.name || "Bangkok to Hong Kong",
      pax: 2,
      leadNote: "Cancelled due to schedule conflict",
      sourceNote: "Facebook inquiry",
    },
  ];

  const createdLeads = [];
  for (const leadData of leads) {
    try {
      // Validate required fields
      if (!leadData.salesUserId || !leadData.agentId || !leadData.tripInterest) {
        console.warn(`⚠️  Skipping lead: missing required fields`);
        continue;
      }

      // Validate newCustomer logic
      if (leadData.newCustomer) {
        if (!leadData.firstName || !leadData.lastName) {
          console.warn(`⚠️  Skipping lead: newCustomer requires firstName and lastName`);
          continue;
        }
      } else {
        if (!leadData.customerId) {
          console.warn(`⚠️  Skipping lead: existing customer requires customerId`);
          continue;
        }
      }

      const lead = await prisma.lead.create({
        data: {
          newCustomer: leadData.newCustomer,
          customerId: leadData.newCustomer ? null : leadData.customerId,
          firstName: leadData.newCustomer ? leadData.firstName : null,
          lastName: leadData.newCustomer ? leadData.lastName : null,
          phoneNumber: leadData.phoneNumber || null,
          email: leadData.email || null,
          lineId: leadData.lineId || null,
          agentId: leadData.agentId,
          salesUserId: leadData.salesUserId,
          source: leadData.source || null,
          status: leadData.status,
          tripInterest: leadData.tripInterest,
          pax: leadData.pax || 1,
          leadNote: leadData.leadNote || null,
          sourceNote: leadData.sourceNote || null,
        },
      });
      createdLeads.push(lead);
    } catch (error) {
      console.warn(`⚠️  Error creating lead:`, error);
    }
  }

  console.log(`✅ Seeded ${createdLeads.length} leads`);
  return createdLeads;
}

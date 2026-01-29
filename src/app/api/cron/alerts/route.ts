import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addDays, subDays } from "date-fns";

export async function GET(request: Request) {
  try {
    // Check authorization: either CRON_SECRET (for cron jobs) or session (for UI calls)
    const authHeader = request.headers.get("authorization");
    const hasValidCronSecret = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    // If no valid cron secret, check for session
    if (!hasValidCronSecret) {
      const session = await getServerSession(authOptions);
      if (!session) {
        return new NextResponse("Unauthorized", {
          status: 401,
        });
      }
    }

    // 1. Passport Expiry Alerts
    // Find passports expiring within the next 6 months
    // const sixMonthsFromNow = addMonths(new Date(), 6);
    // const now = new Date();
    // const passports = await prisma.passport.findMany({
    //   where: {
    //     expiryDate: {
    //       lt: sixMonthsFromNow,
    //       gt: now, // Not already expired
    //     },
    //   },
    //   include: {
    //     customer: {
    //       include: {
    //         leads: {
    //           orderBy: {
    //             createdAt: "desc",
    //           },
    //           take: 1,
    //         },
    //         bookings: {
    //           orderBy: {
    //             createdAt: "desc",
    //           },
    //           take: 1,
    //           include: {
    //             salesUser: {
    //               select: {
    //                 id: true,
    //               },
    //             },
    //             agent: {
    //               select: {
    //                 id: true,
    //               },
    //             },
    //           },
    //         },
    //       },
    //     },
    //   },
    // });

    // let passportAlertsCount = 0;

    // for (const passport of passports) {
    //   // Determine the agent to notify
    //   // Strategy: 
    //   // 1. Use agent from most recent lead
    //   // 2. If no lead, use agent from most recent booking's lead
    //   // 3. If no booking lead, use agent from most recent interaction
    //   let agentId: string | undefined;

    //   if (passport.customer.leads.length > 0) {
    //     agentId = passport.customer.leads[0]?.agentId;
    //   } else if (passport.customer.bookings.length > 0) {
    //     const booking = passport.customer.bookings[0];
    //     // Use salesUser (SALES role) or agent from booking
    //     agentId = booking.salesUser?.id || booking.agent?.id;
    //   }

    //   if (agentId) {
    //     // Check for existing notification created within the alert window (6 months)
    //     // This prevents duplicate notifications even if the previous one was read
    //     const sixMonthsAgo = subDays(now, 180);
    //     const existingNotification = await prisma.notification.findFirst({
    //       where: {
    //         userId: agentId,
    //         type: "PASSPORT_EXPIRY",
    //         entityId: passport.id,
    //         createdAt: {
    //           gte: sixMonthsAgo,
    //         },
    //       },
    //     });

    //     if (!existingNotification) {
    //       await prisma.notification.create({
    //         data: {
    //           userId: agentId,
    //           type: "PASSPORT_EXPIRY",
    //           title: "Passport Expiring Soon",
    //           message: `Passport for ${passport.customer.firstNameEn} ${passport.customer.lastNameEn} expires on ${passport.expiryDate.toLocaleDateString()}`,
    //           link: `/dashboard/customers/${passport.customer.id}`,
    //           entityId: passport.id,
    //         },
    //       });
    //       passportAlertsCount++;
    //     }
    //   }
    // }

    // 2. Trip Upcoming Alerts — trips ที่ startDate อยู่ในอีก 7 วัน
    const now = new Date();
    const sevenDaysFromNow = addDays(now, 7);
    const upcomingTrips = await prisma.trip.findMany({
      where: {
        startDate: {
          gt: now,
          lte: sevenDaysFromNow,
        },
      },
    });

    const sevenDaysAgo = subDays(now, 7);
    const fallbackAdmin = await prisma.user.findFirst({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, isActive: true },
      select: { id: true },
    });

    let tripAlertsCount = 0;

    for (const trip of upcomingTrips) {
      if (!fallbackAdmin) continue;

      const existing = await prisma.notification.findFirst({
        where: {
          userId: fallbackAdmin.id,
          type: "TRIP_UPCOMING",
          entityId: trip.id,
          createdAt: { gte: sevenDaysAgo },
        },
      });

      if (!existing) {
        await prisma.notification.create({
          data: {
            userId: fallbackAdmin.id,
            type: "TRIP_UPCOMING",
            title: "Upcoming Trip",
            message: `Trip "${trip.name}" starts on ${new Date(trip.startDate).toLocaleDateString()}.`,
            link: `/dashboard/trips/${trip.id}`,
            entityId: trip.id,
          },
        });
        tripAlertsCount++;
      }
    }

    // 3. Task Due Alerts
    // Find tasks due today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(startOfToday);
    endOfToday.setHours(23, 59, 59, 999);

    const tasksDueToday = await prisma.task.findMany({
      where: {
        deadline: {
          gte: startOfToday,
          lte: endOfToday,
        },
        status: {
          not: "COMPLETED",
        },
      },
    });

    let taskAlertsCount = 0;

    for (const task of tasksDueToday) {
      if (task.userId) {
        // Check for existing notification to avoid duplicates
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: task.userId,
            type: "TASK_DUE",
            entityId: task.id,
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)), // Created today
            },
          },
        });

        if (!existingNotification) {
          await prisma.notification.create({
            data: {
              userId: task.userId,
              type: "TASK_DUE",
              title: "Reminder",
              message: `"${task.topic}" is due today. Please make sure it is completed on time!`,
              link: `/dashboard/tasks?taskId=${task.id}`,
              entityId: task.id,
            },
          });
          taskAlertsCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      // passportAlertsGenerated: passportAlertsCount,
      tripAlertsGenerated: tripAlertsCount,
      taskAlertsGenerated: taskAlertsCount,
    });
  } catch (error) {
    console.error("[CRON_ALERTS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

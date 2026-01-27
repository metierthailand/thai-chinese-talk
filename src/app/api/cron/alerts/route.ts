import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addMonths, addDays, subDays } from "date-fns";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", {
        status: 401,
      });
    }

    // 1. Passport Expiry Alerts
    // Find passports expiring within the next 6 months
    const sixMonthsFromNow = addMonths(new Date(), 6);
    const now = new Date();
    const passports = await prisma.passport.findMany({
      where: {
        expiryDate: {
          lt: sixMonthsFromNow,
          gt: now, // Not already expired
        },
      },
      include: {
        customer: {
          include: {
            leads: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
            bookings: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
              include: {
                salesUser: {
                  select: {
                    id: true,
                  },
                },
                agent: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    let passportAlertsCount = 0;

    for (const passport of passports) {
      // Determine the agent to notify
      // Strategy: 
      // 1. Use agent from most recent lead
      // 2. If no lead, use agent from most recent booking's lead
      // 3. If no booking lead, use agent from most recent interaction
      let agentId: string | undefined;
      
      if (passport.customer.leads.length > 0) {
        agentId = passport.customer.leads[0]?.agentId;
      } else if (passport.customer.bookings.length > 0) {
        const booking = passport.customer.bookings[0];
        // Use salesUser (SALES role) or agent from booking
        agentId = booking.salesUser?.id || booking.agent?.id;
      }

      if (agentId) {
        // Check for existing notification created within the alert window (6 months)
        // This prevents duplicate notifications even if the previous one was read
        const sixMonthsAgo = subDays(now, 180);
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: agentId,
            type: "PASSPORT_EXPIRY",
            entityId: passport.id,
            createdAt: {
              gte: sixMonthsAgo,
            },
          },
        });

        if (!existingNotification) {
          await prisma.notification.create({
            data: {
              userId: agentId,
              type: "PASSPORT_EXPIRY",
              title: "Passport Expiring Soon",
              message: `Passport for ${passport.customer.firstNameEn} ${passport.customer.lastNameEn} expires on ${passport.expiryDate.toLocaleDateString()}`,
              link: `/dashboard/customers/${passport.customer.id}`,
              entityId: passport.id,
            },
          });
          passportAlertsCount++;
        }
      }
    }

    // 2. Trip Upcoming Alerts
    // Find trips starting within the next 7 days
    const sevenDaysFromNow = addDays(now, 7);
    const upcomingTrips = await prisma.trip.findMany({
      where: {
        startDate: {
          lt: sevenDaysFromNow,
          gt: now,
        },
      },
      include: {
        bookings: {
          where: {
            paymentStatus: {
              in: ["DEPOSIT_PAID", "FULLY_PAID"],
            },
          },
          include: {
            customer: {
              include: {
                leads: {
                  orderBy: {
                    createdAt: "desc",
                  },
                  take: 1,
                },
              },
            },
            salesUser: {
              select: {
                id: true,
              },
            },
            agent: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    let tripAlertsCount = 0;

    for (const trip of upcomingTrips) {
      for (const booking of trip.bookings) {
        // Determine the agent to notify
        // Strategy:
        // 1. Use salesUser (SALES role) from booking
        // 2. If no salesUser, use agent from booking
        // 3. If no booking agent, use agent from customer's most recent lead
        let agentId: string | undefined;
        
        if (booking.salesUser?.id) {
          agentId = booking.salesUser.id;
        } else if (booking.agent?.id) {
          agentId = booking.agent.id;
        } else if (booking.customer.leads.length > 0) {
          agentId = booking.customer.leads[0]?.agentId;
        }

        if (agentId) {
          // Check for existing notification created within the alert window (7 days)
          // This prevents duplicate notifications even if the previous one was read
          const sevenDaysAgo = subDays(now, 7);
          const existingNotification = await prisma.notification.findFirst({
            where: {
              userId: agentId,
              type: "TRIP_UPCOMING",
              entityId: booking.id,
              createdAt: {
                gte: sevenDaysAgo,
              },
            },
          });

          if (!existingNotification) {
            await prisma.notification.create({
              data: {
                userId: agentId,
                type: "TRIP_UPCOMING",
                title: "Upcoming Trip",
                message: `Trip "${trip.name}" for ${booking.customer.firstNameEn} ${booking.customer.lastNameEn} starts on ${trip.startDate.toLocaleDateString()}`,
                link: `/dashboard/bookings/${booking.id}/edit`,
                entityId: booking.id,
              },
            });
            tripAlertsCount++;
          }
        }
      }
    }

    // 3. Task Due Alerts
    // Find tasks due tomorrow
    const startOfTomorrowDate = new Date();
    startOfTomorrowDate.setDate(startOfTomorrowDate.getDate() + 1);
    startOfTomorrowDate.setHours(0, 0, 0, 0);

    const endOfTomorrowDate = new Date(startOfTomorrowDate);
    endOfTomorrowDate.setHours(23, 59, 59, 999);

    const tasksDueTomorrow = await prisma.task.findMany({
      where: {
        deadline: {
          gte: startOfTomorrowDate,
          lte: endOfTomorrowDate,
        },
        status: {
          not: "COMPLETED",
        },
      },
    });

    let taskAlertsCount = 0;

    for (const task of tasksDueTomorrow) {
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
              title: "Task Due Soon",
              message: `Reminder: "${task.topic}" is due tomorrow. Please make sure it is completed on time!`,
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
      passportAlertsGenerated: passportAlertsCount,
      tripAlertsGenerated: tripAlertsCount,
      taskAlertsGenerated: taskAlertsCount,
    });
  } catch (error) {
    console.error("[CRON_ALERTS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

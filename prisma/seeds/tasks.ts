import { PrismaClient, TaskStatus, ContactType } from "@prisma/client";

export async function seedTasks(prisma: PrismaClient) {
  // Get existing users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
    take: 5, // Use first 5 users
  });

  // Get existing customers
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      firstNameEn: true,
      lastNameEn: true,
    },
    take: 10, // Use first 10 customers
  });

  if (users.length === 0) {
    console.log("⚠️  No users found. Skipping task seeding.");
    return [];
  }

  // Calculate dates for deadlines
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const tasks = [
    {
      topic: "Follow up with customer about trip inquiry",
      description: "Customer showed interest in Singapore trip, need to call and discuss details",
      deadline: tomorrow,
      status: TaskStatus.TODO,
      contact: ContactType.CALL,
      relatedCustomerId: customers[0]?.id,
      userId: users[0]?.id,
    },
    {
      topic: "Send trip itinerary to customer",
      description: "Prepare and send detailed itinerary for Hong Kong trip",
      deadline: nextWeek,
      status: TaskStatus.IN_PROGRESS,
      contact: ContactType.LINE,
      relatedCustomerId: customers[1]?.id,
      userId: users[0]?.id,
    },
    {
      topic: "Confirm passport details",
      description: "Verify passport expiry date for upcoming trip",
      deadline: tomorrow,
      status: TaskStatus.TODO,
      contact: ContactType.MESSENGER,
      relatedCustomerId: customers[2]?.id,
      userId: users[0]?.id,
    },
    {
      topic: "Collect payment deposit",
      description: "Follow up on deposit payment for Tokyo private tour",
      deadline: nextWeek,
      status: TaskStatus.IN_PROGRESS,
      contact: ContactType.CALL,
      relatedCustomerId: customers[3]?.id,
      userId: users[0]?.id,
    },
    {
      topic: "Update customer information",
      description: "Customer requested to update email address",
      deadline: nextMonth,
      status: TaskStatus.TODO,
      contact: null,
      relatedCustomerId: customers[4]?.id,
      userId: users[0]?.id,
    },
    {
      topic: "Review booking documents",
      description: "Check all documents are complete before trip departure",
      deadline: yesterday,
      status: TaskStatus.COMPLETED,
      contact: null,
      relatedCustomerId: customers[5]?.id,
      userId: users[0]?.id,
    },
    {
      topic: "Send trip reminder",
      description: "Send reminder message 3 days before trip",
      deadline: nextWeek,
      status: TaskStatus.TODO,
      contact: ContactType.LINE,
      relatedCustomerId: customers[6]?.id,
      userId: users[1]?.id || users[0]?.id,
    },
    {
      topic: "Process refund request",
      description: "Handle cancellation and refund for cancelled booking",
      deadline: nextWeek,
      status: TaskStatus.IN_PROGRESS,
      contact: ContactType.CALL,
      relatedCustomerId: customers[7]?.id,
      userId: users[0]?.id,
    },
    {
      topic: "Schedule customer meeting",
      description: "Arrange meeting to discuss custom trip package",
      deadline: nextMonth,
      status: TaskStatus.TODO,
      contact: ContactType.MESSENGER,
      relatedCustomerId: customers[8]?.id,
      userId: users[0]?.id,
    },
    {
      topic: "Update trip availability",
      description: "Check and update available slots for upcoming trips",
      deadline: tomorrow,
      status: TaskStatus.CANCELLED,
      contact: null,
      relatedCustomerId: null,
      userId: users[0]?.id,
    },
    {
      topic: "Prepare travel documents",
      description: "Collect and organize all travel documents for group",
      deadline: nextWeek,
      status: TaskStatus.TODO,
      contact: null,
      relatedCustomerId: customers[9]?.id,
      userId: users[0]?.id,
    },
    {
      topic: "Contact customer about special request",
      description: "Discuss dietary requirements and special accommodations",
      deadline: tomorrow,
      status: TaskStatus.TODO,
      contact: ContactType.CALL,
      relatedCustomerId: customers[0]?.id,
      userId: users[0]?.id,
    },
  ];

  const createdTasks = [];
  for (const taskData of tasks) {
    try {
      // Validate required fields
      if (!taskData.topic || !taskData.userId) {
        console.warn(`⚠️  Skipping task: missing required fields`);
        continue;
      }

      const task = await prisma.task.create({
        data: {
          topic: taskData.topic,
          description: taskData.description || null,
          deadline: taskData.deadline || null,
          status: taskData.status || TaskStatus.TODO,
          contact: taskData.contact || null,
          relatedCustomerId: taskData.relatedCustomerId || null,
          userId: taskData.userId,
        },
      });
      createdTasks.push(task);
    } catch (error) {
      console.warn(`⚠️  Error creating task "${taskData.topic}":`, error);
    }
  }

  console.log(`✅ Seeded ${createdTasks.length} tasks`);
  return createdTasks;
}

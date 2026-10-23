import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

export const createUserNotification = async (input: {
  recipientId: string;
  type: "REQUEST_STATUS" | "EQUIPMENT_OVERDUE" | "SYSTEM";
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  dedupeKey?: string;
}, client: Prisma.TransactionClient | typeof prisma = prisma) => {
  if (input.dedupeKey) {
    return client.notification.upsert({
      where: { dedupeKey: input.dedupeKey },
      update: {},
      create: input
    });
  }
  return client.notification.create({ data: input });
};

export const runOverdueEquipmentNotificationJob = async (now = new Date()) => {
  const issues = await prisma.equipmentIssue.findMany({
    where: {
      expectedReturnAt: { lt: now },
      status: { in: ["ISSUED", "PARTIALLY_RETURNED"] }
    },
    include: { equipment: true, student: { select: { userId: true, user: { select: { fullName: true } } } } }
  });

  let created = 0;
  for (const issue of issues.filter((candidate) => candidate.quantityReturned < candidate.quantity)) {
    try {
      const notification = await createUserNotification({
        recipientId: issue.student.userId,
        type: "EQUIPMENT_OVERDUE",
        title: "Sports Equipment Overdue",
        message: `${issue.equipment.name} (${issue.quantity - issue.quantityReturned} outstanding) was due on ${issue.expectedReturnAt.toLocaleString("en-IN", { timeZone: process.env.APP_TIMEZONE || "Asia/Kolkata" })}. Please return it to the hostel guard.`,
        relatedEntityType: "EquipmentIssue",
        relatedEntityId: issue.id,
        dedupeKey: `equipment-overdue:${issue.id}`
      });
      if (notification.createdAt.getTime() >= now.getTime() - 1000) created += 1;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
  }
  return { inspected: issues.length, created };
};

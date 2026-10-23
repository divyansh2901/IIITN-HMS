import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

type DbClient = PrismaClient | Prisma.TransactionClient;

export const writeAudit = async (
  input: { actorId?: string; action: string; entityType: string; entityId: string; metadata?: Prisma.InputJsonValue },
  client: DbClient = prisma
) => client.auditLog.create({ data: { ...input, metadata: input.metadata ?? undefined } });

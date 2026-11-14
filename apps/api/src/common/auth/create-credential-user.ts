import { prisma } from "../prisma.ts";
import { hashPassword } from "../auth/password.ts";
import type { Prisma, PrismaClient } from "../../generated/prisma/client.ts";

export type Db = PrismaClient | Prisma.TransactionClient;


export async function createCredentialUser(input: {
  name: string;
  email: string;
  password: string;
  department?: string | null;
  phone?: string | null;
  matricNo?: string | null;
  isActive?: boolean;
}, db: Db = prisma) {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);

  const user = await db.user.create({
    data: {
      name: input.name.trim(),
      email,
      emailVerified: false,
      isActive: input.isActive ?? true,
      department: input.department || null,
      phone: input.phone || null,
      matricNo: input.matricNo || null,
    },
  });


  await db.account.create({
    data: {
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: passwordHash,
    },
  });

  return user;
}


export async function revokeSessions(userId: string, db: Db = prisma) {
  await db.session.deleteMany({ where: { userId } });
}

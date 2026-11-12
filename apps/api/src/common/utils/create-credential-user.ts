import { prisma } from "./prisma.ts";
import { hashPassword } from "./password.ts";


export async function createCredentialUser(input: {
  name: string;
  email: string;
  password: string;
  department?: string | null;
  phone?: string | null;
  matricNo?: string | null;
  isActive?: boolean;
}) {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
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

  
  await prisma.account.create({
    data: {
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: passwordHash,
    },
  });

  return user;
}


export async function revokeSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client.ts";
import { createCredentialUser } from "../src/common/auth/create-credential-user.ts";
import {
  DEMO_USER_CREDENTIALS,
  DEMO_CATEGORIES,
  buildDemoRequests,
  demoNotifications,
  demoAuditLogs,
  type DemoUsers,
  type SeedRequest,
} from "./seed-data.ts";

type Db = PrismaClient | Prisma.TransactionClient;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const IF_MISSING = process.argv.includes("--if-missing");
const DEMO_ORG_SLUG = "miva-open-university";
const DEMO_EMAILS = DEMO_USER_CREDENTIALS.map((u) => u.email.toLowerCase());
const ADVISORY_LOCK_ID = BigInt(83330002);

const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 864e5 - h * 36e5);

async function clearExisting(db: Db) {
  console.log("Clearing existing data…");
  await db.notification.deleteMany();
  await db.comment.deleteMany();
  await db.statusLog.deleteMany();
  await db.assignment.deleteMany();
  await db.attachment.deleteMany();
  await db.serviceRequest.deleteMany();
  await db.category.deleteMany();
  await db.auditLog.deleteMany();
  await db.member.deleteMany();
  await db.organization.deleteMany();
  await db.account.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();
}

async function createDemoUsers(db: Db): Promise<DemoUsers> {
  console.log("Creating users…");
  const entries: [string, { id: string }][] = [];
  for (const { key, ...input } of DEMO_USER_CREDENTIALS) {
    entries.push([key, await createCredentialUser(input, db)]);
  }
  return Object.fromEntries(entries) as unknown as DemoUsers;
}

async function createDemoCampus(db: Db, users: DemoUsers) {
  const { admin, officer1, officer2, officer3, staff2, staff3, staff, student } = users;
  console.log("Creating demo campus…");
  const demoOrg = await db.organization.create({
    data: {
      name: "MIVA Open University",
      slug: DEMO_ORG_SLUG,
      code: "MOU",
      memberships: {
        create: [
          { userId: admin.id, role: "ADMIN" },
          { userId: officer1.id, role: "OFFICER" },
          { userId: officer2.id, role: "OFFICER" },
          { userId: officer3.id, role: "OFFICER" },
          { userId: staff2.id, role: "STAFF" },
          { userId: staff3.id, role: "STAFF" },
          { userId: staff.id, role: "STAFF" },
          { userId: student.id, role: "STUDENT" },
        ],
      },
    },
  });
  console.log(`Subdomain: ${demoOrg.slug} · Campus code for signups: ${demoOrg.code}`);
  return demoOrg;
}

async function memberMapFor(db: Db, demoOrgId: string) {
  const members = await db.member.findMany({ where: { organizationId: demoOrgId }, select: { id: true, userId: true } });
  const midMap = new Map(members.map((m) => [m.userId, m.id] as const));
  return (userId: string) => midMap.get(userId)!;
}

type Mid = (userId: string) => string;

async function createCategories(db: Db) {
  console.log("Creating categories…");
  const cats = await Promise.all(DEMO_CATEGORIES.map((c) => db.category.create({ data: c })));
  const [electrical, plumbing, furniture, internet, classroom, hostel, civil] = cats;
  return { cats, electrical, plumbing, furniture, internet, classroom, hostel, civil };
}

function actorForStep(stepTo: string, r: SeedRequest, adminMemberId: string) {
  if (stepTo === "OPEN") return r.creatorId;
  if (stepTo === "REJECTED" || stepTo === "ASSIGNED") return adminMemberId;
  return r.officerId ?? adminMemberId;
}

async function seedStatusLogs(db: Db, reqId: string, r: SeedRequest, created: Date, adminMemberId: string) {
  for (let i = 0; i < r.logFlow.length; i++) {
    const step = r.logFlow[i];
    const actorMemberId = actorForStep(step.to, r, adminMemberId);
    await db.statusLog.create({
      data: {
        requestId: reqId, memberId: actorMemberId,
        fromStatus: i === 0 ? null : r.logFlow[i - 1].to, toStatus: step.to, note: step.note || null,
        createdAt: new Date(created.getTime() + i * 6 * 36e5),
      },
    });
  }
}

async function seedAssignment(db: Db, reqId: string, r: SeedRequest, created: Date, adminMemberId: string) {
  if (!r.officerId) return;
  await db.assignment.create({
    data: {
      requestId: reqId, officerId: r.officerId, assignedById: adminMemberId,
      note: "Please attend to this promptly.",
      isActive: true, createdAt: new Date(created.getTime() + 3 * 36e5),
    },
  });
  await db.serviceRequest.update({ where: { id: reqId }, data: { updatedAt: new Date(created.getTime() + r.logFlow.length * 6 * 36e5) } });
}

async function seedComments(db: Db, reqId: string, r: SeedRequest, mid: Mid) {
  for (const c of r.comments || []) {
    await db.comment.create({ data: { requestId: reqId, memberId: mid(c.userId), body: c.body } });
  }
}

async function seedOneRequest(db: Db, r: SeedRequest, reference: string, demoOrgId: string, mid: Mid, adminMemberId: string) {
  const created = daysAgo(r.createdDaysAgo);
  const req = await db.serviceRequest.create({
    data: {
      reference, title: r.title, description: r.description, location: r.location,
      priority: r.priority, status: r.status, categoryId: r.categoryId, creatorId: r.creatorId,
      organizationId: demoOrgId,
      createdAt: created, updatedAt: created,
    },
  });
  await seedStatusLogs(db, req.id, r, created, adminMemberId);
  await seedAssignment(db, req.id, r, created, adminMemberId);
  await seedComments(db, req.id, r, mid);
}

async function seedRequests(db: Db, seedReqs: SeedRequest[], demoOrgId: string, mid: Mid, users: DemoUsers) {
  const adminMemberId = mid(users.admin.id);
  let seq = 1;
  for (const r of seedReqs) {
    const reference = `SR-${seq++}`;
    await seedOneRequest(db, r, reference, demoOrgId, mid, adminMemberId);
  }
  return seq;
}

async function seedNotifications(db: Db, demoOrgId: string, mid: Mid, users: DemoUsers) {
  console.log("Creating notifications…");
  const notifs = demoNotifications(users);
  for (let i = 0; i < notifs.length; i++) {
    const { recipientId, requestRef, ...rest } = notifs[i];
    const linked = requestRef ? await db.serviceRequest.findFirst({ where: { reference: requestRef }, select: { id: true } }) : null;
    await db.notification.create({ data: { ...rest, requestId: linked?.id, scope: "ORGANIZATION", memberId: mid(recipientId), organizationId: demoOrgId, isRead: i > 2, createdAt: daysAgo(i, 3) } });
  }
}

async function seedAuditLogs(db: Db, demoOrgId: string, mid: Mid, users: DemoUsers) {
  console.log("Creating audit logs…");
  const audits = demoAuditLogs(users);
  for (let i = 0; i < audits.length; i++) {
    const actorId = audits[i].userId as string;
    await db.auditLog.create({ data: { ...audits[i], scope: "ORGANIZATION", memberId: mid(actorId), organizationId: demoOrgId, createdAt: daysAgo(i, 1) } });
  }
}

async function demoDataExists(db: Db) {
  const [emailHits, org] = await Promise.all([
    db.user.count({ where: { email: { in: [...DEMO_EMAILS] } } }),
    db.organization.findUnique({ where: { slug: DEMO_ORG_SLUG }, select: { id: true } }),
  ]);
  return emailHits > 0 || org !== null;
}

async function seedAll(db: Db) {
  const users = await createDemoUsers(db);
  const demoOrg = await createDemoCampus(db, users);
  const mid = await memberMapFor(db, demoOrg.id);
  const { cats, electrical, plumbing, furniture, internet, classroom, hostel, civil } = await createCategories(db);
  const seedReqs = buildDemoRequests({ electrical, plumbing, furniture, internet, classroom, hostel, civil, cleaning: cats[7], mid, users });
  console.log("Creating service requests…");
  const seq = await seedRequests(db, seedReqs, demoOrg.id, mid, users);
  await db.organization.update({ where: { id: demoOrg.id }, data: { nextRequestSeq: seq } });
  await seedNotifications(db, demoOrg.id, mid, users);
  await seedAuditLogs(db, demoOrg.id, mid, users);
  return demoOrg.code;
}

async function printCounts(db: Db) {
  const counts = {
    users: await db.user.count(),
    categories: await db.category.count(),
    requests: await db.serviceRequest.count(),
    logs: await db.statusLog.count(),
    assignments: await db.assignment.count(),
    comments: await db.comment.count(),
  };
  console.log("Seed complete:", JSON.stringify(counts));
}

async function main() {
  const db = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString })) });
  try {
    const code = await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_ID})`;
        if (IF_MISSING) {
          if (await demoDataExists(tx)) {
            console.log("Demo data already present (matched demo emails or campus org) — skipping demo seed.");
            return null;
          }
          console.log("No demo data found — seeding demo campus…");
        } else {
          await clearExisting(tx);
        }
        return seedAll(tx);
      },
      { maxWait: 10_000, timeout: 300_000 },
    );
    if (code) {
      await printCounts(db);
      console.log(`Demo campus code: ${code}`);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();

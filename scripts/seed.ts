/**
 * Seed script — demo accounts and realistic sample data.
 * Run: bun scripts/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 864e5 - h * 36e5);

async function main() {
  console.log("Clearing existing data…");
  await db.auditLog.deleteMany();
  await db.notification.deleteMany();
  await db.comment.deleteMany();
  await db.statusLog.deleteMany();
  await db.attachment.deleteMany();
  await db.assignment.deleteMany();
  await db.serviceRequest.deleteMany();
  await db.category.deleteMany();
  await db.user.deleteMany();

  console.log("Creating users…");
  const admin = await db.user.create({
    data: { name: "Dr. Ngozi Eze", email: "admin@university.edu", passwordHash: hashPassword("Admin@123"), role: "ADMIN", department: "Works & Services", phone: "0803 111 0001" },
  });
  const officer1 = await db.user.create({
    data: { name: "John Okafor", email: "officer1@university.edu", passwordHash: hashPassword("Officer@123"), role: "OFFICER", department: "Electrical Unit", phone: "0803 222 0002" },
  });
  const officer2 = await db.user.create({
    data: { name: "Amina Bello", email: "officer2@university.edu", passwordHash: hashPassword("Officer@123"), role: "OFFICER", department: "Plumbing Unit", phone: "0803 333 0003" },
  });
  const officer3 = await db.user.create({
    data: { name: "Emeka Nwosu", email: "officer3@university.edu", passwordHash: hashPassword("Officer@123"), role: "OFFICER", department: "ICT Support", phone: "0803 444 0004" },
  });
  const student = await db.user.create({
    data: { name: "Chinedu Okoro", email: "student@university.edu", passwordHash: hashPassword("Student@123"), role: "STUDENT", department: "Computer Science", matricNo: "CSC/2021/045", phone: "0803 555 0005" },
  });
  const student2 = await db.user.create({
    data: { name: "Fatima Sule", email: "student2@university.edu", passwordHash: hashPassword("Student@123"), role: "STUDENT", department: "Mass Communication", matricNo: "MAC/2022/113" },
  });
  const staff = await db.user.create({
    data: { name: "Mrs. Funke Adeyemi", email: "staff@university.edu", passwordHash: hashPassword("Student@123"), role: "STAFF", department: "Registry", matricNo: "REG/0092" },
  });

  console.log("Creating categories…");
  const cats = await Promise.all(
    [
      { name: "Electrical Fault", description: "Power outages, faulty sockets, lighting, wiring issues.", icon: "Zap" },
      { name: "Plumbing & Water", description: "Leaking pipes, blocked drains, water supply problems.", icon: "Droplets" },
      { name: "Furniture Damage", description: "Broken desks, chairs, cabinets and lab benches.", icon: "Armchair" },
      { name: "Internet & Network", description: "Wi-Fi outages, LAN ports, slow connectivity.", icon: "Wifi" },
      { name: "Classroom Equipment", description: "Projectors, PA systems, whiteboards, AC units in halls.", icon: "Monitor" },
      { name: "Hostel Maintenance", description: "Hostel rooms, bathrooms, doors, windows and fittings.", icon: "Building2" },
      { name: "Civil & Structural", description: "Walls, roofs, floors, doors and windows in offices/lectures.", icon: "HardHat" },
      { name: "Cleaning & Sanitation", description: "Waste disposal, sanitation and cleaning services.", icon: "SprayCan" },
    ].map((c) => db.category.create({ data: c }))
  );
  const [electrical, plumbing, furniture, internet, classroom, hostel, civil] = cats;

  console.log("Creating service requests…");
  type Req = {
    title: string; description: string; location: string; priority: string;
    status: string; categoryId: string; creatorId: string; createdDaysAgo: number;
    officerId?: string; logFlow: { to: string; note?: string }[]; comments?: { userId: string; body: string }[];
  };

  const seedReqs: Req[] = [
    {
      title: "Power socket sparking in CSC Lab 2",
      description: "The wall socket near the third row of computers sparked when a laptop was plugged in this morning. It smells burnt and we have stopped using that row. This is dangerous and could cause a fire.",
      location: "Science Block C, Room 214", priority: "URGENT", status: "IN_PROGRESS", categoryId: electrical.id, creatorId: student.id, createdDaysAgo: 2, officerId: officer1.id,
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to John Okafor" }, { to: "IN_PROGRESS", note: "Isolated the circuit, sourcing replacement socket" }],
      comments: [{ userId: officer1.id, body: "I inspected the lab. The socket is burnt out — I will replace it tomorrow morning. Please keep that row off until then." }],
    },
    {
      title: "Leaking pipe above toilet ceiling — Block D",
      description: "Water drips from the ceiling of the ground floor toilet whenever the upstairs bathroom is used. The floor is always wet and slippery, students might fall.",
      location: "Faculty of Arts, Block D ground floor", priority: "HIGH", status: "ASSIGNED", categoryId: plumbing.id, creatorId: staff.id, createdDaysAgo: 1, officerId: officer2.id,
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to Amina Bello" }],
      comments: [{ userId: officer2.id, body: "Received. I will come with the plumber tomorrow to trace the leak." }],
    },
    {
      title: "No Wi-Fi in Main Library since Monday",
      description: "The wireless network in the main library has been down since Monday. Final year students cannot do project research. All access points appear offline on the second floor.",
      location: "Main Library, 2nd Floor", priority: "HIGH", status: "RESOLVED", categoryId: internet.id, creatorId: student.id, createdDaysAgo: 5, officerId: officer3.id,
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to Emeka Nwosu" }, { to: "IN_PROGRESS", note: "Traced fault to a failed PoE switch" }, { to: "RESOLVED", note: "Replaced PoE switch and reconfigured access points. All 6 APs back online." }],
      comments: [{ userId: student.id, body: "Confirmed working now, thank you!" }],
    },
    {
      title: "Broken chairs in Lecture Theatre 1",
      description: "At least 8 chairs in LT1 have broken backrests and 3 have broken legs. Students resort to standing during lectures.",
      location: "Lecture Theatre 1, Main Campus", priority: "MEDIUM", status: "OPEN", categoryId: furniture.id, creatorId: student2.id, createdDaysAgo: 1,
      logFlow: [{ to: "OPEN", note: "Request submitted" }],
    },
    {
      title: "Projector not displaying in Auditorium A",
      description: "The projector powers on but shows 'No Signal' from all inputs. HDMI and VGA both tested with two laptops. Department lectures affected this week.",
      location: "Auditorium A", priority: "HIGH", status: "IN_PROGRESS", categoryId: classroom.id, creatorId: staff.id, createdDaysAgo: 3, officerId: officer3.id,
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to Emeka Nwosu" }, { to: "IN_PROGRESS", note: "Suspected mainboard failure; awaiting replacement part from vendor" }],
    },
    {
      title: "Hostel room window cannot lock (Room 47)",
      description: "The window in room 47 slides open freely and cannot lock. Security concern at night as we are on the ground floor facing the car park.",
      location: "Moremi Hostel, Ground Floor, Room 47", priority: "HIGH", status: "ON_HOLD", categoryId: hostel.id, creatorId: student.id, createdDaysAgo: 6, officerId: officer2.id,
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to Amina Bello" }, { to: "IN_PROGRESS", note: "Measured frame; needs custom lock fitting" }, { to: "ON_HOLD", note: "Waiting for locksmith availability next week" }],
      comments: [{ userId: student.id, body: "Any update on this please? It's getting cold at night." }, { userId: officer2.id, body: "Locksmith is booked for Monday. Sorry for the delay." }],
    },
    {
      title: "Corridor lights out — Science Block B (2nd floor)",
      description: "All fluorescent lights on the second floor corridor are off. The corridor is very dark in the morning and evening.",
      location: "Science Block B, 2nd Floor Corridor", priority: "MEDIUM", status: "RESOLVED", categoryId: electrical.id, creatorId: staff.id, createdDaysAgo: 9, officerId: officer1.id,
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to John Okafor" }, { to: "IN_PROGRESS", note: "Faulty breaker tripping the floor circuit" }, { to: "RESOLVED", note: "Replaced breaker and 6 tubes." }],
    },
    {
      title: "Blocked sink in Staff Common Room",
      description: "The kitchenette sink drains very slowly and now overflows when the kettle area is washed. Suspect grease blockage.",
      location: "Registry Building, Staff Common Room", priority: "LOW", status: "CLOSED", categoryId: plumbing.id, creatorId: staff.id, createdDaysAgo: 14, officerId: officer2.id,
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to Amina Bello" }, { to: "IN_PROGRESS", note: "Cleared trap with drain machine" }, { to: "RESOLVED", note: "Drain cleared and flushed." }, { to: "CLOSED", note: "Confirmed fixed by requester" }],
    },
    {
      title: "Classroom door lock broken — Room 108",
      description: "The door to room 108 cannot be locked after classes. Projector and podium equipment are inside overnight.",
      location: "Management Science Block, Room 108", priority: "HIGH", status: "ASSIGNED", categoryId: civil.id, creatorId: staff.id, createdDaysAgo: 2, officerId: officer1.id,
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to John Okafor" }],
    },
    {
      title: "Air conditioner dripping in Exams & Records office",
      description: "The split AC above the records shelves drips water onto the wall and carpet. Files are at risk of water damage.",
      location: "Exams & Records, Room 12", priority: "URGENT", status: "OPEN", categoryId: classroom.id, creatorId: staff.id, createdDaysAgo: 0,
      logFlow: [{ to: "OPEN", note: "Request submitted" }],
    },
    {
      title: "Desk in Room 305 has sharp protruding nail",
      description: "A nail is protruding from the desk near the window; two students have scratched their arms on it already.",
      location: "Arts Block A, Room 305", priority: "MEDIUM", status: "RESOLVED", categoryId: furniture.id, creatorId: student2.id, createdDaysAgo: 11, officerId: officer1.id,
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to John Okafor" }, { to: "IN_PROGRESS", note: "Hammered nail flat and sanded the edge" }, { to: "RESOLVED", note: "Nail removed and desk smoothed." }],
    },
    {
      title: "Bin overflowing behind Faculty of Science",
      description: "The waste bins behind the faculty have not been collected for over a week. Smell is affecting the nearby classrooms.",
      location: "Behind Faculty of Science", priority: "MEDIUM", status: "IN_PROGRESS", categoryId: cats[7].id, creatorId: student2.id, createdDaysAgo: 4, officerId: officer2.id,
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to Amina Bello" }, { to: "IN_PROGRESS", note: "Scheduled extra collection with waste contractor" }],
    },
    {
      title: "Hostel borehole pump not pumping",
      description: "No water from the borehole since yesterday evening. Over 200 students affected on the hostel block.",
      location: "Male Hostel Quadrangle", priority: "URGENT", status: "ASSIGNED", categoryId: plumbing.id, creatorId: student.id, createdDaysAgo: 1, officerId: officer2.id,
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to Amina Bello" }],
      comments: [{ userId: officer2.id, body: "Checking the pump control panel this afternoon." }],
    },
    {
      title: "Printer in Departmental Office jamming",
      description: "The office printer jams on every second page. We cannot print course materials for students.",
      location: "Computer Science Departmental Office", priority: "LOW", status: "REJECTED", categoryId: internet.id, creatorId: student.id, createdDaysAgo: 8,
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "REJECTED", note: "Departmental printer is serviced by vendor contract, not facility maintenance. Redirected to ICT services." }],
    },
  ];

  const year = new Date().getFullYear();
  let seq = 1;
  for (const r of seedReqs) {
    const created = daysAgo(r.createdDaysAgo);
    const reference = `SR-${year}-${String(seq++).padStart(4, "0")}`;
    const req = await db.serviceRequest.create({
      data: {
        reference, title: r.title, description: r.description, location: r.location,
        priority: r.priority, status: r.status, categoryId: r.categoryId, creatorId: r.creatorId,
        createdAt: created, updatedAt: created,
      },
    });

    for (let i = 0; i < r.logFlow.length; i++) {
      const step = r.logFlow[i];
      const actor = step.to === "OPEN" ? r.creatorId : step.to === "REJECTED" ? admin.id : step.to === "ASSIGNED" ? admin.id : r.officerId || admin.id;
      await db.statusLog.create({
        data: {
          requestId: req.id, userId: actor,
          fromStatus: i === 0 ? null : r.logFlow[i - 1].to, toStatus: step.to, note: step.note || null,
          createdAt: new Date(created.getTime() + i * 6 * 36e5),
        },
      });
    }

    if (r.officerId) {
      await db.assignment.create({
        data: {
          requestId: req.id, officerId: r.officerId, assignedById: admin.id,
          note: "Please attend to this promptly.",
          isActive: true, createdAt: new Date(created.getTime() + 3 * 36e5),
        },
      });
      await db.serviceRequest.update({ where: { id: req.id }, data: { updatedAt: new Date(created.getTime() + r.logFlow.length * 6 * 36e5) } });
    }

    for (const c of r.comments || []) {
      await db.comment.create({ data: { requestId: req.id, userId: c.userId, body: c.body } });
    }
  }

  console.log("Creating notifications…");
  const notifs = [
    { userId: student.id, title: `Request SR-${year}-0001 is now In Progress`, message: "Status changed from Assigned to In Progress. Note: Isolated the circuit, sourcing replacement socket", type: "STATUS" },
    { userId: student.id, title: `Request SR-${year}-0003 is now Resolved`, message: "Status changed from In Progress to Resolved. Note: Replaced PoE switch and reconfigured access points.", type: "SUCCESS" },
    { userId: officer1.id, title: `New assignment: SR-${year}-0001`, message: 'You have been assigned "Power socket sparking in CSC Lab 2" at Science Block C, Room 214 (URGENT priority).', type: "ASSIGNMENT" },
    { userId: officer2.id, title: `New assignment: SR-${year}-0013`, message: 'You have been assigned "Hostel borehole pump not pumping" (URGENT priority).', type: "ASSIGNMENT" },
    { userId: admin.id, title: `New URGENT request SR-${year}-0010`, message: 'Mrs. Funke Adeyemi reported "Air conditioner dripping in Exams & Records office".', type: "WARNING" },
  ];
  for (let i = 0; i < notifs.length; i++) {
    await db.notification.create({ data: { ...notifs[i], isRead: i > 2, createdAt: daysAgo(i, 3) } });
  }

  console.log("Creating audit logs…");
  const audits = [
    { userId: admin.id, action: "USER_LOGIN", entityType: "AUTH", details: "Dr. Ngozi Eze signed in" },
    { userId: student.id, action: "REQUEST_CREATED", entityType: "REQUEST", details: `Chinedu Okoro submitted SR-${year}-0001 (Electrical Fault)` },
    { userId: admin.id, action: "REQUEST_ASSIGNED", entityType: "REQUEST", details: `Dr. Ngozi Eze assigned SR-${year}-0001 to John Okafor` },
    { userId: officer1.id, action: "REQUEST_STATUS_CHANGED", entityType: "REQUEST", details: "John Okafor set SR-" + year + "-0001: ASSIGNED → IN_PROGRESS" },
    { userId: officer3.id, action: "REQUEST_STATUS_CHANGED", entityType: "REQUEST", details: `Emeka Nwosu set SR-${year}-0003: IN_PROGRESS → RESOLVED` },
    { userId: admin.id, action: "DATA_EXPORTED", entityType: "REQUEST", details: `Dr. Ngozi Eze exported 14 request(s) to CSV` },
  ];
  for (let i = 0; i < audits.length; i++) {
    await db.auditLog.create({ data: { ...audits[i], createdAt: daysAgo(i, 1) } });
  }

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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

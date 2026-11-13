export type DemoUsers = Record<
  "admin" | "officer1" | "officer2" | "officer3" | "staff2" | "staff3" | "staff" | "student",
  { id: string }
>;

export const DEMO_USER_CREDENTIALS = [
  { key: "admin", name: "Dr. Ngozi Eze", email: "admin@university.edu", password: "Admin@123", department: "Works & Services", phone: "0803 111 0001" },
  { key: "officer1", name: "John Okafor", email: "officer1@university.edu", password: "Officer@123", department: "Electrical Unit", phone: "0803 222 0002" },
  { key: "officer2", name: "Amina Bello", email: "officer2@university.edu", password: "Officer@123", department: "Plumbing Unit", phone: "0803 333 0003" },
  { key: "officer3", name: "Emeka Nwosu", email: "officer3@university.edu", password: "Officer@123", department: "ICT Support", phone: "0803 444 0004" },
  { key: "staff2", name: "Chinedu Okoro", email: "staff2@university.edu", password: "Staff@123", department: "Computer Science", matricNo: "MOU/0001", phone: "0803 555 0005" },
  { key: "staff3", name: "Fatima Sule", email: "staff3@university.edu", password: "Staff@123", department: "Mass Communication", matricNo: "MOU/0002" },
  { key: "staff", name: "Mrs. Funke Adeyemi", email: "staff@university.edu", password: "Staff@123", department: "Registry", matricNo: "MOU/0003" },
  { key: "student", name: "Tobi Adebisi", email: "student@university.edu", password: "Student@123", department: "Computer Science", matricNo: "MOU/S0001", phone: "0803 666 0006" },
] as const;

export const DEMO_CATEGORIES = [
  { name: "Electrical Fault", description: "Power outages, faulty sockets, lighting, wiring issues.", icon: "Zap" },
  { name: "Plumbing & Water", description: "Leaking pipes, blocked drains, water supply problems.", icon: "Droplets" },
  { name: "Furniture Damage", description: "Broken desks, chairs, cabinets and lab benches.", icon: "Armchair" },
  { name: "Internet & Network", description: "Wi-Fi outages, LAN ports, slow connectivity.", icon: "Wifi" },
  { name: "Classroom Equipment", description: "Projectors, PA systems, whiteboards, AC units in halls.", icon: "Monitor" },
  { name: "Hostel Works", description: "Hostel rooms, bathrooms, doors, windows and fittings.", icon: "Building2" },
  { name: "Civil & Structural", description: "Walls, roofs, floors, doors and windows in offices/lectures.", icon: "HardHat" },
  { name: "Cleaning & Sanitation", description: "Waste disposal, sanitation and cleaning services.", icon: "SprayCan" },
];

export type SeedRequest = {
  title: string; description: string; location: string; priority: string;
  status: string; categoryId: string; creatorId: string; createdDaysAgo: number;
  officerId?: string; logFlow: { to: string; note?: string }[]; comments?: { userId: string; body: string }[];
};

export function buildDemoRequests({ electrical, plumbing, furniture, internet, classroom, hostel, civil, cleaning, mid, users }: {
  electrical: { id: string };
  plumbing: { id: string };
  furniture: { id: string };
  internet: { id: string };
  classroom: { id: string };
  hostel: { id: string };
  civil: { id: string };
  cleaning: { id: string };
  mid: (userId: string) => string;
  users: DemoUsers;
}): SeedRequest[] {
  const { staff, staff2, staff3, officer1, officer2, officer3 } = users;
  return [
    {
      title: "Power socket sparking in CSC Lab 2",
      description: "The wall socket near the third row of computers sparked when a laptop was plugged in this morning. It smells burnt and we have stopped using that row. This is dangerous and could cause a fire.",
      location: "Science Block C, Room 214", priority: "URGENT", status: "IN_PROGRESS", categoryId: electrical.id, creatorId: mid(staff2.id), createdDaysAgo: 2, officerId: mid(officer1.id),
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to John Okafor" }, { to: "IN_PROGRESS", note: "Isolated the circuit, sourcing replacement socket" }],
      comments: [{ userId: officer1.id, body: "I inspected the lab. The socket is burnt out. I will replace it tomorrow morning. Please keep that row off until then." }],
    },
    {
      title: "Leaking pipe above toilet ceiling, Block D",
      description: "Water drips from the ceiling of the ground floor toilet whenever the upstairs bathroom is used. The floor is always wet and slippery, students might fall.",
      location: "Faculty of Arts, Block D ground floor", priority: "HIGH", status: "ASSIGNED", categoryId: plumbing.id, creatorId: mid(staff.id), createdDaysAgo: 1, officerId: mid(officer2.id),
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to Amina Bello" }],
      comments: [{ userId: officer2.id, body: "Received. I will come with the plumber tomorrow to trace the leak." }],
    },
    {
      title: "No Wi-Fi in Main Library since Monday",
      description: "The wireless network in the main library has been down since Monday. Final year students cannot do project research. All access points appear offline on the second floor.",
      location: "Main Library, 2nd Floor", priority: "HIGH", status: "RESOLVED", categoryId: internet.id, creatorId: mid(staff2.id), createdDaysAgo: 5, officerId: mid(officer3.id),
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to Emeka Nwosu" }, { to: "IN_PROGRESS", note: "Traced fault to a failed PoE switch" }, { to: "RESOLVED", note: "Replaced PoE switch and reconfigured access points. All 6 APs back online." }],
      comments: [{ userId: staff2.id, body: "Confirmed working now, thank you!" }],
    },
    {
      title: "Broken chairs in Lecture Theatre 1",
      description: "At least 8 chairs in LT1 have broken backrests and 3 have broken legs. Students resort to standing during lectures.",
      location: "Lecture Theatre 1, Main Campus", priority: "MEDIUM", status: "OPEN", categoryId: furniture.id, creatorId: mid(staff3.id), createdDaysAgo: 1,
      logFlow: [{ to: "OPEN", note: "Request submitted" }],
    },
    {
      title: "Projector not displaying in Auditorium A",
      description: "The projector powers on but shows 'No Signal' from all inputs. HDMI and VGA both tested with two laptops. Department lectures affected this week.",
      location: "Auditorium A", priority: "HIGH", status: "IN_PROGRESS", categoryId: classroom.id, creatorId: mid(staff.id), createdDaysAgo: 3, officerId: mid(officer3.id),
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to Emeka Nwosu" }, { to: "IN_PROGRESS", note: "Suspected mainboard failure; awaiting replacement part from vendor" }],
    },
    {
      title: "Hostel room window cannot lock (Room 47)",
      description: "The window in room 47 slides open freely and cannot lock. Security concern at night as we are on the ground floor facing the car park.",
      location: "Moremi Hostel, Ground Floor, Room 47", priority: "HIGH", status: "ON_HOLD", categoryId: hostel.id, creatorId: mid(staff2.id), createdDaysAgo: 6, officerId: mid(officer2.id),
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to Amina Bello" }, { to: "IN_PROGRESS", note: "Measured frame; needs custom lock fitting" }, { to: "ON_HOLD", note: "Waiting for locksmith availability next week" }],
      comments: [{ userId: staff2.id, body: "Any update on this please? It's getting cold at night." }, { userId: officer2.id, body: "Locksmith is booked for Monday. Sorry for the delay." }],
    },
    {
      title: "Corridor lights out, Science Block B (2nd floor)",
      description: "All fluorescent lights on the second floor corridor are off. The corridor is very dark in the morning and evening.",
      location: "Science Block B, 2nd Floor Corridor", priority: "MEDIUM", status: "RESOLVED", categoryId: electrical.id, creatorId: mid(staff.id), createdDaysAgo: 9, officerId: mid(officer1.id),
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to John Okafor" }, { to: "IN_PROGRESS", note: "Faulty breaker tripping the floor circuit" }, { to: "RESOLVED", note: "Replaced breaker and 6 tubes." }],
    },
    {
      title: "Blocked sink in Staff Common Room",
      description: "The kitchenette sink drains very slowly and now overflows when the kettle area is washed. Suspect grease blockage.",
      location: "Registry Building, Staff Common Room", priority: "LOW", status: "CLOSED", categoryId: plumbing.id, creatorId: mid(staff.id), createdDaysAgo: 14, officerId: mid(officer2.id),
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to Amina Bello" }, { to: "IN_PROGRESS", note: "Cleared trap with drain machine" }, { to: "RESOLVED", note: "Drain cleared and flushed." }, { to: "CLOSED", note: "Confirmed fixed by requester" }],
    },
    {
      title: "Classroom door lock broken, Room 108",
      description: "The door to room 108 cannot be locked after classes. Projector and podium equipment are inside overnight.",
      location: "Management Science Block, Room 108", priority: "HIGH", status: "ASSIGNED", categoryId: civil.id, creatorId: mid(staff.id), createdDaysAgo: 2, officerId: mid(officer1.id),
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to John Okafor" }],
    },
    {
      title: "Air conditioner dripping in Exams & Records office",
      description: "The split AC above the records shelves drips water onto the wall and carpet. Files are at risk of water damage.",
      location: "Exams & Records, Room 12", priority: "URGENT", status: "OPEN", categoryId: classroom.id, creatorId: mid(staff.id), createdDaysAgo: 0,
      logFlow: [{ to: "OPEN", note: "Request submitted" }],
    },
    {
      title: "Desk in Room 305 has sharp protruding nail",
      description: "A nail is protruding from the desk near the window; two students have scratched their arms on it already.",
      location: "Arts Block A, Room 305", priority: "MEDIUM", status: "RESOLVED", categoryId: furniture.id, creatorId: mid(staff3.id), createdDaysAgo: 11, officerId: mid(officer1.id),
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to John Okafor" }, { to: "IN_PROGRESS", note: "Hammered nail flat and sanded the edge" }, { to: "RESOLVED", note: "Nail removed and desk smoothed." }],
    },
    {
      title: "Bin overflowing behind Faculty of Science",
      description: "The waste bins behind the faculty have not been collected for over a week. Smell is affecting the nearby classrooms.",
      location: "Behind Faculty of Science", priority: "MEDIUM", status: "IN_PROGRESS", categoryId: cleaning.id, creatorId: mid(staff3.id), createdDaysAgo: 4, officerId: mid(officer2.id),
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to Amina Bello" }, { to: "IN_PROGRESS", note: "Scheduled extra collection with waste contractor" }],
    },
    {
      title: "Hostel borehole pump not pumping",
      description: "No water from the borehole since yesterday evening. Over 200 students affected on the hostel block.",
      location: "Male Hostel Quadrangle", priority: "URGENT", status: "ASSIGNED", categoryId: plumbing.id, creatorId: mid(staff2.id), createdDaysAgo: 1, officerId: mid(officer2.id),
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "ASSIGNED", note: "Assigned to Amina Bello" }],
      comments: [{ userId: officer2.id, body: "Checking the pump control panel this afternoon." }],
    },
    {
      title: "Printer in Departmental Office jamming",
      description: "The office printer jams on every second page. We cannot print course materials for students.",
      location: "Computer Science Departmental Office", priority: "LOW", status: "REJECTED", categoryId: internet.id, creatorId: mid(staff2.id), createdDaysAgo: 8,
      logFlow: [{ to: "OPEN", note: "Request submitted" }, { to: "REJECTED", note: "Departmental printer is serviced by vendor contract, not facility maintenance. Redirected to ICT services." }],
    },
  ];
}

export function demoNotifications(users: DemoUsers) {
  const { staff2, officer1, officer2, admin } = users;
  return [
    { recipientId: staff2.id, requestRef: `SR-1`, title: `Request SR-1 is now In progress`, message: "Status changed from Assigned to In progress. Note: Isolated the circuit, sourcing replacement socket", type: "STATUS" },
    { recipientId: staff2.id, requestRef: `SR-3`, title: `Request SR-3 is now Resolved`, message: "Status changed from In progress to Resolved. Note: Replaced PoE switch and reconfigured access points.", type: "SUCCESS" },
    { recipientId: officer1.id, requestRef: `SR-1`, title: `New assignment: SR-1`, message: 'You have been assigned "Power socket sparking in CSC Lab 2" at Science Block C, Room 214 (URGENT priority).', type: "ASSIGNMENT" },
    { recipientId: officer2.id, requestRef: `SR-13`, title: `New assignment: SR-13`, message: 'You have been assigned "Hostel borehole pump not pumping" (URGENT priority).', type: "ASSIGNMENT" },
    { recipientId: admin.id, requestRef: `SR-10`, title: `New URGENT request SR-10`, message: 'Mrs. Funke Adeyemi reported "Air conditioner dripping in Exams & Records office".', type: "WARNING" },
  ];
}

export function demoAuditLogs(users: DemoUsers) {
  const { staff2, officer1, officer3, admin } = users;
  return [
    { userId: admin.id, action: "USER_LOGIN", entityType: "AUTH", details: "Dr. Ngozi Eze signed in" },
    { userId: staff2.id, action: "REQUEST_CREATED", entityType: "REQUEST", details: `Chinedu Okoro submitted SR-1 (Electrical Fault)` },
    { userId: admin.id, action: "REQUEST_ASSIGNED", entityType: "REQUEST", details: `Dr. Ngozi Eze assigned SR-1 to John Okafor` },
    { userId: officer1.id, action: "REQUEST_STATUS_CHANGED", entityType: "REQUEST", details: `John Okafor set SR-1: ASSIGNED → IN_PROGRESS` },
    { userId: officer3.id, action: "REQUEST_STATUS_CHANGED", entityType: "REQUEST", details: `Emeka Nwosu set SR-3: IN_PROGRESS → RESOLVED` },
    { userId: admin.id, action: "DATA_EXPORTED", entityType: "REQUEST", details: `Dr. Ngozi Eze exported 14 request(s) to CSV` },
  ];
}

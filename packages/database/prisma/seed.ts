import { PrismaClient, RoomType, Weekday } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const PASSWORD = 'Password123!';
const TERM = 'Fall 2026';

// Weekdays classes run (Mon–Fri; the admin generator may also use Sat).
const DAYS: Weekday[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const SLOT_LENGTH_MIN = 90;

// ─────────────────────────────────────────────────────────────
// SMALL HELPERS
// ─────────────────────────────────────────────────────────────
function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
function overlaps(aS: string, aE: string, bS: string, bE: string) {
  return toMinutes(aS) < toMinutes(bE) && toMinutes(aE) > toMinutes(bS);
}
function buildTimeGrid(start: string, end: string) {
  const slots: { start: string; end: string }[] = [];
  let cursor = toMinutes(start);
  const endMin = toMinutes(end);
  while (cursor + SLOT_LENGTH_MIN <= endMin) {
    const s = cursor;
    const e = cursor + SLOT_LENGTH_MIN;
    slots.push({
      start: `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`,
      end: `${String(Math.floor(e / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`,
    });
    cursor += SLOT_LENGTH_MIN;
  }
  return slots;
}

// ─────────────────────────────────────────────────────────────
// DB RESET — wipe every row (children first) so re-seeding is clean
// and idempotent instead of stacking stale rows on top of old data.
// ─────────────────────────────────────────────────────────────
async function resetDatabase() {
  await prisma.timetableSlot.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.bookReservation.deleteMany();
  await prisma.book.deleteMany();
  await prisma.libraryClearance.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.request.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.enrollmentSchedule.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.section.deleteMany();
  await prisma.student.deleteMany();
  await prisma.course.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.librarian.deleteMany();
  await prisma.user.deleteMany();
  await prisma.room.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.block.deleteMany();
  await prisma.department.deleteMany();
}

// ─────────────────────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { name: 'Software Engineering', code: 'SE', dayStartTime: '08:00', dayEndTime: '16:00' },
  { name: 'Computer Science', code: 'CS', dayStartTime: '08:00', dayEndTime: '16:00' },
  { name: 'Electrical Engineering', code: 'EE', dayStartTime: '09:00', dayEndTime: '17:00' },
  { name: 'Data Science', code: 'DS', dayStartTime: '08:30', dayEndTime: '16:30' },
];

async function seedDepartments() {
  for (const d of DEPARTMENTS) {
    await prisma.department.create({ data: d });
  }
  console.log(`Seeded ${DEPARTMENTS.length} departments.`);
}

// ─────────────────────────────────────────────────────────────
// BLOCKS / FLOORS / ROOMS
// ─────────────────────────────────────────────────────────────
const BLOCKS: { name: string; floors: number; roomsPerFloor: number }[] = [
  { name: 'A', floors: 3, roomsPerFloor: 5 },
  { name: 'B', floors: 3, roomsPerFloor: 5 },
  { name: 'C', floors: 2, roomsPerFloor: 4 },
  { name: 'D', floors: 2, roomsPerFloor: 4 },
  { name: 'E', floors: 2, roomsPerFloor: 4 },
  { name: 'F', floors: 2, roomsPerFloor: 4 },
  { name: 'H', floors: 2, roomsPerFloor: 4 },
  { name: 'J', floors: 1, roomsPerFloor: 3 },
  { name: 'K', floors: 1, roomsPerFloor: 3 },
];

async function seedBlocks() {
  for (const b of BLOCKS) {
    const block = await prisma.block.create({ data: { name: b.name } });
    for (let floorNumber = 0; floorNumber < b.floors; floorNumber++) {
      const floor = await prisma.floor.create({ data: { blockId: block.id, floorNumber } });
      for (let i = 1; i <= b.roomsPerFloor; i++) {
        const label = `${b.name}${floorNumber * b.roomsPerFloor + i}`;
        const type: RoomType = i === b.roomsPerFloor ? 'LAB' : 'LECTURE_HALL';
        await prisma.room.create({
          data: { floorId: floor.id, label, capacity: type === 'LAB' ? 40 : 50, type },
        });
      }
    }
  }
  console.log(`Seeded ${BLOCKS.length} blocks with floors and rooms.`);
}

// ─────────────────────────────────────────────────────────────
// USERS: admin, librarian, teachers, students
// ─────────────────────────────────────────────────────────────
const TEACHERS_BY_DEPT: Record<string, { email: string; designation: string }[]> = {
  SE: [
    { email: 'teacher@cust.edu.pk', designation: 'Associate Professor' },
    { email: 'ayesha.sheikh@cust.edu.pk', designation: 'Lecturer' },
    { email: 'bilal.khan@cust.edu.pk', designation: 'Assistant Professor' },
  ],
  CS: [
    { email: 'dr.saima.javed@cust.edu.pk', designation: 'Assistant Professor' },
    { email: 'hira.shahid@cust.edu.pk', designation: 'Lecturer' },
    { email: 'dr.muhammad.ali@cust.edu.pk', designation: 'Professor' },
  ],
  EE: [
    { email: 'dr.usman.aslam@cust.edu.pk', designation: 'Professor' },
    { email: 'maryam.farooq@cust.edu.pk', designation: 'Lecturer' },
    { email: 'tariq.mehmood@cust.edu.pk', designation: 'Assistant Professor' },
  ],
  DS: [
    { email: 'dr.kanwal.abbas@cust.edu.pk', designation: 'Assistant Professor' },
    { email: 'saad.hussain@cust.edu.pk', designation: 'Lecturer' },
    { email: 'noor.fatima@cust.edu.pk', designation: 'Lecturer' },
  ],
};

const STUDENTS_BY_DEPT: Record<string, { email: string; enrollmentNo: string; semester: number }[]> = {
  SE: [
    { email: 'student@cust.edu.pk', enrollmentNo: 'BSE23001', semester: 1 },
    { email: 'fatima.khan@cust.edu.pk', enrollmentNo: 'BSE23002', semester: 1 },
    { email: 'usman.tariq@cust.edu.pk', enrollmentNo: 'BSE23003', semester: 3 },
    { email: 'zainab.malik@cust.edu.pk', enrollmentNo: 'BSE23004', semester: 3 },
    { email: 'hamza.sheikh@cust.edu.pk', enrollmentNo: 'BSE23005', semester: 5 },
    { email: 'ayesha.siddiqui@cust.edu.pk', enrollmentNo: 'BSE23006', semester: 5 },
    { email: 'omar.butt@cust.edu.pk', enrollmentNo: 'BSE23007', semester: 7 },
    { email: 'mahnoor.raza@cust.edu.pk', enrollmentNo: 'BSE23008', semester: 7 },
  ],
  CS: [
    { email: 'danish.ahmed@cust.edu.pk', enrollmentNo: 'BSCS23001', semester: 1 },
    { email: 'minahil.tariq@cust.edu.pk', enrollmentNo: 'BSCS23002', semester: 1 },
    { email: 'shahzaib.raza@cust.edu.pk', enrollmentNo: 'BSCS23003', semester: 3 },
    { email: 'laiba.arshad@cust.edu.pk', enrollmentNo: 'BSCS23004', semester: 3 },
    { email: 'ali.nawaz@cust.edu.pk', enrollmentNo: 'BSCS23005', semester: 5 },
    { email: 'sana.ullah@cust.edu.pk', enrollmentNo: 'BSCS23006', semester: 5 },
    { email: 'rehan.javed@cust.edu.pk', enrollmentNo: 'BSCS23007', semester: 7 },
    { email: 'iqra.naseem@cust.edu.pk', enrollmentNo: 'BSCS23008', semester: 7 },
  ],
  EE: [
    { email: 'saad.kamran@cust.edu.pk', enrollmentNo: 'BSEE23001', semester: 1 },
    { email: 'hifza.amjad@cust.edu.pk', enrollmentNo: 'BSEE23002', semester: 1 },
    { email: 'arham.qureshi@cust.edu.pk', enrollmentNo: 'BSEE23003', semester: 3 },
    { email: 'anaya.khan@cust.edu.pk', enrollmentNo: 'BSEE23004', semester: 3 },
    { email: 'fahad.mirza@cust.edu.pk', enrollmentNo: 'BSEE23005', semester: 5 },
    { email: 'rabia.zafar@cust.edu.pk', enrollmentNo: 'BSEE23006', semester: 5 },
    { email: 'daniyal.khan@cust.edu.pk', enrollmentNo: 'BSEE23007', semester: 7 },
    { email: 'roshni.anwar@cust.edu.pk', enrollmentNo: 'BSEE23008', semester: 7 },
  ],
  DS: [
    { email: 'ehtesham.ali@cust.edu.pk', enrollmentNo: 'BSDS23001', semester: 1 },
    { email: 'maham.tariq@cust.edu.pk', enrollmentNo: 'BSDS23002', semester: 1 },
    { email: 'subhan.ahmed@cust.edu.pk', enrollmentNo: 'BSDS23003', semester: 3 },
    { email: 'umaiza.siddiqui@cust.edu.pk', enrollmentNo: 'BSDS23004', semester: 3 },
    { email: 'waleed.khan@cust.edu.pk', enrollmentNo: 'BSDS23005', semester: 5 },
    { email: 'anum.fareed@cust.edu.pk', enrollmentNo: 'BSDS23006', semester: 5 },
    { email: 'junaid.haider@cust.edu.pk', enrollmentNo: 'BSDS23007', semester: 7 },
    { email: 'zara.batool@cust.edu.pk', enrollmentNo: 'BSDS23008', semester: 7 },
  ],
};

async function seedUsers(adminUser: { id: string }, librarianUser: { id: string }) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // admin
  await prisma.admin.create({ data: { userId: adminUser.id } });
  await prisma.user.update({ where: { id: adminUser.id }, data: { passwordHash, role: 'ADMIN' } });

  // librarian
  await prisma.librarian.create({ data: { userId: librarianUser.id } });
  await prisma.user.update({ where: { id: librarianUser.id }, data: { passwordHash, role: 'LIBRARIAN' } });

  const teachers: { id: string; departmentId: string; email: string }[] = [];
  for (const dept of await prisma.department.findMany()) {
    for (const t of TEACHERS_BY_DEPT[dept.code] ?? []) {
      const user = await prisma.user.create({
        data: { email: t.email, passwordHash, role: 'TEACHER' },
      });
      const teacher = await prisma.teacher.create({
        data: { userId: user.id, departmentId: dept.id, designation: t.designation },
      });
      teachers.push({ id: teacher.id, departmentId: dept.id, email: t.email });
    }
  }

  const students: { id: string; departmentId: string; email: string; semester: number }[] = [];
  for (const dept of await prisma.department.findMany()) {
    for (const s of STUDENTS_BY_DEPT[dept.code] ?? []) {
      const user = await prisma.user.create({
        data: { email: s.email, passwordHash, role: 'STUDENT' },
      });
      const student = await prisma.student.create({
        data: { userId: user.id, enrollmentNo: s.enrollmentNo, departmentId: dept.id, semester: s.semester },
      });
      students.push({ id: student.id, departmentId: dept.id, email: s.email, semester: s.semester });
    }
  }

  console.log(`Seeded 1 admin, 1 librarian, ${teachers.length} teachers, ${students.length} students.`);
  return { teachers, students };
}

// ─────────────────────────────────────────────────────────────
// COURSES + SECTIONS
// ─────────────────────────────────────────────────────────────
const COURSES_BY_DEPT: Record<string, { code: string; title: string; ch: number; lab: boolean }[]> = {
  SE: [
    { code: 'SE101', title: 'Programming Fundamentals', ch: 4, lab: true },
    { code: 'SE102', title: 'Discrete Structures', ch: 3, lab: false },
    { code: 'SE2101', title: 'Object Oriented Programming', ch: 4, lab: true },
    { code: 'SE3102', title: 'Software Requirements Engineering', ch: 3, lab: false },
    { code: 'SE3201', title: 'Database Systems', ch: 4, lab: true },
    { code: 'SE4101', title: 'Software Project Management', ch: 3, lab: false },
  ],
  CS: [
    { code: 'CS101', title: 'Introduction to Computing', ch: 3, lab: false },
    { code: 'CS2101', title: 'Data Structures & Algorithms', ch: 4, lab: true },
    { code: 'CS3102', title: 'Operating Systems', ch: 3, lab: false },
    { code: 'CS3201', title: 'Computer Networks', ch: 4, lab: true },
    { code: 'CS4101', title: 'Artificial Intelligence', ch: 3, lab: false },
    { code: 'CS4103', title: 'Compiler Design', ch: 3, lab: false },
  ],
  EE: [
    { code: 'EE101', title: 'Basic Electrical Engineering', ch: 4, lab: true },
    { code: 'EE2101', title: 'Circuit Analysis', ch: 4, lab: true },
    { code: 'EE3102', title: 'Signals & Systems', ch: 3, lab: false },
    { code: 'EE3201', title: 'Digital Logic Design', ch: 4, lab: true },
    { code: 'EE4101', title: 'Control Systems', ch: 3, lab: false },
    { code: 'EE4103', title: 'Power Systems', ch: 3, lab: false },
  ],
  DS: [
    { code: 'DS101', title: 'Programming for Data Science', ch: 4, lab: true },
    { code: 'DS2101', title: 'Statistics & Probability', ch: 3, lab: false },
    { code: 'DS3102', title: 'Machine Learning', ch: 4, lab: true },
    { code: 'DS3201', title: 'Data Mining', ch: 3, lab: false },
    { code: 'DS4101', title: 'Big Data Analytics', ch: 3, lab: false },
    { code: 'DS4103', title: 'Deep Learning', ch: 3, lab: false },
  ],
};

async function seedCoursesAndSections(
  departments: { id: string; code: string }[],
  teachers: { id: string; departmentId: string }[],
) {
  const sections: { id: string; departmentId: string; teacherId: string; capacity: number; requiresLab: boolean; courseCode: string; courseTitle: string }[] = [];

  for (const dept of departments) {
    const templates = COURSES_BY_DEPT[dept.code] ?? [];
    const deptTeachers = teachers.filter((t) => t.departmentId === dept.id);

    for (let i = 0; i < templates.length; i++) {
      const tmpl = templates[i]!;
      const course = await prisma.course.create({
        data: {
          code: tmpl.code,
          title: tmpl.title,
          creditHours: tmpl.ch,
          requiresLab: tmpl.lab,
          departmentId: dept.id,
        },
      });

      const teacher = deptTeachers[i % deptTeachers.length]!;
      const section = await prisma.section.create({
        data: { courseId: course.id, teacherId: teacher.id, term: TERM, capacity: 40 },
      });

      sections.push({
        id: section.id,
        departmentId: dept.id,
        teacherId: teacher.id,
        capacity: section.capacity,
        requiresLab: tmpl.lab,
        courseCode: tmpl.code,
        courseTitle: tmpl.title,
      });
    }
  }
  console.log(`Seeded ${sections.length} sections across ${departments.length} departments.`);
  return sections;
}

// ─────────────────────────────────────────────────────────────
// ENROLLMENTS — every student takes every course their department
// offers this term (a full 6-course load per student).
// ─────────────────────────────────────────────────────────────
async function seedEnrollments(
  students: { id: string; departmentId: string }[],
  sections: { id: string; departmentId: string }[],
) {
  const enrollments: { studentId: string; sectionId: string }[] = [];
  const records = [];
  for (const student of students) {
    const deptSections = sections.filter((s) => s.departmentId === student.departmentId);
    for (const section of deptSections) {
      records.push({ studentId: student.id, sectionId: section.id, status: 'ACTIVE' });
      enrollments.push({ studentId: student.id, sectionId: section.id });
    }
  }
  await prisma.enrollment.createMany({ data: records });
  console.log(`Seeded ${enrollments.length} enrollments.`);
  return enrollments;
}

async function seedEnrollmentSchedules(departments: { id: string }[]) {
  for (const dept of departments) {
    await prisma.enrollmentSchedule.create({
      data: {
        departmentId: dept.id,
        term: TERM,
        startsAt: daysAgo(1),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`Seeded enrollment schedules (open now) for ${departments.length} departments.`);
}

// ─────────────────────────────────────────────────────────────
// TIMETABLE — spread every section onto a different (day, time)
// cell so the finished week has classes at varied hours, Mon–Fri,
// instead of everything piling onto 08:00.
// ─────────────────────────────────────────────────────────────
async function seedTimetable(
  departments: { id: string; code: string; dayStartTime: string | null; dayEndTime: string | null }[],
  sections: { id: string; departmentId: string; teacherId: string; capacity: number; requiresLab: boolean }[],
) {
  const rooms = await prisma.room.findMany();
  let placedTotal = 0;

  for (const dept of departments) {
    const grid = buildTimeGrid(dept.dayStartTime ?? '08:00', dept.dayEndTime ?? '16:00');
    const deptSections = sections.filter((s) => s.departmentId === dept.id);
    const placed: { day: Weekday; start: string; end: string; roomId: string; teacherId: string; sectionId: string }[] = [];

    for (let k = 0; k < deptSections.length; k++) {
      const section = deptSections[k]!;
      const feasibleRooms = rooms.filter((r) => r.capacity >= section.capacity && (section.requiresLab ? r.type === 'LAB' : true));

      // Same ordering trick as the production generator: quietest cell first,
      // then a per-section rotation across times + days so consecutive
      // sections prefer different start times (section k prefers slot k % N).
      const timeIndexByStart = new Map(grid.map((s, i) => [s.start, i]));
      const timeRot = k % grid.length;
      const dayRot = k % DAYS.length;
      const cellLoads = new Map<string, number>();
      for (const p of placed) {
        const key = `${p.day}|${p.start}`;
        cellLoads.set(key, (cellLoads.get(key) ?? 0) + 1);
      }

      const daySlots: { day: Weekday; slot: { start: string; end: string } }[] = [];
      for (const day of DAYS) for (const slot of grid) daySlots.push({ day, slot });
      daySlots.sort((x, y) => {
        const loadX = cellLoads.get(`${x.day}|${x.slot.start}`) ?? 0;
        const loadY = cellLoads.get(`${y.day}|${y.slot.start}`) ?? 0;
        if (loadX !== loadY) return loadX - loadY;
        const timePrefX = (timeIndexByStart.get(x.slot.start) ?? 0) === timeRot ? 0 : 1;
        const timePrefY = (timeIndexByStart.get(y.slot.start) ?? 0) === timeRot ? 0 : 1;
        if (timePrefX !== timePrefY) return timePrefX - timePrefY;
        const dayPrefX = (DAYS.indexOf(x.day) - dayRot + DAYS.length) % DAYS.length;
        const dayPrefY = (DAYS.indexOf(y.day) - dayRot + DAYS.length) % DAYS.length;
        if (dayPrefX !== dayPrefY) return dayPrefX - dayPrefY;
        return (timeIndexByStart.get(x.slot.start) ?? 0) - (timeIndexByStart.get(y.slot.start) ?? 0);
      });

      let placedThis = false;
      for (const { day, slot } of daySlots) {
        if (placedThis) break;
        const clash = placed.some(
          (p) =>
            p.day === day &&
            overlaps(slot.start, slot.end, p.start, p.end) &&
            (p.teacherId === section.teacherId || p.sectionId === section.id),
        );
        if (clash) continue;
        const room = feasibleRooms.find(
          (r) => !placed.some((p) => p.day === day && overlaps(slot.start, slot.end, p.start, p.end) && p.roomId === r.id),
        );
        if (!room) continue;

        await prisma.timetableSlot.create({
          data: { sectionId: section.id, roomId: room.id, day, startTime: slot.start, endTime: slot.end },
        });
        placedTotal++;
        placed.push({ day, start: slot.start, end: slot.end, roomId: room.id, teacherId: section.teacherId, sectionId: section.id });
        placedThis = true;
      }
    }
  }
  console.log(`Seeded ${placedTotal} timetable slots across a spread of days/times.`);
}

// ─────────────────────────────────────────────────────────────
// ATTENDANCE — last 30 weekdays; each student has their own
// attendance habit (~50–95% present), a few chronic absentees.
// ─────────────────────────────────────────────────────────────
async function seedAttendance(enrollments: { studentId: string; sectionId: string }[]) {
  const today = new Date();
  const dates: Date[] = [];
  for (let i = 1; i <= 42; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (d.getDay() !== 0 && d.getDay() !== 6) dates.push(d); // skip weekends
    if (dates.length === 30) break;
  }

  const studentHabit = new Map<string, number>();
  const records: { sectionId: string; studentId: string; date: Date; status: 'PRESENT' | 'ABSENT' }[] = [];
  for (const e of enrollments) {
    let habit = studentHabit.get(e.studentId);
    if (habit === undefined) {
      habit = Math.round((Math.random() * 0.45 + 0.5) * 100) / 100; // 0.50 – 0.95
      studentHabit.set(e.studentId, habit);
    }
    for (const date of dates) {
      records.push({
        sectionId: e.sectionId,
        studentId: e.studentId,
        date,
        status: Math.random() < habit ? 'PRESENT' : 'ABSENT',
      });
    }
  }
  await prisma.attendance.createMany({ data: records });
  console.log(`Seeded ${records.length} attendance records (last 30 weekdays).`);
}

// ─────────────────────────────────────────────────────────────
// GRADES — full component set matching the teacher grade sheet:
// quiz1 (10), quiz2 (10), assignment1 (20), midterm (30), final (30).
// ─────────────────────────────────────────────────────────────
const GRADE_COMPONENTS: { name: string; max: number }[] = [
  { name: 'quiz1', max: 10 },
  { name: 'quiz2', max: 10 },
  { name: 'assignment1', max: 20 },
  { name: 'midterm', max: 30 },
  { name: 'final', max: 30 },
];

async function seedGrades(enrollments: { studentId: string; sectionId: string }[]) {
  const sectionToCourse = new Map<string, string>();
  for (const s of await prisma.section.findMany({ select: { id: true, courseId: true } })) {
    sectionToCourse.set(s.id, s.courseId);
  }

  const studentAbility = new Map<string, number>();
  const records: { studentId: string; courseId: string; component: string; marks: number; maxMarks: number }[] = [];
  for (const e of enrollments) {
    const courseId = sectionToCourse.get(e.sectionId);
    if (!courseId) continue;
    let ability = studentAbility.get(e.studentId);
    if (ability === undefined) {
      ability = Math.round((Math.random() * 0.35 + 0.6) * 100) / 100; // 0.60 – 0.95
      studentAbility.set(e.studentId, ability);
    }
    for (const comp of GRADE_COMPONENTS) {
      const jitter = Math.random() * 0.2 + 0.9; // 0.9 – 1.1
      const marks = Math.min(comp.max, Math.max(0, Math.round(comp.max * ability * jitter * 10) / 10));
      records.push({ studentId: e.studentId, courseId, component: comp.name, marks, maxMarks: comp.max });
    }
  }
  await prisma.grade.createMany({ data: records });
  console.log(`Seeded ${records.length} grade entries (${GRADE_COMPONENTS.length} components per course).`);
}

// ─────────────────────────────────────────────────────────────
// ASSIGNMENTS + SUBMISSIONS — two per section: one past (partly
// graded) and one upcoming, each with a few sample submissions.
// ─────────────────────────────────────────────────────────────
const SUBMISSION_COMMENTS = [
  'Good work, well-structured solution.',
  'Clean code — just missing the edge-case tests.',
  'Solid submission, minor formatting issues.',
  'Needs more explanation of the approach.',
  null,
];

async function seedAssignments(
  sections: { id: string; courseTitle: string }[],
  enrollments: { studentId: string; sectionId: string }[],
) {
  let assignmentCount = 0;
  for (const section of sections) {
    const enrolled = enrollments.filter((e) => e.sectionId === section.id);
    const subs = [];

    const past = await prisma.assignment.create({
      data: {
        sectionId: section.id,
        title: `${section.courseTitle} — Assignment 1`,
        description: 'Complete the exercises covered in the first three lectures. Submit a single PDF.',
        deadline: daysAgo(7),
      },
    });
    const upcoming = await prisma.assignment.create({
      data: {
        sectionId: section.id,
        title: `${section.courseTitle} — Assignment 2`,
        description: 'A small project-style problem set building on Assignment 1.',
        deadline: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      },
    });
    assignmentCount += 2;

    // a handful of students submit each assignment
    const submitters = enrolled.slice(0, 3);
    for (let j = 0; j < submitters.length; j++) {
      const e = submitters[j]!;
      for (const assignment of [past, upcoming]) {
        const isPast = assignment.id === past.id;
        subs.push({
          assignmentId: assignment.id,
          studentId: e.studentId,
          fileUrl: '/uploads/sample-submission.pdf',
          submittedAt: isPast ? daysAgo(randInt(1, 5)) : new Date(Date.now() - randInt(0, 2) * 60 * 60 * 1000),
          grade: isPast && j < 2 ? Math.round((randInt(60, 95) / 100) * 20 * 10) / 10 : null,
          feedback: isPast && j < 2 ? rand(SUBMISSION_COMMENTS) : null,
        });
      }
    }
    await prisma.submission.createMany({ data: subs });
  }
  console.log(`Seeded ${assignmentCount} assignments and their sample submissions.`);
}

// ─────────────────────────────────────────────────────────────
// INVOICES — 3 per student: paid semester fee, pending transport
// fee, and a library fine (overdue for some, pending for others).
// ─────────────────────────────────────────────────────────────
async function seedInvoices(students: { id: string }[]) {
  const records: { studentId: string; description: string; amount: number; dueDate: Date; status: 'PAID' | 'PENDING' | 'OVERDUE'; paidAt?: Date }[] = [];
  for (let i = 0; i < students.length; i++) {
    const student = students[i]!;

    records.push({ studentId: student.id, description: 'Fall 2026 Semester Fee', amount: 85000, dueDate: daysAgo(30), status: 'PAID', paidAt: daysAgo(28) });
    records.push({ studentId: student.id, description: 'Fall 2026 Transport Fee', amount: 12500, dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), status: 'PENDING' });

    const overdue = i % 3 === 0;
    records.push({
      studentId: student.id,
      description: 'Library Fine',
      amount: randInt(500, 1500),
      dueDate: overdue ? daysAgo(12) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      status: overdue ? 'OVERDUE' : 'PENDING',
    });
  }
  await prisma.invoice.createMany({ data: records });
  console.log(`Seeded ${records.length} invoices (3 per student).`);
}

// ─────────────────────────────────────────────────────────────
// LIBRARY — a real-looking catalog, reservations in various
// states, and a couple of clearance requests.
// ─────────────────────────────────────────────────────────────
const BOOKS = [
  { title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884', copies: 3 },
  { title: 'Introduction to Algorithms', author: 'Cormen, Leiserson, Rivest & Stein', isbn: '9780262033848', copies: 4 },
  { title: 'Database System Concepts', author: 'Silberschatz, Korth & Sudarshan', isbn: '9780078022159', copies: 3 },
  { title: 'Operating System Concepts', author: 'Silberschatz, Galvin & Gagne', isbn: '9781118063330', copies: 2 },
  { title: 'Computer Networking: A Top-Down Approach', author: 'Kurose & Ross', isbn: '9780133594140', copies: 3 },
  { title: 'Artificial Intelligence: A Modern Approach', author: 'Russell & Norvig', isbn: '9780134610993', copies: 2 },
  { title: 'Design Patterns', author: 'Gamma, Helm, Johnson & Vlissides', isbn: '9780201633610', copies: 2 },
  { title: 'The Pragmatic Programmer', author: 'Hunt & Thomas', isbn: '9780135957059', copies: 3 },
  { title: 'Digital Design', author: 'M. Morris Mano', isbn: '9780132774208', copies: 2 },
  { title: 'Signals and Systems', author: 'Oppenheim & Willsky', isbn: '9780138147570', copies: 2 },
  { title: 'Deep Learning', author: 'Goodfellow, Bengio & Courville', isbn: '9780262035613', copies: 2 },
  { title: 'Introduction to Statistical Learning', author: 'James, Witten, Hastie & Tibshirani', isbn: '9781461471370', copies: 2 },
  { title: 'Machine Learning with Python', author: 'Müller & Guido', isbn: '9781449369415', copies: 3 },
  { title: 'Python Crash Course', author: 'Eric Matthes', isbn: '9781593279288', copies: 3 },
  { title: 'Cracking the Coding Interview', author: 'Gayle Laakmann McDowell', isbn: '9780984782857', copies: 2 },
  { title: 'The C Programming Language', author: 'Kernighan & Ritchie', isbn: '9780131103627', copies: 3 },
  { title: 'Engineering Circuit Analysis', author: 'Hayt, Kemmerly & Durbin', isbn: '9780073529578', copies: 2 },
  { title: 'Power System Analysis', author: 'John J. Grainger', isbn: '9780070612938', copies: 2 },
];

async function seedLibrary(students: { id: string }[]) {
  const books: { id: string }[] = [];
  for (const b of BOOKS) {
    const book = await prisma.book.create({ data: { title: b.title, author: b.author, isbn: b.isbn, totalCopies: b.copies, availableCopies: b.copies } });
    books.push(book);
  }

  // varied reservation states: PENDING, FULFILLED, CANCELLED
  const reservations: { studentIdx: number; bookIdx: number; status: 'PENDING' | 'FULFILLED' | 'CANCELLED' }[] = [
    { studentIdx: 0, bookIdx: 1, status: 'PENDING' },
    { studentIdx: 2, bookIdx: 4, status: 'PENDING' },
    { studentIdx: 5, bookIdx: 0, status: 'FULFILLED' },
    { studentIdx: 7, bookIdx: 10, status: 'FULFILLED' },
    { studentIdx: 9, bookIdx: 13, status: 'CANCELLED' },
  ];
  let reservationCount = 0;
  for (const r of reservations) {
    const student = students[r.studentIdx % students.length]!;
    const book = books[r.bookIdx % books.length]!;
    if (r.status !== 'CANCELLED') {
      await prisma.book.update({ where: { id: book.id }, data: { availableCopies: { decrement: 1 } } });
    }
    await prisma.bookReservation.create({
      data: { studentId: student.id, bookId: book.id, status: r.status, reservedAt: r.status === 'CANCELLED' ? daysAgo(20) : daysAgo(randInt(2, 12)) },
    });
    reservationCount++;
  }

  // clearances: two pending, one already approved
  await prisma.libraryClearance.create({ data: { studentId: students[1]!.id, status: 'PENDING' } });
  await prisma.libraryClearance.create({ data: { studentId: students[6]!.id, status: 'PENDING' } });
  await prisma.libraryClearance.create({
    data: { studentId: students[3]!.id, status: 'APPROVED', remarks: 'All books returned.', requestedAt: daysAgo(10), resolvedAt: daysAgo(8) },
  });

  console.log(`Seeded ${books.length} books, ${reservationCount} reservations, 3 clearance requests.`);
}

// ─────────────────────────────────────────────────────────────
// ANNOUNCEMENTS — a mix of targets with staggered timestamps so
// the freshest few show as unread in the bell.
// ─────────────────────────────────────────────────────────────
async function seedAnnouncements(
  adminUserId: string,
  departments: { id: string; code: string }[],
  sections: { id: string; departmentId: string }[],
) {
  const seDept = departments.find((d) => d.code === 'SE');
  const csDept = departments.find((d) => d.code === 'CS');
  const eeDept = departments.find((d) => d.code === 'EE');
  const dsDept = departments.find((d) => d.code === 'DS');
  const seSection = sections.find((s) => s.departmentId === seDept?.id);
  const csSection = sections.find((s) => s.departmentId === csDept?.id);

  const items: {
    title: string;
    message: string;
    target: 'ALL' | 'DEPARTMENT' | 'SECTION';
    departmentId?: string;
    sectionId?: string;
    createdAt: Date;
  }[] = [
    { title: 'Midterm Examination Schedule Released', message: 'The midterm schedule for Fall 2026 is now available. Check your timetable and resolve any conflicts with your instructors before the week ends.', target: 'ALL', createdAt: hoursAgo(3) },
    { title: 'Fall 2026 Semester Begins', message: 'Classes for Fall 2026 start on the schedule shown in your timetable. Welcome back — timetables are final for this week.', target: 'ALL', createdAt: hoursAgo(26) },
    { title: 'University Sports Gala', message: 'Registration for the annual sports gala (cricket, football, badminton) is open in the student centre until Friday.', target: 'ALL', createdAt: hoursAgo(50) },
    { title: 'SE Final Year Project Exhibition', message: 'SE students must submit a one-page abstract for the FYP exhibition by the end of this month.', target: 'DEPARTMENT', departmentId: seDept?.id, createdAt: daysAgo(2) },
    { title: 'Guest Lecture on Cloud Security', message: 'Dr. Farah Ahmed (Alumni) will give a guest lecture on cloud security on Thursday in Block C.', target: 'DEPARTMENT', departmentId: csDept?.id, createdAt: daysAgo(3) },
    { title: 'Power Systems Lab Maintenance', message: 'The power systems lab (Block K) will be closed for maintenance on Tuesday — lab sessions move to Block H.', target: 'DEPARTMENT', departmentId: eeDept?.id, createdAt: daysAgo(4) },
    { title: 'Data Science Bootcamp', message: 'Free weekend bootcamp on Python for data science. Limited seats — register through the department office.', target: 'DEPARTMENT', departmentId: dsDept?.id, createdAt: daysAgo(5) },
    { title: 'Quiz Reminder', message: 'A quiz will be conducted in the next class. Please review chapters 1-3 from the recommended book.', target: 'SECTION', sectionId: seSection?.id, createdAt: hoursAgo(6) },
    { title: 'Assignment 2 Deadline Extended', message: 'The Assignment 2 deadline has been extended to next Friday due to the midterm week.', target: 'SECTION', sectionId: csSection?.id, createdAt: hoursAgo(30) },
  ];

  let count = 0;
  for (const item of items) {
    if (item.target !== 'ALL' && !item.departmentId && !item.sectionId) continue;
    await prisma.announcement.create({
      data: {
        postedById: adminUserId,
        title: item.title,
        message: item.message,
        target: item.target,
        departmentId: item.departmentId,
        sectionId: item.sectionId,
        createdAt: item.createdAt,
      },
    });
    count++;
  }
  console.log(`Seeded ${count} announcements.`);
}

// ─────────────────────────────────────────────────────────────
// COMPLAINTS + REQUESTS + FEEDBACK
// ─────────────────────────────────────────────────────────────
async function seedComplaintsRequestsFeedback(
  students: { id: string }[],
  sections: { id: string }[],
  enrollments: { studentId: string; sectionId: string }[],
) {
  // complaints across statuses
  const complaints: { studentIdx: number; subject: string; description: string; status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'; response?: string }[] = [
    { studentIdx: 0, subject: 'Projector not working in B3', description: 'The projector in room B3 has not worked for the past two classes.', status: 'OPEN' },
    { studentIdx: 2, subject: 'Wifi issues in library', description: 'Wifi keeps disconnecting in the library reading area.', status: 'RESOLVED', response: 'Router has been replaced. Please let us know if it persists.' },
    { studentIdx: 4, subject: 'AC not cooling in Block D', description: 'Room D2 is very hot during the afternoon classes.', status: 'IN_PROGRESS' },
    { studentIdx: 6, subject: 'Missing chair in lab', description: 'The DB lab (Block C, ground floor) is one chair short.', status: 'OPEN' },
    { studentIdx: 8, subject: 'Parking pass not issued', description: 'Applied for a parking pass two weeks ago, still not issued.', status: 'RESOLVED', response: 'Please collect your pass from the front office.' },
  ];
  let complaintCount = 0;
  for (const c of complaints) {
    const student = students[c.studentIdx % students.length]!;
    await prisma.complaint.create({
      data: {
        studentId: student.id,
        subject: c.subject,
        description: c.description,
        status: c.status,
        response: c.response,
        resolvedAt: c.status === 'RESOLVED' ? daysAgo(randInt(3, 8)) : undefined,
      },
    });
    complaintCount++;
  }

  // requests across types/statuses
  const withdrawSection = enrollments.find((e) => e.studentId === students[1]?.id)?.sectionId;
  const requests: { studentIdx: number; type: 'TRANSCRIPT' | 'LETTER' | 'COURSE_WITHDRAW' | 'PERSONAL_INFO_CHANGE' | 'GENERAL'; details: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; sectionId?: string; adminRemarks?: string }[] = [
    { studentIdx: 0, type: 'TRANSCRIPT', details: 'Need an official transcript for a scholarship application.', status: 'PENDING' },
    { studentIdx: 1, type: 'COURSE_WITHDRAW', details: 'Requesting to withdraw from one course due to a schedule conflict.', status: 'PENDING', sectionId: withdrawSection },
    { studentIdx: 2, type: 'LETTER', details: 'Letter of recommendation for graduate school admissions.', status: 'APPROVED', adminRemarks: 'Issued on request.' },
    { studentIdx: 3, type: 'PERSONAL_INFO_CHANGE', details: 'Update phone number on the student record.', status: 'PENDING' },
    { studentIdx: 4, type: 'TRANSCRIPT', details: 'Official transcript for job application.', status: 'REJECTED', adminRemarks: 'Outstanding library fine must be cleared first.' },
    { studentIdx: 5, type: 'GENERAL', details: 'Inquiry about the internship credit policy.', status: 'PENDING' },
  ];
  let requestCount = 0;
  for (const r of requests) {
    const student = students[r.studentIdx % students.length]!;
    await prisma.request.create({
      data: {
        studentId: student.id,
        type: r.type,
        details: r.details,
        status: r.status,
        sectionId: r.sectionId,
        adminRemarks: r.adminRemarks,
        resolvedAt: r.status !== 'PENDING' ? daysAgo(randInt(2, 9)) : undefined,
      },
    });
    requestCount++;
  }

  // feedback — up to 2 students per section
  const comments = ['Great course!', 'Could use more examples.', 'Very clear explanations.', 'Pace was a bit fast.', 'Would love more hands-on labs.', null];
  const feedbackRecords: { studentId: string; sectionId: string; rating: number; comments: string | null; submittedAt: Date }[] = [];
  for (const section of sections) {
    const enrolled = enrollments.filter((e) => e.sectionId === section.id).slice(0, 2);
    for (const e of enrolled) {
      feedbackRecords.push({
        studentId: e.studentId,
        sectionId: section.id,
        rating: randInt(3, 5),
        comments: rand(comments) ?? null,
        submittedAt: daysAgo(randInt(2, 15)),
      });
    }
  }
  await prisma.feedback.createMany({ data: feedbackRecords });

  console.log(`Seeded ${complaintCount} complaints, ${requestCount} requests, ${feedbackRecords.length} feedback entries.`);
}

// ─────────────────────────────────────────────────────────────
async function main() {
  console.log('Resetting database for a clean, repeatable seed...');
  await resetDatabase();

  await seedDepartments();
  await seedBlocks();

  const departments = await prisma.department.findMany();

  // create admin + librarian first (announcements need the admin id)
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const adminUser = await prisma.user.create({ data: { email: 'admin@cust.edu.pk', passwordHash, role: 'ADMIN' } });
  const librarianUser = await prisma.user.create({ data: { email: 'librarian@cust.edu.pk', passwordHash, role: 'LIBRARIAN' } });

  const { teachers, students } = await seedUsers(adminUser, librarianUser);
  const sections = await seedCoursesAndSections(departments, teachers);
  const enrollments = await seedEnrollments(students, sections);
  await seedEnrollmentSchedules(departments);
  await seedTimetable(departments, sections);
  await seedAttendance(enrollments);
  await seedGrades(enrollments);
  await seedAssignments(sections, enrollments);
  await seedInvoices(students);
  await seedLibrary(students);
  await seedAnnouncements(adminUser.id, departments, sections);
  await seedComplaintsRequestsFeedback(students, sections, enrollments);

  console.log('\n✅ Seed complete. All accounts use password:', PASSWORD);
  console.log('   Admin:     admin@cust.edu.pk');
  console.log('   Librarian: librarian@cust.edu.pk');
  console.log('   Teacher:   teacher@cust.edu.pk (SE)');
  console.log('   Student:   student@cust.edu.pk (SE)');
  console.log(`   + ${teachers.length - 1} more teachers, ${students.length - 1} more students across SE/CS/EE/DS`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

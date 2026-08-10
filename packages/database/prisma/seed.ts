import { PrismaClient, RoomType, Weekday } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const PASSWORD = 'Password123!';
const DAYS: Weekday[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const SLOT_LENGTH_MIN = 90;

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
    const block = await prisma.block.upsert({ where: { name: b.name }, update: {}, create: { name: b.name } });
    for (let floorNumber = 0; floorNumber < b.floors; floorNumber++) {
      const floor = await prisma.floor.upsert({
        where: { blockId_floorNumber: { blockId: block.id, floorNumber } },
        update: {},
        create: { blockId: block.id, floorNumber },
      });
      for (let i = 1; i <= b.roomsPerFloor; i++) {
        const label = `${b.name}${floorNumber * b.roomsPerFloor + i}`;
        const type: RoomType = i === b.roomsPerFloor ? 'LAB' : 'LECTURE_HALL';
        await prisma.room.upsert({
          where: { floorId_label: { floorId: floor.id, label } },
          update: {},
          create: { floorId: floor.id, label, capacity: type === 'LAB' ? 30 : 50, type },
        });
      }
    }
  }
  console.log(`Seeded ${BLOCKS.length} blocks with floors and rooms.`);
}

// ─────────────────────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { name: 'Software Engineering', code: 'SE', dayStartTime: '08:00', dayEndTime: '16:00' },
  { name: 'Computer Science', code: 'CS', dayStartTime: '08:00', dayEndTime: '16:00' },
  { name: 'Electrical Engineering', code: 'EE', dayStartTime: '09:00', dayEndTime: '17:00' },
];

async function seedDepartments() {
  for (const d of DEPARTMENTS) {
    await prisma.department.upsert({ where: { code: d.code }, update: {}, create: d });
  }
  console.log(`Seeded ${DEPARTMENTS.length} departments.`);
}

// ─────────────────────────────────────────────────────────────
// USERS: admin, teachers, students
// ─────────────────────────────────────────────────────────────

async function seedUsersAndTeachers(departments: { id: string; code: string }[]) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // primary admin (kept for the credentials already shared with Ali)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@cust.edu.pk' },
    update: {},
    create: { email: 'admin@cust.edu.pk', passwordHash, role: 'ADMIN' },
  });
  await prisma.admin.upsert({ where: { userId: adminUser.id }, update: {}, create: { userId: adminUser.id } });

  // primary librarian
  const librarianUser = await prisma.user.upsert({
    where: { email: 'librarian@cust.edu.pk' },
    update: {},
    create: { email: 'librarian@cust.edu.pk', passwordHash, role: 'LIBRARIAN' },
  });
  await prisma.librarian.upsert({ where: { userId: librarianUser.id }, update: {}, create: { userId: librarianUser.id } });

  const teachers: { id: string; departmentId: string; email: string }[] = [];
  const designations = ['Lecturer', 'Assistant Professor', 'Associate Professor'];

  // 2 teachers per department, plus keep teacher@cust.edu.pk as teacher #1 in SE for continuity
  for (const dept of departments) {
    for (let i = 1; i <= 2; i++) {
      const isFirstSE = dept.code === 'SE' && i === 1;
      const email = isFirstSE ? 'teacher@cust.edu.pk' : `teacher.${dept.code.toLowerCase()}${i}@cust.edu.pk`;
      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, passwordHash, role: 'TEACHER' },
      });
      const teacher = await prisma.teacher.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, departmentId: dept.id, designation: rand(designations) },
      });
      teachers.push({ id: teacher.id, departmentId: dept.id, email });
    }
  }
  console.log(`Seeded 1 admin and ${teachers.length} teachers.`);
  return teachers;
}

async function seedStudents(departments: { id: string; code: string }[]) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const students: { id: string; departmentId: string; email: string; semester: number }[] = [];
  let enrollCounter = 1;

  for (const dept of departments) {
    for (let i = 1; i <= 6; i++) {
      const isFirstSE = dept.code === 'SE' && i === 1;
      const email = isFirstSE ? 'student@cust.edu.pk' : `student.${dept.code.toLowerCase()}${i}@cust.edu.pk`;
      const semester = [1, 3, 5, 7][(i - 1) % 4]!; // deterministic, not random — keeps re-seeds stable
      const enrollmentNo = `BS${dept.code}23${String(enrollCounter).padStart(4, '0')}`;
      enrollCounter++;

      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, passwordHash, role: 'STUDENT' },
      });
      const student = await prisma.student.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, enrollmentNo, departmentId: dept.id, semester },
      });
      students.push({ id: student.id, departmentId: dept.id, email, semester });
    }
  }
  console.log(`Seeded ${students.length} students.`);
  return students;
}

// ─────────────────────────────────────────────────────────────
// COURSES + SECTIONS
// ─────────────────────────────────────────────────────────────
const COURSE_TEMPLATES: Record<string, { code: string; title: string; ch: number; lab: boolean }[]> = {
  SE: [
    { code: 'SE2101', title: 'Object Oriented Programming', ch: 4, lab: true },
    { code: 'SE3102', title: 'Software Requirements Engineering', ch: 3, lab: false },
    { code: 'SE3201', title: 'Database Systems', ch: 4, lab: true },
    { code: 'SE4103', title: 'Internship', ch: 3, lab: false },
  ],
  CS: [
    { code: 'CS2101', title: 'Data Structures & Algorithms', ch: 4, lab: true },
    { code: 'CS3102', title: 'Operating Systems', ch: 3, lab: false },
    { code: 'CS3201', title: 'Computer Networks', ch: 4, lab: true },
    { code: 'CS4103', title: 'Artificial Intelligence', ch: 3, lab: false },
  ],
  EE: [
    { code: 'EE2101', title: 'Circuit Analysis', ch: 4, lab: true },
    { code: 'EE3102', title: 'Signals & Systems', ch: 3, lab: false },
    { code: 'EE3201', title: 'Digital Logic Design', ch: 4, lab: true },
    { code: 'EE4103', title: 'Power Systems', ch: 3, lab: false },
  ],
};

const TERM = 'Fall 2026';

async function seedCoursesAndSections(
  departments: { id: string; code: string }[],
  teachers: { id: string; departmentId: string }[],
) {
  const sections: { id: string; departmentId: string; teacherId: string; capacity: number; requiresLab: boolean; courseCode: string; courseTitle: string }[] = [];

  for (const dept of departments) {
    const templates = COURSE_TEMPLATES[dept.code] ?? [];
    const deptTeachers = teachers.filter((t) => t.departmentId === dept.id);

    for (let i = 0; i < templates.length; i++) {
      const tmpl = templates[i]!;
      const course = await prisma.course.upsert({
        where: { code: tmpl.code },
        update: {},
        create: {
          code: tmpl.code,
          title: tmpl.title,
          creditHours: tmpl.ch,
          requiresLab: tmpl.lab,
          departmentId: dept.id,
        },
      });

      const teacher = deptTeachers[i % deptTeachers.length]!;
      const existingSection = await prisma.section.findFirst({ where: { courseId: course.id, term: TERM } });
      const section =
        existingSection ??
        (await prisma.section.create({
          data: { courseId: course.id, teacherId: teacher.id, term: TERM, capacity: 30 },
        }));

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
  console.log(`Seeded ${sections.length} courses/sections across ${departments.length} departments.`);
  return sections;
}

// ─────────────────────────────────────────────────────────────
// ENROLLMENTS
// ─────────────────────────────────────────────────────────────
async function seedEnrollments(
  students: { id: string; departmentId: string }[],
  sections: { id: string; departmentId: string }[],
) {
  const enrollments: { studentId: string; sectionId: string }[] = [];
  for (const student of students) {
    const deptSections = sections.filter((s) => s.departmentId === student.departmentId);
    for (const section of deptSections) {
      const enrollment = await prisma.enrollment.upsert({
        where: { studentId_sectionId: { studentId: student.id, sectionId: section.id } },
        update: {},
        create: { studentId: student.id, sectionId: section.id, status: 'ACTIVE' },
      });
      enrollments.push({ studentId: student.id, sectionId: section.id });
    }
  }
  console.log(`Seeded ${enrollments.length} enrollments.`);
  return enrollments;
}

// ─────────────────────────────────────────────────────────────
// ENROLLMENT SCHEDULES (open window right now, per department)
// ─────────────────────────────────────────────────────────────
async function seedEnrollmentSchedules(departments: { id: string }[]) {
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  for (const dept of departments) {
    const existing = await prisma.enrollmentSchedule.findFirst({ where: { departmentId: dept.id, term: TERM } });
    if (!existing) {
      await prisma.enrollmentSchedule.create({
        data: { departmentId: dept.id, term: TERM, startsAt: start, endsAt: end },
      });
    }
  }
  console.log(`Seeded enrollment schedules (open now) for ${departments.length} departments.`);
}

// ─────────────────────────────────────────────────────────────
// TIMETABLE — simple non-clashing placement per department
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

    for (const section of deptSections) {
      const feasibleRooms = rooms.filter((r) => r.capacity >= section.capacity && (section.requiresLab ? r.type === 'LAB' : true));
      // spread sections across the week: try the quietest day first so the
      // finished timetable isn't a single-day pile-up
      const dayCounts = new Map<Weekday, number>();
      for (const p of placed) dayCounts.set(p.day, (dayCounts.get(p.day) ?? 0) + 1);
      const daysToTry = [...DAYS].sort(
        (a, b) => (dayCounts.get(a) ?? 0) - (dayCounts.get(b) ?? 0) || DAYS.indexOf(a) - DAYS.indexOf(b),
      );
      let placedThis = false;
      for (const day of daysToTry) {
        if (placedThis) break;
        for (const slot of grid) {
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

          const existing = await prisma.timetableSlot.findFirst({ where: { sectionId: section.id, day, startTime: slot.start } });
          if (!existing) {
            await prisma.timetableSlot.create({
              data: { sectionId: section.id, roomId: room.id, day, startTime: slot.start, endTime: slot.end },
            });
            placedTotal++;
          }
          placed.push({ day, start: slot.start, end: slot.end, roomId: room.id, teacherId: section.teacherId, sectionId: section.id });
          placedThis = true;
          break;
        }
      }
    }
  }
  console.log(`Seeded ${placedTotal} timetable slots.`);
}

// ─────────────────────────────────────────────────────────────
// ATTENDANCE — last 3 weeks, ~85% present
// ─────────────────────────────────────────────────────────────
async function seedAttendance(enrollments: { studentId: string; sectionId: string }[]) {
  let count = 0;
  const today = new Date();
  const dates: Date[] = [];
  for (let i = 1; i <= 21; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (d.getDay() !== 0 && d.getDay() !== 6) dates.push(d); // skip weekends
  }

  for (const e of enrollments) {
    for (const date of dates) {
      const status = Math.random() < 0.85 ? 'PRESENT' : 'ABSENT';
      await prisma.attendance.upsert({
        where: { sectionId_studentId_date: { sectionId: e.sectionId, studentId: e.studentId, date } },
        update: {},
        create: { sectionId: e.sectionId, studentId: e.studentId, date, status: status as 'PRESENT' | 'ABSENT' },
      });
      count++;
    }
  }
  console.log(`Seeded ${count} attendance records.`);
}

// ─────────────────────────────────────────────────────────────
// GRADES
// ─────────────────────────────────────────────────────────────
async function seedGrades(enrollments: { studentId: string; sectionId: string }[]) {
  const sectionToCourse = new Map<string, string>();
  for (const s of await prisma.section.findMany({ select: { id: true, courseId: true } })) {
    sectionToCourse.set(s.id, s.courseId);
  }

  let count = 0;
  const components = [
    { name: 'quiz1', max: 10 },
    { name: 'assignment1', max: 10 },
    { name: 'midterm', max: 30 },
  ];
  for (const e of enrollments) {
    const courseId = sectionToCourse.get(e.sectionId);
    if (!courseId) continue;
    for (const comp of components) {
      const marks = randInt(Math.round(comp.max * 0.55), comp.max);
      await prisma.grade.upsert({
        where: { studentId_courseId_component: { studentId: e.studentId, courseId, component: comp.name } },
        update: {},
        create: { studentId: e.studentId, courseId, component: comp.name, marks, maxMarks: comp.max },
      });
      count++;
    }
  }
  console.log(`Seeded ${count} grade entries.`);
}

// ─────────────────────────────────────────────────────────────
// ASSIGNMENTS + one sample submission per section
// ─────────────────────────────────────────────────────────────
async function seedAssignments(
  sections: { id: string; courseTitle: string }[],
  enrollments: { studentId: string; sectionId: string }[],
) {
  let count = 0;
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 10);

  for (const section of sections) {
    const existing = await prisma.assignment.findFirst({ where: { sectionId: section.id, title: `${section.courseTitle} — Assignment 1` } });
    const assignment =
      existing ??
      (await prisma.assignment.create({
        data: {
          sectionId: section.id,
          title: `${section.courseTitle} — Assignment 1`,
          description: 'Complete the exercises covered in the first three lectures.',
          deadline,
        },
      }));
    count++;

    const firstEnrollment = enrollments.find((e) => e.sectionId === section.id);
    if (firstEnrollment) {
      await prisma.submission.upsert({
        where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: firstEnrollment.studentId } },
        update: {},
        create: { assignmentId: assignment.id, studentId: firstEnrollment.studentId, fileUrl: '/uploads/sample-submission.pdf' },
      });
    }
  }
  console.log(`Seeded ${count} assignments (with one sample submission each).`);
}

// ─────────────────────────────────────────────────────────────
// INVOICES — 2 per student (one paid, one pending/overdue)
// ─────────────────────────────────────────────────────────────
async function seedInvoices(students: { id: string }[]) {
  let count = 0;
  for (const student of students) {
    const pastDue = new Date();
    pastDue.setDate(pastDue.getDate() - 30);
    const futureDue = new Date();
    futureDue.setDate(futureDue.getDate() + 20);

    const existingPaid = await prisma.invoice.findFirst({ where: { studentId: student.id, description: 'Fall 2026 Semester Fee' } });
    if (!existingPaid) {
      await prisma.invoice.create({
        data: {
          studentId: student.id,
          description: 'Fall 2026 Semester Fee',
          amount: 85000,
          dueDate: pastDue,
          status: 'PAID',
          paidAt: pastDue,
        },
      });
      count++;
    }

    const existingPending = await prisma.invoice.findFirst({ where: { studentId: student.id, description: 'Library Fine' } });
    if (!existingPending) {
      await prisma.invoice.create({
        data: {
          studentId: student.id,
          description: 'Library Fine',
          amount: 500,
          dueDate: Math.random() < 0.3 ? pastDue : futureDue, // some overdue, some upcoming
        },
      });
      count++;
    }
  }
  console.log(`Seeded ${count} invoices.`);
}

// ─────────────────────────────────────────────────────────────
// LIBRARY — books + a few reservations + one clearance request
// ─────────────────────────────────────────────────────────────
const BOOKS = [
  { title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884', copies: 3 },
  { title: 'Introduction to Algorithms', author: 'Cormen et al.', isbn: '9780262033848', copies: 4 },
  { title: 'Database System Concepts', author: 'Silberschatz et al.', isbn: '9780078022159', copies: 3 },
  { title: 'Operating System Concepts', author: 'Silberschatz et al.', isbn: '9781118063330', copies: 2 },
  { title: 'Computer Networking: A Top-Down Approach', author: 'Kurose & Ross', isbn: '9780133594140', copies: 3 },
  { title: 'Artificial Intelligence: A Modern Approach', author: 'Russell & Norvig', isbn: '9780134610993', copies: 2 },
  { title: 'Design Patterns', author: 'Gang of Four', isbn: '9780201633610', copies: 2 },
  { title: 'The Pragmatic Programmer', author: 'Hunt & Thomas', isbn: '9780135957059', copies: 3 },
  { title: 'Digital Design', author: 'M. Morris Mano', isbn: '9780132774208', copies: 2 },
  { title: 'Signals and Systems', author: 'Oppenheim & Willsky', isbn: '9780138147570', copies: 2 },
];

async function seedLibrary(students: { id: string }[]) {
  const books: { id: string }[] = [];
  for (const b of BOOKS) {
    const book = await prisma.book.upsert({
      where: { isbn: b.isbn },
      update: {},
      create: { title: b.title, author: b.author, isbn: b.isbn, totalCopies: b.copies, availableCopies: b.copies },
    });
    books.push(book);
  }

  let reservationCount = 0;
  for (let i = 0; i < 3; i++) {
    const student = students[i % students.length]!;
    const book = books[i % books.length]!;
    const existing = await prisma.bookReservation.findFirst({ where: { studentId: student.id, bookId: book.id, status: 'PENDING' } });
    if (!existing) {
      await prisma.$transaction([
        prisma.book.update({ where: { id: book.id }, data: { availableCopies: { decrement: 1 } } }),
        prisma.bookReservation.create({ data: { studentId: student.id, bookId: book.id, status: 'PENDING' } }),
      ]);
      reservationCount++;
    }
  }

  const clearanceStudent = students[3];
  if (clearanceStudent) {
    const existing = await prisma.libraryClearance.findFirst({ where: { studentId: clearanceStudent.id, status: 'PENDING' } });
    if (!existing) {
      await prisma.libraryClearance.create({ data: { studentId: clearanceStudent.id, status: 'PENDING' } });
    }
  }
  console.log(`Seeded ${books.length} books, ${reservationCount} reservations, 1 clearance request.`);
}

// ─────────────────────────────────────────────────────────────
// ANNOUNCEMENTS
// ─────────────────────────────────────────────────────────────
async function seedAnnouncements(adminUserId: string, departments: { id: string; code: string }[], sections: { id: string; departmentId: string }[]) {
  const seDept = departments.find((d) => d.code === 'SE');
  const seSection = sections.find((s) => s.departmentId === seDept?.id);

  const items: { title: string; message: string; target: 'ALL' | 'DEPARTMENT' | 'SECTION'; departmentId?: string; sectionId?: string }[] = [
    { title: 'Fall 2026 Semester Begins', message: 'Classes for Fall 2026 start on the schedule shown in your timetable. Welcome back!', target: 'ALL' },
    { title: 'SE Department Orientation', message: 'All Software Engineering students should attend the orientation session in Block B.', target: 'DEPARTMENT', departmentId: seDept?.id },
    { title: 'Quiz Reminder', message: 'A quiz will be conducted in the next class. Please review chapters 1-3.', target: 'SECTION', sectionId: seSection?.id },
  ];

  let count = 0;
  for (const item of items) {
    if (item.target !== 'ALL' && !item.departmentId && !item.sectionId) continue;
    const existing = await prisma.announcement.findFirst({ where: { title: item.title } });
    if (!existing) {
      await prisma.announcement.create({
        data: { postedById: adminUserId, title: item.title, message: item.message, target: item.target, departmentId: item.departmentId, sectionId: item.sectionId },
      });
      count++;
    }
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
  const s1 = students[0]!;
  const s2 = students[1] ?? s1;

  const existingComplaint1 = await prisma.complaint.findFirst({ where: { studentId: s1.id, subject: 'Projector not working in B3' } });
  if (!existingComplaint1) {
    await prisma.complaint.create({
      data: { studentId: s1.id, subject: 'Projector not working in B3', description: 'The projector in room B3 has not worked for the past two classes.', status: 'OPEN' },
    });
  }
  const existingComplaint2 = await prisma.complaint.findFirst({ where: { studentId: s2.id, subject: 'Wifi issues in library' } });
  if (!existingComplaint2) {
    await prisma.complaint.create({
      data: { studentId: s2.id, subject: 'Wifi issues in library', description: 'Wifi keeps disconnecting in the library reading area.', status: 'RESOLVED', response: 'Router has been replaced. Please let us know if it persists.', resolvedAt: new Date() },
    });
  }

  const existingReq1 = await prisma.request.findFirst({ where: { studentId: s1.id, type: 'TRANSCRIPT' } });
  if (!existingReq1) {
    await prisma.request.create({ data: { studentId: s1.id, type: 'TRANSCRIPT', details: 'Need an official transcript for a scholarship application.' } });
  }
  const withdrawEnrollment = enrollments.find((e) => e.studentId === s2.id);
  if (withdrawEnrollment) {
    const existingReq2 = await prisma.request.findFirst({ where: { studentId: s2.id, type: 'COURSE_WITHDRAW', sectionId: withdrawEnrollment.sectionId } });
    if (!existingReq2) {
      await prisma.request.create({ data: { studentId: s2.id, type: 'COURSE_WITHDRAW', sectionId: withdrawEnrollment.sectionId, details: 'Requesting to withdraw due to schedule conflict.' } });
    }
  }

  let feedbackCount = 0;
  const sampleComments: (string | undefined)[] = ['Great course!', 'Could use more examples.', 'Very clear explanations.', 'Pace was a bit fast.', undefined];
  for (let i = 0; i < Math.min(5, enrollments.length); i++) {
    const e = enrollments[i]!;
    const existing = await prisma.feedback.findFirst({ where: { studentId: e.studentId, sectionId: e.sectionId } });
    if (!existing) {
      await prisma.feedback.create({ data: { studentId: e.studentId, sectionId: e.sectionId, rating: randInt(3, 5), comments: rand(sampleComments) } });
      feedbackCount++;
    }
  }
  console.log(`Seeded 2 complaints, 2 requests, ${feedbackCount} feedback entries.`);
}

// ─────────────────────────────────────────────────────────────
async function main() {
  await seedDepartments();
  await seedBlocks();

  const departments = await prisma.department.findMany();
  const teachers = await seedUsersAndTeachers(departments);
  const students = await seedStudents(departments);
  const sections = await seedCoursesAndSections(departments, teachers);
  const enrollments = await seedEnrollments(students, sections);
  await seedEnrollmentSchedules(departments);
  await seedTimetable(departments, sections);
  await seedAttendance(enrollments);
  await seedGrades(enrollments);
  await seedAssignments(sections, enrollments);
  await seedInvoices(students);
  await seedLibrary(students);

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@cust.edu.pk' } });
  await seedAnnouncements(admin.id, departments, sections);
  await seedComplaintsRequestsFeedback(students, sections, enrollments);

  console.log('\n✅ Seed complete. All accounts use password:', PASSWORD);
  console.log('   Admin:     admin@cust.edu.pk');
  console.log('   Librarian: librarian@cust.edu.pk');
  console.log('   Teacher:   teacher@cust.edu.pk (SE)');
  console.log('   Student:   student@cust.edu.pk (SE)');
  console.log(`   + ${teachers.length - 1} more teachers, ${students.length - 1} more students across CS/EE/SE`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

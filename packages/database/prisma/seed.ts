import { PrismaClient, RoomType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Blocks + floors + rooms, following CUST's real naming (A,B,C,D,E,F,H,J,K
// blocks; rooms named like "B1","B2"... within a block). Replace the
// per-block room counts below with the real numbers once available —
// see the open question in docs/timetable-design.md.
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
    const block = await prisma.block.upsert({
      where: { name: b.name },
      update: {},
      create: { name: b.name },
    });

    for (let floorNumber = 0; floorNumber < b.floors; floorNumber++) {
      const floor = await prisma.floor.upsert({
        where: { blockId_floorNumber: { blockId: block.id, floorNumber } },
        update: {},
        create: { blockId: block.id, floorNumber },
      });

      for (let i = 1; i <= b.roomsPerFloor; i++) {
        const label = `${b.name}${(floorNumber * b.roomsPerFloor) + i}`;
        // last room per floor per block marked as a LAB, just as a seed default
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

async function seedDepartments() {
  const departments = [
    { name: 'Software Engineering', code: 'SE', dayStartTime: '08:00', dayEndTime: '16:00' },
    { name: 'Computer Science', code: 'CS', dayStartTime: '08:00', dayEndTime: '16:00' },
    { name: 'Electrical Engineering', code: 'EE', dayStartTime: '09:00', dayEndTime: '17:00' },
  ];

  for (const d of departments) {
    await prisma.department.upsert({
      where: { code: d.code },
      update: {},
      create: d,
    });
  }
  console.log(`Seeded ${departments.length} departments.`);
}

async function seedSampleUsers() {
  const seDept = await prisma.department.findUniqueOrThrow({ where: { code: 'SE' } });
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // one admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@cust.edu.pk' },
    update: {},
    create: { email: 'admin@cust.edu.pk', passwordHash, role: 'ADMIN' },
  });
  await prisma.admin.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id },
  });

  // one teacher
  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@cust.edu.pk' },
    update: {},
    create: { email: 'teacher@cust.edu.pk', passwordHash, role: 'TEACHER' },
  });
  await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: { userId: teacherUser.id, departmentId: seDept.id, designation: 'Lecturer' },
  });

  // one student
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@cust.edu.pk' },
    update: {},
    create: { email: 'student@cust.edu.pk', passwordHash, role: 'STUDENT' },
  });
  await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      enrollmentNo: 'BSE230001',
      departmentId: seDept.id,
      semester: 5,
    },
  });

  console.log('Seeded 1 admin, 1 teacher, 1 student (password for all: Password123!).');
}

async function main() {
  await seedDepartments();
  await seedBlocks();
  await seedSampleUsers();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@cust/database';
import { UpsertGradeDto } from './dto/upsert-grade.dto';
import { percentageToGradePoint } from './grade-scale.util';

@Injectable()
export class GradesService {
  upsertGrade(dto: UpsertGradeDto) {
    return prisma.grade.upsert({
      where: {
        studentId_courseId_component: {
          studentId: dto.studentId,
          courseId: dto.courseId,
          component: dto.component,
        },
      },
      update: { marks: dto.marks, maxMarks: dto.maxMarks },
      create: dto,
    });
  }

  // Returns the roster of a section paired with every existing grade entry
  // for the course, laid out as a sheet the teacher can edit row by row
  // (component x student) instead of one student-at-a-time dropdowns.
  async getSectionGradeSheet(sectionId: string) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { course: true, enrollments: { where: { status: 'ACTIVE' } } },
    });
    if (!section) throw new NotFoundException('Section not found');

    const grades = await prisma.grade.findMany({
      where: { courseId: section.courseId, studentId: { in: section.enrollments.map((e) => e.studentId) } },
    });
    const gradeMap = new Map<string, { component: string; marks: number; maxMarks: number }[]>();
    for (const g of grades) {
      const list = gradeMap.get(g.studentId) ?? [];
      list.push({ component: g.component, marks: g.marks, maxMarks: g.maxMarks });
      gradeMap.set(g.studentId, list);
    }

    const students = await prisma.student.findMany({
      where: { id: { in: section.enrollments.map((e) => e.studentId) } },
      include: { user: { select: { email: true } } },
    });

    return {
      sectionId,
      courseId: section.courseId,
      course: { code: section.course.code, title: section.course.title },
      rows: students.map((s) => ({
        student: { id: s.id, enrollmentNo: s.enrollmentNo, email: s.user.email },
        entries: gradeMap.get(s.id) ?? [],
      })),
    };
  }

  // Groups raw components by course, computes the course's percentage +
  // letter grade, then figures out which *term* each course belongs to by
  // matching the student's Enrollment for that course (Grade itself only
  // stores studentId+courseId, not a term — the term lives on Section,
  // reached via Enrollment). Courses are then grouped into per-semester
  // buckets and aligned to the student's *current* semester so a 7th-sem
  // student sees Semesters 1..7 laid out in order, with any semester that
  // has no record left as an empty placeholder. This is what makes the
  // Results page and the PDF transcript feel like a complete record
  // rather than a scatter of leftover terms.
  async getStudentBreakdown(studentId: string) {
    const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId } });
    const grades = await prisma.grade.findMany({ where: { studentId } });
    const courseIds = [...new Set(grades.map((g) => g.courseId))];
    if (courseIds.length === 0) return { semesters: [], currentSemester: student.semester, cgpa: 0, totalCreditHours: 0 };

    const courses = await prisma.course.findMany({ where: { id: { in: courseIds } } });
    const courseMap = new Map(courses.map((c) => [c.id, c]));

    // term lookup: for each course this student has grades in, find the
    // section (via any of their enrollments) that ties it to a term
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: { section: { select: { courseId: true, term: true } } },
    });
    const courseToTerm = new Map<string, string>();
    for (const e of enrollments) {
      if (courseIds.includes(e.section.courseId)) courseToTerm.set(e.section.courseId, e.section.term);
    }

    const courseBreakdowns = courseIds.map((courseId) => {
      const course = courseMap.get(courseId)!;
      const components = grades.filter((g) => g.courseId === courseId);
      const totalMarks = components.reduce((sum, c) => sum + c.marks, 0);
      const totalMax = components.reduce((sum, c) => sum + c.maxMarks, 0);
      const percentage = totalMax === 0 ? 0 : Math.round((totalMarks / totalMax) * 1000) / 10;
      const { letter, points } = percentageToGradePoint(percentage);

      return {
        courseId,
        courseCode: course.code,
        courseTitle: course.title,
        creditHours: course.creditHours,
        term: courseToTerm.get(courseId) ?? 'Unknown Term',
        components,
        percentage,
        letter,
        gradePoints: points,
      };
    });

    // group by term, each term gets its own SGPA, then an overall CGPA
    const termMap = new Map<string, typeof courseBreakdowns>();
    for (const c of courseBreakdowns) {
      if (!termMap.has(c.term)) termMap.set(c.term, []);
      termMap.get(c.term)!.push(c);
    }

    const semesters = [...termMap.entries()].map(([term, courses]) => {
      const totalCH = courses.reduce((s, c) => s + c.creditHours, 0);
      const weighted = courses.reduce((s, c) => s + c.gradePoints * c.creditHours, 0);
      const sgpa = totalCH === 0 ? 0 : Math.round((weighted / totalCH) * 100) / 100;
      return { term, courses, sgpa, creditHours: totalCH };
    });

    const semesterList = this.alignSemesters(student.semester, semesters);

    const totalCreditHours = courseBreakdowns.reduce((s, c) => s + c.creditHours, 0);
    const weightedTotal = courseBreakdowns.reduce((s, c) => s + c.gradePoints * c.creditHours, 0);
    const cgpa = totalCreditHours === 0 ? 0 : Math.round((weightedTotal / totalCreditHours) * 100) / 100;

    return { semesters: semesterList, currentSemester: student.semester, cgpa, totalCreditHours };
  }

  // Converts "term" buckets into a fixed 1..N list of semesters aligned to
  // the student's current semester (e.g. a 7th-sem student with data for
  // "Fall 2026" gets that data on Semester 7, with 1-6 left as empty
  // placeholders until the registrar's old records are entered).
  // Terms sort chronologically (Fall < Spring < Summer of a given year).
  private alignSemesters(currentSemester: number, sems: { term: string; courses: unknown[]; sgpa: number; creditHours: number }[]) {
    const ordered = [...sems].sort((a, b) => termSortKey(a.term) - termSortKey(b.term));
    const map = new Map<number, typeof sems[number]>();
    const count = ordered.length;

    ordered.forEach((sem, i) => {
      // When we have fewer recorded terms than the student's current
      // semester, anchor the latest term to the current semester and work
      // backwards — missing early semesters become placeholders.
      const number = count <= currentSemester ? currentSemester - (count - 1 - i) : i + 1;
      map.set(number, sem);
    });

    const span = Math.max(currentSemester, count);
    const result: { semester: number; term: string | null; courses: unknown[]; sgpa: number | null; creditHours: number }[] = [];
    for (let number = 1; number <= span; number++) {
      const sem = map.get(number);
      result.push(
        sem
          ? { semester: number, term: sem.term, courses: sem.courses, sgpa: sem.sgpa, creditHours: sem.creditHours }
          : { semester: number, term: null, courses: [], sgpa: null, creditHours: 0 },
      );
    }
    return result;
  }
}

// "Fall 2026" -> a number that sorts Spring-before-Fall within a calendar
// year is handled by seasonRank (Fall=0, Spring=1, Summer=2).
function termSortKey(term: string): number {
  const match = /^(Fall|Spring|Summer)\s+(\d{4})$/i.exec(term);
  const season: Record<string, number> = { Fall: 0, Spring: 1, Summer: 2 };
  if (!match?.[1] || !match[2]) return Number.MAX_SAFE_INTEGER;
  return Number(match[2]) * 10 + (season[match[1]] ?? 3);
}

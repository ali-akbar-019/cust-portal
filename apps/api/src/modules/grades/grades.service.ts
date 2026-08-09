import { Injectable } from '@nestjs/common';
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

  // Groups raw components by course, computes each course's percentage +
  // letter grade, then figures out which *term* each course belongs to by
  // matching the student's Enrollment for that course (Grade itself only
  // stores studentId+courseId, not a term — the term lives on Section,
  // reached via Enrollment). Courses are then grouped into per-semester
  // buckets so the frontend can render "Fall 2026", "Spring 2027", etc.
  // as separate, expandable results — and an overall CGPA is computed
  // across every course in every term.
  async getStudentBreakdown(studentId: string) {
    const grades = await prisma.grade.findMany({ where: { studentId } });
    const courseIds = [...new Set(grades.map((g) => g.courseId))];
    if (courseIds.length === 0) return { semesters: [], cgpa: 0, totalCreditHours: 0 };

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

    const totalCreditHours = courseBreakdowns.reduce((s, c) => s + c.creditHours, 0);
    const weightedTotal = courseBreakdowns.reduce((s, c) => s + c.gradePoints * c.creditHours, 0);
    const cgpa = totalCreditHours === 0 ? 0 : Math.round((weightedTotal / totalCreditHours) * 100) / 100;

    return { semesters, cgpa, totalCreditHours };
  }
}

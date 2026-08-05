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
  // letter grade, then a credit-hour-weighted GPA across all courses —
  // the standard CGPA formula: sum(gradePoint * creditHours) / sum(creditHours).
  async getStudentBreakdown(studentId: string) {
    const grades = await prisma.grade.findMany({ where: { studentId } });
    const courseIds = [...new Set(grades.map((g) => g.courseId))];
    const courses = await prisma.course.findMany({ where: { id: { in: courseIds } } });
    const courseMap = new Map(courses.map((c) => [c.id, c]));

    const byCourse = courseIds.map((courseId) => {
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
        components,
        percentage,
        letter,
        gradePoints: points,
      };
    });

    const totalCreditHours = byCourse.reduce((sum, c) => sum + c.creditHours, 0);
    const weightedPoints = byCourse.reduce((sum, c) => sum + c.gradePoints * c.creditHours, 0);
    const gpa = totalCreditHours === 0 ? 0 : Math.round((weightedPoints / totalCreditHours) * 100) / 100;

    return { courses: byCourse, gpa, totalCreditHours };
  }
}

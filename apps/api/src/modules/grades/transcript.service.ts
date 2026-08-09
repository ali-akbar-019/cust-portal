import { Injectable } from '@nestjs/common';
import { prisma } from '@cust/database';
import PDFDocument from 'pdfkit';
import { GradesService } from './grades.service';

@Injectable()
export class TranscriptService {
  constructor(private readonly gradesService: GradesService) {}

  // Streams a simple but complete academic transcript: student info,
  // every semester's courses with grades, SGPA per semester, and overall
  // CGPA. Returns a Buffer so the controller can send it as a file download.
  async generateTranscript(studentId: string): Promise<Buffer> {
    const student = await prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      include: { user: { select: { email: true } }, department: true },
    });
    const breakdown = await this.gradesService.getStudentBreakdown(studentId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Capital University of Science & Technology', { align: 'center' });
      doc.fontSize(12).text('Official Academic Transcript', { align: 'center' });
      doc.moveDown(1.5);

      doc.fontSize(10);
      doc.text(`Name / Email: ${student.user.email}`);
      doc.text(`Enrollment No: ${student.enrollmentNo}`);
      doc.text(`Department: ${student.department.name}`);
      doc.text(`Current Semester: ${student.semester}`);
      doc.moveDown(1);

      for (const sem of breakdown.semesters) {
        doc.fontSize(13).text(sem.term, { underline: true });
        doc.moveDown(0.3);

        const colX = { code: 50, title: 110, ch: 300, pct: 350, grade: 410, points: 470 };
        let rowY = doc.y;
        doc.fontSize(9);
        doc.text('Code', colX.code, rowY);
        doc.text('Course', colX.title, rowY, { width: 180 });
        doc.text('CH', colX.ch, rowY);
        doc.text('%', colX.pct, rowY);
        doc.text('Grade', colX.grade, rowY);
        doc.text('Points', colX.points, rowY);
        rowY += 15;
        doc.y = rowY;
        doc.moveDown(0.2);

        for (const c of sem.courses) {
          rowY = doc.y;
          doc.text(c.courseCode, colX.code, rowY);
          doc.text(c.courseTitle, colX.title, rowY, { width: 180 });
          doc.text(String(c.creditHours), colX.ch, rowY);
          doc.text(`${c.percentage}%`, colX.pct, rowY);
          doc.text(c.letter, colX.grade, rowY);
          doc.text(c.gradePoints.toFixed(1), colX.points, rowY);
          doc.y = rowY + 16;
        }

        doc.moveDown(0.3);
        doc.fontSize(9).text(`Semester GPA: ${sem.sgpa.toFixed(2)}  |  Credit Hours: ${sem.creditHours}`, { align: 'right' });
        doc.moveDown(1);
      }

      doc.moveDown(0.5);
      doc.fontSize(12).text(`Cumulative GPA: ${breakdown.cgpa.toFixed(2)}`, { align: 'right' });
      doc.fontSize(10).text(`Total Credit Hours: ${breakdown.totalCreditHours}`, { align: 'right' });

      doc.moveDown(2);
      doc.fontSize(8).fillColor('gray').text(`Generated on ${new Date().toLocaleString()} — unofficial copy, not valid without registrar signature.`, { align: 'center' });

      doc.end();
    });
  }
}

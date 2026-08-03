import { Module } from '@nestjs/common';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { BlocksModule } from './modules/blocks/blocks.module';
import { CoursesModule } from './modules/courses/courses.module';
import { SectionsModule } from './modules/sections/sections.module';
import { TimetableModule } from './modules/timetable/timetable.module';
import { EnrollmentModule } from './modules/enrollment/enrollment.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { GradesModule } from './modules/grades/grades.module';
import { LibraryModule } from './modules/library/library.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { RequestsModule } from './modules/requests/requests.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FeedbackModule } from './modules/feedback/feedback.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    StudentsModule,
    TeachersModule,
    DepartmentsModule,
    BlocksModule,
    CoursesModule,
    SectionsModule,
    TimetableModule,
    EnrollmentModule,
    AssignmentsModule,
    AttendanceModule,
    GradesModule,
    LibraryModule,
    InvoicesModule,
    ComplaintsModule,
    RequestsModule,
    NotificationsModule,
    FeedbackModule,
  ],
})
export class AppModule {}

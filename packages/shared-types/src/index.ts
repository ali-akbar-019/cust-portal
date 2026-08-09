// Types shared between apps/web and apps/api so both sides stay in sync
// without duplicating shape definitions.

export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'LIBRARIAN';

export type Weekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';

export interface TimetableSlotDTO {
  id: string;
  day: Weekday;
  startTime: string;
  endTime: string;
  roomLabel: string; // e.g. "B3"
  blockName: string; // e.g. "B"
  courseCode: string;
  teacherName: string;
}

export interface LoginResponseDTO {
  accessToken: string;
  refreshToken: string;
  role: Role;
}

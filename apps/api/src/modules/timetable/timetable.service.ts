import { Injectable } from '@nestjs/common';
import { prisma } from '@cust/database';
import { overlaps } from './time.util';

export interface SlotCandidate {
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
  startTime: string; // '09:00'
  endTime: string; // '10:30'
  roomId: string;
  teacherId: string;
  sectionId: string;
}

export interface ClashResult {
  hasClash: boolean;
  reasons: string[];
}

@Injectable()
export class TimetableService {
  /**
   * Checks a candidate slot against existing slots on the same day that
   * share the room, the teacher (via the slot's section), or the section
   * itself — then narrows to actual time overlaps. Three separate OR
   * branches let us report *which* resource conflicted, which is far more
   * useful to an admin than a bare "clash" boolean.
   */
  async checkClash(candidate: SlotCandidate): Promise<ClashResult> {
    const sameDaySlots = await prisma.timetableSlot.findMany({
      where: {
        day: candidate.day,
        OR: [
          { roomId: candidate.roomId },
          { sectionId: candidate.sectionId },
          { section: { teacherId: candidate.teacherId } },
        ],
      },
      include: { section: true, room: true },
    });

    const reasons: string[] = [];

    for (const slot of sameDaySlots) {
      if (!overlaps(candidate.startTime, candidate.endTime, slot.startTime, slot.endTime)) {
        continue; // same resource, but different time — no clash
      }
      if (slot.roomId === candidate.roomId) {
        reasons.push(`Room ${slot.room.label} is already booked ${slot.startTime}-${slot.endTime} on ${candidate.day}`);
      }
      if (slot.section.teacherId === candidate.teacherId) {
        reasons.push(`Teacher already has a class ${slot.startTime}-${slot.endTime} on ${candidate.day}`);
      }
      if (slot.sectionId === candidate.sectionId) {
        reasons.push(`Section already has a class ${slot.startTime}-${slot.endTime} on ${candidate.day}`);
      }
    }

    return { hasClash: reasons.length > 0, reasons };
  }

  async createSlot(candidate: SlotCandidate) {
    const clash = await this.checkClash(candidate);
    if (clash.hasClash) {
      return { success: false as const, reasons: clash.reasons };
    }
    const slot = await prisma.timetableSlot.create({
      data: {
        day: candidate.day,
        startTime: candidate.startTime,
        endTime: candidate.endTime,
        roomId: candidate.roomId,
        sectionId: candidate.sectionId,
      },
    });
    return { success: true as const, slot };
  }

  getStudentTimetable(sectionId: string) {
    return prisma.timetableSlot.findMany({
      where: { sectionId },
      include: { room: { include: { floor: { include: { block: true } } } }, section: { include: { course: true, teacher: { include: { user: true } } } } },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });
  }

  // The full picture an admin needs after running the generator: every
  // section of a department, its teacher, which room + time window each
  // slot occupies, and the enrolled students — so they can answer "who
  // is where, when and with whom" without clicking into student pages.
  getDepartmentTimetable(departmentId: string) {
    return prisma.section.findMany({
      where: { course: { departmentId } },
      include: {
        course: { select: { code: true, title: true, creditHours: true } },
        teacher: { include: { user: { select: { email: true } } } },
        _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } },
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { student: { select: { id: true, enrollmentNo: true, semester: true } } },
        },
        slots: {
          include: {
            room: { select: { id: true, label: true, type: true, floor: { select: { floorNumber: true, block: { select: { name: true } } } } } },
          },
          orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
        },
      },
      orderBy: [{ term: 'asc' }, { course: { code: 'asc' } }],
    });
  }
}

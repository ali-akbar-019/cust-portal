import { Injectable } from '@nestjs/common';

export interface SlotCandidate {
  day: string; // MON | TUE | WED | THU | FRI | SAT
  startTime: string; // '09:00'
  endTime: string; // '10:30'
  roomId: string;
  teacherId: string;
  sectionId: string;
}

@Injectable()
export class TimetableService {
  /**
   * Checks a candidate slot against existing slots for the same day.
   * A conflict exists if the room, teacher, OR section overlaps in time.
   * TODO: replace with a real Prisma query:
   *   findMany({ where: { day, OR: [{ roomId }, { teacherId }, { sectionId }] } })
   *   then filter by time overlap: newStart < existingEnd && newEnd > existingStart
   */
  async checkClash(candidate: SlotCandidate): Promise<{ hasClash: boolean; reasons: string[] }> {
    const reasons: string[] = [];
    // TODO: implement DB-backed overlap check
    return { hasClash: reasons.length > 0, reasons };
  }
}

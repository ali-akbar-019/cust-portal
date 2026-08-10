import { Injectable } from '@nestjs/common';
import { prisma } from '@cust/database';
import { overlaps, toMinutes } from '../time.util';

type Weekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
const DAYS: Weekday[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const SLOT_LENGTH_MIN = 90; // 1.5-hour class blocks

interface PlacedSlot {
  day: Weekday;
  startTime: string;
  endTime: string;
  roomId: string;
  teacherId: string;
  sectionId: string;
}

interface SectionToPlace {
  id: string;
  teacherId: string;
  capacity: number;
  requiresLab: boolean;
}

/**
 * See docs/timetable-design.md for the full design rationale. Summary:
 * greedy placement ordered hardest-first (labs, then largest sections),
 * with backtracking against an in-memory list of tentative placements
 * (not the DB) so a failed branch can be undone cheaply before we ever
 * write anything. Only a fully-successful (or exhausted) run is persisted.
 */
@Injectable()
export class TimetableGeneratorService {
  async generate(departmentId: string) {
    const department = await prisma.department.findUniqueOrThrow({ where: { id: departmentId } });
    const dayStart = department.dayStartTime ?? '08:00';
    const dayEnd = department.dayEndTime ?? '16:00';

    const sections = await prisma.section.findMany({
      where: { course: { departmentId } },
      include: { course: true },
    });
    const toPlace: SectionToPlace[] = sections.map((s) => ({
      id: s.id,
      teacherId: s.teacherId,
      capacity: s.capacity,
      requiresLab: s.course.requiresLab,
    }));
    // hardest-first: lab sections, then by capacity descending (harder to fit)
    toPlace.sort((a, b) => Number(b.requiresLab) - Number(a.requiresLab) || b.capacity - a.capacity);

    const rooms = await prisma.room.findMany();
    const timeSlots = this.buildTimeGrid(dayStart, dayEnd);

    const placed: PlacedSlot[] = [];
    const unplaced: string[] = [];

    const success = this.backtrack(0, toPlace, rooms, timeSlots, placed);
    if (!success) {
      // whatever backtrack couldn't fit gets reported, rest stays placed
      const placedSectionIds = new Set(placed.map((p) => p.sectionId));
      unplaced.push(...toPlace.filter((s) => !placedSectionIds.has(s.id)).map((s) => s.id));
    }

    // persist only what was successfully placed, replacing this department's
    // previous placements so re-running Generate overrides (never duplicates)
    await prisma.$transaction([
      prisma.timetableSlot.deleteMany({
        where: { sectionId: { in: toPlace.map((s) => s.id) } },
      }),
      ...placed.map((slot) =>
        prisma.timetableSlot.create({
          data: {
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            roomId: slot.roomId,
            sectionId: slot.sectionId,
          },
        }),
      ),
    ]);

    return { placedCount: placed.length, unplacedSectionIds: unplaced };
  }

  private buildTimeGrid(dayStart: string, dayEnd: string): { start: string; end: string }[] {
    const slots: { start: string; end: string }[] = [];
    let cursor = toMinutes(dayStart);
    const end = toMinutes(dayEnd);
    while (cursor + SLOT_LENGTH_MIN <= end) {
      const start = cursor;
      const finish = cursor + SLOT_LENGTH_MIN;
      slots.push({
        start: `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`,
        end: `${String(Math.floor(finish / 60)).padStart(2, '0')}:${String(finish % 60).padStart(2, '0')}`,
      });
      cursor += SLOT_LENGTH_MIN;
    }
    return slots;
  }

  private hasInMemoryClash(candidate: PlacedSlot, placed: PlacedSlot[]): boolean {
    return placed.some(
      (p) =>
        p.day === candidate.day &&
        overlaps(candidate.startTime, candidate.endTime, p.startTime, p.endTime) &&
        (p.roomId === candidate.roomId || p.teacherId === candidate.teacherId || p.sectionId === candidate.sectionId),
    );
  }

  private backtrack(
    index: number,
    sections: SectionToPlace[],
    rooms: { id: string; capacity: number; type: string }[],
    timeSlots: { start: string; end: string }[],
    placed: PlacedSlot[],
  ): boolean {
    if (index === sections.length) return true;
    const section = sections[index];
    if (!section) return true; // out of bounds guard, should never hit given the index check above

    const feasibleRooms = rooms.filter(
      (r) => r.capacity >= section.capacity && (section.requiresLab ? r.type === 'LAB' : true),
    );

    // Candidate ordering makes the finished timetable look like a real weekly
    // grid rather than a single pile-up at 08:00:
    //   1. quietest (day, time) cells first — spread load, not just days
    //   2. then a per-section rotation across times + days, so early sections
    //      don't all grab the same 08:00 column (section k prefers time slot
    //      k % count and day k % days). This staggers every class onto a
    //      different (day, time) until the grid genuinely fills up.
    const timeIndexByStart = new Map(timeSlots.map((s, i) => [s.start, i]));
    const timeRot = index % timeSlots.length;
    const dayRot = index % DAYS.length;
    const cellLoads = new Map<string, number>();
    for (const p of placed) {
      const key = `${p.day}|${p.startTime}`;
      cellLoads.set(key, (cellLoads.get(key) ?? 0) + 1);
    }

    const candidates: PlacedSlot[] = [];
    for (const day of DAYS) {
      for (const slot of timeSlots) {
        for (const room of feasibleRooms) {
          candidates.push({
            day,
            startTime: slot.start,
            endTime: slot.end,
            roomId: room.id,
            teacherId: section.teacherId,
            sectionId: section.id,
          });
        }
      }
    }
    candidates.sort((a, b) => {
      const loadA = cellLoads.get(`${a.day}|${a.startTime}`) ?? 0;
      const loadB = cellLoads.get(`${b.day}|${b.startTime}`) ?? 0;
      if (loadA !== loadB) return loadA - loadB;
      const timePrefA = (timeIndexByStart.get(a.startTime) ?? 0) === timeRot ? 0 : 1;
      const timePrefB = (timeIndexByStart.get(b.startTime) ?? 0) === timeRot ? 0 : 1;
      if (timePrefA !== timePrefB) return timePrefA - timePrefB;
      const dayPrefA = (DAYS.indexOf(a.day) - dayRot + DAYS.length) % DAYS.length;
      const dayPrefB = (DAYS.indexOf(b.day) - dayRot + DAYS.length) % DAYS.length;
      if (dayPrefA !== dayPrefB) return dayPrefA - dayPrefB;
      const timeA = timeIndexByStart.get(a.startTime) ?? 0;
      const timeB = timeIndexByStart.get(b.startTime) ?? 0;
      return timeA - timeB;
    });

    for (const candidate of candidates) {
      if (this.hasInMemoryClash(candidate, placed)) continue;

      placed.push(candidate);
      if (this.backtrack(index + 1, sections, rooms, timeSlots, placed)) return true;
      placed.pop(); // undo and try the next candidate
    }
    // no candidate worked for this section — leave it for the caller to
    // report as unplaced rather than failing the whole run
    return this.backtrack(index + 1, sections, rooms, timeSlots, placed);
  }
}

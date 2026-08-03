# Timetable Generator — Design Notes

## Entities
Block (A, B, C, D, E, F, H, J, K) -> Floor -> Room (e.g. "B1", "B2"...)
Each Room has a capacity and a type (LECTURE_HALL | LAB | SEMINAR_ROOM).

## Constraints the generator must respect
1. No room double-booked at the same day/time.
2. No teacher double-booked at the same day/time.
3. No section (student group) double-booked at the same day/time.
4. Room capacity >= section's expected student count.
5. Lab courses must be placed in LAB-type rooms.
6. Each department has a preferred daily time window (configurable per department,
   not hardcoded) — the generator tries to respect this before falling back to
   any open slot.

## Algorithm: greedy placement + backtracking (CSP)
- Order sections by constraint tightness first (lab courses, teachers with
  limited availability, large sections needing big rooms) — place the hardest
  things first.
- For each section, build the list of feasible (day, time, room) candidates
  that satisfy constraints 1-5 above, filtered by the department's time window.
- Attempt candidates in order. On success, lock it in and move to the next
  section. On failure for every candidate, backtrack to the previous section,
  try its next candidate, and retry.
- Anything that still can't be placed after backtracking is surfaced to the
  admin as "needs manual placement" rather than silently failing.

## Why not a DB-level exclusion constraint (v1)
Postgres can enforce "no overlapping time ranges" natively via the
`btree_gist` extension + an `EXCLUDE` constraint, which would make double-
booking impossible at the database layer (not just the application layer).
This is a good v2 hardening step once the core generator is working — for v1,
overlap-checking lives in `TimetableService.checkClash()` so the logic stays
easy to test and explain.

## Open questions to revisit once real CUST data is available
- Exact list of departments and their timing windows (need real data, not
  assumed 8-4 blocks).
- Whether some rooms are shared across departments or reserved.
- Whether the university already has a fixed room-capacity list per block
  (needed to seed the Room table accurately).

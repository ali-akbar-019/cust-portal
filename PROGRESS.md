# CUST Portal — Build Progress Tracker

Legend: [x] done · [~] in progress · [ ] not started

## 0. Scaffolding
- [x] Monorepo structure (Turborepo, pnpm workspaces)
- [x] Root configs (tsconfig base, turbo.json, .gitignore)
- [x] apps/api skeleton (NestJS: main.ts, app.module.ts, nest-cli.json)
- [x] apps/web skeleton (Next.js: layout, page, globals.css)
- [x] packages/database (Prisma schema drafted — Users, Academic structure,
      Blocks/Floors/Rooms, Timetable, Assignments, Attendance, Grades)
- [x] packages/shared-types (initial shared DTOs)
- [x] All 19 backend modules stubbed (module/controller/service files, empty logic)
- [x] Timetable module: clash-check + generator design written (logic TODO)
- [x] CUST logo added to apps/web/public
- [x] Switched DB engine from Postgres to MySQL (XAMPP-compatible) — schema.prisma provider + .env.example updated, no application code changes needed

## 1. Foundation (in progress)
- [x] Seed script written (departments, blocks/floors/rooms, 1 admin/teacher/student sample user)
      — not yet run against a real DB (needs DATABASE_URL + `prisma migrate dev` on your machine)
- [x] Auth: real login logic (bcrypt compare), JWT issuance (access 15m + refresh 7d), refresh endpoint
- [x] Role guard + decorators (@Roles(), RolesGuard, JwtAuthGuard, @CurrentUser())
- [x] Example wiring: BlocksController (GET = any authenticated role, POST = ADMIN only) + real BlocksService
- [x] .env.example added for apps/api
- [x] Users/Students/Teachers modules: real CRUD (transactional user+profile create for students/teachers)
- [x] Frontend: login page, auth context, protected route wrapper per role (Next.js middleware)

## 2. Timetable Engine (done for v1)
- [x] TimetableService.checkClash() — real Prisma overlap query, reports which resource conflicted (room/teacher/section)
- [x] TimetableGeneratorService.generate() — CSP greedy+backtracking implemented (in-memory backtrack, only persists a successful/exhausted run)
- [x] Admin UI: block/floor/room viewer (add-forms still TODO)
- [x] Admin UI: trigger generation, review unplaced sections
- [x] Student UI: personalized timetable view (grouped by day)
- [x] Teacher UI: personalized timetable view (built as a follow-up during the Assignments chunk)

## 3. Assignments (done for v1)
- [x] Teacher: create/edit assignment + file upload (local disk storage for now — R2/S3 swap is a TODO)
- [x] Student: submit before deadline (server-side deadline lock, rejects late submissions)
- [x] Teacher: grade + feedback
- [ ] Notifications on new assignment / grade posted (waiting on Notifications module)
- [x] Follow-up: teacher timetable view page
- [x] Follow-up: GET /departments endpoint + real dropdown in the generator UI

## 4. Attendance (done for v1)
- [x] Teacher: mark attendance per section per date (bulk UI — roster with P/A toggles, re-marking overwrites via upsert)
- [x] Student: view % with low-attendance alert (below 75% threshold)

## 5. Grades (done for v1)
- [x] Teacher: upload component-wise marks (upsert — re-entering a component updates it, no duplicates)
- [x] Student: breakdown view + GPA calculation (credit-hour-weighted)
- [ ] CUST's real grading scale/policy not yet verified — using a standard 4.0-scale mapping as a placeholder (flagged in grade-scale.util.ts)

## 6. Remaining Tasjeel-parity modules (not started)
- [ ] Enrollment (self-enrollment, enrollment schedules)
- [ ] Library (clearance, book reservation)
- [ ] Invoices
- [ ] Complaints
- [ ] Requests (transcript, letters, course withdraw, personal info change)
- [ ] Feedback/QA
- [x] Notifications: Announcement model + posting (admin/teacher) + targeted feed (ALL/DEPARTMENT/SECTION) — in-app only, email via BullMQ still TODO
- [ ] Follow-up: teacher-facing notifications view page (same pattern as the student one, not built yet)

## 7. Polish / Deployment (not started)
- [ ] Docker setup for api + web
- [ ] CI (typecheck + lint on push)
- [ ] Deploy: web -> Vercel, api -> Railway/Render, DB -> managed MySQL (Railway/PlanetScale)
- [ ] Seed realistic CUST data (real block/room list, real department timing windows)

---
**Next chunk to build:** Enrollment module (self-enrollment + enrollment schedules) — next
item in the remaining Tasjeel-parity set.

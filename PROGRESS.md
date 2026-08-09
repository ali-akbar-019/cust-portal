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

## 6. Remaining Tasjeel-parity modules (done for v1 — all core modules built)
- [x] Enrollment — EnrollmentSchedule model (admin-defined open window per department), self-enrollment with 3 gates (window open, seat available, not already enrolled), withdraw, seat-count-aware section browsing, student enrollment page
  - [ ] Follow-up: admin UI to create enrollment schedules (backend endpoint exists, POST /enrollment/schedules — no form yet)
- [x] Library — Book/BookReservation/LibraryClearance models, reserve (decrements copies, transactional) + cancel (returns copy), clearance request/approve/reject flow, student browse+reserve+request-clearance page, admin pending-clearances approval page
  - [ ] Follow-up: no Book rows in seed.ts yet — library page will show empty until books are added (via Prisma Studio or a seed update)
- [x] Invoices — Invoice model, admin creation, student list (lazy PENDING->OVERDUE flip on read), stubbed "pay" action (no real payment gateway — flagged in code), admin + student pages
- [x] Complaints — Complaint model, student file/view-own, admin triage list (OPEN sorted first) + status update + response, student and admin pages
- [x] Requests (transcript, letters, course withdraw, personal info change) — one flexible Request model covering all sub-types, COURSE_WITHDRAW has a real side effect (flips Enrollment to WITHDRAWN on approval), student filing/history page, admin triage page
  - [ ] Follow-up: TRANSCRIPT/LETTER requests are just status+remarks for now — no actual PDF generation yet (would hook into the pdf skill/service later)
- [x] Feedback/QA — Feedback model, upsert submission (1 per student per section), anonymized aggregate view for teachers (average + comments, never traced to a student), student submission page, teacher aggregate view page
- [x] Notifications: Announcement model + posting (admin/teacher) + targeted feed (ALL/DEPARTMENT/SECTION) — in-app only, email via BullMQ still TODO
- [ ] Follow-up: teacher-facing notifications view page (same pattern as the student one, not built yet)

## 7. Polish / Deployment (not started)
- [x] Docker setup for api + web (multi-stage Dockerfiles, docker-compose with a MySQL container for deployment-like testing — day-to-day dev can still just use `pnpm dev` + XAMPP)
- [ ] CI (typecheck + lint on push)
- [ ] Deploy: web -> Vercel, api -> Railway/Render, DB -> managed MySQL (Railway/PlanetScale)
- [ ] Seed realistic CUST data (real block/room list, real department timing windows)

## 8. Post-launch fixes
- [x] GET /users/me — resolves the logged-in user's studentId/teacherId/sectionId/departmentId from the JWT. AuthContext now calls this right after login/rehydration and exposes it as `profile`; every page that previously used a PLACEHOLDER_*_ID (teacher timetable, student attendance/timetable/invoices/results/requests/complaints) now pulls the real id from `profile`.
- [x] Fixed a real bug found while wiring the above: several STUDENT-only write endpoints (assignment submit, self-enrollment, withdraw, library reserve/cancel/clearance, requests create, complaints create, feedback submit, invoice pay) were passing `user.sub` (the User id) directly as the studentId — but every one of those tables has a foreign key to Student.id, not User.id. Added `resolveStudentId()` (common/guards/resolve-student-id.util.ts) which looks up the real Student.id from the JWT's user id, and wired it into all of the above.
- [x] Hardened server-side authorization: added `ensureOwnStudentOrElevated()` (common/guards/self-or-elevated.util.ts) and wired it into every GET endpoint that takes a :studentId URL param (students, attendance, grades, invoices, requests, complaints, library reservations, feedback) — a STUDENT caller now gets a 403 if the id in the URL isn't their own; ADMIN/TEACHER pass through unaffected.

- [x] Fixed a crash-on-startup bug: `@cust/database` and `@cust/shared-types` had `main` pointing straight at their raw `src/index.ts` — pnpm workspace-links them into node_modules, so Node tried to `require()` uncompiled TypeScript directly at runtime and crashed on the first `as` cast it hit ("SyntaxError: Unexpected identifier 'as'"). Both packages now have a real `tsc` build step (`main`/`types` point at `dist/`), and `turbo.json`'s `dev` task now `dependsOn: ["^build"]` so Turborepo builds these packages automatically before starting the apps — no extra manual step needed beyond `pnpm install` + `pnpm dev`.

## 9. Navigation fix
- [x] Fixed missing routes: `/admin/dashboard` and `/teacher/dashboard` were referenced by the post-login redirect but never actually built — added both, plus a completely missing Assignments frontend (backend existed since that chunk, but no page was ever built for either student or teacher).
- [x] Added `admin/layout.tsx`, `teacher/layout.tsx`, `student/layout.tsx` — each with a real sidebar nav linking every page for that role, plus a logout button. Previously every page was only reachable by typing its exact URL; there was no in-app navigation at all.
- [x] Verified programmatically: every nav link across all three layouts + both dashboards resolves to a real page.tsx (26/26).

## 10. Comprehensive seed data
- [x] Rewrote `packages/database/prisma/seed.ts` from a minimal 3-user seed into a full realistic dataset: 1 admin, 6 teachers (2 per department), 18 students (6 per department across SE/CS/EE, mixed semesters), 12 courses with sections for Fall 2026, enrollments (each student enrolled in every section in their department), an open EnrollmentSchedule per department (so self-enrollment is testable immediately), auto-placed timetable slots (simple non-clashing greedy placement per department, respects room capacity/type and teacher/section conflicts), ~21 weekdays of attendance per enrollment (~85% present), 3 grade components per enrollment, 1 assignment per section with a sample submission, 2 invoices per student (one paid, one pending/overdue), a 10-book library catalog with a few reservations and one pending clearance request, 3 announcements (ALL/DEPARTMENT/SECTION), 2 complaints, 2 requests (including a course-withdraw), and feedback entries.
- [x] `admin@cust.edu.pk` / `teacher@cust.edu.pk` / `student@cust.edu.pk` (all in SE) are preserved as the primary accounts Ali already has credentials for — the rest of the seeded users follow a predictable email pattern per department.
- [x] Script is idempotent (safe to re-run — uses upsert or findFirst-then-create checks throughout) so `npx prisma db seed` can be run again without duplicating data.

## 11. Version 2 — UX overhaul + Librarian role
- [x] **Fixed root cause of "stuck loading" bugs**: `StudentsService.getTimetable` depended on the legacy unused `Student.sectionId` field. Rewrote it to aggregate timetable slots across all active `Enrollment` records instead — this is the actual bug behind the student timetable page hanging forever, since the frontend guard on the never-populated `sectionId` meant the fetch never fired.
- [x] Added the same resilience pattern (stop "Loading..." and show a clear error instead of hanging) to student attendance/timetable and teacher timetable pages.
- [x] **Student dashboard** — was empty, now shows attendance %, CGPA, today's schedule, and recent announcements as clickable summary cards.
- [x] **Student Results page** — rewritten with collapsible per-semester sections (SGPA each), overall CGPA, and a working **Download Transcript** button.
- [x] **Transcript PDF generation** — new `transcript.service.ts` (pdfkit) streams a real downloadable PDF with per-semester course tables and grades.
- [x] **GradesService.getStudentBreakdown** rewritten to group courses by term (via Enrollment→Section→term) instead of a flat list — powers both the Results page and the transcript.
- [x] New endpoints for dropdown-driven UX (replacing "type an ID" inputs): `GET /students/:id/sections`, `GET /teachers/:id/sections`, `GET /sections/:id/roster`.
- [x] **Student Enrollment page** — department text-input replaced with a real dropdown (defaults to the student's own department).
- [x] **Student Assignments page** — "Section ID" input replaced with a dropdown of the student's actual enrolled courses.
- [x] **Teacher Attendance page** — "Section ID" input replaced with a dropdown of the teacher's assigned sections; added "mark all present/absent" shortcuts.
- [x] **Teacher Grades page** — raw Student ID / Course ID inputs replaced with section → roster dropdowns (course id is derived automatically from the selected section).
- [x] **Librarian role introduced end-to-end**: `LIBRARIAN` added to the Role enum + a minimal `Librarian` profile model; library clearance/book endpoints now accept `ADMIN` or `LIBRARIAN`; new `POST /library/books` endpoint; seeded `librarian@cust.edu.pk` account; full frontend — `/librarian/dashboard`, `/librarian/books` (catalog + add book), `/librarian/clearances` (approve/reject), sidebar layout, and login-redirect wiring in both `auth-context.tsx` and `middleware.ts`.
- [ ] Follow-up: payments/invoices were explicitly left as-is per Ali's request ("keep them simple like how it's rn").
- [ ] Follow-up: book reservation fulfillment (PENDING → FULFILLED on physical pickup) isn't wired into the librarian UI yet — only APPROVED/REJECTED clearance actions are.
- [ ] Follow-up: a broader UI/UX polish pass (visual design, not just functional dropdowns) is still open — this round focused on fixing broken/unusable flows first.

---
**Next chunk to build:** CI (typecheck + lint on push via GitHub Actions), then the broader visual UI/UX polish pass.

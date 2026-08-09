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
- [x] Follow-up: teacher-facing notifications view page (built in round 16 alongside a librarian one, plus the site-wide notification bell)

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

## 12. Visual UI/UX overhaul — "Collegiate Ledger" theme
- [x] Built a distinctive design system grounded in CUST's own crest colors (deep navy `#14213D` + crimson ribbon-red `#A3182A`) instead of default Tailwind slate/blue — see design tokens in `globals.css`.
- [x] Typography: Source Serif 4 for all headings (academic/transcript feel), Inter for body/UI, IBM Plex Mono for record identifiers (course codes, enrollment numbers) — loaded via `next/font/google` in `layout.tsx`.
- [x] **High-leverage move**: remapped Tailwind v4's `slate`/`red`/`green`/`yellow`/`blue` color scales via `@theme` in `globals.css` — since every page already uses these exact utility classes, this single change re-skins the whole app (all ~40 pages) with richer, jewel-toned colors without editing each file individually.
- [x] Signature element: `.ribbon-badge` — a notched banner shape (echoes the crest's "CUST" ribbon) used for status tags, via the new `<Ribbon>` component.
- [x] Hand-rewrote the highest-leverage surfaces in full: `RoleLayout` (now a dark-navy sidebar with the crest, ribbon role tag, active-state indicator — and fully responsive: collapses to a hamburger-triggered drawer below `lg`), the login page (premium split-panel layout, hidden identity panel on mobile), all 4 role dashboards (Admin/Teacher/Student/Librarian, using new `<QuickLinkCard>`/`<StatCard>` components), and the student Results page (ledger-card styling, ribbon SGPA badges, mono course codes).
- [x] Accessibility/quality floor per the design brief: visible `:focus-visible` outlines sitewide, `prefers-reduced-motion` respected, responsive down to mobile on every rewritten surface.
- [x] Follow-up: the pages not individually rewritten in the theme overhaul got handled in round 15's full content-enrichment pass — every role page was rebuilt on `.ledger-card`/`<Ribbon>`/`<StatCard>`/`<QuickLinkCard>` and the shared `<PageHeader>`/`<EmptyState>` components, so the design system is now applied consistently across all ~40 pages, not just re-colored.

## 13. Compile error fixes (post-theme-overhaul)
- [x] Fixed a real CSS bug: a comment in `globals.css` contained a literal `*/` sequence inside its text ("bg-slate-*/text-slate-*/..."), which closed the CSS comment early and broke parsing. Reworded to avoid embedded `*/`.
- [x] Added `express` + `@types/express` as direct dependencies of `apps/api` — `grades.controller.ts` imports `Response` from `express` for the transcript download endpoint, but express was only ever a transitive dependency via `@nestjs/platform-express`, which isn't guaranteed to resolve for direct type imports.
- [ ] Environment step (not a code bug): the `Type '"LIBRARIAN"' is not assignable to type 'Role'` error means the local Prisma Client hasn't been regenerated since `LIBRARIAN` was added to the schema. Run `npx prisma migrate dev` (or `npx prisma generate`) inside `packages/database` to pick it up.

## 14. Content density, charts, and calendar timetable
- [x] Added `recharts` for real data visualization. New `<ChartCard>` wrapper component.
- [x] **Student dashboard**: attendance trend line chart (last 10 classes), latest-semester grade bar chart (color-coded by performance), 4 stat cards (was 3), scrollable "Today's Schedule" and "Recent Announcements" widgets, "My Courses" chip list.
- [x] **Admin dashboard**: real stats (total students/teachers, open complaints, pending requests — previously just links, no data), students-by-department bar chart, faculty-vs-students pie chart, a "Needs your attention" widget aggregating open complaints/pending requests/pending library clearances.
- [x] **Teacher dashboard**: real stats (sections teaching, total students, avg section size), enrollment-by-section bar chart (enrolled vs. capacity).
- [x] **New: Admin → Manage Users page** (`/admin/users`) — tabbed forms to create new Student or Teacher accounts (department dropdown, semester/designation selects) — previously only existed as an unused backend endpoint with no UI at all.
- [x] **Calendar-style weekly timetable grid** for both student and teacher timetable pages — replaces the old day-grouped card list with a real Mon–Sat × time-slot grid table, color-coded by course, with a legend. This was an explicit ask ("proper calendar type for timetables").
- [x] Custom themed scrollbar (thin, navy-tinted) applied sitewide via `* ::-webkit-scrollbar`, plus a `.scroll-area` utility for constrained-height lists (attendance roster now scrolls in a fixed-height container instead of pushing the page).
- [x] Follow-up: charts + calendar-grid treatment extended to the remaining pages in round 15 (library, invoices, complaints, requests, notifications, blocks, feedback, and every other page got real data, stat cards, filter tabs, and ribbons).

---

## 15. Full-page content density pass (every role page rebuilt on real data)

Round covering all ~40 frontend pages with informative, data-dense content instead of bare one-line headers — all client-side, built on existing API endpoints (no backend changes except noted fixes).

**Shared building blocks**
- New `PageHeader` (eyebrow + serif title + subtext + optional action) and `EmptyState` (title + hint) components in `src/components/ui/page-header.tsx`; used across every rewritten page alongside the existing `StatCard`/`QuickLinkCard`/`ChartCard`/`Ribbon` kit.

**Student pages**
- `attendance` — stat grid (attendance %, present/absent/total), progress-vs-threshold bar with threshold tick, last-6-sessions P/A strip, recent-records list with date/status ribbons.
- `complaints` & `requests` — status count ribbons, filter tabs, response/remarks threads, richer cards with mono IDs and timestamps.
- `notifications` — full notice board with role ribbons and posted-by metadata.
- `library` — full book catalog grid with ISBN/availability ribbons + "My Reservations" list with cancel, plus a course/author search.
- `invoices` — outstanding/paid/due-day counts (StatCards), due-in-X-day chips, Pay Now action.
- `enrollment` — live enrollment-window banner, department picker, schedule window, enroll/withdraw actions with active enrollments listed.
- `feedback` — course dropdown + star-rating submission + "my reviews" history (`/feedback/mine/:studentId`).
- `assignments` — open/due/past-due stat cards, deadline ribbons, submission status + file link.

**Admin pages**
- `blocks` — per-block floor & room chips, capacity/type breakdown.
- `invoices` — student picker + department filter + full ledger.
- `complaints`/`requests` — status counts, filter tabs, richer cards, approve/reject with remarks.
- `library` — pending-clearance count ribbon on the dashboard.
- `notifications` — ALL/DEPARTMENT/SECTION audience picker with department/section dropdowns (loaded via `/sections?departmentId=...`) + recently-published feed.
- `timetable-generator` — department picker + result board with placed/unplaced counts.

**Teacher pages**
- `feedback` — section selector, avg/response stat cards, satisfaction meter bar, comment list.
- `assignments` — section picker, robust posting form, posted list, submission detail with inline grading (grade + feedback + Save Grade via `/assignments/submissions/:id/grade`).
- `grades` — section/component/roster pickers, marks entry.
- `attendance` — section + date pickers, present/absent stat cards, P/A roster with "mark all" shortcuts (course code echo guarded).

**Librarian pages**
- `dashboard` — catalog stats + clearance count + quick links.
- `books` — add-book form, search, per-book availability progress bars.
- `clearances` — enriched queue (student info, request line, approve/reject).

**Pre-existing bug fixes caught by the stricter typecheck**
- `currentCourse?.course.code` in teacher attendance; `h.section.course.title` in student feedback; `decodeURIComponent(match[1] ?? '')` in `auth-context.tsx` so the profile restore works with encoded tokens.
- `pnpm --filter @cust/web typecheck` and `next build` both green.

---

## 16. Feedback round — complete transcript, grade sheet, admin tools, notification bell

Applied Ali's round of direct feedback across both apps.

**Grading / Results**
- **Teacher grade sheet table** — replaced the dropdown-per-student "Enter Grades" UI with a real spreadsheet: new `GET /grades/section/:sectionId` endpoint returns each enrolled student + their existing component scores; the page shows a student × component grid with per-cell marks/max inputs, live running % + letter, and a single "Save Sheet" that upserts only the changed cells (idempotent, no dup rows).
- **Complete student transcript** — `getStudentBreakdown` now fetches the student's `semester` and aligns recorded terms to it: a 7th-sem student sees Semester cards 1st…7th in order, with any semesters lacking records rendered as "Not yet recorded" placeholders (so the transcript reads history-first). CGPA + per-semester SGPA stay credit-hour-weighted. The PDF transcript now prints every semester up to the current one (blank semesters show "No courses on record"), labels the current one, and lists total credit hours.
- Results page stats (CGPA / current semester / semesters on file / credit hours) + Download Transcript button.

**Attendance roster bug (real fix)**
- `AttendanceService.getSectionRoster` was querying the legacy `Student.sectionId` field (which seeds never set) → a section with 6 enrolled students showed "No students enrolled". Rewrote it to read from active `Enrollment` records and attach that date's attendance — roster now correctly shows every enrolled student with Present/absent toggles.

**Uploads file links (404 fix)**
- The API serves assignment files at `/uploads/...` on the API origin, but the teacher assignments page linked them relative, so clicking produced a 404 on the web origin. Added `absoluteFileUrl()` in `api-client.ts` and used it on all "View submission file" links so they resolve to `http://localhost:4000/uploads/...`.

**Academic structure / admin**
- **Add departments** — new `POST /departments` (ADMIN) endpoint + new `/admin/departments` page with an Add-Department form (name, code, class window start/end) and a catalog of existing departments. Wired into the admin nav.
- **Complete department timetable view** — new `GET /timetable/department/:departmentId` returns every section of a department with its teacher, assigned room (block/floor/label/type), and the full enrolled-student roster. The admin **Timetable Generator** page now shows the finished weekly Mon–Sat × time grid (color-coded course chips, room + teacher on each slot, expandable "N students" roster per slot) plus a section-roster summary — so an admin can see exactly *which room, which section, which teacher, which students* at a glance.

**Librarian dashboard charts**
- Recharts: collection availability donut (on-shelf vs out-on-loan copies) and a top-6-titles stock bar (owned vs available) — plus the catalog/copy/on-shelf/pending-clearance stat cards.

**Notifications bell + pages**
- New `<NotificationBell>` in `RoleLayout`: bell icon with live total badge, click-to-open dropdown (latest 5 announcements + "View all"), closes on outside click; added to all four roles (desktop header bar + mobile top bar).
- New teacher & librarian Announcements pages (mirroring the student one), wired into each sidebar nav; teacher's filters by department.

**Student attendance page**
- The "Recent Records" list now shows the complete record — all days in a fixed-height scrollable table (sticky header), instead of a truncated top-12 with a "showing most recent x of y" message.

**Sitewide dropdown/UX styling**
- Global `select` restyle in `globals.css`: native caret hidden, custom navy chevron, hover border + focus ring, pointer cursor, white background — applied automatically to every dropdown on every page (section/course/student pickers, date pickers, etc.), with matching focus treatment for text/number inputs.

**Typecheck/build**: `apps/api` and `apps/web` both `typecheck` clean; `next build` compiles all 38 static pages (the standalone-trace `EPERM` symlink warning on Windows remains an environment-only issue).

---

**Still open / next candidates:** CI (TypeScript + lint on push via GitHub Actions); real payment gateway for invoices ("pay" is still a fake success); book-reservation fulfillment (PENDING → FULFILLED on pickup) in the librarian UI; enrollment-schedule admin form; transcript/letter requests producing actual PDFs; email notifications (BullMQ); realistic production deployment.

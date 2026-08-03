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

## 1. Foundation (not started)
- [ ] Prisma migrate + seed script (departments, blocks/floors/rooms, sample users)
- [ ] Auth: real login logic, password hashing, JWT issuance, refresh flow
- [ ] Role guard + decorators (@Roles(), RolesGuard)
- [ ] Users/Students/Teachers modules: real CRUD
- [ ] Frontend: login page, auth context, protected route wrapper per role

## 2. Timetable Engine (not started)
- [ ] TimetableService.checkClash() — real Prisma-backed overlap query
- [ ] TimetableGeneratorService.generate() — CSP greedy+backtracking implementation
- [ ] Admin UI: block/floor/room management
- [ ] Admin UI: trigger generation, review "unplaced" sections
- [ ] Student/Teacher UI: personalized timetable view

## 3. Assignments (not started)
- [ ] Teacher: create/edit assignment + file upload (R2)
- [ ] Student: submit before deadline (server-side deadline lock)
- [ ] Teacher: grade + feedback
- [ ] Notifications on new assignment / grade posted

## 4. Attendance (not started)
- [ ] Teacher: mark attendance per section per date (bulk UI)
- [ ] Student: view % + low-attendance warning

## 5. Grades (not started)
- [ ] Teacher: upload component-wise marks
- [ ] Student: breakdown view + GPA calculation

## 6. Remaining Tasjeel-parity modules (not started)
- [ ] Enrollment (self-enrollment, enrollment schedules)
- [ ] Library (clearance, book reservation)
- [ ] Invoices
- [ ] Complaints
- [ ] Requests (transcript, letters, course withdraw, personal info change)
- [ ] Feedback/QA
- [ ] Notifications (in-app + email via BullMQ)

## 7. Polish / Deployment (not started)
- [ ] Docker setup for api + web
- [ ] CI (typecheck + lint on push)
- [ ] Deploy: web -> Vercel, api -> Railway/Render, DB -> managed Postgres
- [ ] Seed realistic CUST data (real block/room list, real department timing windows)

---
**Next chunk to build:** Prisma migrate + seed script, then real Auth logic.

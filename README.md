# CUST Portal

A full-stack university management portal for **Capital University of Science & Technology (CUST)** — a modern, role-based rebuild of the university's existing portal (Tasjeel). It covers timetables, attendance, grades, assignments, enrollment, library, invoices, complaints, requests, feedback, announcements, and more — for **students, teachers, admins, and librarians**, all from a single clean web app.

<p align="center">
  <img src="apps/web/public/cust-logo.png" alt="CUST logo" width="120" />
</p>

<p align="center">
  <img alt="status" src="https://img.shields.io/badge/status-in%20development-yellow" />
  <img alt="frontend" src="https://img.shields.io/badge/frontend-Next.js%2015-black" />
  <img alt="backend" src="https://img.shields.io/badge/backend-NestJS%2010-e0234e" />
  <img alt="database" src="https://img.shields.io/badge/database-MySQL%20%2F%20Prisma-4479A1" />
  <img alt="language" src="https://img.shields.io/badge/language-TypeScript-3178c6" />
</p>

---

## Table of Contents

- [Why this exists](#why-this-exists)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Role Portals](#role-portals)
- [Monorepo Structure](#monorepo-structure)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Security](#security)
- [Getting Started](#getting-started)
- [Running with Docker](#running-with-docker-optional)
- [Deployment Status](#deployment-status)
- [Roadmap](#roadmap)
- [Development Timeline](#development-timeline)
- [Contributing & Future Enhancement](#contributing--future-enhancement)
- [License](#license)

---

## Why this exists

CUST's current student portal (Tasjeel) is slow, dated, and missing basic quality-of-life features. This project rebuilds it from scratch with a modern stack, a real timetable auto-generator, and a cleaner experience for students, teachers, and admins — designed to be scalable enough to eventually replace the university's actual portal.

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend | NestJS 10 (TypeScript), REST API |
| Database | MySQL (XAMPP-friendly for local dev) via Prisma ORM 5 |
| Auth | JWT (access + refresh tokens, separate secrets), bcrypt, role-based guards |
| Data viz | Recharts (dashboards, library analytics) |
| PDF | pdfkit (student transcript generation) |
| File uploads | Local disk via multer (dev) — swappable for S3/R2 |
| Monorepo | Turborepo + pnpm workspaces |
| Tooling | TypeScript 5, Zod, ESLint, class-validator/class-transformer |

## Features

### Authentication & Roles

- **JWT login** — short-lived access tokens (15m) + refresh tokens (7d) with separate secrets, bcrypt-hashed passwords, and a working refresh flow.
- **Four role portals** — Student, Teacher, Admin, Librarian, each with its own responsive sidebar, landing dashboard, and restricted routes. A student can never reach an admin page.
- **Server-side authorization everywhere** — every API controller is JWT-guarded; writes are role-scoped; students cannot read or write other students' data via ID guessing (see [Security](#security) and [`SECURITY.md`](./SECURITY.md)).
- **Logout confirmation dialog** — sessions are never ended by accident.

### Timetable

- **Auto-generator** — a constraint-solver (greedy placement + backtracking) that assigns every section of a department a day, time-window, and room while respecting room capacity, room type (lab vs. lecture hall), teacher/room/section conflicts, and each department's preferred class-hours window. Sections that cannot be placed are surfaced to the admin instead of silently failing. Full algorithm notes in [`docs/timetable-design.md`](./docs/timetable-design.md).
- **Real weekly grid** — a Mon–Sat × time-slot calendar grid, color-coded by course, with a legend, for students and teachers (desktop table + mobile day cards, today column highlighted).
- **Admin department viewer** — after generating, the admin sees the whole department week: which room, which section, which teacher, and the enrolled students per slot, plus a section-roster summary. Includes **Download CSV** and **Print**.
- **Clash detection** — `checkClash()` reports which resource (room/teacher/section) conflicts before a manual slot is saved.

### Attendance

- **Bulk marking** — teachers pick a section + date and mark the roster Present/Absent with "mark all" shortcuts; re-marking the same day updates the sheet in place (upsert).
- **Student view** — percentage vs. the 75% exam-eligibility threshold, a trend strip, a present/absent summary, and the full day-by-day record in a scrollable history.

### Assignments & Submissions

- Teachers post assignments (title, instructions, deadline) to a section with **file upload** (10 MB limit, randomized filenames).
- Students submit before the deadline; **late submissions are rejected server-side**.
- Teachers grade each submission (grade + feedback) and open the submitted file directly.

### Grades & Results

- **Spreadsheet-style grade sheet** — teachers enter marks in a student × component grid (Quiz 1, Quiz 2, Assignment, Midterm, Final), with live per-cell validation, running totals + letter grades, and a one-click save that upserts only changed cells.
- **Complete transcript** — students see every semester (1st…current) with per-semester SGPA + overall CGPA (credit-hour weighted), per-course marks and letter grades, and a downloadable **PDF transcript** (generated server-side with pdfkit) that covers all recorded semesters.

### Enrollment & Sections

- Admin-configured **enrollment windows** per department and term.
- **Self-enrollment** gated server-side: window open, seat available, and not already enrolled.
- **Withdrawal** with a confirmation dialog; approved course-withdraw requests really flip the enrollment status.

### Library

- **Catalog management** — librarians add books (title, author, ISBN, copies), search, and see live on-shelf vs. loaned counts with charts.
- **Reservations** — students browse and reserve books (copies decremented transactionally; cancel returns them).
- **Library clearance** — students request an end-of-term clearance; librarians/admins approve or reject pending requests.

### Invoices & Payments

- Fee invoices with automatic **pending → overdue flip**, due-day badges, and a (stubbed) **Pay Now** action — a real payment gateway is flagged as a future TODO.

### Complaints & Requests

- Students file **complaints** and **requests** (transcripts, letters, course withdrawal, personal-info change, general).
- Admins triage and resolve; **course-withdraw approval** actually withdrawals the enrollment; replies and admin remarks are threaded back to the student.

### Feedback & Announcements

- **Anonymized course/teacher feedback** — students rate 1–5 with comments (one per course), teachers see aggregates + comments that are never traced to an individual student.
- **Announcements** — targeted to Everyone / a Department / a Section, with a site-wide **notification bell** (live unread badge, dropdown preview, per-user read state in localStorage) and dedicated pages for every role (unread-first with an archive of previously-read items).

### Academic Structure & Campus

- **Departments** — admins create departments with a class-timing window (drives the timetable generator).
- **Blocks / Floors / Rooms** — campus facility viewer with capacity and room-type breakdown (lecture hall / lab / seminar room).
- **User management** — admins create student and teacher accounts from the UI (department, semester, designation).

### Design & UX

- Distinctive **"Collegiate Ledger"** theme built on CUST's crest colors (deep navy `#14213D` + crimson ribbon-red `#A3182A`): academic serif headings (Source Serif 4), Inter for UI, IBM Plex Mono for record IDs, ribbon badges, ledger cards, stat cards, quick-link cards, chart cards, themed scrollbars, custom dropdowns/inputs, responsive down to mobile, `:focus-visible` outlines, and `prefers-reduced-motion` support.

## Role Portals

| Portal | Pages |
|---|---|
| **Admin** (10) | Dashboard, Departments, Blocks & Rooms, Timetable Generator, Manage Users, Announcements, Invoices, Library Clearances, Complaints, Requests |
| **Teacher** (7) | Dashboard, My Timetable, Mark Attendance, Assignments, Enter Grades, Section Feedback, Announcements |
| **Student** (12) | Dashboard, Timetable, Attendance, Results, Enrollment, Assignments, Library, Invoices, Complaints, Requests, Feedback, Announcements |
| **Librarian** (4) | Dashboard, Book Catalog, Clearance Requests, Announcements |

## Monorepo Structure

```
cust-portal/
├── apps/
│   ├── web/              # Next.js frontend — 35 pages across all 4 role portals
│   └── api/              # NestJS backend — 19 feature modules
├── packages/
│   ├── database/         # Prisma schema, migrations, and the seed script
│   ├── shared-types/     # Types shared between web and api (Role, Weekday, DTOs)
│   ├── ui/               # Shared UI components (WIP)
│   └── config/           # Shared tsconfig base
├── docs/
│   └── timetable-design.md  # Timetable generator algorithm design notes
├── SECURITY.md           # Security model — what's in place and production gaps
└── PROGRESS.md           # Running build log — what's done and what's next
```

## Architecture

### Backend (`apps/api`)

A NestJS 10 REST API with a global prefix of `/api/v1`, a global `ValidationPipe({ whitelist: true, transform: true })`, JWT-passport authentication, and 19 modules:

`auth, users, students, teachers, departments, blocks, courses, sections, timetable, enrollment, assignments, attendance, grades, library, invoices, complaints, requests, notifications, feedback`

Shared infrastructure lives in `src/common`:

- `guards/jwt-auth.guard.ts` — requires a valid bearer JWT on every controller.
- `guards/roles.guard.ts` + `decorators/roles.decorator.ts` — role scoping via `@Roles(...)`.
- `guards/resolve-student-id.util.ts` — resolves the real `Student.id` from the JWT user so writes never trust a client-supplied student id.
- `guards/self-or-elevated.util.ts` — students can only access their own `:studentId`; ADMIN/TEACHER pass through (403 for ID-guessing).

### Database (`packages/database`)

Prisma + MySQL with the following models (full detail in `schema.prisma`):

- **Auth**: `User` (email, passwordHash, role), `Admin`, `Librarian`
- **Academic**: `Department`, `Student`, `Teacher`, `Course`, `Section`, `Enrollment`, `EnrollmentSchedule`
- **Campus**: `Block` → `Floor` → `Room`
- **Timetable**: `TimetableSlot` (day, start/end time, room)
- **Academic work**: `Assignment`, `Submission`, `Attendance`, `Grade`
- **Library**: `Book`, `BookReservation`, `LibraryClearance`
- **Finance**: `Invoice`
- **Communication**: `Complaint`, `Request`, `Feedback`, `Announcement`

### Frontend (`apps/web`)

Next.js 15 App Router with a client-side auth context (`lib/auth-context.tsx`), a typed API client (`lib/api-client.ts`), per-user announcement read state (`lib/notification-reads.ts`), and a grade-scale util (`lib/grade-scale.ts`). Route protection lives in `middleware.ts` (a UX convenience only — the API is the real security boundary). A shared `RoleLayout` shell provides the responsive sidebar, mobile drawer, notification bell, and logout dialog for all four roles.

## API Reference

All endpoints are under `https://<host>/api/v1` and require a `Bearer` JWT unless noted.

| Module | Method & Path | Roles | Description |
|---|---|---|---|
| **Auth** | `POST /auth/login` | public | Log in, returns access + refresh tokens and role |
| | `POST /auth/refresh` | public | Exchange a refresh token for a new token pair |
| **Users** | `GET /users/me` | any | Resolve the caller's profile (ids resolved from the JWT) |
| | `GET /users` · `GET /users/:id` · `POST /users` | ADMIN | List / get / create users |
| **Students** | `GET /students` | ADMIN, TEACHER | List students |
| | `GET /students/:id` · `/:id/timetable` · `/:id/sections` | self-or-elevated | Student detail, timetable, enrolled sections |
| | `POST /students` | ADMIN | Create a student account |
| **Teachers** | `GET /teachers` | ADMIN | List teachers |
| | `GET /teachers/:id` · `/:id/timetable` · `/:id/sections` | any | Teacher detail, timetable, sections |
| | `POST /teachers` | ADMIN | Create a teacher account |
| **Departments** | `GET /departments` | any | List departments |
| | `POST /departments` | ADMIN | Create a department (name, code, class window) |
| **Blocks** | `GET /blocks` | any | List blocks with floors and rooms |
| | `POST /blocks` | ADMIN | Create a block |
| **Sections** | `GET /sections?departmentId=` | any | List sections |
| | `GET /sections/:id/roster` | any | Student roster for a section |
| **Timetable** | `GET /timetable/section/:sectionId` | any | Timetable for a section |
| | `GET /timetable/department/:departmentId` | ADMIN | Full department timetable with rosters |
| | `POST /timetable/slots` | ADMIN | Create a timetable slot (clash-checked) |
| | `POST /timetable/generate?departmentId=` | ADMIN | Auto-generate a department's timetable |
| **Enrollment** | `POST /enrollment/schedules` | ADMIN | Open an enrollment window per department |
| | `GET /enrollment/schedules/active?departmentId=` | any | Get the active enrollment window |
| | `POST /enrollment` | STUDENT | Self-enroll into a section |
| | `POST /enrollment/:sectionId/withdraw` | STUDENT | Withdraw from a section |
| | `GET /enrollment/student/:studentId` | self-or-elevated | List a student's enrollments |
| **Assignments** | `GET /assignments/section/:sectionId` · `GET /assignments/:id` | any | List / get assignments |
| | `POST /assignments` | TEACHER, ADMIN | Create an assignment |
| | `POST /assignments/upload` | any | Upload a file (multipart, ≤10 MB) |
| | `POST /assignments/:id/submit` | STUDENT | Submit an assignment |
| | `POST /assignments/submissions/:submissionId/grade` | TEACHER, ADMIN | Grade a submission |
| **Attendance** | `POST /attendance/mark` | TEACHER, ADMIN | Bulk mark a section for a date |
| | `GET /attendance/section/:sectionId/roster?date=` | TEACHER, ADMIN | Attendance roster for a date |
| | `GET /attendance/student/:studentId?sectionId=` | self-or-elevated | A student's attendance record |
| **Grades** | `POST /grades` | TEACHER, ADMIN | Upsert a grade |
| | `GET /grades/section/:sectionId` | TEACHER, ADMIN | Grade sheet for a section |
| | `GET /grades/student/:studentId` | self-or-elevated | A student's grade breakdown (terms + CGPA) |
| | `GET /grades/student/:studentId/transcript` | self-or-elevated | Download transcript as a PDF |
| **Library** | `GET /library/books` | any | List books |
| | `POST /library/books` | ADMIN, LIBRARIAN | Add a book |
| | `POST /library/reservations` | STUDENT | Reserve a book |
| | `POST /library/reservations/:id/cancel` | STUDENT | Cancel own reservation |
| | `GET /library/reservations/mine/:studentId` | self-or-elevated | A student's reservations |
| | `POST /library/clearance` | STUDENT | Request library clearance |
| | `GET /library/clearance/pending` | ADMIN, LIBRARIAN | Pending clearance requests |
| | `POST /library/clearance/:id/resolve` | ADMIN, LIBRARIAN | Approve / reject a clearance |
| **Invoices** | `POST /invoices` | ADMIN | Create an invoice |
| | `GET /invoices/student/:studentId` | self-or-elevated | A student's invoices |
| | `POST /invoices/:id/pay` | STUDENT | Pay an invoice (simulated) |
| **Complaints** | `POST /complaints` | STUDENT | File a complaint |
| | `GET /complaints/mine/:studentId` | self-or-elevated | A student's complaints |
| | `GET /complaints` | ADMIN | List all complaints |
| | `PUT /complaints/:id` | ADMIN | Update / resolve a complaint |
| **Requests** | `POST /requests` | STUDENT | Create a request |
| | `GET /requests/mine/:studentId` | self-or-elevated | A student's requests |
| | `GET /requests` | ADMIN | List all requests |
| | `PUT /requests/:id` | ADMIN | Approve / reject a request |
| **Notifications** | `POST /notifications` | ADMIN, TEACHER | Publish an announcement |
| | `GET /notifications?departmentId=&sectionId=` | any | Announcements for the caller |
| **Feedback** | `POST /feedback` | STUDENT | Submit course feedback (one per course) |
| | `GET /feedback/section/:sectionId` | TEACHER, ADMIN | Anonymized feedback for a section |
| | `GET /feedback/mine/:studentId` | self-or-elevated | A student's own submissions |

## Security

Passwords are bcrypt-hashed, JWT secrets are split between access and refresh tokens, every controller is JWT-guarded, writes are role-scoped, students are restricted to their own data (server-side), password hashes never leave the API, and feedback is anonymized. The `users`/`students` services use explicit `select` clauses so profile fields and password hashes are never serialized.

The full security model — including the honest, known production gaps (non-`httpOnly` cookies, no rate limiting, wide-open CORS, disk-hosted uploads, no password reset) and a suggested hardening order — is documented in [`SECURITY.md`](./SECURITY.md). It should be read before any production deployment.

## Getting Started

### Prerequisites

- **Node.js 20+**
- **pnpm** (`npm install -g pnpm`)
- **MySQL** running locally — [XAMPP](https://www.apachefriends.org/) works great (start **MySQL** only, Apache isn't needed)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up your database

Create a database named `cust_portal` (via phpMyAdmin or the `mysql` CLI).

### 3. Configure environment variables

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

The defaults in `apps/api/.env.example` already match XAMPP's default MySQL credentials (`root`, no password, port `3306`). **Replace the placeholder JWT secrets (`change-me-...`) with real random values before anything production-like.**

### 4. Migrate and seed the database

```bash
cd packages/database
npx prisma migrate dev
npx prisma db seed
cd ../..
```

This creates all tables and seeds a realistic dataset: 4 departments (SE/CS/EE/DS), 9 blocks with floors/rooms, 12 named teachers, 32 named students spread across semesters 1–7, 24 course sections with a full Mon–Fri timetable, grades for every component, 30 weekdays of attendance, assignments + submissions, invoices, an 18-book library catalog with reservations/clearances, announcements, complaints, requests, and feedback. Re-running the seed is safe — it resets the tables first and reseeds from scratch.

### 5. Run the app

```bash
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1

### Test accounts

All seeded with the password `Password123!`:

| Role | Email |
|---|---|
| Admin | admin@cust.edu.pk |
| Teacher | teacher@cust.edu.pk |
| Student | student@cust.edu.pk |
| Librarian | librarian@cust.edu.pk |

> Student and teacher accounts can also be created from the UI: **Admin → Manage Users**.
>
> Tip: run `npx prisma studio` inside `packages/database` for a GUI to inspect and add data that isn't part of the base seed (e.g. courses, books).

### Useful commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Run web + api in watch mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint all workspaces |
| `pnpm typecheck` | Type-check all workspaces |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:studio` | Open Prisma Studio |

## Running with Docker (optional)

```bash
docker compose up --build
```

Spins up the API, web app, and a MySQL 8 container together — useful for deployment-like testing without XAMPP. The compose file passes local development secrets, so rotate them before any real deployment.

## Deployment Status

**This project is not deployed yet.** It is in active development and works end-to-end locally, but several production-readiness items remain (security hardening in [`SECURITY.md`](./SECURITY.md), real payment gateway, object-storage uploads, email notifications, CI). The plan is to keep building it until it is genuinely usable by the university, and only then deploy:

- **Web** → Vercel
- **API** → Railway / Render
- **Database** → managed MySQL

## Roadmap

See [`PROGRESS.md`](./PROGRESS.md) for the full, up-to-date build log. The project is currently verified through manual QA (every role flow has been exercised by hand) plus the standard `typecheck` / `lint` / `build` gates — there is no committed automated test suite yet. Highlights still open:

- **Automated test suite** (unit tests for the API services + a few end-to-end flows)
- **CI pipeline** (typecheck + lint + tests on push via GitHub Actions)
- **Real payment gateway** for invoices (currently a simulated success)
- **Book-reservation fulfillment** (PENDING → FULFILLED on pickup) in the librarian UI
- **Enrollment-schedule admin form** (backend endpoint exists, no form yet)
- **Transcript/letter requests producing actual PDFs**
- **Email notifications** (currently in-app only)
- **Server-side announcement read receipts** (currently client-side in localStorage)
- **Security hardening** before deployment (see [Security](#security))
- **Seed realistic CUST data** — real block/room lists and real department timing windows

## Development Timeline

This portal was built over a two-week internship (August 3–17, 2026) as a complete replacement for CUST's existing student portal. The full day-by-day work log is in [`docs/timeline.txt`](./docs/timeline.txt). A quick summary:

| Date | What was done |
|---|---|
| **Aug 3** | Finalized the project idea and tech stack (Next.js + NestJS + MySQL), scaffolded the monorepo, wrote the full feature list |
| **Aug 4** | System design and database schema (users, students, teachers, courses, blocks/floors/rooms); timetable algorithm design notes |
| **Aug 5** | Login system (bcrypt + JWT), three role accounts (Student/Teacher/Admin), seed script for departments, blocks, and rooms |
| **Aug 6** | Account management APIs, login page wired to the backend, role-based dashboard redirects, per-user privacy checks |
| **Aug 7** | Timetable clash-checker and auto-generator, admin blocks/rooms and generator pages, conflict-free scheduling tested |
| **Aug 8** | Assignments (post with file, submit before deadline, late-submission lock), departments list, uploads tested |
| **Aug 9** | Attendance (bulk marking, student percentage view with low-attendance warning, dated history) |
| **Aug 10** | Grades entry, student results page, announcements feature |
| **Aug 11** | Course enrollment (window-based, seat limits), library (browse, reserve, clearance) |
| **Aug 12** | Fee invoices, complaints + requests (transcript, course withdraw), anonymous feedback, Docker setup |
| **Aug 13** | Bug fixes, realistic seed data (students/teachers/courses/sections), fourth role — Librarian — end to end |
| **Aug 14** | Full UI/UX overhaul ("Collegiate Ledger" theme), dashboard charts, weekly calendar timetable, admin user-creation page |
| **Aug 15** | Final testing across all four roles, last fixes, documentation finalized |
| **Aug 16** | Final documentation (project guide, security notes, work log), final build/typecheck, Docker run-through, pushed to GitHub |
| **Aug 17** | Final walkthrough of every role and final submission of the internship project |

## Contributing & Future Enhancement

This project is built incrementally and is designed to grow. If you find people willing to contribute — developers, designers, QA testers, or domain experts who know how a university portal should work — we will take the project further together. Here is what we would love help with:

1. **Pick something from the [Roadmap](#roadmap)** — the items above are concrete, well-scoped, and flagged in the code.
2. **Follow the codebase conventions** — the monorepo is Turborepo + pnpm + TypeScript; run `pnpm typecheck` and `pnpm lint` before opening a PR, and keep the same component/design-system patterns.
3. **Check [`PROGRESS.md`](./PROGRESS.md) first** — it records what is done and what is next, so no two people work on the same thing.
4. **Read [`SECURITY.md`](./SECURITY.md) before touching anything auth-related** — the production-gap list is the safest place to make a real impact.

Whether you want to add features, fix bugs, harden security, write tests, improve the UI/UX, or take ownership of a whole module — you are welcome. The goal is to turn this into a portal the university can actually run, and every serious contributor moves it closer to that.

## License

Not yet decided — private/internal project for CUST until it is ready for the university.

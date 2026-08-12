# CUST Portal

A full-stack university management portal built for **Capital University of Science & Technology (CUST)** — a modern, role-based replacement for the university's portal (Tasjeel). It covers timetables, attendance, grades, assignments, enrollment, library, invoices, complaints, requests, feedback, announcements, and more — for **students, teachers, admins, and librarians**, all from a single clean web app.

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

## Why this exists

CUST's current student portal (Tasjeel) is slow, dated, and missing basic quality-of-life features. This project rebuilds it from scratch with a modern stack, a real timetable auto-generator, and a cleaner experience for students, teachers, and admins — designed to be scalable enough to eventually replace the university's actual portal.

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend | NestJS 10 (TypeScript), REST API |
| Database | MySQL (XAMPP-friendly for local dev) via Prisma ORM |
| Auth | JWT (access + refresh tokens), bcrypt, role-based guards |
| Monorepo | Turborepo + pnpm workspaces |
| File uploads | Local disk (dev) — swappable for S3/R2 |

## Monorepo Structure

```
cust-portal/
├── apps/
│   ├── web/            # Next.js frontend (Student / Teacher / Admin / Librarian portals)
│   └── api/             # NestJS backend (19 feature modules)
├── packages/
│   ├── database/         # Prisma schema + client
│   ├── shared-types/      # Types shared between web and api
│   ├── ui/                # Shared UI components (WIP)
│   └── config/            # Shared tsconfig
├── docs/
│   └── timetable-design.md   # Timetable generator algorithm design notes
├── SECURITY.md            # Security model — what's in place, production gaps
└── PROGRESS.md            # Running build log — what's done, what's next
```

## Features

### Auth & Roles
- **JWT-based login** (short-lived access + refresh tokens, bcrypt-hashed passwords) with role-based guards on both frontend and backend.
- Four fully-featured portals — **Student, Teacher, Admin, Librarian** — each with its own responsive sidebar, landing dashboard, and restricted routes (a student can never reach an admin page).
- Student can log in and see their real id-driven data (attendance, results, invoices, requests…) without any manual configuration.
- Logout is gated behind a confirmation dialog so sessions are never ended by accident.
- Every API controller is JWT-guarded, writes are role-scoped, and students can't read or write other students' data via ID guessing. See [`SECURITY.md`](./SECURITY.md) for the full security model and its known production gaps.

### Timetable
- **Auto-generator**: a constraint-solver (greedy + backtracking) that assigns every section of a department a day, time-window, and room while respecting room capacity, room type (lab vs. lecture hall), teacher conflicts, and each department's class-hours window.
- **Calendar weekly grid** for students and teachers (Mon–Sat × time slots, color-coded by course).
- **Admin visual timetable viewer**: after generating, an admin sees the full department week — which room, which section, which teacher, and the enrolled students per slot — plus a section roster summary.

### Attendance
- Teachers bulk-mark a section for a date (Present/Absent toggles, "mark all" shortcuts); re-marking the same day updates the sheet in place.
- Students see a percentage vs. the 75% exam-eligibility threshold, a trend strip, and their full day-by-day record in a scrollable history.

### Assignments
- Teachers post assignments (title, instructions, deadline) to a section with **file upload**.
- Students submit before the deadline; late submissions are rejected server-side.
- Teachers grade each submission (grade + feedback) and open the submitted file directly.

### Grades & Results
- **Spreadsheet-style grade sheet**: teachers enter marks in a student × component grid (Quiz/Midterm/Final…), with live totals and a one-click save.
- Students see a **complete numbered transcript** (Semester 1…current), per-semester SGPA + CGPA (credit-hour weighted), and a downloadable **PDF transcript** that covers every semester in order.

### Enrollment & Sections
- Admin-configured enrollment windows per department, self-enrollment with gates (window open, seat available, not already enrolled), and withdrawal.

### Library
- Librarian catalog management (add books, search, live on-shelf vs loaned counts with charts).
- Students browse and reserve books (copies decremented transactionally, cancel returns them) and request a library clearance; librarian approves/rejects pending clearances.

### Invoices & Payments
- Fee invoices with automatic pending → overdue flip, due-day badges, and a (stubbed) Pay Now action — a real payment gateway is flagged as a TODO.

### Complaints & Requests
- Students file complaints and requests (transcripts, letters, course withdraw, info change); admins triage and resolve (course-withdraw approval really withdrawals the enrollment).

### Feedback & Announcements
- Anonymized course/teacher feedback (averages + comments, never tied to an individual student) visible to teachers, submission visible to students.
- **Announcements** targeted to everyone / a department / a section — with a sitewide **notification bell** (live count + dropdown preview) and dedicated pages for every role.

### Design & UX polish
- Distinctive **"Collegiate Ledger"** theme: deep navy + crimson ribbon, academic serif headings, mono record IDs, custom ribbons/stat cards/ledgers, themed scrollbars, full responsiveness, and site-wide refined dropdowns/inputs.

> See [`PROGRESS.md`](./PROGRESS.md) for the detailed, up-to-date build log of every module.

## Getting Started

### Prerequisites
- Node.js 20+
- [pnpm](https://pnpm.io) (`npm install -g pnpm`)
- MySQL running locally — [XAMPP](https://www.apachefriends.org/) works great for this (start **MySQL** only, Apache isn't needed)

### 1. Install dependencies
```bash
pnpm install
```

### 2. Set up your database
Create a database named `cust_portal` (via phpMyAdmin, or the `mysql` CLI).

### 3. Configure environment variables
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```
The defaults in `apps/api/.env.example` already match XAMPP's default MySQL credentials (`root`, no password, port `3306`).

### 4. Migrate and seed the database
```bash
cd packages/database
npx prisma migrate dev --name init
npx prisma db seed
cd ../..
```
This creates all tables and seeds: 4 departments (SE/CS/EE/DS), all 9 blocks with floors/rooms, 12 named teachers (real designations), 32 named students spread across semesters 1-7, 24 course sections with a full Mon–Fri timetable at varied times, grades for every component (quiz/midterm/final), 30 weekdays of attendance, assignments + submissions, invoices, an 18-book catalog with reservations/clearances, announcements, complaints/requests and feedback — plus one test account per role (see below). Re-running the seed is safe: it resets the tables first and reseeds from scratch.

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

> Student/teacher accounts can also be created from the UI: **Admin → Manage Users** (and **Admin → Departments** for new departments).

> Tip: run `npx prisma studio` inside `packages/database` for a GUI to inspect and add data (e.g. courses, sections, books) that aren't part of the base seed.

## Running with Docker (optional)

```bash
docker compose up --build
```
Spins up the API, web app, and a MySQL container together — useful for deployment-like testing without XAMPP.

## Timetable Generator

The auto-generator is a constraint-satisfaction algorithm (greedy placement + backtracking) that assigns every section a day/time/room slot while respecting room capacity, room type (lab vs. lecture hall), teacher/room/section conflicts, and each department's preferred class-timing window. Full design rationale in [`docs/timetable-design.md`](./docs/timetable-design.md).

## Contributing / Continuing Development

This project is being built incrementally — check [`PROGRESS.md`](./PROGRESS.md) before starting work to see what's done, what's in progress, and what's next.

## License

Not yet decided — private/internal project for CUST.

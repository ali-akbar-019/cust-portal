# CUST Portal

A full-stack university management portal built for **Capital University of Science & Technology (CUST)** — replacing the existing student portal with a faster, modern, role-based system covering timetables, attendance, grades, assignments, enrollment, library, invoices, complaints, and more.

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
| Auth | JWT (access + refresh tokens), role-based guards |
| Monorepo | Turborepo + pnpm workspaces |
| File uploads | Local disk (dev) — swappable for S3/R2 |

## Monorepo Structure

```
cust-portal/
├── apps/
│   ├── web/            # Next.js frontend (student / teacher / admin portals)
│   └── api/             # NestJS backend (19 feature modules)
├── packages/
│   ├── database/         # Prisma schema + client
│   ├── shared-types/      # Types shared between web and api
│   ├── ui/                # Shared UI components (WIP)
│   └── config/            # Shared tsconfig
├── docs/
│   └── timetable-design.md   # Timetable generator algorithm design notes
└── PROGRESS.md            # Running build log — what's done, what's next
```

## Features

- **Auth & Roles** — JWT-based login, Student / Teacher / Admin roles, guarded routes on both frontend and backend
- **Timetable Engine** — real block → floor → room modeling (matches CUST's actual A–K block layout), automatic clash detection, and a greedy + backtracking constraint-solver that auto-generates a full timetable for a department
- **Attendance** — bulk marking per section/date, student-facing percentage with a low-attendance warning
- **Assignments** — file upload, deadline-locked submission, teacher grading + feedback
- **Grades** — component-wise marks entry, per-course breakdown, credit-hour-weighted GPA
- **Enrollment** — admin-scheduled enrollment windows, seat-limited self-enrollment, withdrawal
- **Library** — book catalog, reservation with live copy tracking, clearance request workflow
- **Invoices** — fee tracking with automatic overdue detection
- **Complaints & Requests** — student submissions (transcripts, letters, course withdraw, etc.), admin triage and resolution
- **Feedback/QA** — anonymized course/teacher feedback so students can be honest
- **Announcements** — targeted to everyone, a department, or a specific section

See [`PROGRESS.md`](./PROGRESS.md) for the detailed, up-to-date build log of every module.

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
This creates all tables and seeds: 3 departments, all 9 blocks with floors/rooms, and one test account per role (see below).

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

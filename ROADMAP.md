# CUST Portal — UI/UX Roadmap

## Overview
This document tracks the planned UI/UX improvements for the entire CUST Portal application. The goal is to fix responsiveness, overflow, navigation, and visual polish across all pages to create a consistent, professional "Collegiate Ledger" aesthetic.

## Priorities (by urgency & impact)

### P0 — Critical (affects core flows)
1. **Horizontal scrolling on timetable pages** — Admin, Teacher, and Student timetable pages overflow on mobile/small screens. Fix: `th, td { min-width: 0; }` already in globals.css; also ensure `.scroll-area` wrappers are used where needed.
2. **Student cross-department enrollment** — Students can see/enroll in courses from other departments. Fix: backend query must filter by student's department; frontend dropdown must only show student's department courses.
3. **Teacher grade table horizontal overflow** — On small screens, the grading table overflows. Fix: `min-width: 0` on table cells + `overflow-x-auto` on container.
4. **Sidebar collapse on mobile** — Sidebar height/behavior issues on small screens. Fix: ensure `.fixed inset-y-0 left-0 w-64` drawer animates properly; add `sm:block lg:hidden` appropriate checks.

### P1 — High (usability & polish)
5. **Dropdown long names** — Course/section names overflow in `<select>` dropdowns. Fix: add CSS `.select-container select { text-overflow: ellipsis; }` or truncate displayed text via component logic.
6. **Assignment tabs (passed/remaining)** — Assignments page shows all cards with no distinction between past/due/future. Fix: add tabbed interface (Past / Upcoming / Future) with appropriate styling.
7. **Missing confirmation dialogs** — Many actions (enroll, withdraw, delete) have no confirmation. Fix: add `RoleLayout`-style modals for destructive/irreversible actions.
8. **Invoice table & tabs** — Invoices page lacks organized display; no table, no paid/unpaid status, everything in one place. Fix: build a tabbed interface (All / Paid / Pending) with a detailed modal/drawer on click.

### P2 — Medium (visual refinement)
9. **Notification management** — Bell shows all notifications; no grouping, no "Mark all read" flow that persists. Fix: implement tabbed notifications page (Unread / Read) + "Mark all read" action.
10. **Visual consistency across pages** — Ensure all pages use `ledger-card`, `<Ribbon>`, `<StatCard>`, proper focus rings (`:focus-visible`), and the remapped Tailwind color scales.
11. **Responsive image handling** — Ensure `img { max-width: 100%; height: auto; }` is applied everywhere; add `object-cover` where needed.

### P3 — Lower (future enhancements)
12. **PDF transcript/download polish** — Ensure download UX is smooth with spinners and error states.
13. **Dark mode support** — (future) add `dark:` Tailwind variants.
14. **Accessibility audit** — Verify `aria-labels`, focus order, color contrast across all pages.

---

## Work Plan

Each sprint will focus on one area:

### Sprint 1 — Tables & Overflow
- Apply `th, td { min-width: 0; }` globally (done).
- Ensure all timetable pages use `.scroll-area` wrapper with `overflow-x-auto` on small screens.
- Fix teacher grade table: add `overflow-x-auto` container + `min-width: 0` on cells.
- Fix admin timetable: ensure horizontal scrolling is enabled on small screens via `.scroll-area`.

Sprint 1 files to modify:
- `apps/web/src/app/admin/timetable-generator/page.tsx`
- `apps/web/src/app/teacher/timetable/page.tsx`
- `apps/web/src/app/student/timetable/page.tsx`
- `apps/web/src/app/teacher/grades/page.tsx`

### Sprint 2 — Dropdowns & Department Filtering
- Fix student department filtering: backend `GET /students/:id/sections` must filter by student's department; update frontend dropdowns to only show student's department courses.
- Add CSS for dropdown text truncation: `.select-wrapper select { max-width: 200px; text-overflow: ellipsis; }` with appropriate container.
- Update `role-layout.tsx` sidebar to respect department filtering.

Sprint 2 files to modify:
- `apps/web/src/app/student/enrollment/page.tsx`
- `apps/web/src/app/student/timetable/page.tsx`
- `apps/web/src/components/ui/page-header.tsx` (add wrapper utility)

### Sprint 3 — Tabs & Confirmations
- Add assignment tabs (Past / Upcoming / Future) to student & teacher assignment pages.
- Add confirmation dialogs via `RoleLayout` pattern for: enrollment, withdrawal, assignment delete.
- Add invoice tabs (All / Paid / Pending) with click-to-expand modal for details.
- Add "Mark all read" tab to notifications page.

Sprint 3 files to modify:
- `apps/web/src/app/student/assignments/page.tsx`
- `apps/web/src/app/teacher/assignments/page.tsx`
- `apps/web/src/app/invoices/page.tsx`
- `apps/web/src/components/shared/role-layout.tsx` (reuse confirm dialog)

### Sprint 4 — Visual Polish & Consistency
- Audit all ~40 pages for: correct use of `ledger-card`, `<Ribbon>`, `<StatCard>`, proper `<PageHeader>`, focus rings.
- Ensure `img { max-width: 100%; }` is effective; add `object-cover` where needed.
- Standardize button styles: primary (bg-red-600 hover:bg-red-700), secondary (bg-slate-900 hover:bg-slate-800), outline.
- Update `PROGRESS.md` with each sprint's progress.

Sprint 4 files: all `page.tsx` under `apps/web/src/app/`, `globals.css`, `page-header.tsx`, `stat-card.tsx`, `quick-link-card.tsx`, `ribbon.tsx`, `chart-card.tsx`.

### Sprint 5 — Notifications & Invoices Polish
- Notifications page: tabbed view (Unread / Read), "Mark all read" badge persistence, dropdown shows only recent unread.
- Invoices page: table with columns (Invoice #, Amount, Due Date, Status, Actions); click row opens modal with full details; tabs for All/Paid/Pending.

Sprint 5 files: `apps/web/src/app/invoices/page.tsx`, `apps/web/src/lib/notification-reads.ts`, `apps/web/src/components/ui/notification-bell.tsx`.

---

## Success Metrics
- ✅ No horizontal scrolling on any page below `lg` breakpoint.
- ✅ Students only see their own department's courses in dropdowns/enrollment.
- ✅ Assignment tabs clearly separate Past / Upcoming / Future.
- ✅ Invoices have a proper table with status badges and detail modals.
- ✅ All destructive actions have confirmation dialogs.
- ✅ Consistent design language (navy/crimson/slate) across every page.
- ✅ Typecheck passes on all changes.

---

## Success Metrics
- ✅ No horizontal scrolling on any page below `lg` breakpoint.
- ✅ Students only see their own department's courses in dropdowns/enrollment.
- ✅ Assignment tabs clearly separate Past / Upcoming / Future.
- ✅ Invoices have a proper table with status badges and detail modals.
- ✅ All destructive actions have confirmation dialogs.
- ✅ Consistent design language (navy/crimson/slate) across every page.
- ✅ Typecheck passes on all changes.

---

## Notes & Decisions

- **Dropdown truncation**: Rather than server-side substr, we'll use CSS `text-overflow: ellipsis` with a max-width on the `<select>`'s displayed text. This is client-side only and works for the existing OPTION values without API changes.
- **Department filtering**: The backend already has `resolveStudentId()` and guards. The fix is to ensure `GET /students/:id/sections` and all section-dropdowns filter by the authenticated student's `departmentId`. This is a backend query change + frontend dropdown prop update.
- **Tabs vs modals**: For assignments and invoices, we'll use a hybrid: top-tabs for categorization, and click-row → modal/drawer for details. This avoids page churn while keeping UI clean.
- **Roadmap storage**: This file lives at the repo root as `ROADMAP.md` so any contributor can see the plan.

---
*Last updated: `date`*
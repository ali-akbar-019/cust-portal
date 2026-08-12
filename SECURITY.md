# CUST Portal — Security

Everything currently in place for the CUST Portal, what it protects against, and the known gaps that must be closed before a production deployment. Code references point at the exact files so an audit (or the "production TODO" pass) starts from a precise place.

> Status: **development build**. The app works end-to-end, but several items below are explicitly flagged `TODO (production)` in the code and must be resolved before real student data touches this system.

---

## 1. Authentication

| Measure | Where | Notes |
|---|---|---|
| Passwords hashed with **bcrypt** (cost factor 10) | `apps/api/src/modules/auth/auth.service.ts` (`hashPassword`), `packages/database/prisma/seed.ts` | Plaintext is never stored; login compares with `bcrypt.compare`. |
| Access + refresh JWT split with **separate secrets** and TTLs | `auth.service.ts` (`ACCESS_TOKEN_TTL = '15m'`, `REFRESH_TOKEN_TTL = '7d'`, `JWT_SECRET` / `JWT_REFRESH_SECRET`) | A leaked access token is short-lived; refreshing uses a different key than verifying. |
| Rename/revocation-resistant flow | `auth.service.ts` → `refresh()` | Refresh verifies with its own secret, then re-issues a fresh token pair. |
| Token expiry enforced | `apps/api/src/modules/auth/strategies/jwt.strategy.ts` (`ignoreExpiration: false`) | Expired tokens are rejected, not silently accepted. |
| Login DTO validation | `apps/api/src/modules/auth/dto/login.dto.ts` | Email format enforced, password length floor (`MinLength(6)`). |
| Frontend rehydration guard | `apps/web/src/lib/auth-context.tsx` `deleteCookie` on invalid token | If the token fails `/users/me`, all auth cookies are cleared and the user is sent back to `/login`. |

## 2. Authorization (the real security boundary)

Every API controller is guarded. This is the boundary — the frontend middleware below is only a UX convenience.

| Measure | Where | Notes |
|---|---|---|
| `JwtAuthGuard` on **every** controller class | All controllers under `apps/api/src/modules/**` | 401 for any request without a valid bearer token. |
| `RolesGuard` + `@Roles(...)` on restricted endpoints | `apps/api/src/common/guards/roles.guard.ts` + `roles.decorator.ts` | Writes are scoped per role: ADMIN-only (timetable generate, user creation, student creation…), TEACHER/ADMIN (attendance, grades, assignments…), STUDENT-only (submit, complaints, requests…), ADMIN/LIBRARIAN (library ops). |
| **Own-data enforcement** for students | `apps/api/src/common/guards/self-or-elevated.util.ts` (`ensureOwnStudentOrElevated`) | Any endpoint taking a `:studentId` returns **403** to a STUDENT caller when the id isn't their own — stops ID-guessing between students. ADMIN/TEACHER pass through. |
| Transactional identity binding on student writes | `apps/api/src/common/guards/resolve-student-id.util.ts` (`resolveStudentId`) | Writes use the real `Student.id` resolved from the JWT user, never a client-supplied `user.sub`/`studentId` — prevents foreign-key confusion/write to the wrong row. |
| Password hashes never leave the API | `apps/api/src/modules/users/users.service.ts` | `findAll`/`findById`/`create` use an explicit `select` that omits `passwordHash`. |
| Business rules enforced server-side (not just UI) | e.g. assignment deadline lock in `assignments.service.ts`, seat/window gates in `enrollment.service.ts`, transactional copy counts in `library.service.ts` | Late submissions, over-capacity enrollments, and over-loans are rejected by the backend, not the form. |

## 3. Frontend route protection (UX layer)

`apps/web/middleware.ts` protects `/student/*`, `/teacher/*`, `/admin/*` by checking the presence of the `accessToken`/`role` cookies and the role, redirecting to `/login` or the caller's own dashboard.

**Important:** this middleware only checks cookie *presence/role*, not signature — it prevents seeing a page shell you can't use, but every real fetch is still authorized server-side by the guards above. Removing a page guard in React never unlocks data.

Accidental logouts are also prevented: the logout action requires **confirmation through a dialog** (`apps/web/src/components/shared/role-layout.tsx`) before cookies are cleared and the user is redirected.

## 4. Input validation

| Measure | Where |
|---|---|
| Global `ValidationPipe({ whitelist: true, transform: true })` | `apps/api/src/main.ts` — strips unknown properties from every request body, so mass-assignment style attacks get no payload to exploit. |
| class-validator DTOs per endpoint | `apps/api/src/modules/**/dto/*.ts` |

## 5. Data protection & privacy

- **Anonymized feedback** — teacher-facing feedback shows aggregates + comments, never tied to an individual student (`feedback.service.ts`).
- **Per-user read receipts on shared devices** — announcement read state is keyed by `userId` in `localStorage` so one account's reads never leak to another user's view (`apps/web/src/lib/notification-reads.ts`).
- Password-hash and profile fields are excluded from API responses (see §2).

## 6. File uploads

Applies to assignment uploads — `apps/api/src/modules/assignments/assignments.controller.ts` (`POST /assignments/upload`):

- **Size limit** — `10 MB` enforced by multer.
- **Randomized filenames** — `Date.now()-<random>` prefix so uploaded files can't collide or guess paths.
- Files are stored under `uploads/`, which is **gitignored** (`.gitignore`) and served at `/uploads` for the web UI.

## 7. Secrets & environment

- `.env`, `.env.local`, and `uploads/` are all **gitignored** — secrets never enter the repo.
- Separate `JWT_SECRET` and `JWT_REFRESH_SECRET` are expected in `apps/api/.env` (see `apps/api/.env.example`). **The example placeholders (`change-me-...`) must be replaced with real random secrets** — only `.env` files with the example values have run so far.
- `NEXT_PUBLIC_API_URL` points the web app at the API (`.env.example`).

## 8. Known gaps — production TODOs (must close before go-live)

These are flagged in code as `TODO (production)` / `TODO (v2)` and are the honest current limits:

1. **Access/refresh cookies are not `httpOnly`** — stored as plain, JS-readable cookies by the web app so Next.js middleware can read them. This is the biggest gap: an XSS could read tokens. Fix is server-set `httpOnly` cookies (same-origin or `SameSite=None` + `credentials: 'include'` across subdomains). Commented in `auth-context.tsx`.
2. **Refresh-token rotation / server-side revocation** — a stolen refresh token currently works until it expires; there's no DB-checked, rotated, revocable refresh session. `TODO (v2)` in `auth.service.ts`.
3. **No security headers** — `helmet` is not installed (`main.ts` has none). Add `helmet` or equivalent before production.
4. **No rate limiting** — login/refresh have no throttling (`@nestjs/throttler` not installed), so brute-force protection is missing.
5. **CORS is wide open** — `app.enableCors()` with no origin restriction (`TODO: restrict origin in production` in `main.ts`).
6. **Uploads live on the API disk** — no virus scan, no mime-type allowlist (only a size cap + randomized name), and `/uploads` is served unauthenticated. Swap to R2/S3 with a presigned-URL flow (flagged in `assignments.controller.ts`).
7. **No password reset / email verification / MFA** — not built yet.
8. **Middleware is signature-less** — acceptable only because the backend is authoritative (see §3); don't rely on it alone.

---

## Suggested hardening order (when moving to production)

1. Rotate both JWT secrets (real random values) and move tokens to `httpOnly` cookies.
2. Add `helmet` + restricted CORS origin + rate limiting on auth endpoints.
3. Implement refresh-token rotation with server-side revocation storage.
4. Migrate file uploads off disk to object storage with mime-type validation and (ideally) AV scanning.
5. Add password-reset flow; consider email verification and MFA for admin.
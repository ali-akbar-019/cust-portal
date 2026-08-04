import { NextRequest, NextResponse } from 'next/server';

// Basic role-based route protection. Reads the plain 'role' cookie set at
// login (see lib/auth-context.tsx). This only checks presence/role, not
// signature — real authorization is still enforced server-side by NestJS's
// JwtAuthGuard/RolesGuard on every API call, so this middleware is a UX
// convenience (redirect before a page even renders), not the security
// boundary itself.
const ROLE_PREFIXES: Record<string, string> = {
  '/student': 'STUDENT',
  '/teacher': 'TEACHER',
  '/admin': 'ADMIN',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const matchedPrefix = Object.keys(ROLE_PREFIXES).find((p) => pathname.startsWith(p));
  if (!matchedPrefix) return NextResponse.next();

  const role = request.cookies.get('role')?.value;
  const accessToken = request.cookies.get('accessToken')?.value;

  if (!accessToken || !role) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (role !== ROLE_PREFIXES[matchedPrefix]) {
    // logged in, but wrong role for this area -> send to their own dashboard
    const fallback = role === 'ADMIN' ? '/admin/dashboard' : role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard';
    return NextResponse.redirect(new URL(fallback, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/student/:path*', '/teacher/:path*', '/admin/:path*'],
};

'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from './api-client';
import type { LoginResponseDTO, Role } from '@cust/shared-types';

export interface MyProfile {
  userId: string;
  email: string;
  role: Role;
  studentId: string | null;
  sectionId: string | null;
  enrollmentNo: string | null;
  teacherId: string | null;
  departmentId: string | null;
}

interface AuthContextValue {
  role: Role | null;
  accessToken: string | null;
  profile: MyProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// NOTE (production TODO): these are stored in a plain (non-httpOnly) cookie
// for simplicity so Next.js middleware can read them for route protection.
// Before going live, move to httpOnly cookies set by the API response
// (Set-Cookie) so JS on the page can't read the tokens — mitigates XSS
// token theft. That requires the API and web app to share a domain or use
// SameSite=None + credentials: 'include' across subdomains.
function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/`;
}
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Fetches /users/me once we have a token — resolves studentId/teacherId/
  // sectionId so every "my timetable / my attendance / ..." page has real
  // IDs to call with, instead of a placeholder.
  const loadProfile = useCallback(async (token: string) => {
    try {
      const me = await apiFetch<MyProfile>('/users/me', { token });
      setProfile(me);
    } catch {
      // token invalid/expired — clear everything and send back to login
      deleteCookie('accessToken');
      deleteCookie('refreshToken');
      deleteCookie('role');
      setAccessToken(null);
      setRole(null);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    // rehydrate on page load/refresh
    const token = getCookie('accessToken');
    setAccessToken(token);
    setRole((getCookie('role') as Role) ?? null);
    if (token) {
      loadProfile(token).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [loadProfile]);

  async function login(email: string, password: string) {
    const data = await apiFetch<LoginResponseDTO>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setCookie('accessToken', data.accessToken, 1); // access token: short-lived cookie
    setCookie('refreshToken', data.refreshToken, 7);
    setCookie('role', data.role, 7);
    setAccessToken(data.accessToken);
    setRole(data.role);
    await loadProfile(data.accessToken);

    const destination =
      data.role === 'ADMIN' ? '/admin/dashboard' : data.role === 'TEACHER' ? '/teacher/dashboard' : data.role === 'LIBRARIAN' ? '/librarian/dashboard' : '/student/dashboard';
    router.push(destination);
  }

  function logout() {
    deleteCookie('accessToken');
    deleteCookie('refreshToken');
    deleteCookie('role');
    setAccessToken(null);
    setRole(null);
    setProfile(null);
    router.push('/login');
  }

  return (
    <AuthContext.Provider value={{ role, accessToken, profile, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { Ribbon } from '@/components/ui/ribbon';
import { RoleLayout } from '@/components/shared/role-layout';

interface SectionView {
  id: string;
  term: string;
  capacity: number;
  seatsRemaining: number;
  course: { code: string; title: string; creditHours: number };
  teacher: { user: { email: string } };
}
interface Schedule {
  id: string;
  term: string;
  startsAt: string;
  endsAt: string;
}
interface MyEnrollment {
  status: string;
  enrolledAt: string;
  section: SectionView;
}

export default function StudentEnrollmentPage() {
  const { accessToken, profile } = useAuth();
  const [sections, setSections] = useState<SectionView[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [myEnrollmentIds, setMyEnrollmentIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Always use the student's declared department — they may NOT switch.
  // They only see sections from their own department.
  const departmentId = profile?.departmentId ?? '';

  useEffect(() => {
    if (!accessToken || !profile?.studentId) return;
    // Fetch sections ONLY for the student's department.
    apiFetch<SectionView[]>(`/sections?departmentId=${departmentId}`, { token: accessToken })
      .then(setSections)
      .catch(() => setSections([]));
  }, [departmentId, accessToken, profile]);

  useEffect(() => {
    if (!departmentId || !accessToken) return;
    apiFetch<Schedule | null>(`/enrollment/schedules/active?departmentId=${departmentId}`, { token: accessToken })
      .then(setSchedule)
      .catch(() => setSchedule(null));
  }, [departmentId, accessToken]);

  useEffect(() => {
    if (!accessToken || !profile?.studentId) return;
    apiFetch<MyEnrollment[]>(`/enrollment/student/${profile.studentId}`, { token: accessToken })
      .then((rows) => setMyEnrollmentIds(new Set(rows.map((r) => r.section.id))))
      .catch(() => {});
  }, [accessToken, profile]);

  async function handleEnroll(sectionId: string) {
    setStatus(null);
    setError(null);
    try {
      await apiFetch('/enrollment', { method: 'POST', token: accessToken, body: JSON.stringify({ sectionId }) });
      setStatus('Enrolled successfully — the course is now on your timetable.');
      setMyEnrollmentIds((prev) => new Set(prev).add(sectionId));
      // Re-fetch sections for the same department after enroll
      apiFetch<SectionView[]>(`/sections?departmentId=${departmentId}`, { token: accessToken }).then(setSections).catch(() => {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Enrollment failed');
    }
  }

  async function handleWithdraw(sectionId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to withdraw from this course? This will release the seat for other students.')) return;
    setStatus(null);
    setError(null);
    try {
      await apiFetch(`/enrollment/${sectionId}/withdraw`, { method: 'POST', token: accessToken });
      setStatus('Withdrawn — the seat has been released.');
      setMyEnrollmentIds((prev) => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
      // Re-fetch sections for the same department after withdraw
      apiFetch<SectionView[]>(`/sections?departmentId=${departmentId}`, { token: accessToken }).then(setSections).catch(() => {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Withdrawal failed');
    }
  }

  const totalSeats = sections.reduce((sum, s) => sum + s.capacity, 0);
  const openSeats = sections.reduce((sum, s) => sum + s.seatsRemaining, 0);
  const windowOpen = schedule !== null;

  return (
    <RoleLayout title="Enrollment" items={[]} notificationsHref="#">
      <main className="p-6 lg:p-10">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Department</p>
        <p className="mt-1 font-medium text-slate-900">
          {profile?.departmentId ?? '—'}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Showing sections for {profile?.departmentId ?? 'your department'}
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Enrollment window</p>
          <p className="font-serif text-xl font-semibold text-slate-900">
            {windowOpen ? <span className="text-green-700">Open</span> : <span className="text-slate-500">Closed</span>}
          </p>
          {schedule && (
            <p className="mt-1 text-xs text-slate-500">
              {schedule.term} · {new Date(schedule.startsAt).toLocaleDateString()} – {new Date(schedule.endsAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Sections offered</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{sections.length}</p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Open seats</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{openSeats}<span className="text-sm font-normal text-slate-400"> / {totalSeats}</span></p>
        </div>
        <div className="ledger-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">My enrollments</p>
          <p className="font-serif text-2xl font-semibold text-slate-900">{myEnrollmentIds.size}</p>
        </div>
      </div>

      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {status && <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{status}</p>}

      <h2 className="mb-3 font-serif text-lg font-semibold text-slate-900">Available Sections</h2>
      {sections.length === 0 ? (
        <EmptyState title="No sections offered" hint="Courses for your department are not published yet — check back before enrollment opens." />
      ) : (
        <div className="space-y-3">
          {sections.map((s) => {
            const enrolled = myEnrollmentIds.has(s.id);
            const full = s.seatsRemaining <= 0;
            return (
              <div key={s.id} className={`ledger-card flex flex-wrap items-center justify-between gap-3 p-5 ${enrolled ? 'border-l-4 border-l-green-600' : ''}`}>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {s.course.title} <span className="font-data text-sm text-slate-500">({s.course.code})</span>
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {s.term} · {s.course.creditHours} credit hour{s.course.creditHours === 1 ? '' : 's'} · {s.teacher.user.email}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    <span className={full ? 'text-red-600' : 'text-slate-500'}>{full ? 'Full — no seats remaining' : `${s.seatsRemaining} of ${s.capacity} seats left`}</span>
                    {enrolled && <span className="ml-2 text-green-700">You are enrolled in this section</span>}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {enrolled ? (
                    <button
                      onClick={() => handleWithdraw(s.id)}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:border-red-600 hover:text-red-600"
                    >
                      Withdraw
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEnroll(s.id)}
                      disabled={full || !windowOpen}
                      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
                    >
                      {full ? 'Full' : 'Enroll'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        Enrollment is gated on an open registration window for your department and a free seat in the section — the server rejects closed-window or full-section enrollments with a clear reason.
      </p>
</main>
    </RoleLayout>
  );
}
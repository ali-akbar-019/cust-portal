'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';

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

const card = 'rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur-sm';

export default function StudentEnrollmentPage() {
  const { accessToken, profile } = useAuth();
  const [sections, setSections] = useState<SectionView[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [myEnrollmentIds, setMyEnrollmentIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busySection, setBusySection] = useState<string | null>(null);

  const departmentId = profile?.departmentId ?? '';

  async function reloadSections() {
    if (!accessToken || !departmentId) return;
    const data = await apiFetch<SectionView[]>(`/sections?departmentId=${encodeURIComponent(departmentId)}`, { token: accessToken });
    setSections(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    if (!accessToken || !profile?.studentId || !departmentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      apiFetch<SectionView[]>(`/sections?departmentId=${encodeURIComponent(departmentId)}`, { token: accessToken }),
      apiFetch<Schedule | null>(`/enrollment/schedules/active?departmentId=${encodeURIComponent(departmentId)}`, { token: accessToken }).catch(() => null),
      apiFetch<MyEnrollment[]>(`/enrollment/student/${profile.studentId}`, { token: accessToken }),
    ])
      .then(([sectionData, activeSchedule, enrollments]) => {
        setSections(Array.isArray(sectionData) ? sectionData : []);
        setSchedule(activeSchedule);
        setMyEnrollmentIds(new Set((enrollments ?? []).map((row) => row.section.id)));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load enrollment information'))
      .finally(() => setLoading(false));
  }, [accessToken, profile?.studentId, departmentId]);

  async function handleEnroll(sectionId: string) {
    if (!accessToken || busySection) return;
    setBusySection(sectionId);
    setError(null);
    setStatus(null);
    try {
      await apiFetch('/enrollment', { method: 'POST', token: accessToken, body: JSON.stringify({ sectionId }) });
      setMyEnrollmentIds((prev) => new Set(prev).add(sectionId));
      setStatus('Enrollment successful. The course is now on your timetable.');
      await reloadSections();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Enrollment failed');
    } finally {
      setBusySection(null);
    }
  }

  async function handleWithdraw(sectionId: string) {
    if (!accessToken || busySection) return;
    if (!window.confirm('Withdraw from this course? The seat will be released for another student.')) return;

    setBusySection(sectionId);
    setError(null);
    setStatus(null);
    try {
      await apiFetch(`/enrollment/${sectionId}/withdraw`, { method: 'POST', token: accessToken });
      setMyEnrollmentIds((prev) => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
      setStatus('Course withdrawn successfully.');
      await reloadSections();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Withdrawal failed');
    } finally {
      setBusySection(null);
    }
  }

  const totalSeats = useMemo(() => sections.reduce((sum, section) => sum + section.capacity, 0), [sections]);
  const openSeats = useMemo(() => sections.reduce((sum, section) => sum + Math.max(0, section.seatsRemaining), 0), [sections]);
  const windowOpen = schedule !== null;

  return (
    <main className="min-w-0 overflow-x-hidden bg-slate-50/50 p-4 sm:p-6 lg:p-8 xl:p-10">
      <div className="mx-auto w-full max-w-7xl">
        <PageHeader eyebrow="Course Registration" title="Enrollment" subtitle={`Sections available for your department${departmentId ? ` · ${departmentId}` : ''}. Enrollment is controlled by the active registration window.`} />

        <section className={`${card} mb-7 mt-7 overflow-hidden`}>
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
            <div className="p-4 sm:p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Window</p><p className="mt-2 text-sm font-semibold text-slate-900">{windowOpen ? 'Open' : 'Closed'}</p><p className="mt-1 text-[11px] text-slate-400">{schedule?.term ?? 'No active schedule'}</p></div>
            <div className="p-4 sm:p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Sections</p><p className="mt-2 font-data text-2xl font-semibold text-slate-900">{sections.length}</p></div>
            <div className="p-4 sm:p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Open seats</p><p className="mt-2 font-data text-2xl font-semibold text-slate-900">{openSeats}<span className="text-xs font-normal text-slate-400"> / {totalSeats}</span></p></div>
            <div className="p-4 sm:p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">My courses</p><p className="mt-2 font-data text-2xl font-semibold text-slate-900">{myEnrollmentIds.size}</p></div>
          </div>
        </section>

        {(error || status) && <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600'}`}>{error ?? status}</div>}

        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Registration</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Available sections</h2></div>
          {schedule && <p className="hidden text-xs text-slate-400 sm:block">{new Date(schedule.startsAt).toLocaleDateString()} – {new Date(schedule.endsAt).toLocaleDateString()}</p>}
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className={`${card} h-28 animate-pulse bg-slate-100`} />)}</div>
        ) : sections.length === 0 ? (
          <EmptyState title="No sections offered" hint="Courses for your department have not been published yet." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {sections.map((section) => {
              const enrolled = myEnrollmentIds.has(section.id);
              const full = section.seatsRemaining <= 0;
              const busy = busySection === section.id;

              return (
                <article key={section.id} className={`${card} p-4 sm:p-5`}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 font-data text-[10px] font-bold text-white">{section.course.code.slice(0, 4)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0"><h3 className="text-sm font-semibold text-slate-900 sm:text-base">{section.course.title}</h3><p className="mt-1 font-data text-xs text-slate-400">{section.course.code} · {section.course.creditHours} credit hours</p></div>
                        <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold ${enrolled ? 'bg-slate-900 text-white' : full ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>{enrolled ? 'Enrolled' : full ? 'Full' : `${section.seatsRemaining} seats left`}</span>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">{section.term} · {section.teacher.user.email}</p>
                      <div className="mt-4 flex justify-end">
                        {enrolled ? <button type="button" onClick={() => void handleWithdraw(section.id)} disabled={busy} className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:opacity-40">{busy ? 'Working…' : 'Withdraw'}</button> : <button type="button" onClick={() => void handleEnroll(section.id)} disabled={full || !windowOpen || busy} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'Working…' : full ? 'Full' : !windowOpen ? 'Window closed' : 'Enroll'}</button>}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-6 max-w-3xl text-xs leading-5 text-slate-400">Enrollment is validated by the server against your department, the active registration window, and available seats.</p>
      </div>
    </main>
  );
}

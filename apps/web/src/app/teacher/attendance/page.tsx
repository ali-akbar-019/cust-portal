'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';

interface MySection { id: string; course: { title: string; code: string }; enrolledCount: number; }
interface RosterStudent { id: string; enrollmentNo: string; user: { email: string }; attendances: { status: 'PRESENT' | 'ABSENT' }[]; }

export default function TeacherAttendancePage() {
  const { accessToken, profile } = useAuth();
  const [sections, setSections] = useState<MySection[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [statuses, setStatuses] = useState<Record<string, 'PRESENT' | 'ABSENT'>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accessToken || !profile?.teacherId) return;
    setLoading(true);
    apiFetch<MySection[]>(`/teachers/${profile.teacherId}/sections`, { token: accessToken })
      .then((data) => { setSections(data); setSectionId(data[0]?.id ?? ''); })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load sections'))
      .finally(() => setLoading(false));
  }, [accessToken, profile?.teacherId]);

  useEffect(() => {
    if (!sectionId || !date || !accessToken) return;
    setLoading(true); setError(null); setMessage(null);
    apiFetch<RosterStudent[]>(`/attendance/section/${sectionId}/roster?date=${date}`, { token: accessToken })
      .then((data) => {
        setRoster(data);
        const next: Record<string, 'PRESENT' | 'ABSENT'> = {};
        data.forEach((student) => { next[student.id] = student.attendances[0]?.status ?? 'PRESENT'; });
        setStatuses(next);
      })
      .catch((err) => { setRoster([]); setError(err instanceof ApiError ? err.message : 'Failed to load roster'); })
      .finally(() => setLoading(false));
  }, [sectionId, date, accessToken]);

  const present = useMemo(() => Object.values(statuses).filter((s) => s === 'PRESENT').length, [statuses]);
  const absent = Math.max(0, roster.length - present);
  const current = sections.find((s) => s.id === sectionId);

  function markAll(status: 'PRESENT' | 'ABSENT') {
    const next: Record<string, 'PRESENT' | 'ABSENT'> = {};
    roster.forEach((student) => { next[student.id] = status; });
    setStatuses(next);
  }

  async function save() {
    if (!accessToken || !sectionId || !roster.length) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const records = roster.map((student) => ({ studentId: student.id, status: statuses[student.id] ?? 'PRESENT' }));
      const result = await apiFetch<{ markedCount: number }>('/attendance/mark', { method: 'POST', token: accessToken, body: JSON.stringify({ sectionId, date, records }) });
      setMessage(`Attendance recorded for ${result.markedCount} students.`);
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Failed to submit attendance'); }
    finally { setSaving(false); }
  }

  return (
    <main className="min-w-0 overflow-x-hidden p-4 sm:p-6 lg:p-10">
      <PageHeader eyebrow="Faculty / Register" title="Mark Attendance" subtitle="Take attendance for a section and date. Existing records are updated when you submit again." />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.04)] sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-400">Class setup</p><h2 className="mt-1 font-serif text-lg font-semibold text-slate-900">Choose section and date</h2></div>
            <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 sm:inline-flex">{roster.length} students</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_190px]">
            <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">Section</span><select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10">{sections.length === 0 && <option value="">No sections assigned</option>}{sections.map((s) => <option key={s.id} value={s.id}>{s.course.title} ({s.course.code}) · {s.enrolledCount}</option>)}</select></label>
            <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10" /></label>
          </div>
          {current && <p className="mt-4 text-xs text-slate-500">{current.course.code} · {current.course.title}</p>}
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-2xl border border-slate-200/90 bg-slate-900 p-5 text-white shadow-sm sm:col-span-1 lg:col-span-1"><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-slate-400">Present</p><p className="mt-2 font-serif text-3xl font-semibold">{present}</p></div>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-slate-400">Absent</p><p className="mt-2 font-serif text-3xl font-semibold text-slate-900">{absent}</p></div>
          <div className="col-span-2 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:col-span-1"><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-slate-400">Coverage</p><p className="mt-2 font-serif text-3xl font-semibold text-slate-900">{roster.length ? `${Math.round((present / roster.length) * 100)}%` : '—'}</p></div>
        </section>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</div>}

      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]">
        <header className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><h2 className="font-serif text-lg font-semibold text-slate-900">Class register</h2><p className="mt-1 text-xs text-slate-500">{date} · {roster.length} enrolled</p></div>
          <div className="grid grid-cols-2 gap-2 sm:flex"><button type="button" onClick={() => markAll('PRESENT')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">All present</button><button type="button" onClick={() => markAll('ABSENT')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">All absent</button></div>
        </header>
        {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading register…</div> : roster.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No students enrolled in this section yet.</div> : <>
          <div className="hidden grid-cols-[minmax(0,1fr)_180px] gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-2.5 text-[10px] font-semibold uppercase tracking-[.14em] text-slate-400 sm:grid"><span>Student</span><span className="text-center">Status</span></div>
          <div className="divide-y divide-slate-100">{roster.map((student) => <div key={student.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center sm:px-6"><div className="min-w-0"><p className="font-data text-sm font-semibold text-slate-800">{student.enrollmentNo}</p><p className="mt-0.5 truncate text-xs text-slate-400">{student.user.email}</p></div><div className="grid grid-cols-2 gap-1.5">{(['PRESENT','ABSENT'] as const).map((option) => <button key={option} type="button" onClick={() => setStatuses((prev) => ({ ...prev, [student.id]: option }))} className={`rounded-lg px-3 py-2.5 text-xs font-medium transition ${statuses[student.id] === option ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{option === 'PRESENT' ? 'Present' : 'Absent'}</button>)}</div></div>)}</div>
          <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><p className="text-xs text-slate-500">{present} present · {absent} absent</p><button type="button" onClick={save} disabled={saving} className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{saving ? 'Saving…' : 'Save attendance'}</button></footer>
        </>}
      </section>
    </main>
  );
}

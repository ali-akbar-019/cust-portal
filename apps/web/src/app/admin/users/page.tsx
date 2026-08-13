'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { AdminButton, AdminField, AdminMessage, AdminPill, AdminSurface, inputClass, selectClass } from '../_components/admin-ui';

interface Department { id: string; name: string; code: string; }

export default function AdminUsersPage() {
  const { accessToken } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tab, setTab] = useState<'student' | 'teacher'>('student');
  const [studentForm, setStudentForm] = useState({ email: '', password: '', enrollmentNo: '', departmentId: '', semester: '1' });
  const [teacherForm, setTeacherForm] = useState({ email: '', password: '', departmentId: '', designation: 'Lecturer' });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<Department[]>('/departments', { token: accessToken })
      .then((depts) => {
        setDepartments(depts);
        if (depts.length > 0) {
          setStudentForm((prev) => ({ ...prev, departmentId: prev.departmentId || depts[0]?.id || '' }));
          setTeacherForm((prev) => ({ ...prev, departmentId: prev.departmentId || depts[0]?.id || '' }));
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load departments'));
  }, [accessToken]);

  function switchTab(tabName: 'student' | 'teacher') {
    setTab(tabName);
    setStatus(null);
    setError(null);
  }

  async function createStudent() {
    setStatus(null); setError(null); setSaving(true);
    try {
      await apiFetch('/students', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ ...studentForm, semester: Number(studentForm.semester) }),
      });
      setStatus(`Student ${studentForm.email} created.`);
      setStudentForm((prev) => ({ ...prev, email: '', password: '', enrollmentNo: '' }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create student');
    } finally { setSaving(false); }
  }

  async function createTeacher() {
    setStatus(null); setError(null); setSaving(true);
    try {
      await apiFetch('/teachers', { method: 'POST', token: accessToken, body: JSON.stringify(teacherForm) });
      setStatus(`Teacher ${teacherForm.email} created.`);
      setTeacherForm((prev) => ({ ...prev, email: '', password: '' }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create teacher');
    } finally { setSaving(false); }
  }

  return (
    <main className="min-w-0 p-4 sm:p-6 lg:p-10">
      <PageHeader eyebrow="User Administration" title="Manage Users" subtitle="Create student and teacher accounts with the correct academic profile from one place." />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <AdminSurface className="overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/60 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Account type</p>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-1">
              {(['student', 'teacher'] as const).map((t) => (
                <button key={t} type="button" onClick={() => switchTab(t)} className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${tab === t ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                  {t === 'student' ? 'Student' : 'Teacher'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {error && <div className="mb-4"><AdminMessage tone="error">{error}</AdminMessage></div>}
            {status && <div className="mb-4"><AdminMessage tone="success">{status}</AdminMessage></div>}

            {tab === 'student' ? (
              <div className="space-y-4">
                <AdminField label="Email">
                  <input type="email" className={inputClass} placeholder="student@cust.edu.pk" value={studentForm.email} onChange={(e) => setStudentForm((p) => ({ ...p, email: e.target.value }))} />
                </AdminField>
                <AdminField label="Temporary password" hint="Provide the initial password the student will use to sign in.">
                  <input type="password" autoComplete="new-password" className={inputClass} placeholder="At least 8 characters" value={studentForm.password} onChange={(e) => setStudentForm((p) => ({ ...p, password: e.target.value }))} />
                </AdminField>
                <AdminField label="Enrollment number">
                  <input className={`${inputClass} font-data`} placeholder="BSSE230099" value={studentForm.enrollmentNo} onChange={(e) => setStudentForm((p) => ({ ...p, enrollmentNo: e.target.value }))} />
                </AdminField>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <AdminField label="Department">
                    <select className={selectClass} value={studentForm.departmentId} onChange={(e) => setStudentForm((p) => ({ ...p, departmentId: e.target.value }))}>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
                    </select>
                  </AdminField>
                  <AdminField label="Semester">
                    <select className={selectClass} value={studentForm.semester} onChange={(e) => setStudentForm((p) => ({ ...p, semester: e.target.value }))}>
                      {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </AdminField>
                </div>
                <AdminButton onClick={createStudent} disabled={saving || !studentForm.email || !studentForm.password || !studentForm.enrollmentNo || !studentForm.departmentId} className="w-full sm:w-auto">
                  {saving ? 'Creating…' : 'Create student'}
                </AdminButton>
              </div>
            ) : (
              <div className="space-y-4">
                <AdminField label="Email">
                  <input type="email" className={inputClass} placeholder="teacher@cust.edu.pk" value={teacherForm.email} onChange={(e) => setTeacherForm((p) => ({ ...p, email: e.target.value }))} />
                </AdminField>
                <AdminField label="Temporary password">
                  <input type="password" autoComplete="new-password" className={inputClass} placeholder="At least 8 characters" value={teacherForm.password} onChange={(e) => setTeacherForm((p) => ({ ...p, password: e.target.value }))} />
                </AdminField>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <AdminField label="Department">
                    <select className={selectClass} value={teacherForm.departmentId} onChange={(e) => setTeacherForm((p) => ({ ...p, departmentId: e.target.value }))}>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
                    </select>
                  </AdminField>
                  <AdminField label="Designation">
                    <select className={selectClass} value={teacherForm.designation} onChange={(e) => setTeacherForm((p) => ({ ...p, designation: e.target.value }))}>
                      {['Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor'].map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </AdminField>
                </div>
                <AdminButton onClick={createTeacher} disabled={saving || !teacherForm.email || !teacherForm.password || !teacherForm.departmentId} className="w-full sm:w-auto">
                  {saving ? 'Creating…' : 'Create teacher'}
                </AdminButton>
              </div>
            )}
          </div>
        </AdminSurface>

        <AdminSurface className="hidden p-6 xl:block">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Account setup</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-slate-950">Keep profiles complete</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">Assign each account to its department during creation so enrollment, scheduling, grading, and reporting can resolve the correct academic context.</p>
          <div className="mt-8 space-y-3">
            <div className="rounded-xl border border-slate-200 p-4"><AdminPill tone="dark">Student</AdminPill><p className="mt-2 text-xs leading-5 text-slate-500">Enrollment number, semester, department, and login credentials.</p></div>
            <div className="rounded-xl border border-slate-200 p-4"><AdminPill>Teacher</AdminPill><p className="mt-2 text-xs leading-5 text-slate-500">Department, designation, and login credentials for faculty access.</p></div>
          </div>
        </AdminSurface>
      </div>
    </main>
  );
}

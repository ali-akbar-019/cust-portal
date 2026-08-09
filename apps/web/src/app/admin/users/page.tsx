'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function AdminUsersPage() {
  const { accessToken } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tab, setTab] = useState<'student' | 'teacher'>('student');

  const [studentForm, setStudentForm] = useState({ email: '', password: '', enrollmentNo: '', departmentId: '', semester: '1' });
  const [teacherForm, setTeacherForm] = useState({ email: '', password: '', departmentId: '', designation: 'Lecturer' });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<Department[]>('/departments', { token: accessToken })
      .then((depts) => {
        setDepartments(depts);
        if (depts.length > 0) {
          setStudentForm((prev) => ({ ...prev, departmentId: depts[0]?.id ?? '' }));
          setTeacherForm((prev) => ({ ...prev, departmentId: depts[0]?.id ?? '' }));
        }
      })
      .catch(() => {});
  }, [accessToken]);

  async function createStudent() {
    setStatus(null);
    setError(null);
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
    }
  }

  async function createTeacher() {
    setStatus(null);
    setError(null);
    try {
      await apiFetch('/teachers', { method: 'POST', token: accessToken, body: JSON.stringify(teacherForm) });
      setStatus(`Teacher ${teacherForm.email} created.`);
      setTeacherForm((prev) => ({ ...prev, email: '', password: '' }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create teacher');
    }
  }

  return (
    <main className="p-6 lg:p-10">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Administration</p>
      <h1 className="mb-6 font-serif text-2xl font-semibold text-slate-900">Manage Users</h1>

      <div className="mb-6 inline-flex rounded-lg border border-slate-200 bg-white p-1">
        {(['student', 'teacher'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition ${
              tab === t ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Add {t}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 max-w-md text-sm text-red-600">{error}</p>}
      {status && <p className="mb-3 max-w-md text-sm text-green-700">{status}</p>}

      {tab === 'student' ? (
        <div className="ledger-card max-w-md space-y-3 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={studentForm.email}
              onChange={(e) => setStudentForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="student@cust.edu.pk"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Temporary Password</label>
            <input
              type="text"
              value={studentForm.password}
              onChange={(e) => setStudentForm((p) => ({ ...p, password: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Enrollment Number</label>
            <input
              type="text"
              value={studentForm.enrollmentNo}
              onChange={(e) => setStudentForm((p) => ({ ...p, enrollmentNo: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-data"
              placeholder="BSSE230099"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
              <select
                value={studentForm.departmentId}
                onChange={(e) => setStudentForm((p) => ({ ...p, departmentId: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Semester</label>
              <select
                value={studentForm.semester}
                onChange={(e) => setStudentForm((p) => ({ ...p, semester: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={createStudent} className="w-full rounded-md bg-slate-900 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800">
            Create Student
          </button>
        </div>
      ) : (
        <div className="ledger-card max-w-md space-y-3 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={teacherForm.email}
              onChange={(e) => setTeacherForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="teacher@cust.edu.pk"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Temporary Password</label>
            <input
              type="text"
              value={teacherForm.password}
              onChange={(e) => setTeacherForm((p) => ({ ...p, password: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="At least 8 characters"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
              <select
                value={teacherForm.departmentId}
                onChange={(e) => setTeacherForm((p) => ({ ...p, departmentId: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Designation</label>
              <select
                value={teacherForm.designation}
                onChange={(e) => setTeacherForm((p) => ({ ...p, designation: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {['Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={createTeacher} className="w-full rounded-md bg-slate-900 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800">
            Create Teacher
          </button>
        </div>
      )}
    </main>
  );
}

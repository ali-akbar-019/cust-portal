'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

export default function AdminNotificationsPage() {
  const { accessToken } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'ALL' | 'DEPARTMENT' | 'SECTION'>('ALL');
  const [targetId, setTargetId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePost() {
    setStatus(null);
    setError(null);
    try {
      await apiFetch('/notifications', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          title,
          message,
          target,
          ...(target === 'DEPARTMENT' ? { departmentId: targetId } : {}),
          ...(target === 'SECTION' ? { sectionId: targetId } : {}),
        }),
      });
      setStatus('Announcement posted.');
      setTitle('');
      setMessage('');
      setTargetId('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to post announcement');
    }
  }

  return (
    <main className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Post Announcement</h1>

      <div className="max-w-lg space-y-3">
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value as typeof target)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="ALL">Everyone</option>
          <option value="DEPARTMENT">Specific department</option>
          <option value="SECTION">Specific section</option>
        </select>
        {target !== 'ALL' && (
          <input
            placeholder={target === 'DEPARTMENT' ? 'Department ID' : 'Section ID'}
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {status && <p className="text-sm text-green-600">{status}</p>}
        <button onClick={handlePost} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
          Post
        </button>
      </div>
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';

interface Book {
  id: string;
  title: string;
  author: string;
  availableCopies: number;
  totalCopies: number;
}

export default function StudentLibraryPage() {
  const { accessToken } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<Book[]>('/library/books', { token: accessToken }).then(setBooks).catch(() => {});
  }, [accessToken]);

  async function handleReserve(bookId: string) {
    setStatus(null);
    setError(null);
    try {
      await apiFetch('/library/reservations', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ bookId }),
      });
      setStatus('Reserved successfully.');
      setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, availableCopies: b.availableCopies - 1 } : b)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Reservation failed');
    }
  }

  async function handleClearanceRequest() {
    setStatus(null);
    setError(null);
    try {
      await apiFetch('/library/clearance', { method: 'POST', token: accessToken });
      setStatus('Clearance request submitted.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Request failed');
    }
  }

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Library</h1>
        <button onClick={handleClearanceRequest} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
          Request Clearance
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {status && <p className="mb-3 text-sm text-green-600">{status}</p>}

      <div className="space-y-3">
        {books.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <p className="font-medium">{b.title}</p>
              <p className="text-xs text-slate-500">
                {b.author} · {b.availableCopies}/{b.totalCopies} available
              </p>
            </div>
            <button
              onClick={() => handleReserve(b.id)}
              disabled={b.availableCopies <= 0}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
            >
              {b.availableCopies <= 0 ? 'Unavailable' : 'Reserve'}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}

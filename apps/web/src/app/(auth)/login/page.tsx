'use client';

import { useState, FormEvent } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-client';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* left — identity panel, hidden on small screens */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, transparent, transparent 38px, rgba(255,255,255,0.6) 38px, rgba(255,255,255,0.6) 39px)',
          }}
        />
        <div className="relative flex items-center gap-3">
          <Image src="/cust-logo.png" alt="CUST" width={44} height={44} />
          <span className="font-serif text-lg font-semibold">Capital University</span>
        </div>

        <div className="relative">
          <p className="mb-3 inline-block ribbon-badge bg-red-600 text-white">Student &amp; Faculty Portal</p>
          <h1 className="max-w-sm font-serif text-4xl font-semibold leading-tight">
            Your academic record, in one ledger.
          </h1>
          <p className="mt-4 max-w-sm text-sm text-slate-400">
            Timetables, attendance, results, and requests — everything the registrar keeps, now at your fingertips.
          </p>
        </div>

        <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} Capital University of Science &amp; Technology</p>
      </div>

      {/* right — form */}
      <div className="flex items-center justify-center bg-slate-50 px-6 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <Image src="/cust-logo.png" alt="CUST logo" width={64} height={64} />
          </div>

          <h2 className="mb-1 font-serif text-2xl font-semibold text-slate-900">Sign in</h2>
          <p className="mb-6 text-sm text-slate-500">Enter your university credentials to continue.</p>

          {error && (
            <p className="mb-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-900"
            placeholder="you@cust.edu.pk"
          />

          <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-6 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-900"
            placeholder="••••••••"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-slate-900 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}

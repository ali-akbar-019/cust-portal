'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, ArrowRight, ShieldCheck, BookOpen, CalendarDays } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-client';

export default function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to sign in. Please check your credentials and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        {/* =========================================================
    LEFT — CUST INSTITUTIONAL PANEL
========================================================= */}
        <section className="relative hidden overflow-hidden bg-[#10151c] text-white lg:flex">
          {/* Very subtle architectural grid */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage: `
        linear-gradient(
          90deg,
          rgba(255,255,255,0.9) 1px,
          transparent 1px
        ),
        linear-gradient(
          rgba(255,255,255,0.9) 1px,
          transparent 1px
        )
      `,
              backgroundSize: '56px 56px',
            }}
          />

          {/* Subtle red architectural accent */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 h-full w-[5px] bg-red-700/80"
          />

          <div className="relative z-10 flex min-h-screen w-full flex-col px-12 py-10 xl:px-16 xl:py-12">
            {/* =====================================================
        UNIVERSITY BRAND
    ===================================================== */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center bg-white p-2">
                <Image
                  src="/cust-logo.png"
                  alt="Capital University of Science and Technology"
                  width={48}
                  height={48}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>

              <div>
                <p className="font-serif text-xl font-semibold tracking-tight text-white">
                  Capital University
                </p>

                <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  of Science &amp; Technology
                </p>
              </div>
            </div>

            {/* =====================================================
        MAIN CONTENT
    ===================================================== */}
            <div className="my-auto max-w-xl">
              <p className="mb-6 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                CUST Portal
              </p>

              <h1 className="max-w-lg font-serif text-5xl font-semibold leading-[1.08] tracking-tight text-white xl:text-[58px]">
                Your academic
                <br />
                journey starts here.
              </h1>

              <div className="mt-7 h-px w-16 bg-red-600" />

              <p className="mt-7 max-w-lg text-[15px] leading-7 text-slate-400">
                A centralized digital platform for the students, faculty,
                and administration of Capital University of Science &
                Technology.
              </p>

              {/* Simple portal scope */}
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-400">
                <span>Students</span>

                <span
                  aria-hidden="true"
                  className="h-1 w-1 rounded-full bg-slate-600"
                />

                <span>Faculty</span>

                <span
                  aria-hidden="true"
                  className="h-1 w-1 rounded-full bg-slate-600"
                />

                <span>Administration</span>
              </div>
            </div>

            {/* =====================================================
        FOOTER
    ===================================================== */}
            <div className="border-t border-white/10 pt-6">
              <div className="flex items-end justify-between gap-8">
                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Capital University of Science &amp; Technology
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Islamabad Expressway, Kahuta Road, Islamabad
                  </p>
                </div>

                <p className="text-xs text-slate-600">
                  © {new Date().getFullYear()} CUST
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* =========================================================
            RIGHT — LOGIN
        ========================================================= */}
        <section className="flex min-h-screen items-center justify-center bg-white px-5 py-10 sm:px-8 lg:bg-slate-50 xl:px-12">
          <div className="w-full max-w-md">
            {/* Mobile brand */}
            <div className="mb-10 flex flex-col items-center text-center lg:hidden">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <Image
                  src="/cust-logo.png"
                  alt="Capital University of Science and Technology"
                  width={56}
                  height={56}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>

              <p className="mt-4 font-serif text-lg font-semibold text-slate-900">
                Capital University
              </p>

              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Science &amp; Technology
              </p>
            </div>

            {/* Login card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.06)] sm:p-8">
              <div className="mb-8">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <ShieldCheck className="h-5 w-5 text-slate-700" />
                </div>

                <h2 className="font-serif text-3xl font-semibold tracking-tight text-slate-950">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in with your university credentials to access the
                  academic portal.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                >
                  <p className="text-sm font-medium text-red-800">
                    Sign-in failed
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700">
                    {error}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* Email */}
                <div className="mb-5">
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    University email
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);

                      if (error) {
                        setError(null);
                      }
                    }}
                    disabled={isSubmitting}
                    placeholder="you@cust.edu.pk"
                    className="
                      h-12
                      w-full
                      rounded-xl
                      border
                      border-slate-300
                      bg-white
                      px-4
                      text-sm
                      text-slate-900
                      outline-none
                      transition
                      placeholder:text-slate-400
                      hover:border-slate-400
                      focus:border-slate-900
                      focus:ring-4
                      focus:ring-slate-900/5
                      disabled:cursor-not-allowed
                      disabled:bg-slate-50
                    "
                  />
                </div>

                {/* Password */}
                <div className="mb-7">
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);

                        if (error) {
                          setError(null);
                        }
                      }}
                      disabled={isSubmitting}
                      placeholder="Enter your password"
                      className="
                        h-12
                        w-full
                        rounded-xl
                        border
                        border-slate-300
                        bg-white
                        px-4
                        pr-12
                        text-sm
                        text-slate-900
                        outline-none
                        transition
                        placeholder:text-slate-400
                        hover:border-slate-400
                        focus:border-slate-900
                        focus:ring-4
                        focus:ring-slate-900/5
                        disabled:cursor-not-allowed
                        disabled:bg-slate-50
                      "
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      disabled={isSubmitting}
                      aria-label={
                        showPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                      className="
                        absolute
                        right-2
                        top-1/2
                        flex
                        h-9
                        w-9
                        -translate-y-1/2
                        items-center
                        justify-center
                        rounded-lg
                        text-slate-400
                        transition
                        hover:bg-slate-100
                        hover:text-slate-700
                        disabled:pointer-events-none
                      "
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !email.trim() ||
                    !password
                  }
                  className="
                    group
                    flex
                    h-12
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-slate-950
                    px-4
                    text-sm
                    font-semibold
                    text-white
                    shadow-sm
                    transition
                    hover:bg-slate-800
                    focus:outline-none
                    focus:ring-4
                    focus:ring-slate-900/10
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {isSubmitting ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                      />

                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in to portal</span>

                      <ArrowRight
                        className="
                          h-4
                          w-4
                          transition-transform
                          group-hover:translate-x-0.5
                        "
                      />
                    </>
                  )}
                </button>
              </form>

              {/* Security note */}
              <div className="mt-7 flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

                <p className="text-xs leading-5 text-slate-500">
                  Your account is protected by university authentication.
                  Never share your password with anyone.
                </p>
              </div>
            </div>

            {/* Bottom text */}
            <p className="mt-6 text-center text-xs leading-5 text-slate-400">
              Capital University of Science &amp; Technology
              <span className="mx-2 text-slate-300">•</span>
              Academic Portal
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   FEATURE CARD
========================================================= */

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-slate-300">
        {icon}
      </div>

      <p className="text-xs font-semibold text-white">
        {title}
      </p>

      <p className="mt-1 text-[11px] text-slate-500">
        {description}
      </p>
    </div>
  );
}
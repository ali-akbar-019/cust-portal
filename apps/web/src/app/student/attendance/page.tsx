'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { PageHeader, EmptyState } from '@/components/ui/page-header';

interface AttendanceSummary {
  total: number;
  present: number;
  percentage: number;
  isLow: boolean;
  threshold: number;
  records: {
    date: string;
    status: 'PRESENT' | 'ABSENT';
  }[];
}

export default function StudentAttendancePage() {
  const { accessToken, profile, isLoading: authLoading } = useAuth();

  const [summary, setSummary] =
    useState<AttendanceSummary | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !accessToken) return;

    if (!profile?.studentId) {
      setError(
        'Could not resolve your student profile. Try logging out and back in.'
      );
      return;
    }

    apiFetch<AttendanceSummary>(
      `/attendance/student/${profile.studentId}`,
      { token: accessToken }
    )
      .then(setSummary)
      .catch((err) =>
        setError(
          err instanceof ApiError
            ? err.message
            : 'Failed to load attendance'
        )
      );
  }, [accessToken, profile, authLoading]);

  const records = useMemo(
    () =>
      [...(summary?.records ?? [])].sort((a, b) =>
        b.date.localeCompare(a.date)
      ),
    [summary]
  );

  if (error) {
    return (
      <main className="p-5 sm:p-6 lg:p-10">
        <PageHeader
          eyebrow="Academic Record"
          title="My Attendance"
          subtitle="Your attendance record for the current semester"
        />

        <div className="mt-8 border-l-2 border-red-500 pl-4 text-sm text-red-600">
          {error}
        </div>
      </main>
    );
  }

  if (!summary) {
    return (
      <main className="p-5 sm:p-6 lg:p-10">
        <PageHeader
          eyebrow="Academic Record"
          title="My Attendance"
          subtitle="Your attendance record for the current semester"
        />

        <div className="mt-10 text-sm text-slate-400">
          Loading attendance...
        </div>
      </main>
    );
  }

  const absent = summary.total - summary.present;

  const percentage =
    summary.percentage ?? 0;

  const threshold =
    summary.threshold ?? 0;

  const difference =
    Math.abs(percentage - threshold);

  return (
    <main className="min-w-0 p-5 sm:p-6 lg:p-10">
      <PageHeader
        eyebrow="Academic Record"
        title="My Attendance"
        subtitle={`${summary.total} classes recorded this semester`}
      />

      {/* =====================================================
          OVERVIEW
      ====================================================== */}

      <section className="mt-10 border-y border-slate-200">
        <div className="grid grid-cols-2 lg:grid-cols-4">

          <OverviewItem
            label="Attendance"
            value={`${summary.percentage?.toFixed(1) ?? '0.0'}%`}
            large
          />

          <OverviewItem
            label="Present"
            value={summary.present.toString()}
          />

          <OverviewItem
            label="Absent"
            value={absent.toString()}
          />

          <OverviewItem
            label="Required"
            value={`${summary.threshold?.toFixed(0) ?? '0'}%`}
          />

        </div>
      </section>

      {/* =====================================================
          STATUS
      ====================================================== */}

      <section className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">

        {/* Main attendance visualization */}
        <div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-400">
                Current standing
              </p>

              <h2 className="mt-2 font-serif text-xl font-semibold text-slate-900">
                Attendance progress
              </h2>
            </div>

            <p className="font-data text-sm text-slate-400">
              {summary.percentage?.toFixed(1) ?? '0.0'}%
            </p>
          </div>

          {/* Progress line */}
          <div className="relative mt-8">

            <div className="h-1.5 w-full bg-slate-100">
              <div
                className={`h-full ${summary.isLow
                    ? 'bg-slate-900'
                    : 'bg-slate-900'
                  }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, percentage)
                  )}%`,
                }}
              />
            </div>

            {/* Threshold */}
            <div
              className="absolute -top-2 h-5 w-px bg-slate-400"
              style={{
                left: `${Math.min(
                  100,
                  Math.max(0, threshold)
                )}%`,
              }}
            />

          </div>

          <div className="mt-3 flex justify-between text-[11px] text-slate-400">
            <span>0%</span>

            <span className="font-data">
              Required {threshold}%
            </span>

            <span>100%</span>
          </div>

          <div className="mt-7 max-w-xl">
            {summary.isLow ? (
              <p className="text-sm leading-6 text-slate-500">
                Your current attendance is{' '}
                <span className="font-medium text-slate-900">
                  {difference.toFixed(1)}%
                </span>{' '}
                below the required threshold. Consistent
                attendance in upcoming classes will help
                improve your percentage.
              </p>
            ) : (
              <p className="text-sm leading-6 text-slate-500">
                Your attendance is{' '}
                <span className="font-medium text-slate-900">
                  {difference.toFixed(1)}%
                </span>{' '}
                above the required threshold. You are
                currently in a safe position.
              </p>
            )}
          </div>
        </div>

        {/* Small summary */}
        <aside className="border-t border-slate-200 pt-6 lg:border-l lg:border-t-0 lg:pl-8">

          <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-400">
            Semester summary
          </p>

          <div className="mt-5 space-y-4">

            <SummaryRow
              label="Classes conducted"
              value={summary.total}
            />

            <SummaryRow
              label="Classes attended"
              value={summary.present}
            />

            <SummaryRow
              label="Classes missed"
              value={absent}
            />

            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Status
                </span>

                <span className="text-sm font-medium text-slate-900">
                  {summary.isLow
                    ? 'Needs attention'
                    : 'On track'}
                </span>
              </div>
            </div>

          </div>
        </aside>
      </section>

      {/* =====================================================
          RECENT SESSIONS
      ====================================================== */}

      <section className="mt-14">

        <div className="flex items-end justify-between border-b border-slate-200 pb-4">

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-400">
              Recent activity
            </p>

            <h2 className="mt-2 font-serif text-xl font-semibold text-slate-900">
              Recent sessions
            </h2>
          </div>

          <span className="font-data text-xs text-slate-400">
            {Math.min(records.length, 7)} latest
          </span>

        </div>

        {records.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No attendance recorded yet"
              hint="Records will appear here once your teachers start taking attendance."
            />
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-7">

            {records.slice(0, 7).map((record, index) => {
              const present =
                record.status === 'PRESENT';

              return (
                <div
                  key={`${record.date}-${index}`}
                  className="group border-b border-slate-100 py-4 lg:border-b-0 lg:border-r lg:px-5 lg:first:pl-0 lg:last:border-r-0"
                >

                  <div className="flex items-center justify-between lg:block">

                    <div>
                      <p className="font-data text-xs font-medium text-slate-400">
                        {new Date(
                          record.date
                        ).toLocaleDateString(undefined, {
                          weekday: 'short',
                        })}
                      </p>

                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {new Date(
                          record.date
                        ).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    <div
                      className={`flex h-7 w-7 items-center justify-center text-[10px] font-bold lg:mt-5 ${present
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-300 text-slate-500'
                        }`}
                    >
                      {present ? 'P' : 'A'}
                    </div>

                  </div>

                  <p className="mt-2 hidden text-[10px] uppercase tracking-wide text-slate-400 lg:block">
                    {present ? 'Present' : 'Absent'}
                  </p>

                </div>
              );
            })}

          </div>
        )}
      </section>

      {/* =====================================================
          COMPLETE RECORD
      ====================================================== */}

      <section className="mt-14">

        <div className="border-b border-slate-200 pb-4">

          <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-400">
            Complete history
          </p>

          <div className="mt-2 flex items-end justify-between gap-4">

            <h2 className="font-serif text-xl font-semibold text-slate-900">
              Attendance record
            </h2>

            <span className="font-data text-xs text-slate-400">
              {records.length} sessions
            </span>

          </div>

        </div>

        {records.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No attendance recorded yet"
              hint="Records will appear here once your teachers start taking attendance."
            />
          </div>
        ) : (
          <div className="mt-2 overflow-hidden">

            {/* Header */}
            <div className="hidden grid-cols-[1fr_160px] border-b border-slate-100 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400 sm:grid">
              <span>Date</span>
              <span>Status</span>
            </div>

            <div
              className="scroll-area max-h-[30rem] overflow-y-auto"
            >
              {records.map((record, index) => {

                const present =
                  record.status === 'PRESENT';

                return (
                  <div
                    key={`${record.date}-${index}`}
                    className="grid grid-cols-1 gap-2 border-b border-slate-100 py-4 sm:grid-cols-[1fr_160px] sm:items-center"
                  >

                    <div>
                      <p className="text-sm text-slate-700">
                        {new Date(
                          record.date
                        ).toLocaleDateString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">

                      <span
                        className={`h-1.5 w-1.5 rounded-full ${present
                            ? 'bg-slate-900'
                            : 'border border-slate-400 bg-white'
                          }`}
                      />

                      <span className="text-sm text-slate-600">
                        {present
                          ? 'Present'
                          : 'Absent'}
                      </span>

                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}
      </section>
    </main>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function OverviewItem({
  label,
  value,
  large = false,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div className="border-b border-slate-200 px-4 py-6 sm:px-6 lg:border-b-0 lg:border-r lg:px-7 lg:last:border-r-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p
        className={`mt-2 font-data font-semibold tracking-tight ${large
            ? 'text-3xl text-slate-900 sm:text-4xl'
            : 'text-2xl text-slate-800'
          }`}
      >
        {value}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="font-data text-sm font-medium text-slate-900">
        {value.toLocaleString()}
      </span>
    </div>
  );
}
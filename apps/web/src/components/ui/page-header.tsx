import React from 'react';

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 border-b border-slate-200 pb-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {eyebrow}
            </p>
          )}

          <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        {action && (
          <div className="flex shrink-0 items-center gap-2">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  description,
}: {
  title: string;
  hint?: string;
  description?: string;
}) {
  return (
    <div className="ledger-card flex min-h-[220px] items-center justify-center border-dashed p-8">
      <div className="max-w-md text-center">
        <div
          className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50"
          aria-hidden="true"
        >
          <span className="h-2 w-2 rounded-full bg-slate-300" />
        </div>

        <p className="font-serif text-base font-semibold text-slate-800">
          {title}
        </p>

        {description && (
          <p className="mx-auto mt-2 text-sm leading-6 text-slate-500">
            {description}
          </p>
        )}

        {hint && (
          <p className="mx-auto mt-2 text-xs leading-5 text-slate-400">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
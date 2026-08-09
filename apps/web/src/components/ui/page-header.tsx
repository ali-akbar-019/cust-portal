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
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{eyebrow}</p>
        )}
        <h1 className="font-serif text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="ledger-card border-dashed p-8 text-center">
      <p className="font-serif text-base font-semibold text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}
import Link from 'next/link';

export function StatCard({
  href,
  label,
  value,
  hint,
}: {
  href?: string;
  label: string;
  value: string;
  hint?: string;
}) {
  const content = (
    <div className="ledger-card p-5 transition hover:shadow-md">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="font-serif text-3xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

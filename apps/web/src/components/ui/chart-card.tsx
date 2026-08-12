export function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="ledger-card p-5 shadow-sm border border-slate-200">
      <p className="font-serif text-base font-semibold text-slate-900">{title}</p>
      {subtitle && <p className="mb-3 text-xs text-slate-500">{subtitle}</p>}
      <div>{children}</div>
    </div>
  );
}

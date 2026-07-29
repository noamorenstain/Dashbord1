import React from "react";

type Tone = "default" | "positive" | "negative" | "brand" | "amber";

const toneMap: Record<Tone, { bg: string; icon: string; ring: string }> = {
  default: { bg: "bg-slate-50", icon: "text-slate-600", ring: "ring-slate-100" },
  positive: { bg: "bg-emerald-50", icon: "text-emerald-600", ring: "ring-emerald-100" },
  negative: { bg: "bg-rose-50", icon: "text-rose-600", ring: "ring-rose-100" },
  brand: { bg: "bg-brand-50", icon: "text-brand-600", ring: "ring-brand-100" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600", ring: "ring-amber-100" },
};

/** כרטיס מדד (KPI) — מספר גדול, כותרת, אייקון, ושינוי אופציונלי */
export function KpiCard({
  label,
  value,
  icon,
  tone = "default",
  hint,
  delta,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: Tone;
  hint?: string;
  delta?: { value: string; positive: boolean } | null;
}) {
  const t = toneMap[tone];
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-slate-500 text-sm">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1 truncate" title={value}>
          {value}
        </p>
        {delta && (
          <p className={`text-xs mt-1 font-medium ${delta.positive ? "text-emerald-600" : "text-rose-600"}`}>
            {delta.positive ? "▲" : "▼"} {delta.value}
          </p>
        )}
        {hint && <p className="text-slate-400 text-xs mt-1">{hint}</p>}
      </div>
      {icon && (
        <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ring-4 ${t.bg} ${t.icon} ${t.ring}`}>
          {icon}
        </div>
      )}
    </div>
  );
}

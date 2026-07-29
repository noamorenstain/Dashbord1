import React, { useMemo } from "react";
import { AlertTriangle, AlertCircle, Info, ShieldCheck } from "lucide-react";
import { useData } from "../data/DataContext";
import { useFilters } from "../context/FilterContext";
import { detectAnomalies, Severity } from "../lib/anomalies";
import { Card } from "../components/ui/Card";
import { FilterBar } from "../components/FilterBar";
import { KpiCard } from "../components/ui/KpiCard";

const sevMeta: Record<Severity, { label: string; cls: string; icon: React.ReactNode }> = {
  high: { label: "חמור", cls: "bg-rose-50 border-rose-200 text-rose-700", icon: <AlertTriangle size={18} /> },
  medium: { label: "בינוני", cls: "bg-amber-50 border-amber-200 text-amber-700", icon: <AlertCircle size={18} /> },
  low: { label: "קל", cls: "bg-slate-50 border-slate-200 text-slate-600", icon: <Info size={18} /> },
};

export function AnomaliesPage() {
  const { data } = useData();
  const { filters } = useFilters();
  const anomalies = useMemo(() => detectAnomalies(data, filters), [data, filters]);

  const counts = {
    high: anomalies.filter((a) => a.severity === "high").length,
    medium: anomalies.filter((a) => a.severity === "medium").length,
    low: anomalies.filter((a) => a.severity === "low").length,
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">חריגות ובעיות בנתונים</h2>
        <p className="text-slate-400 text-sm">המערכת רק מציגה התראות — היא לעולם לא מתקנת או משלימה נתונים</p>
      </div>
      <FilterBar />

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="התראות חמורות" value={String(counts.high)} icon={<AlertTriangle size={20} />} tone="negative" />
        <KpiCard label="התראות בינוניות" value={String(counts.medium)} icon={<AlertCircle size={20} />} tone="amber" />
        <KpiCard label="התראות קלות" value={String(counts.low)} icon={<Info size={20} />} tone="default" />
      </div>

      {anomalies.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldCheck size={40} className="text-emerald-500 mb-2" />
            <p className="text-slate-700 font-medium">לא נמצאו חריגות בנתונים המסוננים</p>
            <p className="text-slate-400 text-sm">נסה לשנות את הפילטרים כדי לבדוק תקופות אחרות.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {anomalies.map((a) => {
            const m = sevMeta[a.severity];
            return (
              <div key={a.id} className={`border rounded-xl px-4 py-3 flex items-start gap-3 ${m.cls}`}>
                <div className="mt-0.5">{m.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">{a.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/70 border border-slate-200">{a.category}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{a.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================
//  FilterBar — פס הפילטרים הגלובלי (נכס, מדינה, שנה, חודש, פלטפורמה)
//  כל האפשרויות נגזרות מהנתונים עצמם.
// =============================================================

import React, { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { useData } from "../data/DataContext";
import { useFilters } from "../context/FilterContext";
import { Option, Select } from "./ui/Select";
import { monthLabel } from "../lib/format";
import { occMonth, expenseMonth, oneTimeExpenseMonth, extraMonth } from "../lib/calculations";

const ALL: Option = { value: "all", label: "הכול" };

export function FilterBar({ showPlatform = true }: { showPlatform?: boolean }) {
  const { data } = useData();
  const { filters, setFilter, reset } = useFilters();

  const propertyOptions = useMemo<Option[]>(
    () => [ALL, ...data.properties.map((p) => ({ value: p.propertyId, label: p.propertyName }))],
    [data.properties]
  );

  const countryOptions = useMemo<Option[]>(() => {
    const set = [...new Set(data.properties.map((p) => p.country).filter(Boolean))];
    return [ALL, ...set.map((c) => ({ value: c, label: c }))];
  }, [data.properties]);

  const platformOptions = useMemo<Option[]>(() => {
    const set = [...new Set(data.occupation.map((o) => o.platform).filter(Boolean))];
    return [ALL, ...set.map((p) => ({ value: p, label: p }))];
  }, [data.occupation]);

  // כל חילוץ מפתח-חודש עובר דרך אותן פונקציות בדיוק כמו filterDataSet/החישובים —
  // כדי שהפילטר, הטבלאות והגרפים תמיד יסכימו על אותו שיוך חודש (Check-in / Month / BillingDate).
  const { years, monthsByYear } = useMemo(() => {
    const keys = new Set<string>();
    for (const o of data.occupation) {
      const k = occMonth(o);
      if (k) keys.add(k);
    }
    for (const e of data.extras) {
      const k = extraMonth(e);
      if (k) keys.add(k);
    }
    for (const e of data.expenses) {
      const k = expenseMonth(e);
      if (k) keys.add(k);
    }
    // הוצאות חד-פעמיות — נכללות גם הן באפשרויות השנה/חודש (מאגר נפרד, אך אותו פילטר גלובלי)
    for (const e of data.oneTimeExpenses) {
      const k = oneTimeExpenseMonth(e);
      if (k) keys.add(k);
    }
    const yrs = [...new Set([...keys].map((k) => k.split("-")[0]))].sort();
    return { years: yrs, monthsByYear: [...keys].sort() };
  }, [data.occupation, data.extras, data.expenses, data.oneTimeExpenses]);

  const yearOptions: Option[] = [ALL, ...years.map((y) => ({ value: y, label: y }))];
  const monthOptions: Option[] = [
    ALL,
    ...monthsByYear
      .filter((k) => filters.year === "all" || k.startsWith(filters.year))
      .map((k) => ({ value: k, label: monthLabel(k) })),
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 px-4 py-3 flex flex-wrap items-end gap-3">
      <Select label="נכס" value={filters.propertyId} options={propertyOptions} onChange={(v) => setFilter({ propertyId: v })} />
      <Select label="מדינה" value={filters.country} options={countryOptions} onChange={(v) => setFilter({ country: v })} />
      <Select label="שנה" value={filters.year} options={yearOptions} onChange={(v) => setFilter({ year: v, month: "all" })} />
      <Select label="חודש" value={filters.month} options={monthOptions} onChange={(v) => setFilter({ month: v })} />
      {showPlatform && (
        <Select label="פלטפורמה" value={filters.platform} options={platformOptions} onChange={(v) => setFilter({ platform: v })} />
      )}
      <button
        onClick={reset}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50"
      >
        <RotateCcw size={15} />
        איפוס
      </button>
    </div>
  );
}

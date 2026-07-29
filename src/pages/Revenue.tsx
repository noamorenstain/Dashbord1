import React, { useMemo } from "react";
import { Wallet, Coins, Percent, PlusCircle } from "lucide-react";
import { useData } from "../data/DataContext";
import { useFilters } from "../context/FilterContext";
import {
  filterDataSet, grossRevenue, netRevenue, commissionTotal, additionalIncome,
  revenueByPlatform, monthlySeries, NameValue,
} from "../lib/calculations";
import { fmtEUR } from "../lib/format";
import { KpiCard } from "../components/ui/KpiCard";
import { Card } from "../components/ui/Card";
import { FilterBar } from "../components/FilterBar";
import { DataTable, Column } from "../components/ui/DataTable";
import { DonutChart } from "../components/charts/DonutChart";
import { RevenueVsExpensesChart } from "../components/charts/RevenueVsExpensesChart";

export function RevenuePage() {
  const { data } = useData();
  const { filters } = useFilters();
  const d = useMemo(() => filterDataSet(data, filters), [data, filters]);

  // הכנסות לפי נכס
  const byProperty: NameValue[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of d.occupation) map.set(o.propertyId, (map.get(o.propertyId) ?? 0) + o.totalNetPrice);
    return data.properties
      .filter((p) => map.has(p.propertyId))
      .map((p) => ({ name: p.propertyName, value: map.get(p.propertyId) ?? 0 }))
      .sort((a, b) => b.value - a.value);
  }, [d, data.properties]);

  // הכנסות נוספות לפי סוג
  const extrasByType: NameValue[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of d.extras) map.set(e.incomeType || "אחר", (map.get(e.incomeType || "אחר") ?? 0) + e.amount);
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [d]);

  const propCols: Column<NameValue>[] = [
    { key: "name", header: "נכס" },
    { key: "value", header: "הכנסה נטו", render: (r) => fmtEUR(r.value) },
  ];
  const extraCols: Column<NameValue>[] = [
    { key: "name", header: "סוג הכנסה" },
    { key: "value", header: "סכום", render: (r) => fmtEUR(r.value) },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">הכנסות</h2>
        <p className="text-slate-400 text-sm">לפי נכס, חודש, פלטפורמה וסוג הכנסה</p>
      </div>
      <FilterBar />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="הכנסה ברוטו" value={fmtEUR(grossRevenue(d))} icon={<Wallet size={20} />} tone="positive" />
        <KpiCard label="הכנסה נטו (אחרי עמלה)" value={fmtEUR(netRevenue(d))} icon={<Coins size={20} />} tone="brand" />
        <KpiCard label="סך עמלות" value={fmtEUR(commissionTotal(d))} icon={<Percent size={20} />} tone="amber" />
        <KpiCard label="הכנסות נוספות" value={fmtEUR(additionalIncome(d))} icon={<PlusCircle size={20} />} tone="default" />
      </div>

      <div className="grid xl:grid-cols-2 gap-4">
        <Card title="הכנסות לפי חודש">
          <RevenueVsExpensesChart data={monthlySeries(d)} />
        </Card>
        <Card title="הכנסות לפי פלטפורמה" subtitle="ברוטו">
          <DonutChart data={revenueByPlatform(d)} />
        </Card>
      </div>

      <div className="grid xl:grid-cols-2 gap-4">
        <Card title="הכנסות נטו לפי נכס">
          <DataTable columns={propCols} rows={byProperty} />
        </Card>
        <Card title="הכנסות נוספות לפי סוג (Extras)">
          <DataTable columns={extraCols} rows={extrasByType} />
        </Card>
      </div>
    </div>
  );
}

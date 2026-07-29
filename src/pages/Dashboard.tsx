import React, { useMemo } from "react";
import {
  Wallet, Receipt, TrendingUp, Percent, BedDouble, CalendarCheck,
  Coins, Moon, Trophy, TrendingDown,
} from "lucide-react";
import { useData } from "../data/DataContext";
import { useFilters } from "../context/FilterContext";
import {
  filterDataSet, totalRevenue, totalExpenses, netProfit, profitMargin,
  occupancyRate, bookingsCount, avgRevenuePerBooking, avgRevenuePerNight,
  propertySummaries, mostProfitable, weakest, monthlySeries, revenueByPlatform,
  expensesByCategory, monthlyChange, grossRevenue, additionalIncome,
} from "../lib/calculations";
import { fmtEUR, fmtPct, fmtNum } from "../lib/format";
import { KpiCard } from "../components/ui/KpiCard";
import { Card } from "../components/ui/Card";
import { FilterBar } from "../components/FilterBar";
import { DataTable, Column } from "../components/ui/DataTable";
import { ProfitStatusBadge } from "../components/ui/StatusBadge";
import { RevenueVsExpensesChart } from "../components/charts/RevenueVsExpensesChart";
import { ProfitByPropertyChart } from "../components/charts/ProfitByPropertyChart";
import { DonutChart } from "../components/charts/DonutChart";
import { PropertySummary } from "../lib/calculations";

export function DashboardPage() {
  const { data } = useData();
  const { filters } = useFilters();

  const d = useMemo(() => filterDataSet(data, filters), [data, filters]);
  const summaries = useMemo(() => propertySummaries(data, filters), [data, filters]);
  const best = mostProfitable(summaries);
  const worst = weakest(summaries);
  const change = useMemo(() => monthlyChange(d), [d]);

  const grossTotal = grossRevenue(d) + additionalIncome(d); // ברוטו (TotalPrice) + Extras
  const netTotal = totalRevenue(d); // נטו (TotalNetPrice) + Extras
  const exp = totalExpenses(d);
  const profit = netProfit(d);

  const summaryColumns: Column<PropertySummary>[] = [
    { key: "propertyName", header: "נכס", render: (r) => <span className="font-medium text-slate-800">{r.propertyName}</span> },
    { key: "country", header: "מדינה" },
    { key: "revenue", header: "הכנסות", render: (r) => fmtEUR(r.revenue) },
    { key: "expenses", header: "הוצאות", render: (r) => fmtEUR(r.expenses) },
    { key: "netProfit", header: "רווח נקי", render: (r) => (
      <span className={r.netProfit >= 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>{fmtEUR(r.netProfit)}</span>
    ) },
    { key: "margin", header: "שולי רווח", render: (r) => fmtPct(r.margin) },
    { key: "occupancy", header: "תפוסה", render: (r) => fmtPct(r.occupancy) },
    { key: "bookings", header: "הזמנות", render: (r) => fmtNum(r.bookings) },
    { key: "status", header: "סטטוס", render: (r) => <ProfitStatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">דאשבורד ראשי</h2>
        <p className="text-slate-400 text-sm">תמונת מצב כוללת של כל הנכסים</p>
      </div>

      <FilterBar />

      {/* כרטיסי KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        <KpiCard label="סך הכנסות (ברוטו)" value={fmtEUR(grossTotal)} icon={<Wallet size={20} />} tone="positive" hint="TotalPrice + Extras" />
        <KpiCard label="סך הכנסות (נטו)" value={fmtEUR(netTotal)} icon={<Wallet size={20} />} tone="positive" hint="TotalNetPrice + Extras" />
        <KpiCard label="סך הוצאות" value={fmtEUR(exp)} icon={<Receipt size={20} />} tone="negative" />
        <KpiCard
          label="רווח / הפסד נקי"
          value={fmtEUR(profit)}
          icon={profit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          tone={profit >= 0 ? "positive" : "negative"}
          delta={change ? { value: fmtPct(change.deltaPct, 0) + " מהחודש הקודם", positive: change.deltaPct >= 0 } : null}
        />
        <KpiCard label="שולי רווח" value={fmtPct(profitMargin(d))} icon={<Percent size={20} />} tone="brand" />
        <KpiCard label="תפוסה ממוצעת" value={fmtPct(occupancyRate(d, filters))} icon={<BedDouble size={20} />} tone="brand" hint="הערכה" />
        <KpiCard label="מספר הזמנות" value={fmtNum(bookingsCount(d))} icon={<CalendarCheck size={20} />} tone="default" />
        <KpiCard label="הכנסה ממוצעת להזמנה" value={fmtEUR(avgRevenuePerBooking(d))} icon={<Coins size={20} />} tone="default" />
        <KpiCard label="הכנסה ממוצעת ללילה" value={fmtEUR(avgRevenuePerNight(d))} icon={<Moon size={20} />} tone="default" />
      </div>

      {/* נכס מוביל / חלש */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><Trophy size={22} /></div>
          <div>
            <p className="text-emerald-700 text-sm">הנכס הרווחי ביותר</p>
            <p className="font-bold text-slate-800">{best ? best.propertyName : "—"}</p>
            {best && <p className="text-xs text-emerald-700">רווח נקי {fmtEUR(best.netProfit)} · שוליים {fmtPct(best.margin)}</p>}
          </div>
        </div>
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center"><TrendingDown size={22} /></div>
          <div>
            <p className="text-rose-700 text-sm">נכס בביצוע חלש / הפסד</p>
            <p className="font-bold text-slate-800">{worst ? worst.propertyName : "—"}</p>
            {worst && <p className="text-xs text-rose-700">רווח נקי {fmtEUR(worst.netProfit)} · שוליים {fmtPct(worst.margin)}</p>}
          </div>
        </div>
      </div>

      {/* גרפים */}
      <div className="grid xl:grid-cols-2 gap-4">
        <Card title="הכנסות מול הוצאות לפי חודש">
          <RevenueVsExpensesChart data={monthlySeries(d)} />
        </Card>
        <Card title="רווח / הפסד לפי נכס">
          <ProfitByPropertyChart data={summaries} />
        </Card>
        <Card title="התפלגות הכנסות לפי פלטפורמה" subtitle="לפי מחיר ברוטו">
          <DonutChart data={revenueByPlatform(d)} />
        </Card>
        <Card title="התפלגות הוצאות לפי קטגוריה" subtitle="לפי הסכום המלא (כולל טרם שולם)">
          <DonutChart data={expensesByCategory(d)} />
        </Card>
      </div>

      {/* טבלת סיכום נכסים */}
      <Card title="סיכום כל הנכסים">
        <DataTable columns={summaryColumns} rows={summaries} />
      </Card>
    </div>
  );
}

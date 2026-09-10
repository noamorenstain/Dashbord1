import React, { useMemo, useState } from "react";
import { Wallet, Receipt, TrendingUp, Percent } from "lucide-react";
import { useData } from "../data/DataContext";
import { useFilters } from "../context/FilterContext";
import { DataSet } from "../data/types";
import { Filters, filterDataSet, calcRevenue, calcExpenses, calcProfit, calcProfitMargin } from "../lib/calculations";
import {
  availableTargetYears,
  targetedPropertyIds,
  getTargetForSelection,
  compareToTarget,
  isTargetMet,
  TargetComparison,
} from "../lib/targets";
import { KpiPolarity } from "../lib/periods";
import { MonthlyTarget } from "../data/targets";
import { fmtEUR, fmtPct } from "../lib/format";
import { Card } from "../components/ui/Card";
import { Select, Option } from "../components/ui/Select";
import { DataTable, Column } from "../components/ui/DataTable";

const HE_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

interface Actual {
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
}

/**
 * "בפועל" — תמיד דרך filterDataSet + calcRevenue/calcExpenses/calcProfit/
 * calcProfitMargin, בדיוק אותה שכבת חישוב שמזינה את הדשבורד הראשי ו-P&L.
 * מקבל את אובייקט הפילטרים החי (baseFilters) ורק דורס propertyId/year/month
 * — כך שאם קיים פילטר מדינה/פלטפורמה גלובלי פעיל, שני העמודים מתנהגים
 * זהה. לנכס ספציפי: קריאה ישירה (זהה במדויק לדשבורד הראשי לאותם פילטרים).
 * ל"כל הנכסים": סכימה של הנכסים בעלי יעד מוגדר בלבד (לא כל 11 הנכסים
 * במערכת) — כדי שההשוואה בפועל-מול-יעד תהיה עקבית (ראו lib/targets.ts).
 */
function getActual(data: DataSet, baseFilters: Filters, propertyId: string, year: string, monthKey: string): Actual {
  if (propertyId !== "all") {
    const d = filterDataSet(data, { ...baseFilters, propertyId, year, month: monthKey });
    return { revenue: calcRevenue(d), expenses: calcExpenses(d), profit: calcProfit(d), margin: calcProfitMargin(d) };
  }
  const ids = targetedPropertyIds(year);
  let revenue = 0, expenses = 0, profit = 0;
  for (const id of ids) {
    const d = filterDataSet(data, { ...baseFilters, propertyId: id, year, month: monthKey });
    revenue += calcRevenue(d);
    expenses += calcExpenses(d);
    profit += calcProfit(d);
  }
  return { revenue, expenses, profit, margin: revenue === 0 ? 0 : profit / revenue };
}

function fmtDiffEUR(n: number): string {
  return `${n >= 0 ? "+" : ""}${fmtEUR(n)}`;
}
function fmtDiffPP(n: number): string {
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)} נ"א`;
}
function fmtAchievement(pct: number | null): string {
  return pct === null ? "—" : `${pct.toFixed(0)}%`;
}

function ToneText({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <span className={ok ? "text-emerald-600" : "text-rose-600"}>{children}</span>;
}

/** כרטיס KPI עם השוואת יעד + פס התקדמות — באותה שפה חזותית כמו KpiCard הקיים */
function TargetKpiCard({
  label,
  icon,
  actual,
  target,
  polarity,
  format,
  formatDiff,
  progressLabel,
}: {
  label: string;
  icon: React.ReactNode;
  actual: number;
  target: number | null;
  polarity: KpiPolarity;
  format: (n: number) => string;
  formatDiff?: (n: number) => string;
  progressLabel: string;
}) {
  if (target === null) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-slate-500 text-sm">{label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{format(actual)}</p>
            <p className="text-slate-400 text-xs mt-2">אין יעד מוגדר לנכס זה</p>
          </div>
          <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ring-4 bg-slate-50 text-slate-400 ring-slate-100">
            {icon}
          </div>
        </div>
      </div>
    );
  }

  const cmp: TargetComparison = compareToTarget(actual, target);
  const met = isTargetMet(cmp.diff, polarity);
  const tone = met ? "text-emerald-600" : "text-rose-600";
  const barColor = met ? "bg-emerald-500" : "bg-rose-500";
  const barWidth = cmp.achievementPct === null ? 0 : Math.min(100, Math.max(0, cmp.achievementPct));
  const diffFmt = formatDiff ?? fmtDiffEUR;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-slate-500 text-sm">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1 truncate">{format(actual)}</p>
        </div>
        <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ring-4 ${met ? "bg-emerald-50 text-emerald-600 ring-emerald-100" : "bg-rose-50 text-rose-600 ring-rose-100"}`}>
          {icon}
        </div>
      </div>

      <div className="mt-3 space-y-1 text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <span>יעד: {format(target)}</span>
          <span className={`font-semibold ${tone}`}>{diffFmt(cmp.diff)}</span>
        </div>
      </div>

      <div className="mt-2.5">
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${barWidth}%` }} />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-slate-400">{progressLabel}</span>
          <ToneText ok={met}><span className="text-xs font-semibold">{fmtAchievement(cmp.achievementPct)}</span></ToneText>
        </div>
      </div>
    </div>
  );
}

interface MonthRow {
  monthIdx: number; // 0-11
  monthLabel: string;
  actual: Actual;
  target: MonthlyTarget | null;
}

export function MonthlyTargetsPage() {
  const { data } = useData();
  const { filters, setFilter } = useFilters();

  const years = useMemo(() => availableTargetYears(), []);
  const [year, setYear] = useState(years[0] ?? "2026");
  const [month, setMonth] = useState("all"); // "all" | "1".."12"

  const propertyOptions: Option[] = useMemo(
    () => [{ value: "all", label: "הכל" }, ...data.properties.map((p) => ({ value: p.propertyId, label: p.propertyName }))],
    [data.properties]
  );
  const yearOptions: Option[] = years.map((y) => ({ value: y, label: y }));
  const monthOptions: Option[] = [
    { value: "all", label: "הכל" },
    ...HE_MONTHS.map((label, i) => ({ value: String(i + 1), label })),
  ];

  const monthCount = month === "all" ? 12 : 1;
  const monthKey = month === "all" ? "all" : `${year}-${pad2(Number(month))}`;

  // ---- KPI-ים ראשיים (לתקופה הנבחרת כולה) ----
  const actual = useMemo(() => getActual(data, filters, filters.propertyId, year, monthKey), [data, filters, monthKey]);
  const target = useMemo(() => getTargetForSelection(year, filters.propertyId, monthCount), [year, filters.propertyId, monthCount]);

  // ---- טבלה חודשית (12 חודשים כש"הכל", או חודש בודד) ----
  const monthIndices = month === "all" ? Array.from({ length: 12 }, (_, i) => i) : [Number(month) - 1];
  const monthRows: MonthRow[] = useMemo(
    () =>
      monthIndices.map((mi) => {
        const mk = `${year}-${pad2(mi + 1)}`;
        return {
          monthIdx: mi,
          monthLabel: HE_MONTHS[mi],
          actual: getActual(data, filters, filters.propertyId, year, mk),
          target: getTargetForSelection(year, filters.propertyId, 1),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, filters, year, month]
  );

  const cols: Column<MonthRow>[] = [
    { key: "monthLabel", header: "חודש", className: "font-medium text-slate-800" },
    {
      key: "targetRevenue", header: "יעד הכנסות",
      render: (r) => (r.target ? fmtEUR(r.target.revenue) : "—"),
    },
    { key: "actualRevenue", header: "הכנסות בפועל", render: (r) => fmtEUR(r.actual.revenue) },
    {
      key: "diffRevenue", header: "פער הכנסות",
      render: (r) => (r.target ? <ToneText ok={isTargetMet(r.actual.revenue - r.target.revenue, "up-good")}>{fmtDiffEUR(r.actual.revenue - r.target.revenue)}</ToneText> : "—"),
    },
    {
      key: "achRevenue", header: "% עמידה ביעד הכנסות",
      render: (r) => (r.target ? <ToneText ok={r.actual.revenue >= r.target.revenue}>{fmtAchievement(compareToTarget(r.actual.revenue, r.target.revenue).achievementPct)}</ToneText> : "—"),
    },
    { key: "targetExpenses", header: "יעד הוצאות", render: (r) => (r.target ? fmtEUR(r.target.expenses) : "—") },
    { key: "actualExpenses", header: "הוצאות בפועל", render: (r) => fmtEUR(r.actual.expenses) },
    {
      key: "diffExpenses", header: "פער הוצאות",
      render: (r) => (r.target ? <ToneText ok={isTargetMet(r.actual.expenses - r.target.expenses, "down-good")}>{fmtDiffEUR(r.actual.expenses - r.target.expenses)}</ToneText> : "—"),
    },
    {
      key: "utilExpenses", header: "% ניצול תקציב הוצאות",
      render: (r) => (r.target ? <ToneText ok={r.actual.expenses <= r.target.expenses}>{fmtAchievement(compareToTarget(r.actual.expenses, r.target.expenses).achievementPct)}</ToneText> : "—"),
    },
    { key: "targetProfit", header: "יעד רווח", render: (r) => (r.target ? fmtEUR(r.target.profit) : "—") },
    {
      key: "actualProfit", header: "רווח בפועל",
      render: (r) => <span className={r.actual.profit >= 0 ? "text-emerald-600" : "text-rose-600"}>{fmtEUR(r.actual.profit)}</span>,
    },
    {
      key: "diffProfit", header: "פער רווח",
      render: (r) => (r.target ? <ToneText ok={isTargetMet(r.actual.profit - r.target.profit, "up-good")}>{fmtDiffEUR(r.actual.profit - r.target.profit)}</ToneText> : "—"),
    },
    {
      key: "achProfit", header: "% עמידה ביעד רווח",
      render: (r) => (r.target ? <ToneText ok={r.actual.profit >= r.target.profit}>{fmtAchievement(compareToTarget(r.actual.profit, r.target.profit).achievementPct)}</ToneText> : "—"),
    },
    { key: "targetMargin", header: "יעד שולי רווח", render: (r) => (r.target ? fmtPct(r.target.margin) : "—") },
    { key: "actualMargin", header: "שולי רווח בפועל", render: (r) => fmtPct(r.actual.margin) },
    {
      key: "diffMargin", header: "פער שולי רווח",
      render: (r) => (r.target ? <ToneText ok={r.actual.margin >= r.target.margin}>{fmtDiffPP(r.actual.margin - r.target.margin)}</ToneText> : "—"),
    },
  ];

  const noTargetAtAll = target === null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">יעדים חודשיים</h2>
        <p className="text-slate-400 text-sm">השוואת ביצועים בפועל מול יעדים חודשיים</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 px-4 py-3 flex flex-wrap items-end gap-3">
        <Select label="נכס" value={filters.propertyId} options={propertyOptions} onChange={(v) => setFilter({ propertyId: v })} />
        <Select label="חודש" value={month} options={monthOptions} onChange={setMonth} />
        <Select label="שנה" value={year} options={yearOptions} onChange={setYear} />
      </div>

      {noTargetAtAll && (
        <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-xl px-4 py-3 text-sm">
          אין יעד מוגדר לנכס זה עבור {year}. מוצג הביצוע בפועל בלבד.
        </div>
      )}
      {filters.propertyId === "all" && (
        <p className="text-xs text-slate-400">
          * "הכל" בעמוד זה כולל את הנכסים בעלי יעד מוגדר בלבד ({targetedPropertyIds(year).length} נכסים) — לא את כל הנכסים במערכת.
        </p>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <TargetKpiCard
          label="הכנסות" icon={<Wallet size={20} />} actual={actual.revenue} target={target?.revenue ?? null}
          polarity="up-good" format={fmtEUR} progressLabel="עמידה ביעד"
        />
        <TargetKpiCard
          label="הוצאות" icon={<Receipt size={20} />} actual={actual.expenses} target={target?.expenses ?? null}
          polarity="down-good" format={fmtEUR} progressLabel="ניצול תקציב"
        />
        <TargetKpiCard
          label="רווח נקי" icon={<TrendingUp size={20} />} actual={actual.profit} target={target?.profit ?? null}
          polarity="up-good" format={fmtEUR} progressLabel="עמידה ביעד"
        />
        <TargetKpiCard
          label="שולי רווח" icon={<Percent size={20} />} actual={actual.margin} target={target?.margin ?? null}
          polarity="up-good" format={(n) => fmtPct(n)} formatDiff={fmtDiffPP} progressLabel="עמידה ביעד"
        />
      </div>

      <Card title="השוואה חודשית — בפועל מול יעד" subtitle={month === "all" ? `כל 12 החודשים של ${year}` : `${HE_MONTHS[Number(month) - 1]} ${year}`}>
        <DataTable columns={cols} rows={monthRows} maxHeight={560} />
      </Card>
    </div>
  );
}

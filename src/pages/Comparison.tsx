import React, { useMemo, useState } from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { useData } from "../data/DataContext";
import { useFilters } from "../context/FilterContext";
import {
  filterDataSetByRange,
  dailySeriesForRange,
  calcRevenue,
  calcExpenses,
  calcProfit,
  calcProfitMargin,
  bookingsCount,
  occupiedNights,
  availableNightsForDays,
  occupancyRateFor,
  avgLengthOfStay,
  avgRevenuePerBooking,
  avgRevenuePerNight,
  revpar,
} from "../lib/calculations";
import {
  ComparisonMode,
  getPeriodPair,
  daysInRange,
  calcChange,
  isGoodChange,
  quarterOf,
  ChangeResult,
} from "../lib/periods";
import { fmtEUR, fmtPct, fmtNum, monthLabel } from "../lib/format";
import { Card } from "../components/ui/Card";
import { Select, Option } from "../components/ui/Select";
import { DataTable, Column } from "../components/ui/DataTable";
import { ComparisonOverlayChart } from "../components/charts/ComparisonOverlayChart";
import { eurTick } from "../components/charts/chartUtils";

const MODE_OPTIONS: Option[] = [
  { value: "mom", label: "חודש מול חודש" },
  { value: "wow", label: "שבוע מול שבוע" },
  { value: "qoq", label: "רבעון מול רבעון" },
  { value: "yoy", label: "שנה מול שנה" },
  { value: "last7", label: "7 הימים האחרונים" },
  { value: "last30", label: "30 הימים האחרונים" },
  { value: "mtd", label: "מתחילת החודש (MTD)" },
  { value: "ytd", label: "מתחילת השנה (YTD)" },
  { value: "custom", label: "טווח מותאם אישית" },
];

const QUARTER_OPTIONS: Option[] = [
  { value: "1", label: "רבעון 1 (ינו׳-מרץ)" },
  { value: "2", label: "רבעון 2 (אפר׳-יוני)" },
  { value: "3", label: "רבעון 3 (יולי-ספט׳)" },
  { value: "4", label: "רבעון 4 (אוק׳-דצמ׳)" },
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function toDateInputValue(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** חץ כיוון + צביעה חכמה (לא כל עלייה טובה, לא כל ירידה רעה) */
function ChangeBadge({ change, polarity }: { change: ChangeResult; polarity: "up-good" | "down-good" | "neutral" }) {
  const good = isGoodChange(change.pct, polarity);
  const color = good === null ? "text-slate-400" : good ? "text-emerald-600" : "text-rose-600";
  if (change.pct === null) {
    return <span className="text-xs text-slate-400">לא זמין (תקופה קודמת = 0)</span>;
  }
  const Icon = change.pct > 0 ? ArrowUpRight : change.pct < 0 ? ArrowDownRight : Minus;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${color}`}>
      <Icon size={15} />
      {fmtPct(Math.abs(change.pct), 1)}
    </span>
  );
}

function KpiCompareCard({
  label,
  current,
  previous,
  polarity,
  format,
}: {
  label: string;
  current: number;
  previous: number;
  polarity: "up-good" | "down-good" | "neutral";
  format: (n: number) => string;
}) {
  const change = calcChange(current, previous);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-4">
      <p className="text-slate-500 text-sm">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{format(current)}</p>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-slate-400">
          קודם: {format(previous)} · הפרש {change.diff >= 0 ? "+" : ""}
          {format(change.diff)}
        </p>
        <ChangeBadge change={change} polarity={polarity} />
      </div>
    </div>
  );
}

export function ComparisonPage() {
  const { data } = useData();
  const { filters, setFilter } = useFilters();

  const today = useMemo(() => new Date(), []);
  const [mode, setMode] = useState<ComparisonMode>("mom");
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month1, setMonth1] = useState(today.getUTCMonth() + 1);
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(quarterOf(today.getUTCMonth() + 1));
  const [yoySpecificMonth, setYoySpecificMonth] = useState(false);
  const [customStart, setCustomStart] = useState(toDateInputValue(new Date(today.getTime() - 15 * 86400000)));
  const [customEnd, setCustomEnd] = useState(toDateInputValue(today));

  const propertyOptions: Option[] = useMemo(
    () => [{ value: "all", label: "כל הנכסים" }, ...data.properties.map((p) => ({ value: p.propertyId, label: p.propertyName }))],
    [data.properties]
  );

  const monthOptions: Option[] = useMemo(() => {
    const opts: Option[] = [];
    for (let i = 0; i < 24; i++) {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
      const key = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
      opts.push({ value: key, label: monthLabel(key) });
    }
    return opts;
  }, [today]);

  const yearOptions: Option[] = useMemo(() => {
    const cy = today.getUTCFullYear();
    return Array.from({ length: 6 }, (_, i) => cy - i).map((y) => ({ value: String(y), label: String(y) }));
  }, [today]);

  // הגנה: לעולם לא לבנות תקופה שמתחילה אחרי "היום" (למשל רבעון/חודש עתידי
  // שנבחר בטעות) — מכווצים לתקופה הנוכחית (החודש/רבעון של היום) במקרה כזה.
  const todayY = today.getUTCFullYear();
  const todayM = today.getUTCMonth() + 1;
  const todayQ = quarterOf(todayM);
  const safeYear = year > todayY ? todayY : year;
  const safeMonth1 = safeYear === todayY && month1 > todayM ? todayM : month1;
  const safeQuarter = safeYear === todayY && quarter > todayQ ? todayQ : quarter;

  const pair = useMemo(() => {
    let customStartDate = new Date(customStart + "T00:00:00.000Z");
    let customEndDate = new Date(customEnd + "T00:00:00.000Z");
    // הגנה: לא לאפשר טווח מותאם אישית שמסתיים אחרי "היום" או שמתחיל אחרי סיומו
    if (customEndDate.getTime() > today.getTime()) customEndDate = today;
    if (customStartDate.getTime() > customEndDate.getTime()) customStartDate = customEndDate;
    return getPeriodPair(mode, today, {
      year: safeYear,
      month1: mode === "yoy" ? (yoySpecificMonth ? safeMonth1 : undefined) : safeMonth1,
      quarter: safeQuarter,
      customStart: customStartDate,
      customEnd: customEndDate,
    });
  }, [mode, today, safeYear, safeMonth1, safeQuarter, yoySpecificMonth, customStart, customEnd]);

  const rangeFilter = { propertyId: filters.propertyId, country: filters.country };

  const curData = useMemo(() => filterDataSetByRange(data, rangeFilter, pair.current), [data, rangeFilter.propertyId, rangeFilter.country, pair]);
  const prevData = useMemo(() => filterDataSetByRange(data, rangeFilter, pair.previous), [data, rangeFilter.propertyId, rangeFilter.country, pair]);

  // ---- פיננסי ----
  const revC = calcRevenue(curData), revP = calcRevenue(prevData);
  const expC = calcExpenses(curData), expP = calcExpenses(prevData);
  const profitC = calcProfit(curData), profitP = calcProfit(prevData);
  const marginC = calcProfitMargin(curData), marginP = calcProfitMargin(prevData);
  const marginPP = marginC - marginP; // הפרש נקודות אחוז (לא שינוי יחסי)

  // ---- תפעולי ----
  const daysC = daysInRange(pair.current);
  const daysP = daysInRange(pair.previous);
  const bookingsC = bookingsCount(curData), bookingsP = bookingsCount(prevData);
  const nightsC = occupiedNights(curData), nightsP = occupiedNights(prevData);
  const availC = availableNightsForDays(curData, daysC);
  const availP = availableNightsForDays(prevData, daysP);
  const occC = occupancyRateFor(curData, availC), occP = occupancyRateFor(prevData, availP);
  const losC = avgLengthOfStay(curData), losP = avgLengthOfStay(prevData);
  const avgBookC = avgRevenuePerBooking(curData), avgBookP = avgRevenuePerBooking(prevData);
  const adrC = avgRevenuePerNight(curData), adrP = avgRevenuePerNight(prevData);
  const revparC = revpar(curData, availC), revparP = revpar(prevData, availP);

  // ---- גרפים חופפים לפי יום ----
  const dailyCur = useMemo(() => dailySeriesForRange(data, rangeFilter, pair.current), [data, rangeFilter.propertyId, rangeFilter.country, pair]);
  const dailyPrev = useMemo(() => dailySeriesForRange(data, rangeFilter, pair.previous), [data, rangeFilter.propertyId, rangeFilter.country, pair]);
  const revenueOverlay = dailyCur.map((c, i) => ({ dayIndex: c.dayIndex, current: c.revenue, previous: dailyPrev[i]?.revenue ?? 0 }));
  const expensesOverlay = dailyCur.map((c, i) => ({ dayIndex: c.dayIndex, current: c.expenses, previous: dailyPrev[i]?.expenses ?? 0 }));
  const profitOverlay = dailyCur.map((c, i) => ({ dayIndex: c.dayIndex, current: c.profit, previous: dailyPrev[i]?.profit ?? 0 }));

  // ---- פירוט לפי נכס (רלוונטי כש"כל הנכסים" נבחר) ----
  interface PropRow {
    propertyId: string;
    propertyName: string;
    revenue: number;
    profit: number;
    margin: number;
    occupancy: number;
    revenueChange: number | null;
    profitChange: number | null;
  }
  const propRows: PropRow[] = useMemo(() => {
    if (filters.propertyId !== "all") return [];
    return data.properties.map((p) => {
      const subCur = filterDataSetByRange(data, { propertyId: p.propertyId, country: "all" }, pair.current);
      const subPrev = filterDataSetByRange(data, { propertyId: p.propertyId, country: "all" }, pair.previous);
      const revenue = calcRevenue(subCur);
      const profit = calcProfit(subCur);
      const margin = calcProfitMargin(subCur);
      const avail = availableNightsForDays(subCur, daysC);
      const occupancy = occupancyRateFor(subCur, avail);
      return {
        propertyId: p.propertyId,
        propertyName: p.propertyName,
        revenue,
        profit,
        margin,
        occupancy,
        revenueChange: calcChange(revenue, calcRevenue(subPrev)).pct,
        profitChange: calcChange(profit, calcProfit(subPrev)).pct,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [data, filters.propertyId, pair, daysC]);

  const bestImproving = propRows.length
    ? [...propRows].filter((r) => r.revenueChange !== null).sort((a, b) => (b.revenueChange ?? 0) - (a.revenueChange ?? 0))[0]
    : null;
  const worstDeclining = propRows.length
    ? [...propRows].filter((r) => r.revenueChange !== null).sort((a, b) => (a.revenueChange ?? 0) - (b.revenueChange ?? 0))[0]
    : null;

  // ---- Performance Highlights (דטרמיניסטי, לא AI) ----
  const highlights: string[] = useMemo(() => {
    const items: string[] = [];
    const revChange = calcChange(revC, revP);
    if (revChange.pct !== null) {
      items.push(`הכנסות ${revChange.pct >= 0 ? "עלו" : "ירדו"} ב-${fmtPct(Math.abs(revChange.pct), 1)} לעומת התקופה הקודמת (${fmtEUR(revC)} מול ${fmtEUR(revP)}).`);
    }
    items.push(`שולי הרווח ${marginPP >= 0 ? "השתפרו" : "ירדו"} ב-${Math.abs(marginPP * 100).toFixed(1)} נקודות אחוז (${fmtPct(marginP)} → ${fmtPct(marginC)}).`);
    const occChangePP = occC - occP;
    items.push(`התפוסה ${occChangePP >= 0 ? "עלתה" : "ירדה"} ב-${Math.abs(occChangePP * 100).toFixed(1)} נקודות אחוז (${fmtPct(occP)} → ${fmtPct(occC)}).`);
    const expChange = calcChange(expC, expP);
    if (revChange.pct !== null && expChange.pct !== null && expChange.pct > revChange.pct) {
      items.push("ההוצאות גדלו מהר יותר מההכנסות בתקופה זו.");
    }
    if (bestImproving && bestImproving.revenueChange !== null && filters.propertyId === "all") {
      items.push(`הנכס עם הצמיחה החזקה ביותר בהכנסות: ${bestImproving.propertyName} (${fmtPct(bestImproving.revenueChange, 1)}).`);
    }
    if (worstDeclining && worstDeclining.revenueChange !== null && filters.propertyId === "all" && worstDeclining.propertyId !== bestImproving?.propertyId) {
      items.push(`הנכס עם הירידה הגדולה ביותר בהכנסות: ${worstDeclining.propertyName} (${fmtPct(worstDeclining.revenueChange, 1)}).`);
    }
    return items;
  }, [revC, revP, marginPP, marginP, marginC, occC, occP, expC, expP, bestImproving, worstDeclining, filters.propertyId]);

  const propCols: Column<PropRow>[] = [
    { key: "propertyName", header: "נכס" },
    { key: "revenue", header: "הכנסות", render: (r) => fmtEUR(r.revenue) },
    { key: "profit", header: "רווח", render: (r) => <span className={r.profit >= 0 ? "text-emerald-600" : "text-rose-600"}>{fmtEUR(r.profit)}</span> },
    { key: "margin", header: "שולי רווח", render: (r) => fmtPct(r.margin) },
    { key: "occupancy", header: "תפוסה", render: (r) => fmtPct(r.occupancy) },
    { key: "revenueChange", header: "שינוי הכנסות", render: (r) => (r.revenueChange === null ? <span className="text-slate-400 text-xs">לא זמין</span> : <span className={r.revenueChange >= 0 ? "text-emerald-600" : "text-rose-600"}>{r.revenueChange >= 0 ? "+" : ""}{fmtPct(r.revenueChange, 1)}</span>) },
    { key: "profitChange", header: "שינוי רווח", render: (r) => (r.profitChange === null ? <span className="text-slate-400 text-xs">לא זמין</span> : <span className={r.profitChange >= 0 ? "text-emerald-600" : "text-rose-600"}>{r.profitChange >= 0 ? "+" : ""}{fmtPct(r.profitChange, 1)}</span>) },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">השוואת תקופות</h2>
        <p className="text-slate-400 text-sm">ביצועים לאורך זמן — נכס בודד או כל הנכסים</p>
      </div>

      {/* בקרות: נכס + מצב השוואה + בורר תקופה ספציפי */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 px-4 py-3 flex flex-wrap items-end gap-3">
        <Select label="נכס" value={filters.propertyId} options={propertyOptions} onChange={(v) => setFilter({ propertyId: v })} />
        <Select label="סוג השוואה" value={mode} options={MODE_OPTIONS} onChange={(v) => setMode(v as ComparisonMode)} />

        {mode === "mom" && (
          <Select
            label="חודש"
            value={`${year}-${pad2(month1)}`}
            options={monthOptions}
            onChange={(v) => { const [y, m] = v.split("-").map(Number); setYear(y); setMonth1(m); }}
          />
        )}
        {mode === "qoq" && (
          <>
            <Select label="שנה" value={String(year)} options={yearOptions} onChange={(v) => setYear(Number(v))} />
            <Select label="רבעון" value={String(quarter)} options={QUARTER_OPTIONS} onChange={(v) => setQuarter(Number(v) as 1 | 2 | 3 | 4)} />
          </>
        )}
        {mode === "yoy" && (
          <>
            <Select label="שנה" value={String(year)} options={yearOptions} onChange={(v) => setYear(Number(v))} />
            <Select
              label="היקף"
              value={yoySpecificMonth ? "month" : "year"}
              options={[{ value: "year", label: "כל השנה" }, { value: "month", label: "חודש ספציפי" }]}
              onChange={(v) => setYoySpecificMonth(v === "month")}
            />
            {yoySpecificMonth && (
              <Select
                label="חודש"
                value={String(month1)}
                options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: monthLabel(`${year}-${pad2(i + 1)}`).split(" ")[0] }))}
                onChange={(v) => setMonth1(Number(v))}
              />
            )}
          </>
        )}
        {mode === "custom" && (
          <>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-slate-500">מתאריך</span>
              <input type="date" value={customStart} max={customEnd} onChange={(e) => setCustomStart(e.target.value)} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-slate-500">עד תאריך</span>
              <input type="date" value={customEnd} min={customStart} max={toDateInputValue(today)} onChange={(e) => setCustomEnd(e.target.value)} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </label>
          </>
        )}
      </div>

      {/* תווית התקופות שמושוות בפועל */}
      <div className="bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <span><strong className="text-brand-700">תקופה נוכחית:</strong> {pair.currentLabel} ({daysC} ימים)</span>
        <span><strong className="text-slate-500">תקופה קודמת:</strong> {pair.previousLabel} ({daysP} ימים)</span>
      </div>
      {pair.note && (
        <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-xl px-4 py-2 text-xs">{pair.note}</div>
      )}

      {/* KPI פיננסיים */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 mb-2">מדדים פיננסיים</h3>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <KpiCompareCard label="הכנסות" current={revC} previous={revP} polarity="up-good" format={fmtEUR} />
          <KpiCompareCard label="הוצאות תפעוליות" current={expC} previous={expP} polarity="down-good" format={fmtEUR} />
          <KpiCompareCard label="רווח נקי" current={profitC} previous={profitP} polarity="up-good" format={fmtEUR} />
          <KpiCompareCard label="שולי רווח" current={marginC} previous={marginP} polarity="up-good" format={(n) => fmtPct(n)} />
        </div>
      </div>

      {/* מגמת רווחיות — הפרש נקודות אחוז, לא רק % שינוי */}
      <Card title="מגמת שולי רווח">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-slate-400 text-xs">תקופה קודמת</p>
            <p className="text-xl font-bold text-slate-600">{fmtPct(marginP)}</p>
          </div>
          <div className="text-slate-300 text-xl">→</div>
          <div>
            <p className="text-slate-400 text-xs">תקופה נוכחית</p>
            <p className="text-xl font-bold text-slate-800">{fmtPct(marginC)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">הפרש (נקודות אחוז)</p>
            <p className={`text-xl font-bold ${marginPP >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {marginPP >= 0 ? "+" : ""}{(marginPP * 100).toFixed(1)} נ"א
            </p>
          </div>
        </div>
      </Card>

      {/* KPI תפעוליים */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 mb-2">מדדים תפעוליים</h3>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <KpiCompareCard label="מספר הזמנות" current={bookingsC} previous={bookingsP} polarity="up-good" format={fmtNum} />
          <KpiCompareCard label="לילות תפוסים" current={nightsC} previous={nightsP} polarity="up-good" format={fmtNum} />
          <KpiCompareCard label="לילות זמינים (הערכה)" current={availC} previous={availP} polarity="neutral" format={fmtNum} />
          <KpiCompareCard label="אחוז תפוסה (הערכה)" current={occC} previous={occP} polarity="up-good" format={(n) => fmtPct(n)} />
          <KpiCompareCard label="אורך שהייה ממוצע (לילות)" current={losC} previous={losP} polarity="neutral" format={(n) => fmtNum(n)} />
          <KpiCompareCard label="הכנסה ממוצעת להזמנה" current={avgBookC} previous={avgBookP} polarity="up-good" format={fmtEUR} />
          <KpiCompareCard label="ADR (תעריף יומי ממוצע)" current={adrC} previous={adrP} polarity="up-good" format={fmtEUR} />
          <KpiCompareCard label="RevPAR (הכנסה ליחידה זמינה)" current={revparC} previous={revparP} polarity="up-good" format={fmtEUR} />
        </div>
        <p className="text-xs text-slate-400 mt-2">* לילות זמינים ואחוז תפוסה הם הערכה (מספר חדרים × מספר ימים בתקופה) — אותה שיטת הערכה כמו בלשונית "תפוסה".</p>
      </div>

      {/* גרפים חופפים */}
      <div className="grid xl:grid-cols-2 gap-4">
        <Card title="הכנסות — נוכחי מול קודם" subtitle="לפי יום בתקופה">
          <ComparisonOverlayChart data={revenueOverlay} currentLabel="נוכחי" previousLabel="קודם" formatValue={eurTick} />
        </Card>
        <Card title="הוצאות — נוכחי מול קודם" subtitle="לפי יום בתקופה">
          <ComparisonOverlayChart data={expensesOverlay} currentLabel="נוכחי" previousLabel="קודם" formatValue={eurTick} />
        </Card>
        <Card title="רווח — נוכחי מול קודם" subtitle="לפי יום בתקופה">
          <ComparisonOverlayChart data={profitOverlay} currentLabel="נוכחי" previousLabel="קודם" formatValue={eurTick} />
        </Card>
        <Card title="תפוסה — סיכום" subtitle="נוכחי מול קודם">
          <div className="flex items-center justify-center h-full py-8">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-slate-400 text-xs">קודם</p>
                <p className="text-3xl font-bold text-slate-400">{fmtPct(occP)}</p>
              </div>
              <div className="text-slate-300 text-2xl">→</div>
              <div className="text-center">
                <p className="text-slate-400 text-xs">נוכחי</p>
                <p className="text-3xl font-bold text-brand-600">{fmtPct(occC)}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* פירוט לפי נכס */}
      {filters.propertyId === "all" && (
        <Card title="פירוט לפי נכס" subtitle="מי משתפר ומי נחלש">
          <DataTable columns={propCols} rows={propRows} />
        </Card>
      )}

      {/* תובנות ביצועים */}
      <Card title="תובנות ביצועים" subtitle="נגזרות אוטומטית מהנתונים המחושבים">
        <ul className="space-y-2">
          {highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="text-brand-500 mt-0.5">•</span>
              {h}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

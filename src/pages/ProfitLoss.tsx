import React, { useMemo } from "react";
import { useData } from "../data/DataContext";
import { useFilters } from "../context/FilterContext";
import { buildPnL, PnLBreakdown, filterDataSet, monthlyChange } from "../lib/calculations";
import { fmtEUR, fmtPct } from "../lib/format";
import { Card } from "../components/ui/Card";
import { FilterBar } from "../components/FilterBar";
import { ProfitStatusBadge } from "../components/ui/StatusBadge";

interface LineDef {
  label: string;
  key: keyof PnLBreakdown;
  group: "income" | "expense" | "total";
}

const LINES: LineDef[] = [
  { label: "הכנסה ברוטו — Booking", key: "grossBooking", group: "income" },
  { label: "הכנסה ברוטו — Airbnb", key: "grossAirbnb", group: "income" },
  { label: "הכנסה ברוטו — אורח מזדמן", key: "grossWalkIn", group: "income" },
  { label: "סך הכנסות ברוטו", key: "grossTotal", group: "total" },
  { label: "הכנסות נוספות", key: "extraIncome", group: "income" },
  { label: "סך כל ההכנסות", key: "revenueTotalGross", group: "total" },
  { label: "שכר עבודה", key: "salary", group: "expense" },
  { label: "חשמל", key: "electricity", group: "expense" },
  { label: "חימום", key: "heating", group: "expense" },
  { label: "מים", key: "water", group: "expense" },
  { label: "מצרכים", key: "groceries", group: "expense" },
  { label: "דלק ורכב", key: "fuel", group: "expense" },
  { label: "אינטרנט", key: "internet", group: "expense" },
  { label: "מיסים", key: "tax", group: "expense" },
  { label: "תחזוקה", key: "maintenance", group: "expense" },
  { label: "עמלות", key: "commission", group: "expense" },
  { label: "הנהלת חשבונות", key: "accounting", group: "expense" },
  { label: "חשבון גז", key: "gas", group: "expense" },
  { label: "פינוי אשפה", key: "garbage", group: "expense" },
  { label: "אחר", key: "other", group: "expense" },
  { label: "סך כל ההוצאות", key: "expensesTotal", group: "total" },
  { label: "רווח נקי", key: "netProfit", group: "total" },
];

export function ProfitLossPage() {
  const { data } = useData();
  const { filters } = useFilters();

  const props = useMemo(
    () => filterDataSet(data, filters).properties,
    [data, filters]
  );
  const pnls = useMemo(
    () => props.map((p) => ({ prop: p, pnl: buildPnL(data, p.propertyId, filters) })),
    [props, data, filters]
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">רווח והפסד (P&amp;L)</h2>
        <p className="text-slate-400 text-sm">מחושב ישירות מגיליונות המקור — לא מהגיליונות המוכנים שב-Excel</p>
      </div>
      <FilterBar showPlatform={false} />

      {/* כרטיסי שינוי חודשי לכל נכס */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {pnls.map(({ prop, pnl }) => {
          const change = monthlyChange(filterDataSet(data, { ...filters, propertyId: prop.propertyId, country: "all" }));
          const status = pnl.netProfit <= 0 ? "loss" : pnl.margin < 0.05 ? "balanced" : "profit";
          return (
            <div key={prop.propertyId} className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">{prop.propertyName}</h3>
                <ProfitStatusBadge status={status} />
              </div>
              <p className={`text-2xl font-bold mt-2 ${pnl.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {fmtEUR(pnl.netProfit)}
              </p>
              <p className="text-xs text-slate-400">שולי רווח {fmtPct(pnl.margin)}</p>
              {change && (
                <p className={`text-xs mt-1 ${change.deltaPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {change.deltaPct >= 0 ? "▲" : "▼"} {fmtPct(change.deltaPct, 0)} מהחודש הקודם
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* טבלת P&L משולבת */}
      <Card title="דוח רווח והפסד מפורט" subtitle="שורות = סעיפים · עמודות = נכסים">
        <div className="overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600 sticky right-0 bg-slate-50">סעיף</th>
                {pnls.map(({ prop }) => (
                  <th key={prop.propertyId} className="px-3 py-2.5 text-right font-semibold text-slate-600 whitespace-nowrap">
                    {prop.propertyName}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap">סה"כ</th>
              </tr>
            </thead>
            <tbody>
              {LINES.map((line) => {
                const total = pnls.reduce((a, { pnl }) => a + (pnl[line.key] as number), 0);
                const isTotal = line.group === "total";
                const isProfit = line.key === "netProfit";
                return (
                  <tr
                    key={line.key}
                    className={`border-t border-slate-100 ${isTotal ? "bg-slate-50/80 font-semibold" : ""}`}
                  >
                    <td className={`px-3 py-2 text-right sticky right-0 ${isTotal ? "bg-slate-50/80 font-semibold" : "bg-white"} text-slate-700`}>
                      {line.label}
                    </td>
                    {pnls.map(({ prop, pnl }) => {
                      const v = pnl[line.key] as number;
                      return (
                        <td key={prop.propertyId} className={`px-3 py-2 text-right ${isProfit ? (v >= 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold") : "text-slate-700"}`}>
                          {line.key === "margin" ? fmtPct(v) : fmtEUR(v)}
                        </td>
                      );
                    })}
                    <td className={`px-3 py-2 text-right ${isProfit ? (total >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold") : "text-slate-800 font-medium"}`}>
                      {fmtEUR(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

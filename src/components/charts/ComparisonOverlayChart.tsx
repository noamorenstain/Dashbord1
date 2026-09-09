import React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface OverlayPoint {
  dayIndex: number;
  current: number;
  previous: number;
}

/**
 * גרף חופף לאורך ציר-זמן משותף (יום 1, יום 2, ...) — משווה תקופה נוכחית
 * מול קודמת, גם אם הן חודשים/שבועות שונים לגמרי בלוח השנה.
 */
export function ComparisonOverlayChart({
  data,
  currentLabel,
  previousLabel,
  formatValue,
}: {
  data: OverlayPoint[];
  currentLabel: string;
  previousLabel: string;
  formatValue: (n: number) => string;
}) {
  const rows = data.map((p) => ({ ...p, x: `יום ${p.dayIndex}` }));
  const tickInterval = rows.length > 20 ? Math.ceil(rows.length / 15) : 0;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={rows} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
        <XAxis dataKey="x" tick={{ fontSize: 11, fill: "#94a3b8" }} interval={tickInterval} />
        <YAxis tickFormatter={formatValue} tick={{ fontSize: 11, fill: "#94a3b8" }} width={70} />
        <Tooltip
          formatter={(v: any) => formatValue(Number(v))}
          contentStyle={{ direction: "rtl", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Line dataKey="current" name={currentLabel} stroke="#3563eb" strokeWidth={2.5} dot={false} />
        <Line dataKey="previous" name={previousLabel} stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

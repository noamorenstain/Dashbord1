import React from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MonthlyPoint } from "../../lib/calculations";
import { monthLabel } from "../../lib/format";
import { eurTick } from "./chartUtils";

/** הכנסות מול הוצאות לפי חודש + קו רווח */
export function RevenueVsExpensesChart({ data }: { data: MonthlyPoint[] }) {
  const rows = data.map((p) => ({ ...p, label: monthLabel(p.month) }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={rows} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
        <YAxis tickFormatter={eurTick} tick={{ fontSize: 11, fill: "#94a3b8" }} width={70} />
        <Tooltip
          formatter={(v: any) => `€${Math.round(Number(v)).toLocaleString("he-IL")}`}
          contentStyle={{ direction: "rtl", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="revenue" name="הכנסות" fill="#10b981" radius={[6, 6, 0, 0]} barSize={18} />
        <Bar dataKey="expenses" name="הוצאות" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={18} />
        <Line dataKey="profit" name="רווח נקי" stroke="#3563eb" strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

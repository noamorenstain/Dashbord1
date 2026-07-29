import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PropertySummary } from "../../lib/calculations";
import { eurTick } from "./chartUtils";

/** רווח/הפסד נקי לפי נכס (ירוק=רווח, אדום=הפסד) */
export function ProfitByPropertyChart({ data }: { data: PropertySummary[] }) {
  const rows = data.map((p) => ({ name: p.propertyName, profit: Math.round(p.netProfit) }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
        <YAxis tickFormatter={eurTick} tick={{ fontSize: 11, fill: "#94a3b8" }} width={70} />
        <Tooltip
          formatter={(v: any) => `€${Math.round(Number(v)).toLocaleString("he-IL")}`}
          contentStyle={{ direction: "rtl", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
        />
        <Bar dataKey="profit" name="רווח נקי" radius={[6, 6, 0, 0]} barSize={48}>
          {rows.map((r, i) => (
            <Cell key={i} fill={r.profit >= 0 ? "#10b981" : "#ef4444"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

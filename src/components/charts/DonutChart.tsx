import React from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { NameValue } from "../../lib/calculations";
import { CHART_COLORS } from "./chartUtils";

/** גרף דונאט גנרי — לפילוח לפי פלטפורמה / קטגוריה */
export function DonutChart({ data }: { data: NameValue[] }) {
  const rows = data.filter((d) => d.value > 0);
  const total = rows.reduce((a, b) => a + b.value, 0);
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={rows}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          label={({ percent }) => (percent >= 0.04 ? `${(percent * 100).toFixed(0)}%` : "")}
          labelLine={false}
        >
          {rows.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: any, name: any) => {
            const num = Number(v);
            return [`€${Math.round(num).toLocaleString("he-IL")} (${total ? ((num / total) * 100).toFixed(1) : 0}%)`, name];
          }}
          contentStyle={{ direction: "rtl", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value: string, entry: any) => {
            const v = entry?.payload?.value ?? 0;
            const pct = total ? ((v / total) * 100).toFixed(1) : "0";
            return `${value} (${pct}%)`;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

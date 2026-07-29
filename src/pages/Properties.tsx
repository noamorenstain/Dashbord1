import React, { useMemo } from "react";
import { useData } from "../data/DataContext";
import { useFilters } from "../context/FilterContext";
import { propertySummaries } from "../lib/calculations";
import { fmtEUR, fmtPct, fmtNum } from "../lib/format";
import { Card } from "../components/ui/Card";
import { FilterBar } from "../components/FilterBar";
import { DataTable, Column } from "../components/ui/DataTable";
import { ProfitStatusBadge, Badge } from "../components/ui/StatusBadge";
import { Room, PlatformCommission } from "../data/types";

/** בודק זמינות חדר — תומך בעברית וגם באנגלית (Available / UNavailable) */
function isRoomAvailable(status: string): boolean {
  const s = (status || "").trim().toLowerCase();
  if (s === "זמין" || s === "available") return true;
  return false;
}

export function PropertiesPage() {
  const { data } = useData();
  const { filters } = useFilters();
  const summaries = useMemo(() => propertySummaries(data, filters), [data, filters]);

  const roomCols: Column<Room>[] = [
    { key: "propertyId", header: "נכס" },
    { key: "roomNumber", header: "מס' חדר" },
    { key: "roomType", header: "סוג" },
    { key: "maxGuests", header: "תפוסה מקס'" },
    { key: "status", header: "סטטוס", render: (r) => <Badge text={r.status || "—"} tone={isRoomAvailable(r.status) ? "green" : "amber"} /> },
    { key: "notes", header: "הערות", render: (r) => <span className="text-slate-400">{r.notes || "—"}</span> },
  ];

  const commCols: Column<PlatformCommission>[] = [
    { key: "propertyId", header: "נכס" },
    { key: "platform", header: "פלטפורמה" },
    { key: "commissionPct", header: "אחוז עמלה", render: (c) => fmtPct(c.commissionPct, 1) },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">נכסים</h2>
        <p className="text-slate-400 text-sm">פירוט הנכסים, החדרים ועמלות הפלטפורמות</p>
      </div>
      <FilterBar showPlatform={false} />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {summaries.map((s) => (
          <div key={s.propertyId} className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">{s.propertyName}</h3>
              <ProfitStatusBadge status={s.status} />
            </div>
            <p className="text-slate-400 text-xs mb-3">{s.country} · {s.propertyId}</p>
            <dl className="space-y-1.5 text-sm">
              <Row label="הכנסות" value={fmtEUR(s.revenue)} />
              <Row label="הוצאות" value={fmtEUR(s.expenses)} />
              <Row label="רווח נקי" value={fmtEUR(s.netProfit)} strong tone={s.netProfit >= 0 ? "pos" : "neg"} />
              <Row label="שולי רווח" value={fmtPct(s.margin)} />
              <Row label="תפוסה" value={fmtPct(s.occupancy)} />
              <Row label="הזמנות" value={fmtNum(s.bookings)} />
            </dl>
          </div>
        ))}
      </div>

      <Card title="חדרים / יחידות אירוח">
        <DataTable columns={roomCols} rows={data.rooms.filter((r) => filters.propertyId === "all" || r.propertyId === filters.propertyId)} />
      </Card>

      <Card title="טבלת עמלות לפי פלטפורמה" subtitle="מתוך גיליון Properties (טבלה שנייה)">
        <DataTable columns={commCols} rows={data.platformCommissions.filter((c) => filters.propertyId === "all" || c.propertyId === filters.propertyId)} />
      </Card>
    </div>
  );
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "pos" | "neg" }) {
  const color = tone === "pos" ? "text-emerald-600" : tone === "neg" ? "text-rose-600" : "text-slate-700";
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-400">{label}</dt>
      <dd className={`${strong ? "font-bold" : ""} ${color}`}>{value}</dd>
    </div>
  );
}

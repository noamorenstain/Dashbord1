import React, { useMemo, useState } from "react";
import { CalendarCheck, Users, Moon, Wallet } from "lucide-react";
import { useData } from "../data/DataContext";
import { useFilters } from "../context/FilterContext";
import {
  filterDataSet, bookingsCount, occupiedNights, grossRevenue,
} from "../lib/calculations";
import { fmtEUR, fmtNum, fmtDate } from "../lib/format";
import { KpiCard } from "../components/ui/KpiCard";
import { Card } from "../components/ui/Card";
import { FilterBar } from "../components/FilterBar";
import { DataTable, Column } from "../components/ui/DataTable";
import { Badge } from "../components/ui/StatusBadge";
import { Select } from "../components/ui/Select";
import { Occupation } from "../data/types";

export function BookingsPage() {
  const { data } = useData();
  const { filters } = useFilters();
  const base = useMemo(() => filterDataSet(data, filters), [data, filters]);

  const [status, setStatus] = useState("all");
  const statuses = useMemo(() => [...new Set(data.occupation.map((o) => o.status).filter(Boolean))], [data.occupation]);
  const rows = useMemo(
    () => base.occupation.filter((o) => status === "all" || o.status === status)
      .sort((a, b) => (b.checkInDate ?? "").localeCompare(a.checkInDate ?? "")),
    [base.occupation, status]
  );

  const cols: Column<Occupation>[] = [
    { key: "propertyId", header: "נכס" },
    { key: "roomNumber", header: "חדר" },
    { key: "guestName", header: "אורח" },
    { key: "checkInDate", header: "כניסה", render: (o) => fmtDate(o.checkInDate) },
    { key: "checkOutDate", header: "יציאה", render: (o) => fmtDate(o.checkOutDate) },
    { key: "nights", header: "לילות" },
    { key: "numberOfGuests", header: "אורחים" },
    { key: "platform", header: "פלטפורמה", render: (o) => o.platform ? <Badge text={o.platform} tone="blue" /> : <span className="text-rose-500">חסר</span> },
    { key: "totalPrice", header: "ברוטו", render: (o) => fmtEUR(o.totalPrice) },
    { key: "commission", header: "עמלה", render: (o) => fmtEUR(o.commission) },
    { key: "totalNetPrice", header: "נטו", render: (o) => fmtEUR(o.totalNetPrice) },
    { key: "paidBy", header: "תשלום" },
    { key: "status", header: "סטטוס", render: (o) => <Badge text={o.status || "—"} tone="slate" /> },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">הזמנות</h2>
        <p className="text-slate-400 text-sm">כל ההזמנות מתוך גיליון occupation</p>
      </div>
      <FilterBar />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="מספר הזמנות" value={fmtNum(bookingsCount(base))} icon={<CalendarCheck size={20} />} tone="brand" />
        <KpiCard label="סך לילות" value={fmtNum(occupiedNights(base))} icon={<Moon size={20} />} tone="default" />
        <KpiCard label="סך אורחים" value={fmtNum(base.occupation.reduce((a, o) => a + o.numberOfGuests, 0))} icon={<Users size={20} />} tone="default" />
        <KpiCard label="הכנסה ברוטו" value={fmtEUR(grossRevenue(base))} icon={<Wallet size={20} />} tone="positive" />
      </div>

      <Card
        title="רשימת הזמנות"
        action={<Select label="סטטוס הזמנה" value={status} options={[{ value: "all", label: "הכול" }, ...statuses.map((s) => ({ value: s, label: s }))]} onChange={setStatus} />}
      >
        <DataTable columns={cols} rows={rows} maxHeight={560} />
      </Card>
    </div>
  );
}

import React, { useMemo } from "react";
import { BedDouble, Moon, DoorOpen, Percent } from "lucide-react";
import { useData } from "../data/DataContext";
import { useFilters } from "../context/FilterContext";
import {
  filterDataSet, occupancyRate, occupiedNights, periodDays, roomCount,
} from "../lib/calculations";
import { fmtPct, fmtNum } from "../lib/format";
import { KpiCard } from "../components/ui/KpiCard";
import { Card } from "../components/ui/Card";
import { FilterBar } from "../components/FilterBar";
import { DataTable, Column } from "../components/ui/DataTable";

interface PropOcc {
  name: string;
  rooms: number;
  occupied: number;
  available: number;
  rate: number;
}

export function OccupancyPage() {
  const { data } = useData();
  const { filters } = useFilters();
  const d = useMemo(() => filterDataSet(data, filters), [data, filters]);

  const byProperty: PropOcc[] = useMemo(() => {
    return filterDataSet(data, filters).properties.map((p) => {
      const sub = filterDataSet(data, { ...filters, propertyId: p.propertyId, country: "all" });
      const rooms = roomCount(sub);
      const occ = occupiedNights(sub);
      const avail = rooms * periodDays(sub, { ...filters, propertyId: p.propertyId, country: "all" });
      return { name: p.propertyName, rooms, occupied: occ, available: avail, rate: avail ? occ / avail : 0 };
    });
  }, [data, filters]);

  // תפוסה לפי חדר (כשנבחר נכס בודד)
  const byRoom = useMemo(() => {
    const map = new Map<number, number>();
    for (const o of d.occupation) map.set(o.roomNumber, (map.get(o.roomNumber) ?? 0) + o.nights);
    return [...map.entries()].map(([room, nights]) => ({ room, nights })).sort((a, b) => b.nights - a.nights);
  }, [d]);

  const propCols: Column<PropOcc>[] = [
    { key: "name", header: "נכס" },
    { key: "rooms", header: "מס' חדרים", render: (r) => fmtNum(r.rooms) },
    { key: "occupied", header: "לילות תפוסים", render: (r) => fmtNum(r.occupied) },
    { key: "available", header: "לילות זמינים", render: (r) => fmtNum(r.available) },
    { key: "rate", header: "אחוז תפוסה", render: (r) => (
      <div className="flex items-center gap-2">
        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500" style={{ width: `${Math.min(100, r.rate * 100)}%` }} />
        </div>
        <span>{fmtPct(r.rate)}</span>
      </div>
    ) },
  ];

  const roomCols: Column<{ room: number; nights: number }>[] = [
    { key: "room", header: "מס' חדר" },
    { key: "nights", header: "לילות תפוסים", render: (r) => fmtNum(r.nights) },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">תפוסה</h2>
        <p className="text-slate-400 text-sm">הערכת תפוסה לפי נכס, חודש וחדר</p>
      </div>
      <FilterBar showPlatform={false} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="תפוסה ממוצעת" value={fmtPct(occupancyRate(d, filters))} icon={<Percent size={20} />} tone="brand" hint="הערכה" />
        <KpiCard label="לילות תפוסים" value={fmtNum(occupiedNights(d))} icon={<Moon size={20} />} tone="positive" />
        <KpiCard label="לילות זמינים" value={fmtNum(roomCount(d) * periodDays(d, filters))} icon={<DoorOpen size={20} />} tone="default" />
        <KpiCard label="מספר חדרים" value={fmtNum(roomCount(d))} icon={<BedDouble size={20} />} tone="default" />
      </div>

      <Card title="תפוסה לפי נכס">
        <DataTable columns={propCols} rows={byProperty} />
      </Card>

      <Card title="תפוסה לפי חדר" subtitle={filters.propertyId === "all" ? "מומלץ לבחור נכס בפילטר" : undefined}>
        <DataTable columns={roomCols} rows={byRoom} emptyText="אין נתוני תפוסה" />
      </Card>

      <p className="text-xs text-slate-400">
        * אחוז התפוסה הוא הערכה: לילות תפוסים חלקי (מספר חדרים × ימים בתקופה). ניתן לדייק בעתיד לפי תאריכי כניסה/יציאה מדויקים.
      </p>
    </div>
  );
}

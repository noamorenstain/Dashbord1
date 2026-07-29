import React, { useMemo, useState } from "react";
import { Receipt, CheckCircle2, Clock, Wrench } from "lucide-react";
import { useData } from "../data/DataContext";
import { useFilters } from "../context/FilterContext";
import {
  filterDataSet, expensesFull, expensesPaid, expensesLeft, maintenanceCost, expensesByCategory,
} from "../lib/calculations";
import { fmtEUR } from "../lib/format";
import { fmtDate } from "../lib/format";
import { KpiCard } from "../components/ui/KpiCard";
import { Card } from "../components/ui/Card";
import { FilterBar } from "../components/FilterBar";
import { DataTable, Column } from "../components/ui/DataTable";
import { DonutChart } from "../components/charts/DonutChart";
import { PaymentBadge } from "../components/ui/StatusBadge";
import { Select } from "../components/ui/Select";
import { Expense } from "../data/types";

export function ExpensesPage() {
  const { data } = useData();
  const { filters } = useFilters();
  const base = useMemo(() => filterDataSet(data, filters), [data, filters]);

  // פילטרים מקומיים לעמוד ההוצאות
  const [category, setCategory] = useState("all");
  const [payStatus, setPayStatus] = useState("all");
  const [payType, setPayType] = useState("all");

  const categories = useMemo(() => [...new Set(data.expenses.map((e) => e.expensesType).filter(Boolean))], [data.expenses]);
  const statuses = useMemo(() => [...new Set(data.expenses.map((e) => e.status).filter(Boolean))], [data.expenses]);
  const payTypes = useMemo(() => [...new Set(data.expenses.map((e) => e.paidBy).filter(Boolean))], [data.expenses]);

  const rows = useMemo(
    () =>
      base.expenses.filter(
        (e) =>
          (category === "all" || e.expensesType === category) &&
          (payStatus === "all" || e.status === payStatus) &&
          (payType === "all" || e.paidBy === payType)
      ),
    [base.expenses, category, payStatus, payType]
  );

  const opt = (arr: string[]) => [{ value: "all", label: "הכול" }, ...arr.map((v) => ({ value: v, label: v }))];

  const cols: Column<Expense>[] = [
    { key: "propertyId", header: "נכס" },
    { key: "expensesType", header: "קטגוריה", render: (e) => e.expensesType || <span className="text-rose-500">ללא קטגוריה</span> },
    { key: "invoiceDate", header: "תאריך חשבונית", render: (e) => fmtDate(e.invoiceDate) },
    { key: "fullAmount", header: "סכום מלא", render: (e) => fmtEUR(e.fullAmount) },
    { key: "paidAmount", header: "שולם", render: (e) => fmtEUR(e.paidAmount) },
    { key: "leftAmount", header: "נותר לתשלום", render: (e) => (
      <span className={e.leftAmount > 0 ? "text-rose-600 font-medium" : "text-slate-500"}>{fmtEUR(e.leftAmount)}</span>
    ) },
    { key: "status", header: "סטטוס", render: (e) => <PaymentBadge status={e.status} /> },
    { key: "paidBy", header: "אמצעי תשלום" },
    { key: "reportBy", header: "דווח ע\"י" },
    { key: "notes", header: "הערות", render: (e) => <span className="text-slate-400">{e.notes || "—"}</span> },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">הוצאות</h2>
        <p className="text-slate-400 text-sm">חשבוניות, תשלומים ויתרות לתשלום</p>
      </div>
      <FilterBar showPlatform={false} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="סך חשבוניות (מלא)" value={fmtEUR(expensesFull(base))} icon={<Receipt size={20} />} tone="default" />
        <KpiCard label="שולם בפועל" value={fmtEUR(expensesPaid(base))} icon={<CheckCircle2 size={20} />} tone="positive" />
        <KpiCard label="נותר לתשלום" value={fmtEUR(expensesLeft(base))} icon={<Clock size={20} />} tone="negative" />
        <KpiCard label="עלות תחזוקה" value={fmtEUR(maintenanceCost(base))} icon={<Wrench size={20} />} tone="amber" />
      </div>

      <div className="grid xl:grid-cols-2 gap-4">
        <Card title="הוצאות לפי קטגוריה" subtitle="לפי הסכום המלא (כולל טרם שולם)">
          <DonutChart data={expensesByCategory(base)} />
        </Card>
        <Card title="סינון מפורט">
          <div className="flex flex-wrap gap-3">
            <Select label="קטגוריה" value={category} options={opt(categories)} onChange={setCategory} />
            <Select label="סטטוס תשלום" value={payStatus} options={opt(statuses)} onChange={setPayStatus} />
            <Select label="אמצעי תשלום" value={payType} options={opt(payTypes)} onChange={setPayType} />
          </div>
          <p className="text-slate-400 text-xs mt-4">מציג {rows.length} שורות הוצאה לאחר סינון.</p>
        </Card>
      </div>

      <Card title="פירוט הוצאות">
        <DataTable columns={cols} rows={rows} maxHeight={520} />
      </Card>
    </div>
  );
}

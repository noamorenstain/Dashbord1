// =============================================================
//  הוצאות חד-פעמיות (One-time Expenses)
//  -------------------------------------------------------------
//  נתונים מגיליון "One-time expenses" — מבנה זהה לגיליון Expenses,
//  אך מאגר נתונים נפרד לחלוטין. לא מעורב בחישובי P&L / הוצאות רגילות.
// =============================================================

import React, { useMemo, useState } from "react";
import { PackageOpen, CheckCircle2, Clock, Receipt } from "lucide-react";
import { useData } from "../data/DataContext";
import { useFilters } from "../context/FilterContext";
import {
  filterDataSet, oneTimeExpensesFull, oneTimeExpensesPaid, oneTimeExpensesLeft, oneTimeExpensesByCategory,
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

export function OneTimeExpensesPage() {
  const { data } = useData();
  const { filters } = useFilters();
  const base = useMemo(() => filterDataSet(data, filters), [data, filters]);

  // פילטרים מקומיים לעמוד ההוצאות החד-פעמיות
  const [category, setCategory] = useState("all");
  const [payStatus, setPayStatus] = useState("all");
  const [payType, setPayType] = useState("all");

  const categories = useMemo(
    () => [...new Set(data.oneTimeExpenses.map((e) => e.expensesType).filter(Boolean))],
    [data.oneTimeExpenses]
  );
  const statuses = useMemo(
    () => [...new Set(data.oneTimeExpenses.map((e) => e.status).filter(Boolean))],
    [data.oneTimeExpenses]
  );
  const payTypes = useMemo(
    () => [...new Set(data.oneTimeExpenses.map((e) => e.paidBy).filter(Boolean))],
    [data.oneTimeExpenses]
  );

  const rows = useMemo(
    () =>
      base.oneTimeExpenses.filter(
        (e) =>
          (category === "all" || e.expensesType === category) &&
          (payStatus === "all" || e.status === payStatus) &&
          (payType === "all" || e.paidBy === payType)
      ),
    [base.oneTimeExpenses, category, payStatus, payType]
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
        <h2 className="text-xl font-bold text-slate-800">הוצאות חד פעמיות</h2>
        <p className="text-slate-400 text-sm">
          חשבוניות, תשלומים ויתרות לתשלום — מגיליון נפרד מ"הוצאות", אינו נכלל בחישובי רווח והפסד הרגילים
        </p>
      </div>
      <FilterBar showPlatform={false} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="סך חשבוניות (מלא)" value={fmtEUR(oneTimeExpensesFull(base))} icon={<Receipt size={20} />} tone="default" />
        <KpiCard label="שולם בפועל" value={fmtEUR(oneTimeExpensesPaid(base))} icon={<CheckCircle2 size={20} />} tone="positive" />
        <KpiCard label="נותר לתשלום" value={fmtEUR(oneTimeExpensesLeft(base))} icon={<Clock size={20} />} tone="negative" />
        <KpiCard label="מספר הוצאות" value={String(rows.length)} icon={<PackageOpen size={20} />} tone="amber" />
      </div>

      <div className="grid xl:grid-cols-2 gap-4">
        <Card title="הוצאות חד-פעמיות לפי קטגוריה" subtitle="לפי הסכום המלא (כולל טרם שולם)">
          <DonutChart data={oneTimeExpensesByCategory(base)} />
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

      <Card title="פירוט הוצאות חד-פעמיות">
        <DataTable columns={cols} rows={rows} maxHeight={520} />
      </Card>
    </div>
  );
}

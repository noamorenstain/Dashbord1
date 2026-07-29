import React from "react";

export interface Column<T> {
  key: string;
  header: string;
  /** רינדור תא. אם לא מסופק — מציג את הערך לפי key */
  render?: (row: T) => React.ReactNode;
  align?: "right" | "left" | "center";
  className?: string;
}

// מיפוי ליישור — מחרוזות מלאות כדי ש-Tailwind לא יסיר אותן ב-build
const alignClass: Record<"right" | "left" | "center", string> = {
  right: "text-right",
  left: "text-left",
  center: "text-center",
};

/** טבלת נתונים גנרית, RTL, עם פס גלילה אופקי במידת הצורך */
export function DataTable<T>({
  columns,
  rows,
  emptyText = "אין נתונים להצגה",
  maxHeight,
}: {
  columns: Column<T>[];
  rows: T[];
  emptyText?: string;
  maxHeight?: number;
}) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-200" style={maxHeight ? { maxHeight } : undefined}>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 sticky top-0 z-10">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2.5 font-semibold text-slate-600 whitespace-nowrap ${alignClass[c.align ?? "right"]}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-slate-400">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/70">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-2 text-slate-700 whitespace-nowrap ${alignClass[c.align ?? "right"]} ${c.className ?? ""}`}
                  >
                    {c.render ? c.render(row) : (row as any)[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

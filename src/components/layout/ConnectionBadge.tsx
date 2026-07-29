// =============================================================
//  ConnectionBadge — חיווי מצב מקור הנתונים
//  ירוק = מעודכן מקובץ Excel · כתום = נתוני דמו (טרם הועלה קובץ)
// =============================================================

import React from "react";
import { Loader2, FileSpreadsheet, FlaskConical } from "lucide-react";
import { useData } from "../../data/DataContext";

export function ConnectionBadge() {
  const { status } = useData();

  if (status.loading) {
    return (
      <Pill className="bg-slate-100 text-slate-600">
        <Loader2 size={14} className="animate-spin" />
        טוען…
      </Pill>
    );
  }

  if (status.source === "upload" && status.ok) {
    return (
      <Pill className="bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <FileSpreadsheet size={14} />
        מעודכן מקובץ Excel
      </Pill>
    );
  }

  // ברירת מחדל — נתוני דמו (טרם הועלה קובץ)
  return (
    <Pill className="bg-amber-50 text-amber-700 border border-amber-200">
      <FlaskConical size={14} />
      נתוני דמו — העלה קובץ
    </Pill>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

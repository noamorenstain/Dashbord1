// =============================================================
//  Header עליון — שם המערכת, חיווי מצב, זמן עדכון אחרון,
//  כפתור ראשי "העלאת קובץ Excel", וכפתור לדמו/ניקוי.
// =============================================================

import React, { useRef } from "react";
import { Upload, Building2, FlaskConical } from "lucide-react";
import { useData } from "../../data/DataContext";
import { fmtDateTime } from "../../lib/format";
import { ConnectionBadge } from "./ConnectionBadge";

export function Header() {
  const { status, loadFromFile, loadDemo, clearData } = useData();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="px-5 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="text-slate-800 font-bold text-lg leading-tight">לוח בקרה — נכסי אירוח באירופה</h1>
            <p className="text-slate-400 text-xs">מערכת ניהול רווח והפסד לנכסים</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* חיווי מצב + זמן עדכון אחרון */}
          <div className="hidden md:flex flex-col items-end gap-1">
            <ConnectionBadge />
            <span className="text-slate-400 text-xs">עודכן: {fmtDateTime(status.lastUpdated)}</span>
          </div>

          {/* input מוסתר להעלאת הקובץ */}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void loadFromFile(f);
              e.target.value = "";
            }}
          />

          {/* כפתור משני — דמו / ניקוי */}
          {status.source === "upload" ? (
            <button
              onClick={() => clearData()}
              title="ניקוי הקובץ שהועלה וחזרה לדמו"
              className="hidden sm:flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50"
            >
              <FlaskConical size={16} />
              נקה / דמו
            </button>
          ) : (
            <button
              onClick={() => loadDemo()}
              className="hidden sm:flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50"
            >
              <FlaskConical size={16} />
              נתוני דמו
            </button>
          )}

          {/* כפתור ראשי — העלאת קובץ Excel */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={status.loading}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-lg px-4 py-2"
          >
            <Upload size={16} className={status.loading ? "animate-pulse" : ""} />
            העלאת קובץ Excel
          </button>
        </div>
      </div>

      {/* שורת הודעת מצב */}
      <div
        className={`px-5 py-1.5 text-xs ${
          status.ok && status.source === "upload"
            ? "bg-emerald-50 text-emerald-700"
            : status.ok
            ? "bg-amber-50 text-amber-700"
            : "bg-rose-50 text-rose-700"
        }`}
      >
        {status.message}
      </div>
    </header>
  );
}

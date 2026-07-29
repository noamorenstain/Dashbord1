// =============================================================
//  UploadBanner — אזור העלאה בולט (גרירה או לחיצה)
//  מוצג כשעדיין לא הועלה קובץ (מצב דמו).
// =============================================================

import React, { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { useData } from "../data/DataContext";

export function UploadBanner() {
  const { loadFromFile, status } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) void loadFromFile(f);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => fileRef.current?.click()}
      role="button"
      tabIndex={0}
      className={`cursor-pointer rounded-2xl border-2 border-dashed px-6 py-7 text-center transition ${
        dragOver ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-white hover:bg-slate-50"
      }`}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center">
          <UploadCloud size={26} />
        </div>
        <p className="text-slate-800 font-semibold">
          גרור לכאן את קובץ ה-Excel, או לחץ לבחירת קובץ
        </p>
        <p className="text-slate-400 text-sm">
          המסכים שלמטה מציגים כרגע נתוני דמו. עם העלאת הקובץ — כל הנתונים יתעדכנו לפיו.
        </p>
        {!status.ok && status.message && (
          <p className="text-rose-600 text-sm mt-1">{status.message}</p>
        )}
      </div>
    </div>
  );
}

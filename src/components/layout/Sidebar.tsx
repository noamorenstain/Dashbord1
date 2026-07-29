import React from "react";
import { NAV_ITEMS, PageKey } from "./nav";
import { useData } from "../../data/DataContext";

/** תפריט צד ימני (RTL) */
export function Sidebar({
  active,
  onNavigate,
}: {
  active: PageKey;
  onNavigate: (k: PageKey) => void;
}) {
  const { status } = useData();
  return (
    <aside className="w-60 shrink-0 bg-white border-l border-slate-200 hidden lg:flex flex-col">
      <nav className="p-3 flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <li key={item.key}>
                <button
                  onClick={() => onNavigate(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-3 border-t border-slate-100">
        <div
          className={`text-xs rounded-lg px-3 py-2 ${
            status.source === "mock" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {status.source === "mock" ? "⚠️ נתוני דמו פעילים" : "✓ נתונים אמיתיים"}
        </div>
      </div>
    </aside>
  );
}

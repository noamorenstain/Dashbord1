import React, { useState } from "react";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { NAV_ITEMS, PageKey } from "./components/layout/nav";
import { FilterProvider } from "./context/FilterContext";
import { useData } from "./data/DataContext";
import { UploadBanner } from "./components/UploadBanner";

import { DashboardPage } from "./pages/Dashboard";
import { PropertiesPage } from "./pages/Properties";
import { ProfitLossPage } from "./pages/ProfitLoss";
import { ComparisonPage } from "./pages/Comparison";
import { RevenuePage } from "./pages/Revenue";
import { ExpensesPage } from "./pages/Expenses";
import { OneTimeExpensesPage } from "./pages/OneTimeExpenses";
import { OccupancyPage } from "./pages/Occupancy";
import { BookingsPage } from "./pages/Bookings";
import { MaintenancePage } from "./pages/Maintenance";
import { AnomaliesPage } from "./pages/Anomalies";

function Pages({ page }: { page: PageKey }) {
  switch (page) {
    case "dashboard": return <DashboardPage />;
    case "properties": return <PropertiesPage />;
    case "pnl": return <ProfitLossPage />;
    case "comparison": return <ComparisonPage />;
    case "revenue": return <RevenuePage />;
    case "expenses": return <ExpensesPage />;
    case "oneTimeExpenses": return <OneTimeExpensesPage />;
    case "occupancy": return <OccupancyPage />;
    case "bookings": return <BookingsPage />;
    case "maintenance": return <MaintenancePage />;
    case "anomalies": return <AnomaliesPage />;
    default: return <DashboardPage />;
  }
}

export default function App() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const { status } = useData();

  return (
    <FilterProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1 min-h-0">
          <Sidebar active={page} onNavigate={setPage} />
          <main className="flex-1 min-w-0 overflow-y-auto">
            {/* ניווט אופקי למסכים קטנים */}
            <div className="lg:hidden bg-white border-b border-slate-200 overflow-x-auto">
              <div className="flex gap-1 p-2 w-max">
                {NAV_ITEMS.map((it) => (
                  <button
                    key={it.key}
                    onClick={() => setPage(it.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
                      page === it.key ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 max-w-[1400px] mx-auto space-y-5">
              {/* אזור העלאה — מוצג רק כשעדיין לא הועלה קובץ (מצב דמו) */}
              {status.source === "mock" && !status.loading && <UploadBanner />}

              {status.loading && status.lastUpdated === null ? (
                <div className="text-center text-slate-400 py-20">טוען נתונים…</div>
              ) : (
                <Pages page={page} />
              )}
            </div>
          </main>
        </div>
      </div>
    </FilterProvider>
  );
}

// =============================================================
//  FilterContext — פילטרים גלובליים משותפים לכל המסכים
//  (נכס, מדינה, שנה, חודש, פלטפורמה)
// =============================================================

import React, { createContext, useContext, useMemo, useState } from "react";
import { Filters, defaultFilters } from "../lib/calculations";

interface FilterCtx {
  filters: Filters;
  setFilter: (patch: Partial<Filters>) => void;
  reset: () => void;
}

const Ctx = createContext<FilterCtx | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const value = useMemo<FilterCtx>(
    () => ({
      filters,
      setFilter: (patch) => setFilters((f) => ({ ...f, ...patch })),
      reset: () => setFilters(defaultFilters),
    }),
    [filters]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFilters(): FilterCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFilters חייב להיות בתוך FilterProvider");
  return ctx;
}

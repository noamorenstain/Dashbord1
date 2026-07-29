// צבעים ופורמטים משותפים לגרפים
export const CHART_COLORS = [
  "#3563eb", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16",
  "#f97316", "#14b8a6", "#a855f7", "#64748b",
];

export const eurTick = (n: number) => `€${Math.round(n).toLocaleString("he-IL")}`;

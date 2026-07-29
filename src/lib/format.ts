// =============================================================
//  פונקציות עיצוב תצוגה (Formatting) — עברית + יורו (€)
// =============================================================

const eurFormatter = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const eurFormatterCents = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 });

/** סכום ביורו ללא אגורות (לכרטיסי KPI וטבלאות) */
export function fmtEUR(n: number): string {
  if (!isFinite(n)) return "—";
  return eurFormatter.format(n);
}

/** סכום ביורו עם שתי ספרות אחרי הנקודה */
export function fmtEUR2(n: number): string {
  if (!isFinite(n)) return "—";
  return eurFormatterCents.format(n);
}

/** מספר רגיל עם מפרידי אלפים */
export function fmtNum(n: number): string {
  if (!isFinite(n)) return "—";
  return numberFormatter.format(n);
}

/** אחוז — מקבל שבר (0.15) ומחזיר "15%" */
export function fmtPct(fraction: number, digits = 1): string {
  if (!isFinite(fraction)) return "—";
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** תאריך בעברית מתוך ISO string */
export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** תאריך + שעה (לעדכון אחרון) */
export function fmtDateTime(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** מפתח חודש YYYY-MM מתוך ISO */
export function monthKey(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const HE_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

/** תווית חודש בעברית מתוך מפתח YYYY-MM */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return `${HE_MONTHS[m - 1]} ${y}`;
}

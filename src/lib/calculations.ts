// =================================================================
//  שכבת החישובים (Calculations) — לב המערכת
//  -----------------------------------------------------------------
//  כל החישובים העסקיים מתבצעים כאן, ישירות מגיליונות המקור
//  (occupation, Extras, Expenses, Maintence, Rooms, Properties).
//  שכבת התצוגה רק קוראת לפונקציות האלה — אין חישובים בקומפוננטות.
//
//  לוגיקת הרווח וההפסד (לפי ההגדרה שסיפקת):
//    הכנסה כוללת   = TotalNetPrice (occupation) + Amount (Extras)
//    הוצאה כוללת   = FullAmount (Expenses — כל השורות, כולל שולם/לא שולם/שולם
//                     חלקית) + Amount (Maintence)
//    רווח נקי      = הכנסה כוללת − הוצאה כוללת
//    שולי רווח     = רווח נקי / הכנסה כוללת
// =================================================================

import { DataSet, Expense, Extra, Maintenance, Occupation, Room } from "../data/types";
import { monthKey } from "./format";

// ----------------------- פילטרים -----------------------

export interface Filters {
  propertyId: string; // 'all' או PropertyID
  country: string; // 'all' או שם מדינה
  year: string; // 'all' או '2026'
  month: string; // 'all' או 'YYYY-MM'
  platform: string; // 'all' או שם פלטפורמה
}

export const defaultFilters: Filters = {
  propertyId: "all",
  country: "all",
  year: "all",
  month: "all",
  platform: "all",
};

/**
 * מפתח חודש לכל סוג רשומה — מקור אמת יחיד. כל מקום במערכת (פילטרים, KPI,
 * גרפים, טבלאות, P&L) חייב לקרוא לפונקציות האלה ולא לשכפל את הלוגיקה.
 *
 *   הזמנות (occupation)      -> Check-in Date בלבד (לא Check-out, לא Month)
 *   הכנסות נוספות (Extras)   -> עמודת Month (לא Date)
 *   הוצאות (Expenses + One-time expenses) -> BillingDate (עמודה I), לא InvoiceDate/PaymentDate
 *   תחזוקה (Maintence)       -> Date
 */
/** מחזיר את המועמד הראשון שהוא תאריך תקין (לא null וניתן לפרסור) */
function firstValidISO(...vals: (string | null)[]): string | null {
  for (const v of vals) {
    if (!v) continue;
    const d = new Date(v);
    if (!isNaN(d.getTime())) return v;
  }
  return null;
}

// --- מפתחי תאריך גולמי (ISO) לפי סוג רשומה — אותו מקור אמת ששיוך-חודש
// (occMonth וכו') ושיוך-טווח-תאריכים (להשוואת תקופות) שניהם נשענים עליו,
// כדי שלא תהיה אף פעם אפשרות לשתי לוגיקות שיוך תאריך שונות לאותו סוג רשומה. ---
export function occDate(o: Occupation): string | null {
  return o.checkInDate;
}
export function extraDate(e: Extra): string | null {
  return firstValidISO(e.month, e.date);
}
export function expenseDate(e: Expense): string | null {
  return firstValidISO(e.billingDate, e.month, e.invoiceDate);
}
export function maintDate(m: Maintenance): string | null {
  return m.date;
}

export function occMonth(o: Occupation): string | null {
  return monthKey(occDate(o));
}
export function extraMonth(e: Extra): string | null {
  return monthKey(extraDate(e));
}
export function expenseMonth(e: Expense): string | null {
  return monthKey(expenseDate(e));
}
// הוצאות חד-פעמיות — אותה לוגיקת תאריך (BillingDate קודם), נשמר כפונקציה נפרדת כי מדובר במאגר נפרד
export function oneTimeExpenseMonth(e: Expense): string | null {
  return monthKey(expenseDate(e));
}
export function maintMonth(m: Maintenance): string | null {
  return monthKey(maintDate(m));
}

function matchPeriod(key: string | null, f: Filters): boolean {
  if (!key) return f.year === "all" && f.month === "all"; // רשומה ללא תאריך תיכלל רק כשאין סינון תקופה
  if (f.month !== "all") return key === f.month;
  if (f.year !== "all") return key.startsWith(f.year);
  return true;
}

/**
 * מסנן את כל מאגר הנתונים לפי הפילטרים.
 * country -> מתורגם לרשימת מזהי נכסים באותה מדינה.
 */
export function filterDataSet(data: DataSet, f: Filters): DataSet {
  const propIdsInCountry =
    f.country === "all"
      ? null
      : new Set(data.properties.filter((p) => p.country === f.country).map((p) => p.propertyId));

  const propOk = (id: string) =>
    (f.propertyId === "all" || id === f.propertyId) &&
    (propIdsInCountry === null || propIdsInCountry.has(id));

  return {
    properties: data.properties.filter((p) => propOk(p.propertyId)),
    platformCommissions: data.platformCommissions.filter((c) => propOk(c.propertyId)),
    rooms: data.rooms.filter((r) => propOk(r.propertyId)),
    occupation: data.occupation.filter(
      (o) =>
        propOk(o.propertyId) &&
        matchPeriod(occMonth(o), f) &&
        (f.platform === "all" || o.platform === f.platform)
    ),
    extras: data.extras.filter((e) => propOk(e.propertyId) && matchPeriod(extraMonth(e), f)),
    maintenance: data.maintenance.filter((m) => propOk(m.propertyId) && matchPeriod(maintMonth(m), f)),
    expenses: data.expenses.filter((e) => propOk(e.propertyId) && matchPeriod(expenseMonth(e), f)),
    // הוצאות חד-פעמיות — מסוננות בנפרד לחלוטין, לא מתערבבות עם expenses
    oneTimeExpenses: data.oneTimeExpenses.filter(
      (e) => propOk(e.propertyId) && matchPeriod(oneTimeExpenseMonth(e), f)
    ),
    profitAndLoss: [],
  };
}

/** טווח תאריכים (כולל את שני הקצוות) — ל"השוואת תקופות" */
export interface DateRange {
  start: Date; // UTC, חצות תחילת היום הראשון
  end: Date; // UTC, סוף היום האחרון (23:59:59.999)
}

function inRange(iso: string | null, r: DateRange): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return false;
  return t >= r.start.getTime() && t <= r.end.getTime();
}

/**
 * מסנן את מאגר הנתונים לפי טווח תאריכים מדויק (לא לפי "YYYY-MM") — משמש אך
 * ורק ע"י לשונית "השוואת תקופות", לצורך טווחים שאינם חודש קלנדרי שלם (שבוע,
 * 7/30 ימים אחרונים, מתחילת החודש/שנה, טווח מותאם אישית).
 * משתמש באותם שדות תאריך בדיוק כמו filterDataSet/occMonth/expenseMonth וכו'
 * (Check-in לתפוסה, BillingDate להוצאות, Month ל-Extras, Date לתחזוקה) —
 * שום כלל שיוך-תאריך חדש לא הומצא כאן, רק הוחלף שיוך-לפי-מפתח-חודש בבדיקת
 * טווח מדויקת יותר על אותו תאריך עצמו.
 */
export function filterDataSetByRange(
  data: DataSet,
  f: { propertyId: string; country: string },
  range: DateRange
): DataSet {
  const propIdsInCountry =
    f.country === "all"
      ? null
      : new Set(data.properties.filter((p) => p.country === f.country).map((p) => p.propertyId));
  const propOk = (id: string) =>
    (f.propertyId === "all" || id === f.propertyId) &&
    (propIdsInCountry === null || propIdsInCountry.has(id));

  return {
    properties: data.properties.filter((p) => propOk(p.propertyId)),
    platformCommissions: data.platformCommissions.filter((c) => propOk(c.propertyId)),
    rooms: data.rooms.filter((r) => propOk(r.propertyId)),
    occupation: data.occupation.filter((o) => propOk(o.propertyId) && inRange(occDate(o), range)),
    extras: data.extras.filter((e) => propOk(e.propertyId) && inRange(extraDate(e), range)),
    maintenance: data.maintenance.filter((m) => propOk(m.propertyId) && inRange(maintDate(m), range)),
    expenses: data.expenses.filter((e) => propOk(e.propertyId) && inRange(expenseDate(e), range)),
    oneTimeExpenses: data.oneTimeExpenses.filter((e) => propOk(e.propertyId) && inRange(expenseDate(e), range)),
    profitAndLoss: [],
  };
}

export interface DailyPoint {
  dayIndex: number; // 1..N מתחילת הטווח
  date: string; // ISO (YYYY-MM-DD)
  revenue: number;
  expenses: number;
  profit: number;
  occupiedNights: number;
}

/**
 * פירוק יומי של הכנסה/הוצאה/רווח לאורך טווח תאריכים — לצורך גרפים חופפים
 * ("יום 1: נוכחי מול קודם" וכו') בלשונית השוואת תקופות. אותה שיטת הכנסה/
 * הוצאה בדיוק כמו calcRevenue/calcExpenses (ברוטו + Extras; FullAmount +
 * תחזוקה + עמלה), רק מפורק ליום בודד לפי אותם שדות תאריך (Check-in/
 * BillingDate/Month/Date) במקום מסוכם על כל הטווח.
 */
export function dailySeriesForRange(
  data: DataSet,
  f: { propertyId: string; country: string },
  range: DateRange
): DailyPoint[] {
  const filtered = filterDataSetByRange(data, f, range);
  const DAY_MS = 86400000;
  const startUTC = Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth(), range.start.getUTCDate());
  const endUTC = Date.UTC(range.end.getUTCFullYear(), range.end.getUTCMonth(), range.end.getUTCDate());
  const numDays = Math.round((endUTC - startUTC) / DAY_MS) + 1;

  const points: DailyPoint[] = Array.from({ length: numDays }, (_, i) => ({
    dayIndex: i + 1,
    date: new Date(startUTC + i * DAY_MS).toISOString().slice(0, 10),
    revenue: 0,
    expenses: 0,
    profit: 0,
    occupiedNights: 0,
  }));

  const idxOf = (iso: string | null): number | null => {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    if (isNaN(t)) return null;
    const dUTC = Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth(), new Date(t).getUTCDate());
    const idx = Math.round((dUTC - startUTC) / DAY_MS);
    return idx >= 0 && idx < numDays ? idx : null;
  };

  for (const o of filtered.occupation) {
    const idx = idxOf(occDate(o));
    if (idx !== null) {
      points[idx].revenue += o.totalPrice;
      points[idx].expenses += o.commission; // עמלה כשורת הוצאה — עקבי עם calcExpenses
      points[idx].occupiedNights += o.nights;
    }
  }
  for (const e of filtered.extras) {
    const idx = idxOf(extraDate(e));
    if (idx !== null) points[idx].revenue += e.amount;
  }
  for (const e of filtered.expenses) {
    const idx = idxOf(expenseDate(e));
    if (idx !== null) points[idx].expenses += e.fullAmount;
  }
  for (const m of filtered.maintenance) {
    const idx = idxOf(maintDate(m));
    if (idx !== null) points[idx].expenses += m.amount;
  }
  points.forEach((p) => (p.profit = p.revenue - p.expenses));
  return points;
}

// ----------------------- מדדים בסיסיים -----------------------

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

export function grossRevenue(d: DataSet): number {
  return sum(d.occupation.map((o) => o.totalPrice));
}
export function netRevenue(d: DataSet): number {
  return sum(d.occupation.map((o) => o.totalNetPrice));
}
export function commissionTotal(d: DataSet): number {
  return sum(d.occupation.map((o) => o.commission));
}
export function additionalIncome(d: DataSet): number {
  return sum(d.extras.map((e) => e.amount));
}
export function expensesPaid(d: DataSet): number {
  return sum(d.expenses.map((e) => e.paidAmount));
}
export function expensesFull(d: DataSet): number {
  return sum(d.expenses.map((e) => e.fullAmount));
}
export function expensesLeft(d: DataSet): number {
  return sum(d.expenses.map((e) => e.leftAmount));
}
export function maintenanceCost(d: DataSet): number {
  return sum(d.maintenance.map((m) => m.amount));
}

// ----- הוצאות חד-פעמיות (One-time expenses) — מאגר נפרד לחלוטין -----
// לא נכללות בחישובי totalExpenses / netProfit / P&L הרגילים.
export function oneTimeExpensesPaid(d: DataSet): number {
  return sum(d.oneTimeExpenses.map((e) => e.paidAmount));
}
export function oneTimeExpensesFull(d: DataSet): number {
  return sum(d.oneTimeExpenses.map((e) => e.fullAmount));
}
export function oneTimeExpensesLeft(d: DataSet): number {
  return sum(d.oneTimeExpenses.map((e) => e.leftAmount));
}

/** הכנסה כוללת = נטו הזמנות + הכנסות נוספות */
export function totalRevenue(d: DataSet): number {
  return netRevenue(d) + additionalIncome(d);
}
/**
 * הוצאה כוללת = כל שורות ההוצאה במלואן (Expenses — ללא קשר לסטטוס תשלום:
 * שולם / לא שולם / שולם חלקית) + תחזוקה (Maintence).
 * לפי בקשת המשתמש: לכלול את כל ההוצאות, לא רק מה ששולם בפועל.
 */
export function totalExpenses(d: DataSet): number {
  return expensesFull(d) + maintenanceCost(d);
}
export function netProfit(d: DataSet): number {
  return totalRevenue(d) - totalExpenses(d);
}
export function profitMargin(d: DataSet): number {
  const rev = totalRevenue(d);
  return rev === 0 ? 0 : netProfit(d) / rev;
}

/**
 * ============================================================
 *  שכבת רווחיות מרכזית — מקור אמת יחיד לכל האפליקציה
 *  ------------------------------------------------------------
 *  totalRevenue/totalExpenses/netProfit/profitMargin לעיל מחושבים על
 *  בסיס נטו (TotalNetPrice, שכבר מנוכה ממנו העמלה) ומוצגים במקומות
 *  ספציפיים כמידע משלים ("הכנסות נטו"). הם *לא* משמשים עוד לחישוב
 *  "שולי הרווח" הרשמי, כי המכנה שלהם (הכנסה נטו) שונה מהמכנה שה-P&L
 *  (המקור הסמכותי, לפי בקשת המשתמש) משתמש בו (הכנסה ברוטו).
 *
 *  הפונקציות הבאות משכפלות בדיוק את הלוגיקה העסקית שכבר הייתה נכונה
 *  ב-buildPnL (לשונית רווח והפסד):
 *    הכנסה  = TotalPrice ברוטו (grossRevenue) + הכנסות נוספות (Extras)
 *    הוצאה  = FullAmount של כל שורות ה-Expenses (ללא קשר לסטטוס תשלום)
 *             + תחזוקה (Maintence) + עמלות פלטפורמה (commission), כשורת
 *             הוצאה נפרדת — בדיוק כפי שמופיע ב-buildPnL.
 *    רווח   = הכנסה − הוצאה
 *    שולי רווח = רווח / הכנסה (0% כשההכנסה 0 — לעולם לא Infinity/NaN)
 *  הוצאות חד-פעמיות (oneTimeExpenses) אף פעם לא נכללות כאן.
 *
 *  כל מקום באפליקציה שמציג "רווח נקי" / "שולי רווח" / "הכנסות" / "הוצאות"
 *  כמדד הרשמי (KPI ראשי, טבלת סיכום נכסים, השוואת תקופות וכו') חייב לקרוא
 *  לפונקציות האלה — ולא לחשב הכנסה/הוצאה/רווח בעצמו — כדי שאותו נכס +
 *  אותה תקופה + אותם פילטרים יניבו תמיד בדיוק את אותו מספר בכל מקום.
 * ============================================================
 */
export function calcRevenue(d: DataSet): number {
  return grossRevenue(d) + additionalIncome(d);
}
export function calcExpenses(d: DataSet): number {
  return expensesFull(d) + maintenanceCost(d) + commissionTotal(d);
}
export function calcProfit(d: DataSet): number {
  return calcRevenue(d) - calcExpenses(d);
}
export function calcProfitMargin(d: DataSet): number {
  const rev = calcRevenue(d);
  if (!rev) return 0;
  const m = calcProfit(d) / rev;
  return isFinite(m) ? m : 0;
}
export function bookingsCount(d: DataSet): number {
  return d.occupation.length;
}
export function occupiedNights(d: DataSet): number {
  return sum(d.occupation.map((o) => o.nights));
}
export function avgRevenuePerBooking(d: DataSet): number {
  const n = bookingsCount(d);
  return n === 0 ? 0 : grossRevenue(d) / n;
}
export function avgRevenuePerNight(d: DataSet): number {
  const n = occupiedNights(d);
  return n === 0 ? 0 : grossRevenue(d) / n;
}

// ----------------------- תפוסה -----------------------

/** מספר הימים בתקופה הנבחרת (להערכת תפוסה) */
export function periodDays(d: DataSet, f: Filters): number {
  if (f.month !== "all") {
    const [y, m] = f.month.split("-").map(Number);
    return new Date(Date.UTC(y, m, 0)).getUTCDate(); // ימים בחודש
  }
  if (f.year !== "all") return 365;
  // 'all' — מספר החודשים הייחודיים שבהם יש הזמנות * 30 (הערכה)
  const months = new Set(d.occupation.map(occMonth).filter(Boolean));
  return Math.max(1, months.size) * 30;
}

export function roomCount(d: DataSet): number {
  return d.rooms.length;
}

/** תפוסה מוערכת = לילות תפוסים / (מספר חדרים × ימים בתקופה) */
export function occupancyRate(d: DataSet, f: Filters): number {
  const available = roomCount(d) * periodDays(d, f);
  if (available === 0) return 0;
  return occupiedNights(d) / available;
}

/**
 * לילות זמינים להערכת תפוסה על טווח תאריכים מפורש (למשל שבוע/7 ימים/טווח
 * מותאם אישית) — אותה שיטת הערכה שכבר קיימת בלשונית "תפוסה" (roomCount ×
 * מספר ימים), רק עם ימים מחושבים מטווח תאריכים מדויק במקום ממפתח חודש/שנה.
 */
export function availableNightsForDays(d: DataSet, days: number): number {
  return roomCount(d) * Math.max(0, days);
}

/** תפוסה מוערכת על בסיס מספר לילות זמינים נתון (ראו availableNightsForDays) */
export function occupancyRateFor(d: DataSet, availableNights: number): number {
  if (availableNights === 0) return 0;
  return occupiedNights(d) / availableNights;
}

/** אורך שהייה ממוצע = סך לילות תפוסים / מספר הזמנות */
export function avgLengthOfStay(d: DataSet): number {
  const n = bookingsCount(d);
  return n === 0 ? 0 : occupiedNights(d) / n;
}

/**
 * RevPAR — הכנסה להזמנה זמינה = הכנסת חדרים (ברוטו, TotalPrice — אותה
 * הגדרת "הכנסת אירוח" ש-grossRevenue/ADR כבר משתמשים בה) / לילות זמינים.
 * שקול ל-ADR × אחוז תפוסה.
 */
export function revpar(d: DataSet, availableNights: number): number {
  if (availableNights === 0) return 0;
  return grossRevenue(d) / availableNights;
}

// ----------------------- פילוחים -----------------------

export interface NameValue {
  name: string;
  value: number;
  secondary?: number;
}

/** הכנסות לפי פלטפורמה (ברוטו ונטו) */
export function revenueByPlatform(d: DataSet): NameValue[] {
  const map = new Map<string, { gross: number; net: number }>();
  for (const o of d.occupation) {
    const key = o.platform || "לא ידוע";
    const cur = map.get(key) ?? { gross: 0, net: 0 };
    cur.gross += o.totalPrice;
    cur.net += o.totalNetPrice;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, value: v.gross, secondary: v.net }))
    .sort((a, b) => b.value - a.value);
}

/** הוצאות לפי קטגוריה (הסכום המלא — כולל טרם שולם). כולל תחזוקה מגיליון Maintence */
export function expensesByCategory(d: DataSet): NameValue[] {
  const map = new Map<string, { paid: number; full: number }>();
  for (const e of d.expenses) {
    const key = e.expensesType || "ללא קטגוריה";
    const cur = map.get(key) ?? { paid: 0, full: 0 };
    cur.paid += e.paidAmount;
    cur.full += e.fullAmount;
    map.set(key, cur);
  }
  const maint = maintenanceCost(d);
  if (maint > 0) {
    const cur = map.get("תחזוקה (דיווחים)") ?? { paid: 0, full: 0 };
    cur.paid += maint;
    cur.full += maint;
    map.set("תחזוקה (דיווחים)", cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, value: v.full, secondary: v.paid }))
    .sort((a, b) => b.value - a.value);
}

/** הוצאות חד-פעמיות לפי קטגוריה (הסכום המלא — כולל טרם שולם) — מאגר נפרד מ-Expenses */
export function oneTimeExpensesByCategory(d: DataSet): NameValue[] {
  const map = new Map<string, { paid: number; full: number }>();
  for (const e of d.oneTimeExpenses) {
    const key = e.expensesType || "ללא קטגוריה";
    const cur = map.get(key) ?? { paid: 0, full: 0 };
    cur.paid += e.paidAmount;
    cur.full += e.fullAmount;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, value: v.full, secondary: v.paid }))
    .sort((a, b) => b.value - a.value);
}

// ----------------------- סיכום לפי נכס -----------------------

export interface PropertySummary {
  propertyId: string;
  propertyName: string;
  country: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  margin: number;
  bookings: number;
  occupancy: number;
  grossRevenue: number;
  commission: number;
  status: "profit" | "balanced" | "loss";
}

function statusOf(margin: number, profit: number): PropertySummary["status"] {
  if (profit <= 0) return "loss";
  if (margin < 0.05) return "balanced";
  return "profit";
}

/**
 * סיכום מלא לכל נכס (לאחר החלת הפילטרים).
 * הכנסה/הוצאה/רווח/שולי-רווח מחושבים דרך calcRevenue/calcExpenses/calcProfit/
 * calcProfitMargin — אותה שכבת רווחיות מרכזית שמזינה גם את P&L — כדי שהמספרים
 * בלשונית "נכסים" (Assets) יהיו זהים תמיד לאלה שב-P&L עבור אותו נכס ואותם פילטרים.
 */
export function propertySummaries(data: DataSet, f: Filters): PropertySummary[] {
  const filtered = filterDataSet(data, f);
  return filtered.properties
    .map((p) => {
      const sub = filterDataSet(data, { ...f, propertyId: p.propertyId, country: "all" });
      const rev = calcRevenue(sub);
      const profit = calcProfit(sub);
      const margin = calcProfitMargin(sub);
      return {
        propertyId: p.propertyId,
        propertyName: p.propertyName,
        country: p.country,
        revenue: rev,
        expenses: calcExpenses(sub),
        netProfit: profit,
        margin,
        bookings: bookingsCount(sub),
        occupancy: occupancyRate(sub, { ...f, propertyId: p.propertyId, country: "all" }),
        grossRevenue: grossRevenue(sub),
        commission: commissionTotal(sub),
        status: statusOf(margin, profit),
      };
    })
    .sort((a, b) => b.netProfit - a.netProfit);
}

/** הנכס הרווחי ביותר */
export function mostProfitable(summaries: PropertySummary[]): PropertySummary | null {
  return summaries.length ? summaries[0] : null;
}
/** הנכס החלש ביותר / בהפסד */
export function weakest(summaries: PropertySummary[]): PropertySummary | null {
  return summaries.length ? summaries[summaries.length - 1] : null;
}

// ----------------------- סדרות חודשיות -----------------------

export interface MonthlyPoint {
  month: string; // YYYY-MM
  revenue: number;
  expenses: number;
  profit: number;
}

/** הכנסות מול הוצאות לפי חודש (על בסיס הנתונים המסוננים) */
export function monthlySeries(d: DataSet): MonthlyPoint[] {
  const map = new Map<string, MonthlyPoint>();
  const ensure = (k: string) => {
    if (!map.has(k)) map.set(k, { month: k, revenue: 0, expenses: 0, profit: 0 });
    return map.get(k)!;
  };
  for (const o of d.occupation) {
    const k = occMonth(o);
    if (k) ensure(k).revenue += o.totalNetPrice;
  }
  for (const e of d.extras) {
    const k = extraMonth(e);
    if (k) ensure(k).revenue += e.amount;
  }
  for (const e of d.expenses) {
    const k = expenseMonth(e);
    if (k) ensure(k).expenses += e.fullAmount; // כל ההוצאות, ללא קשר לסטטוס תשלום
  }
  for (const m of d.maintenance) {
    const k = maintMonth(m);
    if (k) ensure(k).expenses += m.amount;
  }
  const arr = [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
  arr.forEach((p) => (p.profit = p.revenue - p.expenses));
  return arr;
}

/** שינוי ברווח הנקי בין החודש האחרון לחודש שלפניו (לכל הנתונים המסוננים) */
export function monthlyChange(d: DataSet): { current: number; previous: number; deltaPct: number } | null {
  const series = monthlySeries(d);
  if (series.length < 2) return null;
  const current = series[series.length - 1].profit;
  const previous = series[series.length - 2].profit;
  const deltaPct = previous === 0 ? 0 : (current - previous) / Math.abs(previous);
  return { current, previous, deltaPct };
}

// ----------------------- P&L לפי נכס -----------------------

/**
 * מיפוי סוג הוצאה (כפי שמופיע בגיליון Expenses, עמודת ExpensesType) לקטגוריית P&L.
 * כולל גם שמות בעברית (נתוני דמו) וגם באנגלית (הקובץ האמיתי), עם טיפול
 * בכמה איותים שנמצאו בפועל (Accouting, Maintence וכו').
 * קטגוריות שלא מופיעות כאן נופלות אוטומטית ל-"other".
 */
const PNL_CATEGORY: Record<string, keyof PnLBreakdown> = {
  // עברית (נתוני דמו)
  "שכר עבודה": "salary",
  "חשמל": "electricity",
  "חימום": "heating",
  "מים": "water",
  "מצרכים": "groceries",
  "דלק ורכב": "fuel",
  "אינטרנט": "internet",
  "מיסים": "tax",
  "תחזוקה": "maintenance",
  "הנהלת חשבונות": "accounting",
  "אחר": "other",
  // אנגלית (הקובץ האמיתי)
  "Salary": "salary",
  "Electricity bill": "electricity",
  "Heating": "heating",
  "Water bill": "water",
  "Groceries": "groceries",
  "Fuel": "fuel",
  "Internet": "internet",
  "Taxes": "tax",
  "Maintence": "maintenance", // איות כפי שמופיע בקובץ
  "Maintenance": "maintenance",
  "Accouting": "accounting", // איות כפי שמופיע בקובץ
  "Accounting": "accounting",
  "Gas bill": "gas",
  "Garbage bill": "garbage",
  "Other": "other",
};

export interface PnLBreakdown {
  grossBooking: number;
  grossAirbnb: number;
  grossWalkIn: number;
  grossTotal: number;
  extraIncome: number;
  revenueTotalGross: number; // E + F
  salary: number;
  electricity: number;
  heating: number;
  water: number;
  groceries: number;
  fuel: number;
  internet: number;
  tax: number;
  maintenance: number;
  commission: number;
  accounting: number;
  gas: number;
  garbage: number;
  other: number;
  expensesTotal: number;
  netProfit: number;
  margin: number;
}

/**
 * מסווג שם פלטפורמה לקבוצה (Booking / Airbnb / אורח מזדמן), בצורה גמישה
 * (case-insensitive, substring) — כך שגם "Booking.com" וגם "Booking" (כפי
 * שמופיע בקובץ האמיתי), וגם "Airbnb" ו-"AirBNB", מזוהים נכון.
 */
function classifyPlatform(platform: string): "booking" | "airbnb" | "walkin" {
  const p = (platform || "").trim().toLowerCase();
  if (p.includes("booking")) return "booking";
  if (p.includes("airbnb") || p.includes("air bnb")) return "airbnb";
  return "walkin";
}

/** בונה פירוק P&L לנכס בודד מתוך גיליונות המקור */
export function buildPnL(data: DataSet, propertyId: string, f: Filters): PnLBreakdown {
  const d = filterDataSet(data, { ...f, propertyId, country: "all" });
  const b: PnLBreakdown = {
    grossBooking: 0, grossAirbnb: 0, grossWalkIn: 0, grossTotal: 0,
    extraIncome: 0, revenueTotalGross: 0, salary: 0, electricity: 0, heating: 0,
    water: 0, groceries: 0, fuel: 0, internet: 0, tax: 0, maintenance: 0,
    commission: 0, accounting: 0, gas: 0, garbage: 0, other: 0,
    expensesTotal: 0, netProfit: 0, margin: 0,
  };
  for (const o of d.occupation) {
    const cls = classifyPlatform(o.platform);
    if (cls === "booking") b.grossBooking += o.totalPrice;
    else if (cls === "airbnb") b.grossAirbnb += o.totalPrice;
    else b.grossWalkIn += o.totalPrice;
    b.commission += o.commission;
  }
  b.grossTotal = b.grossBooking + b.grossAirbnb + b.grossWalkIn;
  b.extraIncome = additionalIncome(d);
  b.revenueTotalGross = b.grossTotal + b.extraIncome;

  // תצוגת מספרים על האובייקט כדי לאפשר אינדוקס דינמי בבטחה
  const bn = b as unknown as Record<string, number>;
  for (const e of d.expenses) {
    const cat = PNL_CATEGORY[e.expensesType] ?? "other";
    bn[cat] += e.fullAmount; // כל ההוצאות במלואן, ללא קשר לסטטוס תשלום
  }
  // תחזוקה מגיליון Maintence מצטרפת לשורת התחזוקה
  b.maintenance += maintenanceCost(d);

  b.expensesTotal =
    b.salary + b.electricity + b.heating + b.water + b.groceries + b.fuel +
    b.internet + b.tax + b.maintenance + b.commission + b.accounting +
    b.gas + b.garbage + b.other;

  // רווח נקי ושולי-רווח מחושבים דרך שכבת הרווחיות המרכזית (calcProfit/
  // calcProfitMargin) — לא באופן עצמאי — כדי שהם יהיו זהים במתמטיקה (ולא רק
  // בערך המספרי) לכל מקום אחר באפליקציה שמציג רווח/שולי-רווח לאותו נכס/פילטר.
  // (b.revenueTotalGross/b.expensesTotal לעיל שווים אלגברית ל-calcRevenue/
  // calcExpenses — הפירוק לפי קטגוריה נשמר כאן רק לצורך טבלת ה-P&L המפורטת.)
  b.netProfit = calcProfit(d);
  b.margin = calcProfitMargin(d);
  return b;
}

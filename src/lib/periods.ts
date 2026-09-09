// =================================================================
//  שכבת "תקופות להשוואה" (Period Comparison)
//  -----------------------------------------------------------------
//  אחראית אך ורק על חישוב טווחי תאריכים (נוכחי + קודם) לכל אחד ממצבי
//  ההשוואה (שבוע/חודש/רבעון/שנה/7 ימים/30 יום/מתחילת החודש/מתחילת השנה/
//  טווח מותאם אישית). לא נוגעת בסינון הנתונים עצמו — הסינון לפי טווח
//  התאריכים המחושב כאן מתבצע דרך filterDataSetByRange (ב-calculations.ts),
//  שמשתמשת באותם שדות תאריך בדיוק כמו שאר האפליקציה (Check-in, BillingDate
//  וכו'). כך אין כאן כפילות של כללי שיוך-תאריך — רק כפילות של "אילו שני
//  טווחי ימים משווים".
//
//  כלל-העל שמיושם בכל מצב: לעולם לא משווים תקופה חלקית (שטרם הסתיימה) מול
//  תקופה מלאה. אם התקופה הנוכחית עדיין באמצע (כוללת את "היום"), שתי
//  התקופות (נוכחית וקודמת) נחתכות לאותו מספר ימים בדיוק, החל מתחילתן.
// =================================================================

import { DateRange } from "./calculations";
import { fmtDate } from "./format";

const DAY_MS = 86400000;

// ----------------------- בסיס תאריכים (UTC) -----------------------

function utcMidnight(y: number, m0: number, d: number): Date {
  return new Date(Date.UTC(y, m0, d, 0, 0, 0, 0));
}
function utcEndOfDay(y: number, m0: number, d: number): Date {
  return new Date(Date.UTC(y, m0, d, 23, 59, 59, 999));
}
function dateOnly(d: Date): Date {
  return utcMidnight(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
export function addDays(d: Date, n: number): Date {
  return new Date(dateOnly(d).getTime() + n * DAY_MS);
}
function addMonthsUTC(y: number, m0: number, n: number): { y: number; m0: number } {
  const total = y * 12 + m0 + n;
  return { y: Math.floor(total / 12), m0: ((total % 12) + 12) % 12 };
}
function daysInMonth(y: number, m0: number): number {
  return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
}
function fullDayRange(start: Date, end: Date): DateRange {
  const s = dateOnly(start);
  const e = dateOnly(end);
  return { start: utcMidnight(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()), end: utcEndOfDay(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()) };
}

/** מספר הימים בטווח (כולל שני הקצוות) */
export function daysInRange(r: DateRange): number {
  return Math.round((dateOnly(r.end).getTime() - dateOnly(r.start).getTime()) / DAY_MS) + 1;
}

/** טווח באורך נתון (ימים), החל מ-start */
function rangeOfLength(start: Date, days: number): DateRange {
  const s = dateOnly(start);
  const e = addDays(s, Math.max(1, days) - 1);
  return fullDayRange(s, e);
}

/** הטווח הקודם, מיד לפני תחילת r, באותו אורך בדיוק */
export function previousEqualLengthRange(r: DateRange): DateRange {
  const len = daysInRange(r);
  const prevEnd = addDays(r.start, -1);
  return rangeOfLength(addDays(prevEnd, -(len - 1)), len);
}

/** חותך טווח כך שלא יעבור את "היום" (לתקופות שעדיין באמצע) */
function clampToToday(r: DateRange, today: Date): { range: DateRange; clamped: boolean } {
  const t = dateOnly(today);
  if (dateOnly(r.end).getTime() > t.getTime()) {
    return { range: fullDayRange(r.start, t), clamped: true };
  }
  return { range: r, clamped: false };
}

// ----------------------- טווחי יסוד (שבוע/חודש/רבעון/שנה) -----------------------

/** יום ראשון של השבוע (א'-ש') שמכיל את d */
function sundayOf(d: Date): Date {
  const dow = dateOnly(d).getUTCDay(); // 0 = ראשון
  return addDays(d, -dow);
}

export function getWeekRange(anchor: Date): DateRange {
  const sun = sundayOf(anchor);
  return fullDayRange(sun, addDays(sun, 6));
}

export function getMonthRange(year: number, month1: number): DateRange {
  const start = utcMidnight(year, month1 - 1, 1);
  return fullDayRange(start, utcMidnight(year, month1 - 1, daysInMonth(year, month1 - 1)));
}

export function getQuarterRange(year: number, quarter: 1 | 2 | 3 | 4): DateRange {
  const startMonth = (quarter - 1) * 3 + 1;
  return fullDayRange(getMonthRange(year, startMonth).start, getMonthRange(year, startMonth + 2).end);
}

export function getYearRange(year: number): DateRange {
  return fullDayRange(utcMidnight(year, 0, 1), utcMidnight(year, 11, 31));
}

export function quarterOf(month1: number): 1 | 2 | 3 | 4 {
  return (Math.floor((month1 - 1) / 3) + 1) as 1 | 2 | 3 | 4;
}

// ----------------------- תוצאת השוואה -----------------------

export type ComparisonMode = "wow" | "mom" | "qoq" | "yoy" | "last7" | "last30" | "mtd" | "ytd" | "custom";

export interface PeriodPair {
  current: DateRange;
  previous: DateRange;
  currentLabel: string;
  previousLabel: string;
  /** true אם התקופה הנוכחית נחתכה (כי היא עדיין באמצע) כדי להשוות אורכים שווים */
  note?: string;
}

function label(r: DateRange): string {
  const a = fmtDate(r.start.toISOString());
  const b = fmtDate(r.end.toISOString());
  return a === b ? a : `${a} – ${b}`;
}

/** משווה שני טווחים "נומינליים" (מלאים), וחותך את שניהם לאותו אורך אם הנוכחי טרם הסתיים */
function pairFromNominal(currentNominal: DateRange, previousNominal: DateRange, today: Date): PeriodPair {
  const { range: current, clamped } = clampToToday(currentNominal, today);
  let previous = previousNominal;
  let note: string | undefined;
  if (clamped) {
    const len = daysInRange(current);
    previous = rangeOfLength(previousNominal.start, len);
    note = `התקופה טרם הסתיימה (עד ${fmtDate(today.toISOString())}) — הושוו ${len} הימים הראשונים בשתי התקופות (במקום ${label(currentNominal)} המלא), לשם השוואה הוגנת.`;
  } else {
    // גם אם הנוכחית מלאה, ייתכן שהקודמת קצרה ממנה (למשל ינואר מול פברואר) —
    // לא חותכים במקרה הזה: זו השוואת "חודש מלא מול חודש מלא" הרגילה (סוג 2),
    // לא תקופה חלקית. הפרשי אורך חודשים הם התנהגות סטנדרטית ומצופה כאן.
  }
  return { current, previous, currentLabel: label(current), previousLabel: label(previous), note };
}

// ----------------------- מצבי השוואה -----------------------

export function weekOverWeek(today: Date, anchor: Date = today): PeriodPair {
  const current = getWeekRange(anchor);
  const previous = getWeekRange(addDays(anchor, -7));
  return pairFromNominal(current, previous, today);
}

/** חודש מול חודש. ברירת מחדל: החודש הנוכחי. ניתן לבחור year/month1 היסטוריים. */
export function monthOverMonth(today: Date, year?: number, month1?: number): PeriodPair {
  const t = dateOnly(today);
  const y = year ?? t.getUTCFullYear();
  const m = month1 ?? t.getUTCMonth() + 1;
  const current = getMonthRange(y, m);
  const prev = addMonthsUTC(y, m - 1, -1);
  const previous = getMonthRange(prev.y, prev.m0 + 1);
  return pairFromNominal(current, previous, today);
}

export function quarterOverQuarter(today: Date, year?: number, quarter?: 1 | 2 | 3 | 4): PeriodPair {
  const t = dateOnly(today);
  const y = year ?? t.getUTCFullYear();
  const q = quarter ?? quarterOf(t.getUTCMonth() + 1);
  const current = getQuarterRange(y, q);
  const prevQ = q === 1 ? 4 : ((q - 1) as 1 | 2 | 3 | 4);
  const prevY = q === 1 ? y - 1 : y;
  const previous = getQuarterRange(prevY, prevQ);
  return pairFromNominal(current, previous, today);
}

/** שנה מול שנה — כל השנה, או חודש ספציפי מול אותו חודש בשנה הקודמת */
export function yearOverYear(today: Date, year?: number, month1?: number): PeriodPair {
  const t = dateOnly(today);
  const y = year ?? t.getUTCFullYear();
  if (month1) {
    const current = getMonthRange(y, month1);
    const previous = getMonthRange(y - 1, month1);
    return pairFromNominal(current, previous, today);
  }
  const current = getYearRange(y);
  const previous = getYearRange(y - 1);
  return pairFromNominal(current, previous, today);
}

export function last7Days(today: Date): PeriodPair {
  const current = rangeOfLength(addDays(today, -6), 7);
  const previous = previousEqualLengthRange(current);
  return { current, previous, currentLabel: label(current), previousLabel: label(previous) };
}

export function last30Days(today: Date): PeriodPair {
  const current = rangeOfLength(addDays(today, -29), 30);
  const previous = previousEqualLengthRange(current);
  return { current, previous, currentLabel: label(current), previousLabel: label(previous) };
}

/** מתחילת החודש עד היום, מול אותו מספר ימים מתחילת החודש הקודם */
export function monthToDate(today: Date): PeriodPair {
  const t = dateOnly(today);
  const current = fullDayRange(utcMidnight(t.getUTCFullYear(), t.getUTCMonth(), 1), t);
  const elapsed = daysInRange(current);
  const prev = addMonthsUTC(t.getUTCFullYear(), t.getUTCMonth(), -1);
  const prevDays = daysInMonth(prev.y, prev.m0);
  const len = Math.min(elapsed, prevDays);
  const previous = rangeOfLength(utcMidnight(prev.y, prev.m0, 1), len);
  const currentEq = len < elapsed ? rangeOfLength(current.start, len) : current;
  const note =
    len < elapsed
      ? `החודש הקודם קצר יותר (${prevDays} ימים) — ההשוואה מוגבלת ל-${len} הימים הראשונים בשני החודשים.`
      : undefined;
  return { current: currentEq, previous, currentLabel: label(current), previousLabel: label(previous), note };
}

/** מתחילת השנה עד היום, מול אותה תקופה בשנה הקודמת (29 בפברואר -> 28 בפברואר בשנה לא מעוברת) */
export function yearToDate(today: Date): PeriodPair {
  const t = dateOnly(today);
  const current = fullDayRange(utcMidnight(t.getUTCFullYear(), 0, 1), t);
  const py = t.getUTCFullYear() - 1;
  let prevEndDay = t.getUTCDate();
  const prevMonthDays = daysInMonth(py, t.getUTCMonth());
  if (prevEndDay > prevMonthDays) prevEndDay = prevMonthDays; // 29 בפברואר בשנה מעוברת -> 28 בשנה רגילה
  const previous = fullDayRange(utcMidnight(py, 0, 1), utcMidnight(py, t.getUTCMonth(), prevEndDay));
  return { current, previous, currentLabel: label(current), previousLabel: label(previous) };
}

/** טווח מותאם אישית — הקודם מחושב אוטומטית כטווח שווה-אורך שמסתיים יום לפני תחילת הנוכחי */
export function customPeriod(start: Date, end: Date): PeriodPair {
  const current = fullDayRange(start, end);
  const previous = previousEqualLengthRange(current);
  return { current, previous, currentLabel: label(current), previousLabel: label(previous) };
}

export function getPeriodPair(
  mode: ComparisonMode,
  today: Date,
  opts?: { year?: number; month1?: number; quarter?: 1 | 2 | 3 | 4; customStart?: Date; customEnd?: Date }
): PeriodPair {
  switch (mode) {
    case "wow":
      return weekOverWeek(today);
    case "mom":
      return monthOverMonth(today, opts?.year, opts?.month1);
    case "qoq":
      return quarterOverQuarter(today, opts?.year, opts?.quarter);
    case "yoy":
      return yearOverYear(today, opts?.year, opts?.month1);
    case "last7":
      return last7Days(today);
    case "last30":
      return last30Days(today);
    case "mtd":
      return monthToDate(today);
    case "ytd":
      return yearToDate(today);
    case "custom":
      if (opts?.customStart && opts?.customEnd) return customPeriod(opts.customStart, opts.customEnd);
      return last7Days(today);
  }
}

// ----------------------- שינוי אחוזי -----------------------

export interface ChangeResult {
  current: number;
  previous: number;
  diff: number; // הפרש מוחלט
  pct: number | null; // אחוז שינוי; null = לא ניתן לחישוב (previous=0, current!=0)
}

/** שינוי אחוזי בין תקופה נוכחית לקודמת — לעולם לא Infinity/NaN. null = "לא רלוונטי" (previous=0) */
export function calcChange(current: number, previous: number): ChangeResult {
  const diff = current - previous;
  let pct: number | null;
  if (previous === 0) {
    pct = current === 0 ? 0 : null; // 0 מול 0 = 0% שינוי; מספר כלשהו מול 0 = לא ניתן לחישוב אחוז
  } else {
    pct = diff / Math.abs(previous);
  }
  if (pct !== null && !isFinite(pct)) pct = null;
  return { current, previous, diff, pct };
}

/**
 * האם עלייה במדד הזה נחשבת "טובה"? (לצורך צביעה/כיוון). false = ירידה טובה
 * (כמו הוצאות). לא כל עלייה היא חיובית ולא כל ירידה שלילית.
 */
export type KpiPolarity = "up-good" | "down-good" | "neutral";

export const KPI_POLARITY: Record<string, KpiPolarity> = {
  revenue: "up-good",
  expenses: "down-good",
  profit: "up-good",
  margin: "up-good",
  bookings: "up-good",
  occupiedNights: "up-good",
  occupancy: "up-good",
  avgLOS: "neutral",
  avgRevenuePerBooking: "up-good",
  adr: "up-good",
  revpar: "up-good",
};

/** true = שינוי חיובי (ירוק), false = שלילי (אדום), null = ניטרלי/לא רלוונטי */
export function isGoodChange(pct: number | null, polarity: KpiPolarity): boolean | null {
  if (pct === null || polarity === "neutral") return null;
  if (pct === 0) return null;
  return polarity === "up-good" ? pct > 0 : pct < 0;
}

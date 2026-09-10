// =================================================================
//  שכבת יעדים (Targets) — לוגיקת חיפוש/צבירה של יעדים חודשיים
//  -----------------------------------------------------------------
//  קוראת אך ורק מ-src/data/targets.ts (תצורה קבועה). לא נוגעת בנתוני
//  ה-Excel שהועלה ולא בחישובי ה"בפועל" — אלה ממשיכים לבוא אך ורק
//  מ-src/lib/calculations.ts (calcRevenue/calcExpenses/calcProfit/
//  calcProfitMargin), אותה שכבה שמזינה גם את הדשבורד הראשי ו-P&L.
// =================================================================

import { MONTHLY_TARGETS, MonthlyTarget } from "../data/targets";
import { KpiPolarity } from "./periods";

/** מזהי הנכסים שיש להם יעד מוגדר לשנה נתונה (בלבד — לא כל הנכסים במערכת) */
export function targetedPropertyIds(year: string): string[] {
  return Object.keys(MONTHLY_TARGETS[year] ?? {});
}

/** כל השנים שיש עבורן תצורת יעדים (כרגע: 2026 בלבד) */
export function availableTargetYears(): string[] {
  return Object.keys(MONTHLY_TARGETS).sort();
}

/** יעד חודשי גולמי לנכס ספציפי. null אם אין יעד מוגדר — לעולם לא ממציאים יעד. */
export function getPropertyTarget(year: string, propertyId: string): MonthlyTarget | null {
  return MONTHLY_TARGETS[year]?.[propertyId] ?? null;
}

/**
 * יעד משולב ("כל הנכסים") — סכימה של הנכסים בעלי יעד מוגדר לשנה הזו,
 * לא ממוצע. שולי הרווח המשולבים = סך הרווח המשולב / סך ההכנסה המשולבת
 * (לא ממוצע האחוזים של כל נכס).
 */
export function getCombinedTarget(year: string): MonthlyTarget | null {
  const ids = targetedPropertyIds(year);
  if (ids.length === 0) return null;
  let revenue = 0;
  let expenses = 0;
  let profit = 0;
  for (const id of ids) {
    const t = MONTHLY_TARGETS[year][id];
    revenue += t.revenue;
    expenses += t.expenses;
    profit += t.profit;
  }
  return { revenue, expenses, profit, margin: revenue === 0 ? 0 : profit / revenue };
}

/**
 * יעד עבור הבחירה הנוכחית בעמוד "יעדים חודשיים" — נכס ספציפי או "all"
 * (מוגבל לנכסים בעלי יעד מוגדר, ראו targetedPropertyIds), מוכפל במספר
 * החודשים שנבחרו (1 לחודש בודד, 12 ל"הכל"). הכנסה/הוצאה/רווח מוכפלים
 * במספר החודשים; שולי הרווח תמיד מחושבים מחדש כ-רווח/הכנסה (לא מוכפלים
 * ב-12). מחזיר null אם אין יעד מוגדר (נכס לא ברשימה, או שנה ללא תצורה).
 */
export function getTargetForSelection(year: string, propertyId: string, monthCount: number): MonthlyTarget | null {
  const base = propertyId === "all" ? getCombinedTarget(year) : getPropertyTarget(year, propertyId);
  if (!base) return null;
  const revenue = base.revenue * monthCount;
  const expenses = base.expenses * monthCount;
  const profit = base.profit * monthCount;
  return { revenue, expenses, profit, margin: revenue === 0 ? 0 : profit / revenue };
}

// ----------------------- השוואה בפועל-מול-יעד -----------------------

export interface TargetComparison {
  actual: number;
  target: number;
  diff: number; // actual - target
  /** actual/target*100. null = לא ניתן לחישוב (target=0) — לעולם לא Infinity/NaN */
  achievementPct: number | null;
}

/** משווה ערך בפועל מול יעד. בטוח מחלוקה באפס (target=0 -> achievementPct=null) */
export function compareToTarget(actual: number, target: number): TargetComparison {
  const diff = actual - target;
  let achievementPct: number | null = target === 0 ? null : (actual / target) * 100;
  if (achievementPct !== null && !isFinite(achievementPct)) achievementPct = null;
  return { actual, target, diff, achievementPct };
}

/**
 * האם היעד "הושג" (לצביעה ירוק/אדום)? לפי הקוטביות של המדד — הכנסה/רווח/
 * שולי-רווח: עמידה = actual >= target. הוצאות: עמידה (הפוך) = actual <= target.
 */
export function isTargetMet(diff: number, polarity: KpiPolarity): boolean {
  return polarity === "down-good" ? diff <= 0 : diff >= 0;
}

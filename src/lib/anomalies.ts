// =================================================================
//  זיהוי חריגות ובעיות בנתונים (Anomaly Detection)
//  -----------------------------------------------------------------
//  ⚠️ חשוב: המודול הזה רק *מזהה ומציג* בעיות בנתונים.
//      הוא לעולם לא מתקן, משלים או משנה נתונים.
//      כשמתגלה ערך חסר/חריג — מוצגת התראה כדי שתבדוק ידנית.
// =================================================================

import { DataSet } from "../data/types";
import {
  Filters,
  filterDataSet,
  monthlySeries,
  propertySummaries,
} from "./calculations";

export type Severity = "high" | "medium" | "low";

export interface Anomaly {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  detail: string;
  propertyId?: string;
}

const sevRank: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

export function detectAnomalies(data: DataSet, f: Filters): Anomaly[] {
  const d = filterDataSet(data, f);
  const out: Anomaly[] = [];
  let n = 0;
  const add = (a: Omit<Anomaly, "id">) => out.push({ id: `a${n++}`, ...a });

  // 1) נכסים בהפסד
  for (const s of propertySummaries(data, f)) {
    if (s.netProfit < 0) {
      add({
        severity: "high",
        category: "רווחיות",
        title: `הנכס ${s.propertyName} בהפסד`,
        detail: `רווח נקי שלילי בתקופה הנבחרת (${Math.round(s.netProfit).toLocaleString("he-IL")} €).`,
        propertyId: s.propertyId,
      });
    } else if (s.margin < 0.05) {
      add({
        severity: "medium",
        category: "רווחיות",
        title: `שולי רווח נמוכים — ${s.propertyName}`,
        detail: `שולי הרווח נמוכים מ-5% (${(s.margin * 100).toFixed(1)}%).`,
        propertyId: s.propertyId,
      });
    }
  }

  // 2) הוצאות חודשיות חריגות (גבוה מ-1.5× מהממוצע)
  const series = monthlySeries(d);
  if (series.length >= 2) {
    const avgExp = series.reduce((a, b) => a + b.expenses, 0) / series.length;
    for (const p of series) {
      if (avgExp > 0 && p.expenses > avgExp * 1.5) {
        add({
          severity: "medium",
          category: "הוצאות",
          title: `הוצאות גבוהות מהרגיל בחודש ${p.month}`,
          detail: `ההוצאות (${Math.round(p.expenses).toLocaleString("he-IL")} €) גבוהות ב-50%+ מהממוצע החודשי.`,
        });
      }
      // 3) הכנסות נמוכות מהרגיל
      const avgRev = series.reduce((a, b) => a + b.revenue, 0) / series.length;
      if (avgRev > 0 && p.revenue < avgRev * 0.5) {
        add({
          severity: "medium",
          category: "הכנסות",
          title: `הכנסות נמוכות מהרגיל בחודש ${p.month}`,
          detail: `ההכנסות (${Math.round(p.revenue).toLocaleString("he-IL")} €) נמוכות ב-50%+ מהממוצע החודשי.`,
        });
      }
    }
  }

  // 4) הזמנות ללא פלטפורמה
  const noPlatform = d.occupation.filter((o) => !o.platform).length;
  if (noPlatform > 0) {
    add({
      severity: "low",
      category: "נתונים חסרים",
      title: "הזמנות ללא פלטפורמה",
      detail: `${noPlatform} הזמנות ללא ערך בעמודת Platform.`,
    });
  }

  // 5) הזמנות ללא מחיר / לילות
  const badOcc = d.occupation.filter((o) => o.totalPrice <= 0 || o.nights <= 0).length;
  if (badOcc > 0) {
    add({
      severity: "medium",
      category: "נתונים חסרים",
      title: "הזמנות ללא מחיר או ללא לילות",
      detail: `${badOcc} הזמנות עם TotalPrice=0 או Nights=0 — כדאי לבדוק.`,
    });
  }

  // 6) הוצאות ללא קטגוריה
  const noCat = d.expenses.filter((e) => !e.expensesType).length;
  if (noCat > 0) {
    add({
      severity: "low",
      category: "נתונים חסרים",
      title: "הוצאות ללא קטגוריה",
      detail: `${noCat} שורות הוצאה ללא ExpensesType.`,
    });
  }

  // 7) הוצאות שלא שולמו במלואן
  const unpaid = d.expenses.filter((e) => e.leftAmount > 0);
  if (unpaid.length > 0) {
    const totalLeft = unpaid.reduce((a, b) => a + b.leftAmount, 0);
    add({
      severity: "medium",
      category: "תשלומים",
      title: "הוצאות שטרם שולמו במלואן",
      detail: `${unpaid.length} חשבוניות עם יתרה לתשלום, סה"כ ${Math.round(totalLeft).toLocaleString("he-IL")} €.`,
    });
  }

  // 8) חדרים ללא סטטוס
  const roomsNoStatus = d.rooms.filter((r) => !r.status).length;
  if (roomsNoStatus > 0) {
    add({
      severity: "low",
      category: "נתונים חסרים",
      title: "חדרים ללא סטטוס",
      detail: `${roomsNoStatus} חדרים ללא ערך בעמודת Status.`,
    });
  }

  // 9) עמלות חריגות — השוואה לאחוז העמלה הצפוי מטבלת Properties
  const commMap = new Map<string, number>(); // propertyId|platform -> pct
  for (const c of data.platformCommissions) {
    commMap.set(`${c.propertyId}|${c.platform}`, c.commissionPct);
  }
  let unusualComm = 0;
  for (const o of d.occupation) {
    if (o.totalPrice <= 0) continue;
    const expected = commMap.get(`${o.propertyId}|${o.platform}`);
    if (expected === undefined) continue;
    const actual = o.commission / o.totalPrice;
    if (Math.abs(actual - expected) > 0.03) unusualComm++; // סטייה מעל 3 נקודות אחוז
  }
  if (unusualComm > 0) {
    add({
      severity: "low",
      category: "עמלות",
      title: "עמלות חריגות מול הצפוי",
      detail: `${unusualComm} הזמנות שבהן אחוז העמלה בפועל חורג מהאחוז שבטבלת העמלות.`,
    });
  }

  return out.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);
}

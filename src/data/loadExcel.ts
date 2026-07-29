// =================================================================
//  שכבת טעינת הנתונים (Data Loading Layer)
//  -----------------------------------------------------------------
//  מודל העבודה: המשתמש מעלה קובץ Excel לאתר, והנתונים מתעדכנים
//  לפיו. בכל העלאה מחדש — הנתונים מתחלפים לחלוטין לפי הקובץ החדש.
//
//  שתי דרכים:
//   1. loadFromMock()         — נתוני דמו (תצוגה ראשונית, עד שמעלים קובץ)
//   2. loadFromArrayBuffer()  — פירוק קובץ ה-Excel שהמשתמש העלה
//
//  שתיהן מחזירות אותו DataSet מנורמל. הקובץ נקרא בלבד — לעולם לא
//  נכתב/משתנה.
// =================================================================

import * as XLSX from "xlsx";
import { DataSet } from "./types";
import { buildMockDataSet } from "./mockData";
import {
  normalizeProperties,
  normalizePlatformCommissions,
  normalizeRooms,
  normalizeOccupation,
  normalizeExtras,
  normalizeMaintenance,
  normalizeExpenses,
  normalizeOneTimeExpenses,
  canon,
} from "./normalize";

/** מצב 1 — נתוני דמו */
export function loadFromMock(): DataSet {
  return buildMockDataSet();
}

/**
 * מצב 2 — פירוק חוברת Excel מתוך ArrayBuffer.
 * משמש גם להעלאה ידנית (Upload) וגם לתשובת Backend.
 * כאן מטופלת גם הבעיה ששתי טבלאות יושבות בגיליון Properties
 * (עמודות A-C ו-E-H), על ידי קריאה לפי טווחי עמודות.
 */
export function loadFromArrayBuffer(buffer: ArrayBuffer): DataSet {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });

  // אינדוקס גיליונות בצורה גמישה (case-insensitive, ללא רווחים)
  const sheetByCanon = new Map<string, XLSX.WorkSheet>();
  for (const name of wb.SheetNames) {
    sheetByCanon.set(canon(name), wb.Sheets[name]);
  }
  const getSheet = (...aliases: string[]): XLSX.WorkSheet | null => {
    for (const a of aliases) {
      const ws = sheetByCanon.get(canon(a));
      if (ws) return ws;
    }
    return null;
  };
  const rowsOf = (ws: XLSX.WorkSheet | null): Record<string, unknown>[] =>
    ws ? (XLSX.utils.sheet_to_json(ws, { defval: "", raw: false, dateNF: "yyyy-mm-dd" }) as Record<string, unknown>[]) : [];

  /**
   * קורא טבלה מטווח עמודות נתון, ומזהה אוטומטית את שורת הכותרות האמיתית —
   * גם אם יש מעליה שורת כותרת-על ממוזגת (למשל "Commission Rates" מעל
   * Key/PropertyID/Platform/Commission %). מחפש את השורה הראשונה שמכילה
   * אחד מה-headerHints, ומשתמש בה ככותרות.
   */
  function readTableAutoHeader(
    ws: XLSX.WorkSheet,
    colStart: number,
    colEnd: number,
    rowStart: number,
    rowEnd: number,
    headerHints: string[]
  ): Record<string, unknown>[] {
    const range = { s: { r: rowStart, c: colStart }, e: { r: rowEnd, c: colEnd } };
    const aoa = XLSX.utils.sheet_to_json(ws, {
      range: XLSX.utils.encode_range(range),
      header: 1,
      raw: false,
      defval: "",
    }) as unknown[][];
    const hints = headerHints.map(canon);
    let headerRowIdx = 0;
    for (let i = 0; i < aoa.length; i++) {
      const rowCanon = (aoa[i] ?? []).map((v) => canon(String(v ?? "")));
      if (hints.some((h) => rowCanon.includes(h))) {
        headerRowIdx = i;
        break;
      }
    }
    const headers = (aoa[headerRowIdx] ?? []).map((v) => String(v ?? "").trim());
    return aoa
      .slice(headerRowIdx + 1)
      .map((row) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, idx) => {
          if (h) obj[h] = row[idx] ?? "";
        });
        return obj;
      })
      .filter((r) => Object.values(r).some((v) => v !== "" && v !== undefined));
  }

  // --- גיליון Properties: שתי טבלאות בתוך אותו גיליון ---
  // טבלה ראשונה: עמודות A-C. טבלה שנייה: עמודות E-H (לעיתים עם שורת
  // כותרת-על "Commission Rates" מעל שורת הכותרות האמיתית — מזוהה אוטומטית).
  const propsWs = getSheet("Properties");
  let propsRows: Record<string, unknown>[] = [];
  let commRows: Record<string, unknown>[] = [];
  if (propsWs) {
    const ref = propsWs["!ref"] || "A1";
    const range = XLSX.utils.decode_range(ref);
    // טבלה 1 — עמודות A..C
    const r1 = { s: { r: range.s.r, c: 0 }, e: { r: range.e.r, c: 2 } };
    propsRows = XLSX.utils.sheet_to_json(propsWs, {
      range: XLSX.utils.encode_range(r1),
      defval: "",
      raw: false,
    }) as Record<string, unknown>[];
    // טבלה 2 — עמודות E..H (אינדקסים 4..7), עם זיהוי כותרות אוטומטי
    commRows = readTableAutoHeader(propsWs, 4, 7, range.s.r, range.e.r, ["Key", "PropertyID"]);
  }

  const data: DataSet = {
    properties: normalizeProperties(propsRows),
    platformCommissions: normalizePlatformCommissions(commRows),
    rooms: normalizeRooms(rowsOf(getSheet("Rooms"))),
    occupation: normalizeOccupation(rowsOf(getSheet("occupation", "Occupation"))),
    extras: normalizeExtras(rowsOf(getSheet("Extras"))),
    // טיפול בשגיאת הכתיב Maintence
    maintenance: normalizeMaintenance(rowsOf(getSheet("Maintence", "Maintenance"))),
    expenses: normalizeExpenses(rowsOf(getSheet("Expenses"))),
    // גיליון נפרד "One-time expenses" — אותו מבנה, נשאר נפרד לגמרי מ-Expenses
    oneTimeExpenses: normalizeOneTimeExpenses(
      rowsOf(getSheet("One-time expenses", "One Time Expenses", "OneTimeExpenses"))
    ),
    profitAndLoss: [],
  };
  return data;
}
/**
 * עזר — קריאת קובץ File (מ-input/גרירה) והמרתו ל-DataSet.
 */
export async function loadFromFileObject(file: File): Promise<DataSet> {
  const buf = await file.arrayBuffer();
  return loadFromArrayBuffer(buf);
}

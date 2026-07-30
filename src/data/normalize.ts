// =============================================================
//  שכבת נורמליזציה (Normalization Layer)
//  -------------------------------------------------------------
//  קובץ ה-Excel מכיל שמות גיליונות ועמודות עם שגיאות כתיב
//  ולא עקביים. כאן ממירים את השורות הגולמיות (raw rows) שמגיעות
//  מ-SheetJS למבנה הנקי שמוגדר ב-types.ts, תוך טיפול בשגיאות
//  הכתיב הידועות:
//    ProperyName   במקום PropertyName
//    Commision %   במקום Commission %
//    Maintence     במקום Maintenance
//    InvocieDate   במקום InvoiceDate
//    dashbords     במקום dashboards
//    occupation    באותיות קטנות
//
//  הגישה: לא מסתמכים על שם עמודה אחד בלבד. לכל שדה יש רשימת
//  שמות אפשריים (aliases) ולוקחים את הראשון שקיים בשורה.
// =============================================================

import {
  DataSet,
  Expense,
  Extra,
  Maintenance,
  Occupation,
  PlatformCommission,
  Property,
  Room,
} from "./types";

type RawRow = Record<string, unknown>;

/** מנרמל מפתח עמודה: אותיות קטנות, ללא רווחים/סימנים, לצורך התאמה גמישה */
function canon(key: string): string {
  return key
    .toString()
    .toLowerCase()
    .replace(/[\s_%.\-#]/g, "")
    .trim();
}

/** בונה מפה {מפתח מנורמל -> ערך} משורה גולמית */
function indexRow(row: RawRow): Map<string, unknown> {
  const map = new Map<string, unknown>();
  for (const k of Object.keys(row)) {
    map.set(canon(k), row[k]);
  }
  return map;
}

/** מחזיר ערך לפי רשימת שמות אפשריים (כולל שגיאות כתיב) */
function pick(idx: Map<string, unknown>, ...aliases: string[]): unknown {
  for (const a of aliases) {
    const c = canon(a);
    if (idx.has(c)) {
      const v = idx.get(c);
      if (v !== undefined && v !== null && v !== "") return v;
    }
  }
  return undefined;
}

function toStr(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

/** ממיר למספר בבטחה. תומך גם במחרוזות עם פסיקים/מטבע. מחזיר 0 אם ריק */
export function toNum(v: unknown): number {
  if (v === undefined || v === null || v === "") return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const cleaned = String(v).replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/** ממיר מספר/מחרוזת שעלול להיות null */
function toNumOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  return toNum(v);
}

/** ממיר אחוז: 15 -> 0.15, "15%" -> 0.15, 0.15 -> 0.15 */
function toPct(v: unknown): number {
  const n = toNum(v);
  return n > 1 ? n / 100 : n;
}

/**
 * ממיר ערך תאריך (כולל serial של Excel) ל-ISO string או null.
 * SheetJS עם {cellDates:true} מחזיר Date; אחרת ייתכן מספר serial.
 */
export function toISODate(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString();
  if (typeof v === "number") {
    // Excel serial date -> JS Date (בסיס 1899-12-30)
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ---------- ממירים לכל גיליון ----------

export function normalizeProperties(rows: RawRow[]): Property[] {
  return rows
    .map((r) => {
      const i = indexRow(r);
      return {
        propertyId: toStr(pick(i, "PropertyID", "Property ID", "ID")),
        // טיפול בשגיאת הכתיב ProperyName
        propertyName: toStr(pick(i, "ProperyName", "PropertyName", "Name")),
        country: toStr(pick(i, "country", "Country")),
      };
    })
    .filter((p) => p.propertyId !== "");
}

export function normalizePlatformCommissions(rows: RawRow[]): PlatformCommission[] {
  return rows
    .map((r) => {
      const i = indexRow(r);
      return {
        key: toStr(pick(i, "Key")),
        propertyId: toStr(pick(i, "PropertyID", "Property ID")),
        platform: toStr(pick(i, "Platform")),
        // טיפול בשגיאת הכתיב "Commision %"
        commissionPct: toPct(pick(i, "Commision %", "Commission %", "Commision", "Commission")),
      };
    })
    .filter((c) => c.propertyId !== "" || c.key !== "");
}

export function normalizeRooms(rows: RawRow[]): Room[] {
  return rows
    .map((r) => {
      const i = indexRow(r);
      return {
        propertyId: toStr(pick(i, "PropertyID")),
        propertyName: toStr(pick(i, "ProperyName", "PropertyName")),
        country: toStr(pick(i, "country", "Country")),
        roomNumber: toNum(pick(i, "RoomNumber", "Room Number", "Room")),
        roomType: toStr(pick(i, "RoomType", "Room Type")),
        maxGuests: toNum(pick(i, "MaxGuests", "Max Guests")),
        status: toStr(pick(i, "Status")),
        notes: toStr(pick(i, "Notes")),
      };
    })
    .filter((r) => r.propertyId !== "");
}

export function normalizeOccupation(rows: RawRow[]): Occupation[] {
  return rows
    .map((r) => {
      const i = indexRow(r);
      return {
        propertyId: toStr(pick(i, "PropertyID")),
        roomNumber: toNum(pick(i, "RoomNumber", "Room Number")),
        status: toStr(pick(i, "Status")),
        checkInDate: toISODate(pick(i, "Check-in Date", "CheckinDate", "Check in Date", "CheckIn")),
        checkOutDate: toISODate(pick(i, "Check-out Date", "CheckoutDate", "Check out Date", "CheckOut")),
        nights: toNum(pick(i, "Nights")),
        guestName: toStr(pick(i, "GuestName", "Guest Name")),
        numberOfGuests: toNum(pick(i, "NumberOfGuests", "Number Of Guests", "Guests")),
        totalPrice: toNum(pick(i, "TotalPrice", "Total Price")),
        totalNetPrice: toNum(pick(i, "TotalNetPrice", "Total Net Price", "NetPrice")),
        platform: toStr(pick(i, "Platform")),
        paidBy: toStr(pick(i, "PaidBy", "Paid By")),
        notes: toStr(pick(i, "Notes")),
        month: toStr(pick(i, "Month")),
        commission: toNum(pick(i, "commission", "Commission")),
      };
    })
    .filter((o) => o.propertyId !== "");
}

export function normalizeExtras(rows: RawRow[]): Extra[] {
  return rows
    .map((r) => {
      const i = indexRow(r);
      return {
        propertyId: toStr(pick(i, "PropertyID")),
        date: toISODate(pick(i, "Date")),
        incomeType: toStr(pick(i, "IncomeType", "Income Type")),
        amount: toNum(pick(i, "Amount")),
        paidBy: toStr(pick(i, "PaidBy", "Paid By")),
        // עמודת Month — קובעת את שיוך החודש (עדיפות על פני Date)
        month: toISODate(pick(i, "Month")) ?? (toStr(pick(i, "Month")) || null),
      };
    })
    .filter((e) => e.propertyId !== "");
}

export function normalizeMaintenance(rows: RawRow[]): Maintenance[] {
  return rows
    .map((r) => {
      const i = indexRow(r);
      return {
        propertyId: toStr(pick(i, "PropertyID")),
        date: toISODate(pick(i, "Date")),
        roomNumber: toNumOrNull(pick(i, "RoomNumber", "Room Number")),
        reportBy: toStr(pick(i, "ReportedBy", "ReportBy", "Report By")),
        amount: toNum(pick(i, "Amount")),
        status: toStr(pick(i, "Status")),
        supervisor: toStr(pick(i, "Supervisor")),
      };
    })
    .filter((m) => m.propertyId !== "");
}

export function normalizeExpenses(rows: RawRow[]): Expense[] {
  return rows
    .map((r) => {
      const i = indexRow(r);
      return {
        propertyId: toStr(pick(i, "PropertyID")),
        // טיפול בשגיאת הכתיב InvocieDate
        invoiceDate: toISODate(pick(i, "InvocieDate", "InvoiceDate", "Invoice Date")),
        expensesType: toStr(pick(i, "ExpensesType", "Expenses Type", "ExpenseType")),
        fullAmount: toNum(pick(i, "FullAmount", "Full Amount")),
        paidAmount: toNum(pick(i, "PaidAmount", "Paid Amount")),
        leftAmount: toNum(pick(i, "LeftAmount", "Left Amount")),
        status: toStr(pick(i, "Status")),
        paidBy: toStr(pick(i, "PaidBy", "Paid By")),
        billingDate: toISODate(pick(i, "BillingDate", "Billing Date")),
        paymentDate: toISODate(pick(i, "PaymentDate", "Payment Date")),
        reportBy: toStr(pick(i, "ReportedBy", "ReportBy", "Report By")),
        confirmBy: toStr(pick(i, "ConfirmedBy", "ConfirmBy", "Confirm By")),
        notes: toStr(pick(i, "Notes")),
        month: toISODate(pick(i, "Month")) ?? toStr(pick(i, "Month")) ?? null,
      };
    })
    .filter((e) => e.propertyId !== "");
}

/**
 * גיליון "One-time expenses" — מבנה זהה לגיליון Expenses, לכן משתמשים
 * באותו נורמליזר. מדובר במאגר נתונים נפרד לחלוטין ב-DataSet.
 */
export function normalizeOneTimeExpenses(rows: RawRow[]): Expense[] {
  return normalizeExpenses(rows);
}

/**
 * מקבל אובייקט של גיליונות גולמיים (key = שם הגיליון, value = מערך שורות)
 * ומחזיר DataSet מנורמל. שמות הגיליונות מזוהים בצורה גמישה.
 */
export function normalizeWorkbook(sheets: Record<string, RawRow[]>): Partial<DataSet> {
  // מיפוי שמות גיליונות בצורה גמישה (case-insensitive, ללא רווחים)
  const byCanon = new Map<string, RawRow[]>();
  for (const name of Object.keys(sheets)) {
    byCanon.set(canon(name), sheets[name]);
  }
  const sheet = (...aliases: string[]): RawRow[] => {
    for (const a of aliases) {
      const c = canon(a);
      if (byCanon.has(c)) return byCanon.get(c) as RawRow[];
    }
    return [];
  };

  return {
    properties: normalizeProperties(sheet("Properties")),
    rooms: normalizeRooms(sheet("Rooms")),
    occupation: normalizeOccupation(sheet("occupation", "Occupation")),
    extras: normalizeExtras(sheet("Extras")),
    // טיפול בשגיאת הכתיב Maintence
    maintenance: normalizeMaintenance(sheet("Maintence", "Maintenance")),
    expenses: normalizeExpenses(sheet("Expenses")),
    oneTimeExpenses: normalizeOneTimeExpenses(sheet("One-time expenses", "One Time Expenses", "OneTimeExpenses")),
  };
}

export { canon };

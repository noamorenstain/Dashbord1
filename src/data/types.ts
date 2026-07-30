// =============================================================
//  שכבת הטיפוסים (Types) — מבנה הנתונים הפנימי של הדאשבורד
//  הטיפוסים האלה הם המבנה ה"נקי" שהאפליקציה עובדת איתו.
//  שמות העמודות בקובץ ה-Excel (כולל שגיאות הכתיב) ממופים
//  למבנה הזה בקובץ normalize.ts.
// =============================================================

/** טבלה ראשונה בגיליון Properties (עמודות A-C) */
export interface Property {
  propertyId: string; // PropertyID
  propertyName: string; // ProperyName (שגיאת כתיב במקור) -> שם הנכס
  country: string; // country
}

/** טבלה שנייה בגיליון Properties (עמודות E-H) — עמלות לפי פלטפורמה */
export interface PlatformCommission {
  key: string; // Key (PropertyID + Platform)
  propertyId: string; // PropertyID
  platform: string; // Platform
  commissionPct: number; // "Commision %" (שגיאת כתיב במקור), אחוז כמספר עשרוני (0.15 = 15%)
}

/** גיליון Rooms — חדר / יחידת אירוח */
export interface Room {
  propertyId: string; // PropertyID
  propertyName: string; // ProperyName
  country: string; // country
  roomNumber: number; // RoomNumber
  roomType: string; // RoomType
  maxGuests: number; // MaxGuests
  status: string; // Status (זמין / לא זמין)
  notes: string; // Notes
}

/** גיליון occupation — הזמנה / שהות אורח */
export interface Occupation {
  propertyId: string; // PropertyID
  roomNumber: number; // RoomNumber
  status: string; // Status (לדוגמה Booked)
  checkInDate: string | null; // Check-in Date (ISO)
  checkOutDate: string | null; // Check-out Date (ISO)
  nights: number; // Nights
  guestName: string; // GuestName
  numberOfGuests: number; // NumberOfGuests
  totalPrice: number; // TotalPrice (מחיר ברוטו)
  totalNetPrice: number; // TotalNetPrice (מחיר נטו)
  platform: string; // Platform
  paidBy: string; // PaidBy
  notes: string; // Notes
  month: string; // Month (טקסט חודש)
  commission: number; // commission (סכום העמלה)
}

/** גיליון Extras — הכנסה נוספת */
export interface Extra {
  propertyId: string; // PropertyID
  date: string | null; // Date (ISO)
  incomeType: string; // IncomeType
  amount: number; // Amount
  paidBy: string; // PaidBy
  month: string | null; // Month — משמש לשיוך לחודש (עדיפות על פני Date)
}

/** גיליון Maintence (שגיאת כתיב במקור) — תחזוקה / תקלה */
export interface Maintenance {
  propertyId: string; // PropertyID
  date: string | null; // Date (ISO)
  roomNumber: number | null; // RoomNumber
  reportBy: string; // ReportedBy (בקובץ בפועל; נתמך גם ReportBy)
  amount: number; // Amount (עלות תיקון)
  status: string; // Status
  supervisor: string; // Supervisor
}

/** גיליון Expenses — הוצאה / חשבונית / תשלום */
export interface Expense {
  propertyId: string; // PropertyID
  invoiceDate: string | null; // InvocieDate (שגיאת כתיב במקור)
  expensesType: string; // ExpensesType
  fullAmount: number; // FullAmount
  paidAmount: number; // PaidAmount
  leftAmount: number; // LeftAmount
  status: string; // Status (סטטוס תשלום)
  paidBy: string; // PaidBy
  billingDate: string | null; // BillingDate
  paymentDate: string | null; // PaymentDate
  reportBy: string; // ReportBy
  confirmBy: string; // ConfirmBy
  notes: string; // Notes
  month: string | null; // Month
}

/**
 * גיליון "One-time expenses" — הוצאות חד-פעמיות.
 * מבנה זהה לחלוטין לגיליון Expenses, אך מדובר במאגר נתונים נפרד
 * לחלוטין (לא מעורב בחישובי ה-Expenses הרגילים / רווח והפסד).
 */
export type OneTimeExpense = Expense;

/** שורה בגיליון P&L (רשות — לשימוש להשוואה/השראה בלבד) */
export interface PnLRow {
  propertyId: string;
  month: string; // A: חודש ושנה
  grossBooking: number; // B
  grossAirbnb: number; // C
  grossWalkIn: number; // D
  grossTotal: number; // E
  extraIncome: number; // F
  revenueTotal: number; // G
  salary: number; // H
  electricity: number; // I
  heating: number; // J
  water: number; // K
  groceries: number; // L
  fuel: number; // M
  internet: number; // N
  tax: number; // O
  maintenance: number; // P
  commission: number; // Q
  accounting: number; // R
  other: number; // S
  expensesTotal: number; // T
  netProfit: number; // U
  margin: number; // V = U / G
}

/** כל מאגר הנתונים של המערכת — מקביל לגיליונות בקובץ ה-Excel */
export interface DataSet {
  properties: Property[];
  platformCommissions: PlatformCommission[];
  rooms: Room[];
  occupation: Occupation[];
  extras: Extra[];
  maintenance: Maintenance[];
  expenses: Expense[];
  oneTimeExpenses: OneTimeExpense[]; // גיליון נפרד "One-time expenses" — לא מעורב בחישובי Expenses
  profitAndLoss: PnLRow[]; // אופציונלי — מגיליונות ה-P&L
}

/** מצב טעינת הנתונים — מוצג ב-Header */
export type DataSource = "mock" | "upload";

export interface DataStatus {
  source: DataSource;
  lastUpdated: Date | null;
  loading: boolean;
  ok: boolean;
  message: string;
}

// =================================================================
//  ███  נתוני דמו בלבד — MOCK DATA  ███
//  -----------------------------------------------------------------
//  ⚠️  כל הנתונים בקובץ הזה הם פיקטיביים ונוצרו לצורך הדגמה בלבד.
//      הם אינם מגיעים מקובץ ה-Excel האמיתי שלך ב-OneDrive.
//      המבנה תואם במדויק לגיליונות שתיארת (Properties, Rooms,
//      occupation, Extras, Maintence, Expenses, One-time expenses).
//
//  להחלפה בנתונים אמיתיים: מעלים קובץ Excel דרך האתר
//      (כפתור "העלאת קובץ Excel" / אזור הגרירה).
//
//  הגנרציה דטרמיניסטית (seed קבוע) כדי שהמספרים יישארו יציבים.
// =================================================================

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

/** דגל גלובלי — מאפשר להציג באנר "נתוני דמו" בכל המסכים */
export const IS_MOCK_DATA = true;

// ----- מחולל מספרים פסאודו-אקראי דטרמיניסטי (mulberry32) -----
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260615);
const pickOne = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => Math.round(min + rand() * (max - min));
const round2 = (n: number) => Math.round(n * 100) / 100;

// ----- הגדרת 4 הנכסים (דמו) -----
const PROPERTIES: Property[] = [
  { propertyId: "BF", propertyName: "Black Forest Hotel", country: "גרמניה" },
  { propertyId: "CH1", propertyName: "Chemnitz Apartments", country: "גרמניה" },
  { propertyId: "TAB1", propertyName: "Helvetia Tabiano", country: "איטליה" },
  { propertyId: "TAV", propertyName: "Tavernola Apartments", country: "איטליה" },
];

const PLATFORMS = ["Booking.com", "Airbnb", "אורח מזדמן"];

// טבלת עמלות (Properties — טבלה שנייה, עמודות E-H)
const PLATFORM_COMMISSIONS: PlatformCommission[] = PROPERTIES.flatMap((p) => [
  { key: `${p.propertyId}-Booking.com`, propertyId: p.propertyId, platform: "Booking.com", commissionPct: 0.15 },
  { key: `${p.propertyId}-Airbnb`, propertyId: p.propertyId, platform: "Airbnb", commissionPct: 0.14 },
  { key: `${p.propertyId}-אורח מזדמן`, propertyId: p.propertyId, platform: "אורח מזדמן", commissionPct: 0 },
]);

// ----- חדרים (Rooms) -----
const ROOM_COUNTS: Record<string, number> = { BF: 8, CH1: 5, TAB1: 6, TAV: 4 };
const ROOM_TYPES = ["סטנדרט", "דה-לוקס", "סוויטה", "סטודיו", "משפחתי"];

const ROOMS: Room[] = PROPERTIES.flatMap((p) => {
  const n = ROOM_COUNTS[p.propertyId];
  return Array.from({ length: n }, (_, idx) => {
    const status = rand() < 0.9 ? "זמין" : "לא זמין";
    return {
      propertyId: p.propertyId,
      propertyName: p.propertyName,
      country: p.country,
      roomNumber: 101 + idx,
      roomType: pickOne(ROOM_TYPES),
      maxGuests: between(2, 5),
      status,
      notes: status === "לא זמין" ? "בשיפוץ" : "",
    } as Room;
  });
});

// ----- תקופת הדמו: ינואר–יוני 2026 -----
const MONTHS = [
  { y: 2026, m: 1, label: "ינואר 2026" },
  { y: 2026, m: 2, label: "פברואר 2026" },
  { y: 2026, m: 3, label: "מרץ 2026" },
  { y: 2026, m: 4, label: "אפריל 2026" },
  { y: 2026, m: 5, label: "מאי 2026" },
  { y: 2026, m: 6, label: "יוני 2026" },
];

const GUEST_NAMES = [
  "Müller", "Rossi", "Schneider", "Bianchi", "Weber", "Ferrari",
  "Fischer", "Romano", "Becker", "Greco", "Hoffmann", "Conti",
];
const PAID_BY = ["כרטיס אשראי", "מזומן", "העברה בנקאית", "PayPal"];

// בסיס מחיר לילה לפי נכס (דמו)
const BASE_NIGHTLY: Record<string, number> = { BF: 140, CH1: 95, TAB1: 120, TAV: 105 };

// ----- הזמנות (occupation) -----
function buildOccupation(): Occupation[] {
  const out: Occupation[] = [];
  for (const p of PROPERTIES) {
    const rooms = ROOMS.filter((r) => r.propertyId === p.propertyId);
    for (const mo of MONTHS) {
      // עונתיות: יותר הזמנות בחודשי הקיץ
      const seasonFactor = mo.m >= 4 ? 1.5 : 1;
      const bookings = Math.round(rooms.length * (1.3 + rand()) * seasonFactor);
      for (let b = 0; b < bookings; b++) {
        const room = pickOne(rooms);
        const platform = rand() < 0.55 ? "Booking.com" : rand() < 0.8 ? "Airbnb" : "אורח מזדמן";
        const nights = between(1, 6);
        const day = between(1, 26);
        const checkIn = new Date(Date.UTC(mo.y, mo.m - 1, day));
        const checkOut = new Date(Date.UTC(mo.y, mo.m - 1, day + nights));
        const nightly = BASE_NIGHTLY[p.propertyId] * (0.85 + rand() * 0.5);
        const gross = round2(nightly * nights);
        const commPct = platform === "Booking.com" ? 0.15 : platform === "Airbnb" ? 0.14 : 0;
        const commission = round2(gross * commPct);
        const net = round2(gross - commission);
        out.push({
          propertyId: p.propertyId,
          roomNumber: room.roomNumber,
          status: "Booked",
          checkInDate: checkIn.toISOString(),
          checkOutDate: checkOut.toISOString(),
          nights,
          guestName: pickOne(GUEST_NAMES),
          numberOfGuests: between(1, room.maxGuests),
          totalPrice: gross,
          totalNetPrice: net,
          platform,
          paidBy: pickOne(PAID_BY),
          notes: "",
          month: mo.label,
          commission,
        });
      }
    }
  }
  return out;
}

// ----- הכנסות נוספות (Extras) -----
const EXTRA_TYPES = ["ארוחת בוקר", "חניה", "מיני-בר", "כביסה", "העברה משדה התעופה", "צ'ק-אאוט מאוחר"];
function buildExtras(): Extra[] {
  const out: Extra[] = [];
  for (const p of PROPERTIES) {
    for (const mo of MONTHS) {
      const count = between(2, 6);
      for (let i = 0; i < count; i++) {
        out.push({
          propertyId: p.propertyId,
          date: new Date(Date.UTC(mo.y, mo.m - 1, between(1, 27))).toISOString(),
          incomeType: pickOne(EXTRA_TYPES),
          amount: round2(between(8, 60) + rand()),
          paidBy: pickOne(PAID_BY),
          month: new Date(Date.UTC(mo.y, mo.m - 1, 1)).toISOString(),
        });
      }
    }
  }
  return out;
}

// ----- הוצאות (Expenses) -----
const EXPENSE_TYPES = [
  "שכר עבודה", "חשמל", "חימום", "מים", "מצרכים", "דלק ורכב",
  "אינטרנט", "מיסים", "תחזוקה", "הנהלת חשבונות", "אחר",
];
const EXPENSE_BASE: Record<string, [number, number]> = {
  "שכר עבודה": [1500, 4500],
  "חשמל": [200, 700],
  "חימום": [150, 600],
  "מים": [80, 250],
  "מצרכים": [150, 500],
  "דלק ורכב": [60, 280],
  "אינטרנט": [40, 90],
  "מיסים": [300, 1200],
  "תחזוקה": [100, 800],
  "הנהלת חשבונות": [120, 300],
  "אחר": [40, 250],
};
const SUPPLIERS = ["שרה לוי", "דוד כהן", "ספק חשמל EnBW", "עיריית קמניץ", "רו\"ח מזרחי", "ABC שירותים"];
const PAY_STATUS = ["שולם", "שולם חלקית", "לא שולם"];

function buildExpenses(): Expense[] {
  const out: Expense[] = [];
  for (const p of PROPERTIES) {
    for (const mo of MONTHS) {
      for (const type of EXPENSE_TYPES) {
        // לא כל סוג הוצאה מופיע בכל חודש
        if (type === "אחר" && rand() < 0.5) continue;
        if (type === "דלק ורכב" && rand() < 0.4) continue;
        const [lo, hi] = EXPENSE_BASE[type];
        const full = round2(between(lo, hi) + rand());
        const r = rand();
        const status = r < 0.7 ? "שולם" : r < 0.88 ? "שולם חלקית" : "לא שולם";
        const paid = status === "שולם" ? full : status === "שולם חלקית" ? round2(full * (0.3 + rand() * 0.4)) : 0;
        const left = round2(full - paid);
        const invoice = new Date(Date.UTC(mo.y, mo.m - 1, between(1, 15)));
        const payment = status === "שולם" ? new Date(Date.UTC(mo.y, mo.m - 1, between(16, 28))) : null;
        out.push({
          propertyId: p.propertyId,
          invoiceDate: invoice.toISOString(),
          expensesType: type,
          fullAmount: full,
          paidAmount: paid,
          leftAmount: left,
          status,
          paidBy: pickOne(PAID_BY),
          billingDate: new Date(Date.UTC(mo.y, mo.m - 1, 1)).toISOString(),
          paymentDate: payment ? payment.toISOString() : null,
          reportBy: pickOne(SUPPLIERS),
          confirmBy: pickOne(["נועם", "מנהל אזור"]),
          notes: status !== "שולם" ? "ממתין לאישור תשלום" : "",
          month: new Date(Date.UTC(mo.y, mo.m - 1, 1)).toISOString(),
        });
      }
    }
  }
  return out;
}

// ----- הוצאות חד-פעמיות (One-time expenses) — מאגר נפרד לגמרי מ-Expenses -----
const ONE_TIME_TYPES = [
  "שיפוץ", "רכישת ריהוט", "רכישת ציוד", "ייעוץ משפטי", "מערכת מיזוג", "רישוי ואגרות",
];
const ONE_TIME_BASE: Record<string, [number, number]> = {
  "שיפוץ": [2000, 12000],
  "רכישת ריהוט": [500, 4000],
  "רכישת ציוד": [300, 2500],
  "ייעוץ משפטי": [400, 1800],
  "מערכת מיזוג": [1200, 6000],
  "רישוי ואגרות": [200, 900],
};
function buildOneTimeExpenses(): Expense[] {
  const out: Expense[] = [];
  for (const p of PROPERTIES) {
    // כל נכס מקבל 1-3 הוצאות חד-פעמיות בלבד, מפוזרות על פני התקופה
    const count = between(1, 3);
    for (let i = 0; i < count; i++) {
      const type = pickOne(ONE_TIME_TYPES);
      const mo = pickOne(MONTHS);
      const [lo, hi] = ONE_TIME_BASE[type];
      const full = round2(between(lo, hi) + rand());
      const r = rand();
      const status = r < 0.6 ? "שולם" : r < 0.85 ? "שולם חלקית" : "לא שולם";
      const paid = status === "שולם" ? full : status === "שולם חלקית" ? round2(full * (0.3 + rand() * 0.4)) : 0;
      const left = round2(full - paid);
      const invoice = new Date(Date.UTC(mo.y, mo.m - 1, between(1, 26)));
      const payment = status === "שולם" ? new Date(Date.UTC(mo.y, mo.m - 1, between(20, 28))) : null;
      out.push({
        propertyId: p.propertyId,
        invoiceDate: invoice.toISOString(),
        expensesType: type,
        fullAmount: full,
        paidAmount: paid,
        leftAmount: left,
        status,
        paidBy: pickOne(PAID_BY),
        billingDate: invoice.toISOString(),
        paymentDate: payment ? payment.toISOString() : null,
        reportBy: pickOne(SUPPLIERS),
        confirmBy: pickOne(["נועם", "מנהל אזור"]),
        notes: status !== "שולם" ? "ממתין לאישור תשלום" : "",
        month: new Date(Date.UTC(mo.y, mo.m - 1, 1)).toISOString(),
      });
    }
  }
  return out;
}

// ----- תחזוקה (Maintence) -----
const MAINT_STATUS = ["פתוח", "בטיפול", "טופל"];
const MAINT_REPORTERS = ["שרה לוי", "דוד כהן", "מנהל הנכס", "צוות ניקיון"];
function buildMaintenance(): Maintenance[] {
  const out: Maintenance[] = [];
  for (const p of PROPERTIES) {
    const rooms = ROOMS.filter((r) => r.propertyId === p.propertyId);
    const count = between(2, 5);
    for (let i = 0; i < count; i++) {
      const mo = pickOne(MONTHS);
      out.push({
        propertyId: p.propertyId,
        date: new Date(Date.UTC(mo.y, mo.m - 1, between(1, 27))).toISOString(),
        roomNumber: pickOne(rooms).roomNumber,
        reportBy: pickOne(MAINT_REPORTERS),
        amount: round2(between(20, 600) + rand()),
        status: pickOne(MAINT_STATUS),
        supervisor: pickOne(["נועם", "מנהל אזור"]),
      });
    }
  }
  return out;
}

/**
 * בונה את כל מאגר נתוני הדמו.
 * נקראת מ-loadExcel.ts במצב "mock".
 */
export function buildMockDataSet(): DataSet {
  return {
    properties: PROPERTIES,
    platformCommissions: PLATFORM_COMMISSIONS,
    rooms: ROOMS,
    occupation: buildOccupation(),
    extras: buildExtras(),
    maintenance: buildMaintenance(),
    expenses: buildExpenses(),
    oneTimeExpenses: buildOneTimeExpenses(),
    profitAndLoss: [], // ה-P&L מחושב מהמקור (ראה lib/calculations.ts)
  };
}

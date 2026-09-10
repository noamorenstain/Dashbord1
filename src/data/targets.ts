// =================================================================
//  יעדים חודשיים קבועים (Monthly Targets) — תצורה בלבד, ללא לוגיקה
//  -----------------------------------------------------------------
//  נתוני יעד קבועים לכל שנה, לפי PropertyID (אותם מזהים בדיוק כמו
//  בגיליון Properties — לא הומצאו מזהים חדשים). היעדים הם *חודשיים*
//  (חוזרים על עצמם בכל אחד מ-12 חודשי השנה), לא שנתיים.
//
//  נכס שאינו מופיע כאן (עבור שנה נתונה) פשוט אין לו יעד מוגדר — אסור
//  להמציא לו יעד. שנים עתידיות (2027, 2028...) יתווספו כאן בעתיד ללא
//  שינוי בלוגיקה שצורכת את הנתונים (src/lib/targets.ts).
// =================================================================

export interface MonthlyTarget {
  revenue: number;
  expenses: number;
  profit: number;
  margin: number; // שבר, למשל 0.23 = 23%
}

export const MONTHLY_TARGETS: Record<string, Record<string, MonthlyTarget>> = {
  "2026": {
    // Black Forest
    "GE-BF": { revenue: 18292.47, expenses: 14172.41, profit: 4120.06, margin: 0.23 },
    // Tabiano 1
    "IT-TAB1": { revenue: 5711.45, expenses: 3770.75, profit: 1940.7, margin: 0.34 },
    // Chemnitz 1
    "GE-CH1": { revenue: 5123.9, expenses: 2315.77, profit: 2808.13, margin: 0.55 },
    // Tavernola
    "IT-TAV": { revenue: 12500.0, expenses: 6250.0, profit: 6250.0, margin: 0.5 },
  },
};

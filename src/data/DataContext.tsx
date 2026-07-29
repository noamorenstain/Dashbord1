// =================================================================
//  DataContext — מאגר הנתונים המרכזי של האפליקציה (State Layer)
//  -----------------------------------------------------------------
//  מודל העבודה: המשתמש מעלה קובץ Excel, והנתונים מתעדכנים לפיו.
//  בכל העלאה מחדש — הנתונים מתחלפים לחלוטין לפי הקובץ החדש.
//
//  הנתונים שהועלו נשמרים ב-localStorage של הדפדפן, כך שאחרי רענון
//  של הדף המידע נשאר (עד שמעלים קובץ חדש או מנקים).
//
//  כל המסכים שואבים נתונים מכאן בלבד — שכבת התצוגה לעולם לא ניגשת
//  ישירות לקובץ או ל-mockData.
// =================================================================

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DataSet, DataStatus } from "./types";
import { loadFromArrayBuffer, loadFromMock } from "./loadExcel";

interface DataContextValue {
  data: DataSet;
  status: DataStatus;
  /** העלאת קובץ Excel — מעדכן את כל הנתונים לפי הקובץ */
  loadFromFile: (file: File) => Promise<void>;
  /** טעינת נתוני דמו (להדגמה) */
  loadDemo: () => void;
  /** ניקוי הקובץ שהועלה וחזרה לדמו */
  clearData: () => void;
}

const emptyData: DataSet = {
  properties: [],
  platformCommissions: [],
  rooms: [],
  occupation: [],
  extras: [],
  maintenance: [],
  expenses: [],
  oneTimeExpenses: [],
  profitAndLoss: [],
};

const DataContext = createContext<DataContextValue | null>(null);

// ----- שמירה ב-localStorage -----
const LS_KEY = "properties_dashboard_dataset_v1";

interface SavedEnvelope {
  savedAt: number;
  fileName: string;
  data: DataSet;
}

function persist(env: SavedEnvelope) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(env));
  } catch {
    /* אם ה-localStorage מלא/חסום — פשוט לא שומרים */
  }
}
function readPersisted(): SavedEnvelope | null {
  try {
    const s = localStorage.getItem(LS_KEY);
    return s ? (JSON.parse(s) as SavedEnvelope) : null;
  } catch {
    return null;
  }
}
function clearPersisted() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* התעלם */
  }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DataSet>(emptyData);
  const [status, setStatus] = useState<DataStatus>({
    source: "mock",
    lastUpdated: null,
    loading: true,
    ok: false,
    message: "טוען…",
  });

  const loadDemo = useCallback(() => {
    setData(loadFromMock());
    setStatus({
      source: "mock",
      lastUpdated: new Date(),
      loading: false,
      ok: true,
      message: "מוצגים נתוני דמו — העלה קובץ Excel כדי לראות את הנתונים האמיתיים.",
    });
  }, []);

  const loadFromFile = useCallback(async (file: File) => {
    setStatus((s) => ({ ...s, loading: true, message: `טוען את ${file.name}…` }));
    try {
      const buf = await file.arrayBuffer();
      const parsed = loadFromArrayBuffer(buf);

      // בדיקת שפיות בסיסית — שהקובץ אכן מכיל נתונים במבנה המוכר
      const totalRows =
        parsed.properties.length + parsed.occupation.length + parsed.expenses.length + parsed.rooms.length;
      if (totalRows === 0) {
        throw new Error("לא נמצאו נתונים מוכרים בקובץ");
      }

      setData(parsed);
      const now = new Date();
      setStatus({
        source: "upload",
        lastUpdated: now,
        loading: false,
        ok: true,
        message: `הנתונים עודכנו מהקובץ: ${file.name}`,
      });
      persist({ savedAt: now.getTime(), fileName: file.name, data: parsed });
    } catch (err) {
      setStatus((s) => ({
        ...s,
        loading: false,
        ok: false,
        message:
          "שגיאה בקריאת הקובץ. ודא שזה קובץ Excel (.xlsx) במבנה הגיליונות הנכון (Properties, Rooms, occupation, Extras, Maintence, Expenses, One-time expenses).",
      }));
    }
  }, []);

  const clearData = useCallback(() => {
    clearPersisted();
    loadDemo();
  }, [loadDemo]);

  // טעינה ראשונית — אם יש קובץ שמור, משתמשים בו; אחרת דמו
  useEffect(() => {
    const saved = readPersisted();
    if (saved && saved.data && saved.data.properties) {
      // תאימות לאחור: קבצים שנשמרו לפני הוספת "One-time expenses"
      setData({ ...emptyData, ...saved.data, oneTimeExpenses: saved.data.oneTimeExpenses ?? [] });
      setStatus({
        source: "upload",
        lastUpdated: new Date(saved.savedAt),
        loading: false,
        ok: true,
        message: `נטען מהקובץ האחרון שהועלה: ${saved.fileName}`,
      });
    } else {
      loadDemo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ data, status, loadFromFile, loadDemo, clearData }),
    [data, status, loadFromFile, loadDemo, clearData]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData חייב להיות בתוך DataProvider");
  return ctx;
}

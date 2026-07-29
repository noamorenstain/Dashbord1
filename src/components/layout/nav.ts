import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  Wallet,
  Receipt,
  BedDouble,
  CalendarCheck,
  Wrench,
  AlertTriangle,
  PackageOpen,
  LucideIcon,
} from "lucide-react";

export type PageKey =
  | "dashboard"
  | "properties"
  | "pnl"
  | "revenue"
  | "expenses"
  | "oneTimeExpenses"
  | "occupancy"
  | "bookings"
  | "maintenance"
  | "anomalies";

export interface NavItem {
  key: PageKey;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "דאשבורד ראשי", icon: LayoutDashboard },
  { key: "properties", label: "נכסים", icon: Building2 },
  { key: "pnl", label: "רווח והפסד", icon: TrendingUp },
  { key: "revenue", label: "הכנסות", icon: Wallet },
  { key: "expenses", label: "הוצאות", icon: Receipt },
  { key: "oneTimeExpenses", label: "הוצאות חד פעמיות", icon: PackageOpen },
  { key: "occupancy", label: "תפוסה", icon: BedDouble },
  { key: "bookings", label: "הזמנות", icon: CalendarCheck },
  { key: "maintenance", label: "תחזוקה", icon: Wrench },
  { key: "anomalies", label: "חריגות בנתונים", icon: AlertTriangle },
];

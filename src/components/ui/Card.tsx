import React from "react";

/** כרטיס לבן בסיסי עם כותרת אופציונלית */
export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200/70 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-2">
          <div>
            {title && <h3 className="text-slate-800 font-semibold text-base">{title}</h3>}
            {subtitle && <p className="text-slate-400 text-xs mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="px-5 pb-5 pt-1">{children}</div>
    </div>
  );
}

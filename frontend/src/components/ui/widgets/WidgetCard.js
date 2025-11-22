"use client";

import React from "react";

const paddingMap = {
  sm: "var(--widget-padding-sm)",
  md: "var(--widget-padding-md)",
  lg: "var(--widget-padding-lg)",
};

const accentMap = {
  none: "bg-transparent",
  subtle:
    "bg-gradient-to-br from-rose-50 to-white dark:from-slate-900 dark:to-slate-800",
  highlight:
    "bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent dark:from-red-500/20",
};

export default function WidgetCard({
  title,
  subtitle,
  actions = null,
  children,
  padding = "md",
  accent = "none",
  className = "",
  footer = null,
  id,
}) {
  const paddingValue = paddingMap[padding] || paddingMap.md;
  const accentClass = accentMap[accent] || accentMap.none;

  return (
    <section
      id={id}
      className={`widget-card ${accentClass} ${className}`.trim()}
      style={{
        backgroundClip: "padding-box",
      }}
    >
      {(title || actions) && (
        <header className="widget-card__header">
          <div>
            {title && <h3 className="widget-card__title"> {title} </h3>}
            {subtitle && <p className="widget-card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="widget-card__body" style={{ padding: paddingValue }}>
        {children}
      </div>
      {footer && <div className="widget-card__footer">{footer}</div>}
    </section>
  );
}

export function WidgetGroup({ title, description, actions, children }) {
  return (
    <div className="space-y-4">
      {(title || description) && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            {title && (
              <p className="text-sm font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                {title}
              </p>
            )}
            {description && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

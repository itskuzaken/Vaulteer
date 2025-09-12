import React from "react";

export default function SkipLink({ target = "#main-content" }) {
  return (
    <a
      href={target}
      className="fixed top-2 left-2 z-[2000] -translate-y-16 focus:translate-y-0 transition-transform bg-[var(--color-brand-primary)] text-white px-4 py-2 rounded-md text-sm font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-white/60"
    >
      Skip to main content
    </a>
  );
}

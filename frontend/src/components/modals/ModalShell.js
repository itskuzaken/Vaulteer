"use client";

import { useEffect, useRef } from "react";

export default function ModalShell({
  isOpen = true,
  title,
  description,
  children,
  footer,
  onClose,
  role = "dialog",
  size = "md",
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocused = document.activeElement;
    const focusable = panelRef.current?.querySelectorAll(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );

    focusable?.[0]?.focus?.();

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && typeof onClose === "function") {
        onClose();
      }
      if (event.key === "Tab" && focusable && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass =
    size === "lg" ? "modal-panel modal-panel--lg" : "modal-panel";

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        role={role}
        aria-modal="true"
        className={`${sizeClass}`}
        ref={panelRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {(title || description) && (
          <header className="modal-panel__header">
            {title && (
              <h2
                className="text-xl font-semibold tracking-tight"
                id={`${title}-heading`}
              >
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </header>
        )}
        <div className="modal-panel__body">{children}</div>
        {footer && <div className="modal-panel__footer">{footer}</div>}
      </div>
    </div>
  );
}

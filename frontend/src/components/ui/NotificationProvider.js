import React, { createContext, useContext, useState, useCallback } from "react";

const ToastCtx = createContext(null);

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = "info", ttl = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  }, []);
  const api = { push };
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[1100] space-y-3 w-72">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`text-sm font-semibold rounded-md px-4 py-3 shadow-md text-white ${
              t.type === "success"
                ? "bg-green-600"
                : t.type === "error"
                ? "bg-red-600"
                : "bg-[var(--color-brand-primary)]"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export function useNotify() {
  return useContext(ToastCtx);
}

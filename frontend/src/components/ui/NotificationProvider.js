"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import {
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoInformationCircleOutline,
  IoWarningOutline,
  IoCloseOutline,
} from "react-icons/io5";

const ToastCtx = createContext(null);

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((msg, type = "info", ttl = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const api = { push, dismiss };

  const getToastStyles = (type) => {
    const styles = {
      success: {
        bg: "bg-green-50 dark:bg-green-900/20",
        border: "border-green-200 dark:border-green-800",
        text: "text-green-800 dark:text-green-200",
        icon: <IoCheckmarkCircleOutline className="w-5 h-5 flex-shrink-0" />,
      },
      error: {
        bg: "bg-red-50 dark:bg-red-900/20",
        border: "border-red-200 dark:border-red-800",
        text: "text-red-800 dark:text-red-200",
        icon: <IoCloseCircleOutline className="w-5 h-5 flex-shrink-0" />,
      },
      warning: {
        bg: "bg-amber-50 dark:bg-amber-900/20",
        border: "border-amber-200 dark:border-amber-800",
        text: "text-amber-800 dark:text-amber-200",
        icon: <IoWarningOutline className="w-5 h-5 flex-shrink-0" />,
      },
      info: {
        bg: "bg-blue-50 dark:bg-blue-900/20",
        border: "border-blue-200 dark:border-blue-800",
        text: "text-blue-800 dark:text-blue-200",
        icon: <IoInformationCircleOutline className="w-5 h-5 flex-shrink-0" />,
      },
    };
    return styles[type] || styles.info;
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div
        className="fixed top-4 right-4 z-[1100] space-y-3 w-80 max-w-[calc(100vw-2rem)]"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => {
          const style = getToastStyles(t.type);
          return (
            <div
              key={t.id}
              role="status"
              aria-live="polite"
              className={`
                ${style.bg} ${style.border} ${style.text}
                border rounded-lg shadow-lg backdrop-blur-sm
                flex items-start gap-3 p-4
                animate-slideInRight
              `}
              style={{
                animation: "slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {/* Icon */}
              <div className="mt-0.5">{style.icon}</div>

              {/* Message */}
              <div className="flex-1 text-sm font-medium leading-relaxed">
                {t.msg}
              </div>

              {/* Dismiss Button */}
              <button
                onClick={() => dismiss(t.id)}
                className={`
                  ${style.text} opacity-60 hover:opacity-100
                  rounded-md p-1 -m-1
                  transition-all duration-200 ease-in-out
                  hover:bg-black/5 dark:hover:bg-white/5
                  focus:outline-none focus:ring-2 focus:ring-offset-2
                  focus:ring-current focus:ring-offset-transparent
                `}
                aria-label="Dismiss notification"
              >
                <IoCloseOutline className="w-5 h-5" />
              </button>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </ToastCtx.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(ToastCtx);
  
  // Return no-op during SSR/SSG to prevent build errors
  if (typeof window === 'undefined') {
    return {
      push: () => {},
      dismiss: () => {},
    };
  }
  
  // Runtime error if used outside provider
  if (!ctx) {
    throw new Error('useNotify must be used within a NotificationProvider');
  }
  
  return ctx;
}

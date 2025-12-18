"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createActivityLog } from "../../services/activityLogService";

// --- Helpers defined outside to avoid re-creation ---

const LOG_THROTTLE_MS = 5000;
let lastLogTime = 0;

const logOverlayActivation = async (reason) => {
  const now = Date.now();
  if (now - lastLogTime < LOG_THROTTLE_MS) return;
  lastLogTime = now;

  // Fire-and-forget log
  createActivityLog({
    type: "SECURITY",
    action: "SCREENSHOT_PROTECTION_TRIGGERED",
    description: `Screenshot protection overlay shown`,
    severity: "INFO",
    metadata: {
      reason,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      timestamp: new Date().toISOString(),
    },
  }).catch((err) => console.warn("Screenshot log failed:", err));
};

/**
 * ScreenshotBlocker component
 * Uses a React Portal + Direct DOM manipulation for instant (synchronous) blocking.
 */
export default function ScreenshotBlocker({
  enabled = true,
  watermarkText = "",
  autoHideMs = 3000,
  showDurationMs = null,
  blockType = "white", // 'blur' or 'white' or 'black'
  onShow = null,
  onHide = null,
}) {
  const overlayRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  // Ensure we only run portal logic on the client
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!enabled || !mounted) return;

    const overlay = overlayRef.current;
    
    // --- Core Logic ---

    const show = (reason) => {
      // 1. Synchronous Block: Immediately make visible via direct DOM access
      if (overlay) {
        overlay.style.display = "flex";
      }

      // 2. Clear existing hide timers
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      // 3. Side Effects (Logging / Callbacks)
      logOverlayActivation(reason);
      if (onShow) onShow(reason);

      // 4. Schedule Hide
      const durationMs = typeof showDurationMs === "number" && showDurationMs >= 0 
        ? showDurationMs 
        : autoHideMs;

      if (durationMs > 0) {
        hideTimeoutRef.current = setTimeout(() => {
          hide("timeout");
        }, durationMs);
      }
    };

    const hide = (reason = "manual") => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      
      // Synchronous Hide
      if (overlay) {
        overlay.style.display = "none";
      }

      if (onHide) onHide(reason);
    };

    // --- Event Handlers ---

    const onVisibilityChange = () => {
      if (document.hidden) show("visibilitychange");
      else hide("visibility-visible");
    };

    const onBlur = () => show("blur");
    const onFocus = () => hide("focus");
    const onBeforePrint = () => show("print");
    const onAfterPrint = () => hide("after-print");

    const onKeyDown = (e) => {
      try {
        const key = e.key || e.code;
        // 44 = PrintScreen
        if (key === "PrintScreen" || key === "Print_Screen" || e.keyCode === 44) {
          show("printscreen-key");
        }
        // Mac: Meta + Shift + 3/4/5 (captured as best effort, browsers often block this key combo detection)
        // Windows: Meta + Shift + S (Snipping Tool)
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "s" || e.key === "S" || e.key === "3" || e.key === "4")) {
          show("shortcut-key");
        }
      } catch (err) {
        // ignore
      }
    };

    const onCopy = (e) => {
      // Only block copy if overlay is currently visible
      if (overlay && overlay.style.display !== "none") {
        e.preventDefault();
      }
    };

    const onContextMenu = (e) => {
      if (overlay && overlay.style.display !== "none") {
        e.preventDefault();
      }
    };

    const onCustomShow = (e) => show(e.detail || "custom-event");
    const onCustomHide = () => hide("custom-event");
    const onNativeScreenshot = () => show("native-screenshot");

    // --- Listeners ---

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    window.addEventListener("keydown", onKeyDown, { capture: true }); // Capture phase to run before other handlers
    document.addEventListener("copy", onCopy, { capture: true });
    document.addEventListener("contextmenu", onContextMenu, { capture: true });
    
    // Custom events for integration
    document.addEventListener("screenshot-protect-show", onCustomShow);
    document.addEventListener("screenshot-protect-hide", onCustomHide);
    window.addEventListener("screenshot", onNativeScreenshot);

    // Cleanup
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      document.removeEventListener("copy", onCopy, { capture: true });
      document.removeEventListener("contextmenu", onContextMenu, { capture: true });
      document.removeEventListener("screenshot-protect-show", onCustomShow);
      document.removeEventListener("screenshot-protect-hide", onCustomHide);
      window.removeEventListener("screenshot", onNativeScreenshot);
    };
  }, [enabled, mounted, autoHideMs, showDurationMs, onShow, onHide]);

  // If disabled or SSR, render nothing
  if (!enabled || !mounted) return null;

  // Render via Portal to ensure it is always the topmost element in the DOM (avoids z-index wars)
  return createPortal(
    <div
      ref={overlayRef}
      id="screenshot-protect-overlay"
      style={{
        display: "none", // Hidden by default, toggled via ref for speed
        position: "fixed",
        inset: 0,
        zIndex: 2147483647, // Max z-index
        backgroundColor: blockType === "white" ? "#ffffff" : "#000000",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "24px",
          color: blockType === "white" ? "#111827" : "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: "18px", marginBottom: "8px" }}>
          Sensitive Content Hidden
        </div>
        <div style={{ fontSize: "14px", opacity: 0.9 }}>
          This page contains sensitive information.
        </div>
        {watermarkText && (
          <div
            style={{
              marginTop: "16px",
              fontSize: "12px",
              opacity: 0.7,
              userSelect: "none",
            }}
          >
            {watermarkText}
          </div>
        )}
      </div>

      {/* Background Watermark Pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: -1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            fontSize: "40px",
            fontWeight: "bold",
            opacity: 0.05,
            color: blockType === "white" ? "#000" : "#fff",
            transform: "rotate(-15deg)",
            whiteSpace: "nowrap",
          }}
        >
          {watermarkText.repeat(5)}
        </div>
      </div>
    </div>,
    document.body
  );
}
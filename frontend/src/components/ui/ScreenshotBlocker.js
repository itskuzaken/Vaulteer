"use client";
import { useEffect, useState, useRef } from "react";
import { createActivityLog } from "../../services/activityLogService";

/**
 * ScreenshotBlocker component: Best-effort detection & UI overlay
 * - Listens to events that suggest a screenshot or print is attempted (PrintScreen key, visibilitychange, beforeprint, window blur, native custom events)
 * - Shows an overlay with watermark text and optional theme-specific white/black screen
 * - Exposes `show` and `hide` via custom DOM events: 'screenshot-protect-show' and 'screenshot-protect-hide'
 */
export default function ScreenshotBlocker({
  enabled = true,
  watermarkText = "",
  autoHideMs = 3000,
  showDurationMs = null, // explicit show duration (overrides `autoHideMs` when provided)
  blockType = "white", // 'blur' or 'white'
  onShow = null,
  onHide = null,
}) {
  const lastLogTimeRef = useRef(0);
  const LOG_THROTTLE_MS = 5000; // throttle logs to avoid spamming backend
  const [active, setActive] = useState(false);
  const hideTimeoutRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const show = (reason) => {
      // already active? reset timer
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      // If an activation timeout exists (scheduled show), clear it when we actually show
      setActive(true);
      onShow?.(reason);
      // Log overlay activation for telemetry (best-effort, fire-and-forget)
      logOverlayActivation(reason);
      // Auto-hide so it doesn't block forever (show duration can be controlled by showDurationMs)
      const durationMs = typeof showDurationMs === "number" && showDurationMs >= 0 ? showDurationMs : autoHideMs;
      if (durationMs > 0) {
        hideTimeoutRef.current = setTimeout(() => {
          setActive(false);
          hideTimeoutRef.current = null;
          onHide?.("timeout");
        }, durationMs);
      }
    };

    const hide = () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      // Also clear scheduled activation if hide occurs before it runs
        // activationTimeoutRef removed; no scheduling cleanup required
      setActive(false);
      onHide?.("manual");
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        show("visibilitychange");
      } else {
        hide();
      }
    };

    const onBlur = () => show("blur");
    const onFocus = () => hide();
    const onBeforePrint = () => show("print");
    const onAfterPrint = () => hide();

      // Scheduling not necessary; call show immediately
      const scheduleShow = (reason) => show(reason);

    const onKeyDown = (e) => {
      try {
        const key = e?.key || e?.code || e?.keyCode;
        // 44 = PrintScreen key code
        if (key === "PrintScreen" || key === "Print_Screen" || key === 44) {
          // Use scheduled show to align overlay activation with OS screenshot timing
          scheduleShow("printscreen-key");
        }
        // Meta + Shift + S (mac screenshot in some browsers/tools)
        if ((e?.metaKey || e?.ctrlKey) && e?.shiftKey && (e?.key === "S" || e?.key === "s")) {
          scheduleShow("meta-shift-s");
        }
      } catch (err) {
        // ignore
        console.warn("ScreenshotBlocker keydown handler error:", err);
      }
    };

    const onCopy = (e) => {
      // Block copying text while overlay active
      if (active) {
        e?.preventDefault && e.preventDefault();
      }
    };

    const onContextMenu = (e) => {
      if (active) {
        e?.preventDefault && e.preventDefault();
      }
    };

    const onCustomShow = (e) => show(e?.detail || "custom-event");
    const onCustomHide = (e) => hide();

    // Custom screenshot event from native/webviews (e.g., React Native, cordova)
    const onNativeScreenshot = (e) => scheduleShow("native-screenshot");

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("copy", onCopy, { capture: true });
    document.addEventListener("contextmenu", onContextMenu, { capture: true });
    document.addEventListener("screenshot-protect-show", onCustomShow);
    document.addEventListener("screenshot-protect-hide", onCustomHide);

    // Some native wrappers dispatch a 'screenshot' event
    window.addEventListener("screenshot", onNativeScreenshot);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("copy", onCopy, { capture: true });
      document.removeEventListener("contextmenu", onContextMenu, { capture: true });
      document.removeEventListener("screenshot-protect-show", onCustomShow);
      document.removeEventListener("screenshot-protect-hide", onCustomHide);
      window.removeEventListener("screenshot", onNativeScreenshot);

      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [enabled, autoHideMs, onShow, onHide, active]);

  // Visual overlay styles
  const overlayClasses = blockType === "white" ? "bg-white" : "bg-black";
  const textColor = blockType === "white" ? "text-gray-900" : "text-white";

  if (!enabled) return null;

  return (
    <div aria-hidden={!active} className={`pointer-events-none fixed inset-0 z-[9999] ${active ? "block" : "hidden"}`}>
      {/* Block screen or blur is applied by parent component to avoid interfering with UI elements */}
      <div className={`${overlayClasses} absolute inset-0 flex items-center justify-center`}>
        <div className={`text-center px-6 ${textColor}`}> 
          <div className="text-lg font-semibold mb-2">Sensitive Content Hidden</div>
          <div className="text-sm opacity-90">This page contains sensitive information — content is temporarily hidden.</div>
          {watermarkText && <div className="mt-4 text-xs opacity-80 select-none w-full truncate">{watermarkText}</div>}
        </div>
      </div>

      {/* Watermark overlay - subtle, repeat with rotated text */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[10000]">
        <div className="select-none pointer-events-none text-[44px] tracking-[6px] opacity-10 transform -rotate-12">{watermarkText}</div>
      </div>
    </div>
  );
}
        // Log overlay activation (telemetry)
        async function logOverlayActivation(reason) {
          try {
            const now = Date.now();
            if (now - lastLogTimeRef.current < LOG_THROTTLE_MS) return; // throttle
            lastLogTimeRef.current = now;

            // Fire-and-forget: do not await to avoid blocking UI
            createActivityLog({
              type: "SECURITY",
              action: "SCREENSHOT_PROTECTION_TRIGGERED",
              description: `Screenshot protection overlay shown`,
              severity: "INFO",
              metadata: {
                reason,
                path: (typeof window !== "undefined" && window.location?.pathname) || null,
                userAgent: (typeof navigator !== "undefined" && navigator.userAgent) || null,
                timestamp: new Date().toISOString(),
              },
            }).catch((err) => {
              console.warn("Failed to send overlay activation log:", err);
            });
          } catch (err) {
            console.warn("Error scheduling overlay activation log:", err);
          }
        }

"use client";

import React, { useEffect, useRef, useState } from "react";
import DashboardSectionCard from "./DashboardSectionCard";

/**
 * QuickActionsSection
 * - Uses DashboardSectionCard to render a titled section
 * - Layout: stacked single-column on md+; horizontally scrollable row on mobile
 * - Accepts children (QuickActionCard) and wraps them to enforce sizing for scroll
 */
export default function QuickActionsSection({
  title = "Quick actions",
  subtitle = "",
  icon = null,
  action = null,
  className = "",
  children,
  // autoScrollInterval (ms) - when set > 0 enables auto-advance on mobile view
  autoScrollInterval = 4000,
  // pause auto-scroll while user is interacting
  pauseOnHover = true,
}) {
  const containerRef = useRef(null);
  const childRefs = useRef([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // keep a current index ref so auto-advance knows which child to show next
  const currentIndexRef = useRef(0);

  // Track viewport width to enable auto-scroll only on smaller (mobile) screens
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const setMobile = (e) => setIsMobileView(!e.matches);

    // initial value
    setIsMobileView(!mq.matches);

    // Prefer modern addEventListener/removeEventListener on MediaQueryList.
    // For older browsers that don't implement addEventListener on MediaQueryList
    // we avoid using the deprecated addListener/removeListener and use the
    // onchange assignment as a non-deprecated fallback.
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", setMobile);
      return () => {
        mq.removeEventListener("change", setMobile);
      };
    }

    // Fallback for older environments: use onchange handler (safer than addListener/removeListener)
    mq.onchange = setMobile;
    return () => {
      // clear the handler on cleanup
      mq.onchange = null;
    };
  }, []);

  // Auto-scroll interval + manual scroll detection
  useEffect(() => {
    if (typeof window === "undefined") return; // safety

    const childCount = React.Children.count(children);
    if (!containerRef.current) return;
    if (!isMobileView) return; // only auto-scroll on mobile
    if (!autoScrollInterval || autoScrollInterval <= 0) return;
    if (childCount <= 1) return;

    let intervalId = null;
    let scrollTimeout = null;

    const advance = () => {
      try {
        currentIndexRef.current = (currentIndexRef.current + 1) % childCount;
        setActiveIndex(currentIndexRef.current);
        const el = childRefs.current[currentIndexRef.current];
        if (el && el.scrollIntoView) {
          el.scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest",
          });
        }
      } catch (err) {
        // swallow errors to avoid noisy logs
      }
    };

    intervalId = setInterval(() => {
      if (!isPaused) advance();
    }, autoScrollInterval);

    // if user manually scrolls, briefly pause auto-advance and update current index
    const onScroll = () => {
      setIsPaused(true);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsPaused(false);
        // refresh current index to nearest centered child
        const container = containerRef.current;
        if (!container) return;
        const containerRect = container.getBoundingClientRect();
        let bestIdx = 0;
        let bestDist = Infinity;
        childRefs.current.forEach((child, idx) => {
          if (!child) return;
          const rect = child.getBoundingClientRect();
          const childCenter = rect.left + rect.width / 2;
          const center = containerRect.left + containerRect.width / 2;
          const d = Math.abs(childCenter - center);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = idx;
          }
        });
        currentIndexRef.current = bestIdx;
        setActiveIndex(bestIdx);
      }, 250);
    };

    const container = containerRef.current;
    container.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      container && container.removeEventListener("scroll", onScroll);
    };
  }, [autoScrollInterval, isMobileView, isPaused, children]);

  // Reset index when children change (or count changes)
  useEffect(() => {
    currentIndexRef.current = 0;
    setActiveIndex(0);
    // clear childRefs to allow re-population
    childRefs.current = [];
  }, [children]);
  return (
    <DashboardSectionCard
      title={title}
      subtitle={subtitle}
      icon={icon}
      action={action}
      className={className}
    >
      <div
        className={
          // Mobile (default): horizontal, snap-enabled row
          // md+ : responsive grid (3 columns) with centered items
          // Use centered snap so items align to the center of the viewport on mobile
          "flex flex-row md:grid md:grid-cols-3 gap-3 md:gap-4 overflow-x-auto md:overflow-visible px-4 md:px-0 snap-x snap-mandatory scroll-smooth justify-start md:justify-center no-scrollbar"
        }
        style={{ WebkitOverflowScrolling: "touch" }}
        ref={containerRef}
        onMouseEnter={() => pauseOnHover && setIsPaused(true)}
        onMouseLeave={() => pauseOnHover && setIsPaused(false)}
        onTouchStart={() => pauseOnHover && setIsPaused(true)}
        onTouchEnd={() => pauseOnHover && setIsPaused(false)}
      >
        {React.Children.map(children, (child, index) => (
          <div
            ref={(el) => (childRefs.current[index] = el)}
            key={index}
            className=" shrink-0 w-64 md:mx-0 md:w-full md:flex-1 snap-center md:snap-none"
            style={{ scrollSnapStop: "always" }}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Mobile-only dot indicator for currently centered card */}
      {isMobileView && React.Children.count(children) > 1 && (
        <div
          className="mt-1 flex justify-center items-center md:hidden"
          aria-hidden={false}
        >
          {React.Children.map(children, (_child, idx) => (
            <button
              key={idx}
              onClick={() => {
                const el = childRefs.current[idx];
                if (el && el.scrollIntoView) {
                  // ensure the index updates as we jump
                  currentIndexRef.current = idx;
                  setActiveIndex(idx);
                  el.scrollIntoView({
                    behavior: "smooth",
                    inline: "center",
                    block: "nearest",
                  });
                }
              }}
              aria-label={`Go to quick action ${idx + 1}`}
              className={`h-0.5 w-0.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                activeIndex === idx
                  ? "bg-red-600 scale-32"
                  : "bg-gray-300 dark:bg-gray-600 opacity-75 scale-24"
              }`}
            />
          ))}
        </div>
      )}
    </DashboardSectionCard>
  );
}

// Auto-scroll behaviour is handled inside the component using refs and effects

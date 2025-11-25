Goal

- Improve mobile experience across the frontend: layout, typography, images, spacing, cards, and interactions.
- Keep desktop behaviour unchanged; use feature flags / gradual rollout.

Constraints

- Next.js + Tailwind config already in repo.
- Components include ModernDashboardLayout, ModernSidebar, many card components.
- SSR/Next pitfalls: avoid window.\* during SSR; detect client only with `useEffect` or server props.
- Performance: reduce layout shifts, optimize images, avoid heavy client bundles.

High-level approach (hybrid)

1. Design tokens & Tailwind baseline

   - Ensure Tailwind breakpoints and font scale are correct (sm/640 md/768 lg/1024 xl).
   - Add responsive font scales using clamp (e.g. body/clamped sizes in globals).
   - Add new utility classes for consistent spacing on mobile (eg. mobile-gap, mobile-padding).

2. Global layout fixes

   - Replace inline window checks in render with useIsClient/useWindowSize hooks.
   - Use responsive CSS for margins/padding instead of inline style math that uses window at render time.
   - Shift heavy layout logic for responsive behaviour to CSS and props.

3. Image handling

   - Use next/image with sizes and priority for critical avatars/hero images.
   - Add fallback blur placeholders and ensure unoptimized removed only where necessary.
   - Normalize avatar size across breakpoints.

4. Text / Typography

   - Ensure truncation rules (single-line with ellipsis) for headings and meta text.
   - Reduce font-size and line-heights on mobile.
   - Avoid wrapping large paragraphs; use show/hide or “Read more” for long blocks.

5. Cards & containers

   - Make cards stack vertically with full-width on mobile with smaller padding.
   - Convert grid columns to single column at mobile breakpoint.
   - Reduce box shadows and heavy borders on mobile.

6. Interactions & accessibility

   - Bigger tap targets (min 44px) for buttons and action items.
   - Use aria attributes and keyboard support; ensure modals work well on small screens.
   - Add focus-visible outlines and reduce hover-only interactions.

7. Components prioritization & tasks

   - Top priority (immediate)
     - ModernDashboardLayout: remove inline window use during SSR; ensure mobile header and mobile sidebar overlay behaves cleanly.
     - ModernSidebar: compact mobile layout; collapse/expand animations; increase hit target sizes.
     - NotificationBell: modal/panel optimized for mobile.
     - Avatar/display name: smaller images and fallback initials.
     - DashboardCard, EventCard, UserCard: responsive stacking, truncation, action consolidation (use icons + overflow menu).
   - Mid priority
     - EventList & filters: switch to collapsible filter panel on mobile; keep only essential filters visible.
     - Forms: optimize inputs for mobile (larger tappable labels, stacked layout)
     - Pagination: use infinite scroll or touch-friendly pagination controls on mobile.
   - Low priority
     - Non-critical widgets, animations (reduce to improve perf on low-end devices).

8. Dev tasks & code examples (apply to affected files)

   - Add a new hook: src/hooks/useIsClient.js
   - Modify ModernDashboardLayout to use hook and CSS-based responsive layout (example included below).
   - Update key card components with responsive Tailwind classes.

9. Testing & validation

   - Add unit tests for responsive layout logic (render with different window widths using jsdom).
   - Add visual snapshot tests for mobile viewport.
   - Manual QA checklist: performance (LCP/CLS), accessibility (AXE), touch targets, network throttling.

10. Rollout & Monitoring

- Release behind feature flag or staged deploy to small % first.
- Monitor logs, user feedback, error rates.
- Add telemetry for mobile layout issues (client-side console capture for first run after deploy).

Example small change (ModernDashboardLayout)

```javascript
// filepath: frontend/src/components/layout/ModernDashboardLayout.js
// ...existing code...
// Replace inline window usage in render with client-detection hook
import useIsClient from "../../hooks/useIsClient";

const isClient = useIsClient();

const layoutMargin =
  isClient && window.innerWidth >= 1024
    ? sidebarOpen
      ? "18rem"
      : "5rem"
    : "0";
// ...existing code...
```

Deliverables & timeline (estimate)

- Week 1: baseline tokens, global layout fixes, ModernDashboardLayout + ModernSidebar mobile polish.
- Week 2: Cards, forms, EventList & filters, notifications.
- Week 3: Testing, performance tweaks, fixups, staged rollout.

PR checklist

- Run `npm ci` & `npm run build` to test production build
- Add snapshots for changed components
- Manual tests on emulated devices (iPhone/Android)
- Add accessible attributes and verify with axe

If you want I can:

- A) generate the actual hook and modify ModernDashboardLayout (small PR) now, or
- B) produce a full list of code edits per-file (diff-ready) for the high-priority components.

Which option do you want me to implement first — A) ModernDashboardLayout + supporting hooks and tests, or B) All top-priority components (Sidebar, NotificationBell, DashboardCard, EventCard, UserCard) in one PR?

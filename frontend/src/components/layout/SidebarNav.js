import React, { useState } from "react";

function NavGroup({ label, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <li className="mb-2">
      <button
        className="w-full flex items-center justify-between text-left text-sm font-semibold text-[var(--color-text-strong)] px-2 py-2 rounded-md hover:bg-[var(--color-surface-alt)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]"
        aria-expanded={open}
        aria-controls={`group-${id}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{label}</span>
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>
          ›
        </span>
      </button>
      <ul
        id={`group-${id}`}
        className="pl-3 mt-1 overflow-hidden transition-all"
        style={{ maxHeight: open ? "600px" : "0", opacity: open ? 1 : 0 }}
        aria-hidden={!open}
      >
        {children}
      </ul>
    </li>
  );
}

function NavItem({ label, href = "#", active = false }) {
  return (
    <li>
      <a
        href={href}
        className={`block text-sm px-2 py-1.5 rounded-md truncate focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)] transition-colors ${
          active
            ? "bg-[var(--color-surface-alt)] font-semibold border-l-4 border-[var(--color-brand-primary)] pl-1"
            : "hover:bg-[var(--color-surface-alt)]"
        }`}
      >
        {label}
      </a>
    </li>
  );
}

export default function SidebarNav({ activePath }) {
  return (
    <nav
      aria-label="Primary"
      className="px-3 pt-4 text-[var(--color-text-default)] text-sm select-none"
    >
      <ul className="space-y-1">
        <NavGroup label="Overview">
          <NavItem
            label="Dashboard"
            href="/dashboard"
            active={activePath === "/dashboard"}
          />
          <NavItem
            label="Metrics"
            href="/dashboard/metrics"
            active={activePath === "/dashboard/metrics"}
          />
        </NavGroup>
        <NavGroup label="Users">
          <NavItem
            label="Volunteers"
            href="/dashboard/admin/volunteers"
            active={activePath?.includes("volunteers")}
          />
          <NavItem
            label="Staff"
            href="/dashboard/admin/staff"
            active={activePath?.includes("staff")}
          />
          <NavItem
            label="Applicants"
            href="/dashboard/admin/applicants"
            active={activePath?.includes("applicants")}
          />
        </NavGroup>
        <NavGroup label="Content" defaultOpen={false}>
          <NavItem
            label="Announcements"
            href="/dashboard/admin/announcements"
          />
          <NavItem label="Events" href="/dashboard/admin/events" />
        </NavGroup>
        <NavGroup label="Settings" defaultOpen={false}>
          <NavItem label="Profile" href="/dashboard/profile" />
        </NavGroup>
        <li className="pt-4 border-t border-[var(--color-border-default)] mt-4">
          <button className="w-full text-left text-sm font-semibold text-[var(--color-accent-error)] px-2 py-2 rounded-md hover:bg-[var(--color-accent-error-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-error)]">
            Logout
          </button>
        </li>
      </ul>
    </nav>
  );
}

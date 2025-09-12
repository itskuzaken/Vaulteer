import React, { useState, useEffect } from "react";
import SkipLink from "./SkipLink";

export default function DashboardLayout({ header, sidebar, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (sidebarOpen) document.body.classList.add("dashboard-locked");
    else document.body.classList.remove("dashboard-locked");
  }, [sidebarOpen]);

  return (
    <div className="dashboard-shell flex flex-col h-screen">
      <SkipLink />
      <header
        className="dashboard-header dashboard-header-shadow fixed top-0 left-0 right-0 z-40 bg-white flex items-center justify-between px-4 md:px-6 border-b border-gray-200"
        role="banner"
      >
        <div className="flex items-center gap-3">
          <button
            aria-label="Toggle sidebar"
            className="md:hidden btn-ghost focus-outline"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            <svg
              width="22"
              height="22"
              stroke="currentColor"
              fill="none"
              strokeWidth="2"
            >
              <path d="M3 6h16M3 12h16M3 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <div className="font-bold text-[var(--color-brand-primary)] tracking-tight">
            Dashboard
          </div>
          {header}
        </div>
        <div className="flex items-center gap-2">
          {/* placeholder user menu */}
          <button className="btn-outline text-xs">Profile</button>
        </div>
      </header>
      {/* Layout body */}
      <div className="flex flex-row flex-1 pt-16 h-full">
        {/* Sidebar */}
        <aside
          className={`dashboard-sidebar z-30 w-64 shrink-0 h-[calc(100vh-4rem)] hidden md:flex flex-col`}
        >
          {sidebar}
        </aside>
        {/* Mobile overlay sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-[45] md:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="absolute top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200 flex flex-col p-4 overflow-y-auto">
              <button
                className="self-end mb-2 btn-ghost"
                onClick={() => setSidebarOpen(false)}
              >
                ✕
              </button>
              {sidebar}
            </aside>
          </div>
        )}
        {/* Main content scroll area */}
        <main
          id="main-content"
          className="dashboard-content-scroll flex-1 h-[calc(100vh-4rem)] px-4 md:px-6 lg:px-8 pb-10 focus:outline-none"
          tabIndex={-1}
          role="main"
          aria-label="Main content area"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

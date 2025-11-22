"use client";

import React from "react";

export default function DashboardSplitLayout({
  main,
  sidebar,
  className = "",
  sidebarPosition = "right",
}) {
  const hasSidebar = Boolean(sidebar);

  const renderColumns = () => {
    if (!hasSidebar) {
      return <div className="space-y-6">{main}</div>;
    }

    if (sidebarPosition === "left") {
      return (
        <>
          <div className="space-y-6" role="complementary">
            {sidebar}
          </div>
          <div className="space-y-6" role="region">
            {main}
          </div>
        </>
      );
    }

    return (
      <>
        <div className="space-y-6" role="region">
          {main}
        </div>
        <div className="space-y-6" role="complementary">
          {sidebar}
        </div>
      </>
    );
  };

  return (
    <div className={`dashboard-grid-shell ${className}`}>
      <div className={`dashboard-grid ${hasSidebar ? "has-sidebar" : ""}`}>
        {renderColumns()}
      </div>
    </div>
  );
}

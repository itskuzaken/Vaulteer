// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import {
  IoDocumentTextOutline,
  IoChatbubbleEllipsesOutline,
  IoPeopleOutline,
  IoPersonOutline,
  IoCalendarOutline,
  IoCreateOutline,
  IoCheckmarkDoneOutline,
  IoArchiveOutline,
  IoTimeOutline,
  IoMegaphoneOutline,
  IoEyeOutline,
  IoCheckmarkCircleOutline,
  IoAddCircleOutline,
  IoChevronDownOutline,
  IoAnalyticsOutline,
  IoGridOutline,
  IoMenuOutline,
  IoCloseOutline,
} from "react-icons/io5";

export default function ModernSidebar({
  role = "admin",
  collapsed = false,
  onNavigate,
  selectedContent,
  selectedSubContent,
  onContentChange,
  onSubContentChange,
  onExpandRequest, // New prop to request sidebar expansion
  onToggleSidebar, // New prop to toggle sidebar collapse
  roleColors, // New prop for role-based colors
  isMobile = false, // New prop to detect mobile mode
}) {
  const [expandedMenu, setExpandedMenu] = useState(null);

  // Auto-expand menu when a sub-content is selected
  useEffect(() => {
    if (selectedSubContent) {
      const menuItems = getMenuItems();
      // Find which menu contains this sub-content
      for (const [menuKey, menu] of Object.entries(menuItems)) {
        if (menu.subSections.includes(selectedSubContent)) {
          setExpandedMenu(menuKey);
          break;
        }
      }
    }
  }, [selectedSubContent, role]);

  // Define menu structure based on role
  const getMenuItems = () => {
    if (role === "admin") {
      return {
        Dashboard: {
          icon: <IoGridOutline className="w-5 h-5" />,
          subSections: [],
        },
        "HTS Form": {
          icon: <IoDocumentTextOutline className="w-5 h-5" />,
          subSections: ["Form Submission"],
        },
        "Manage Post": {
          icon: <IoChatbubbleEllipsesOutline className="w-5 h-5" />,
          subSections: [
            "Create Post",
            "Published Posts",
            "Archived Posts",
            "Scheduled Posts",
            "Create Announcement",
          ],
        },
        "Manage Volunteer": {
          icon: <IoPeopleOutline className="w-5 h-5" />,
          subSections: ["View All Volunteers", "Application Approval"],
        },
        "Manage Staff": {
          icon: <IoPersonOutline className="w-5 h-5" />,
          subSections: ["View All Staff"],
        },
        "Manage Events": {
          icon: <IoCalendarOutline className="w-5 h-5" />,
          subSections: ["Create Event", "Published Events", "Archived Events"],
        },
        "Activity Logs": {
          icon: <IoAnalyticsOutline className="w-5 h-5" />,
          subSections: [],
        },
      };
    } else if (role === "staff") {
      return {
        Dashboard: {
          icon: <IoGridOutline className="w-5 h-5" />,
          subSections: [],
        },
        "HTS Form": {
          icon: <IoDocumentTextOutline className="w-5 h-5" />,
          subSections: ["Form Submission"],
        },
        "Manage Post": {
          icon: <IoChatbubbleEllipsesOutline className="w-5 h-5" />,
          subSections: [
            "Create Post",
            "Published Posts",
            "Archived Posts",
            "Scheduled Posts",
            "Create Announcement",
          ],
        },
        "Manage Volunteer": {
          icon: <IoPeopleOutline className="w-5 h-5" />,
          subSections: ["View All Volunteers", "Application Approval"],
        },
        "Manage Events": {
          icon: <IoCalendarOutline className="w-5 h-5" />,
          subSections: ["Create Event", "Published Events", "Archived Events"],
        },
        "My Activity": {
          icon: <IoAnalyticsOutline className="w-5 h-5" />,
          subSections: [],
        },
      };
    } else {
      // volunteer
      return {
        Dashboard: {
          icon: <IoGridOutline className="w-5 h-5" />,
          subSections: [],
        },
        Forms: {
          icon: <IoDocumentTextOutline className="w-5 h-5" />,
          subSections: ["Submit Form", "View Submitted"],
        },
        "My Activity": {
          icon: <IoAnalyticsOutline className="w-5 h-5" />,
          subSections: [],
        },
      };
    }
  };

  const menuItems = getMenuItems();

  const subSectionIcons = {
    "Form Submission": <IoDocumentTextOutline className="w-5 h-5" />,
    "Submit Form": <IoCreateOutline className="w-5 h-5" />,
    "View Submitted": <IoEyeOutline className="w-5 h-5" />,
    "Create Post": <IoCreateOutline className="w-5 h-5" />,
    "Published Posts": <IoCheckmarkDoneOutline className="w-5 h-5" />,
    "Archived Posts": <IoArchiveOutline className="w-5 h-5" />,
    "Scheduled Posts": <IoTimeOutline className="w-5 h-5" />,
    "Create Announcement": <IoMegaphoneOutline className="w-5 h-5" />,
    "View All Volunteers": <IoEyeOutline className="w-5 h-5" />,
    "Application Approval": <IoCheckmarkCircleOutline className="w-5 h-5" />,
    "View All Staff": <IoPeopleOutline className="w-5 h-5" />,
    "Create Event": <IoAddCircleOutline className="w-5 h-5" />,
    "Published Events": <IoCheckmarkDoneOutline className="w-5 h-5" />,
    "Archived Events": <IoArchiveOutline className="w-5 h-5" />,
  };

  const handleMenuClick = (menuKey) => {
    const menu = menuItems[menuKey];

    // Auto-expand sidebar if collapsed when clicking an icon
    if (collapsed && onExpandRequest) {
      onExpandRequest();
    }

    if (menu.subSections.length === 0) {
      // No subsections, navigate directly
      onContentChange(menuKey);
      onSubContentChange && onSubContentChange(null);
      onNavigate && onNavigate();
      setExpandedMenu(null);
    } else {
      // Has subsections, toggle expand
      const isCurrentlyExpanded = expandedMenu === menuKey;
      setExpandedMenu(isCurrentlyExpanded ? null : menuKey);

      // Also set this as the selected content when expanding
      if (!isCurrentlyExpanded) {
        onContentChange(menuKey);
      }
    }
  };

  const handleSubMenuClick = (subMenu) => {
    // Auto-expand sidebar if collapsed when clicking a submenu
    if (collapsed && onExpandRequest) {
      onExpandRequest();
    }

    onSubContentChange && onSubContentChange(subMenu);
    onNavigate && onNavigate();
  };

  const isMenuActive = (menuKey) => {
    return selectedContent === menuKey;
  };

  const isSubMenuActive = (subMenu) => {
    return selectedSubContent === subMenu;
  };

  return (
    <nav className="space-y-1 px-2 py-3">
      {/* Burger Menu Toggle Button - First Item */}
      <div className="mb-2">
        <button
          onClick={onToggleSidebar}
          className={`
            w-full flex items-center rounded-lg overflow-hidden relative
            transition-all duration-300 ease-in-out
            text-gray-700 dark:text-gray-300
            hover:bg-gray-100 dark:hover:bg-gray-700
            ${collapsed ? "justify-start p-3" : "justify-start p-3"}
          `}
          style={{
            minHeight: "3rem", // 48px in rem
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {/* Icon Container - Perfectly Centered */}
          <div
            className="relative z-10 flex items-center justify-center flex-shrink-0 transition-all duration-300 ease-in-out"
            style={{
              width: "2.5rem", // 40px
              height: "2.5rem",
              minWidth: "2.5rem",
            }}
          >
            <span
              className="flex items-center justify-center transition-transform duration-300 ease-in-out"
              style={{
                width: "1.5rem", // 24px
                height: "1.5rem",
                transform: !collapsed ? "rotate(0deg)" : "rotate(180deg)",
              }}
            >
              {/* Show Close icon on mobile, Menu icon on desktop */}
              {window.innerWidth < 1024 && !collapsed ? (
                <IoCloseOutline className="w-6 h-6" />
              ) : (
                <IoMenuOutline className="w-6 h-6" />
              )}
            </span>
          </div>

          {/* Text label - Only in Expanded Mode */}
          {!collapsed && (
            <div
              className="relative z-8 flex items-center flex-1 min-w-0 transition-opacity duration-300 ease-in-out ml-3"
              style={{
                opacity: collapsed ? 0 : 1,
              }}
            >
              <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                {/* Branding Section - Only when expanded */}
                {!collapsed && roleColors && (
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-r ${roleColors.gradient} flex items-center justify-center flex-shrink-0 transition-transform duration-200 ease-in-out`}
                    >
                      <span className="text-white font-bold text-sm">
                        {role.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-gray-900 dark:text-white min-w-0">
                      <p className="text-s font-semibold truncate ">Vaulteer</p>
                    </div>
                  </div>
                )}
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

      {/* Menu Items */}
      {Object.entries(menuItems).map(([menuKey, menu]) => {
        const hasSubSections = menu.subSections.length > 0;
        const isExpanded = expandedMenu === menuKey;
        const isActive = isMenuActive(menuKey);

        return (
          <div key={menuKey} className="mb-1">
            {/* Main Menu Item */}
            <div className="group relative">
              <button
                onClick={() => handleMenuClick(menuKey)}
                className={`
                  w-full flex items-center rounded-lg overflow-hidden relative
                  transition-all duration-300 ease-in-out
                  ${collapsed ? "justify-start p-3" : "justify-start p-3"}
                  ${
                    isActive
                      ? "text-red-700 dark:text-red-300 font-semibold"
                      : "text-gray-700 dark:text-gray-300"
                  }
                `}
                style={{
                  minHeight: "3rem", // 48px in rem
                }}
              >
                {/* Active Indicator - Unified for both modes */}
                {isActive && (
                  <div
                    className="absolute rounded-lg transition-all duration-300 ease-in-out"
                    style={{
                      ...(collapsed
                        ? {
                            width: "4rem",
                            height: "4rem",
                            left: 0,
                            top: "50%",
                            transform: "translateY( -50%)",
                          }
                        : {
                            inset: 0,
                          }),
                      background:
                        "linear-gradient(135deg, rgba(211, 47, 47, 0.12) 0%, rgba(183, 28, 28, 0.18) 100%)",
                      border: "2px solid rgba(211, 47, 47, 0.3)",
                      boxShadow:
                        "0 2px 8px rgba(211, 47, 47, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.1)",
                    }}
                  />
                )}

                {/* Hover Effect (Non-Active Items) */}
                {!isActive && (
                  <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700 opacity-0 hover:opacity-100 rounded-lg transition-opacity duration-200 ease-in-out" />
                )}

                {/* Icon Container - Perfectly Centered */}
                <div
                  className="relative z-10 flex items-center justify-center flex-shrink-0 transition-all duration-300 ease-in-out"
                  style={{
                    width: "2.5rem", // 40px
                    height: "2.5rem",
                    minWidth: "2.5rem",
                  }}
                >
                  <span
                    className="flex items-center justify-center transition-transform duration-200 ease-in-out"
                    style={{
                      transform: isActive ? "scale(1.1)" : "scale(1)",
                      width: "1.5rem", // 24px
                      height: "1.5rem",
                    }}
                  >
                    {menu.icon}
                  </span>
                </div>

                {/* Text label with smooth fade - Only in Expanded Mode */}
                {!collapsed && (
                  <div
                    className="relative z-10 flex items-center flex-1 min-w-0 transition-opacity duration-300 ease-in-out ml-3"
                    style={{
                      opacity: collapsed ? 0 : 1,
                    }}
                  >
                    <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                      {menuKey}
                    </span>
                  </div>
                )}

                {/* Chevron - Only in Expanded Mode with Subsections */}
                {!collapsed && hasSubSections && (
                  <div
                    className="relative z-10 flex-shrink-0 flex items-center justify-center transition-transform duration-200 ease-in-out"
                    style={{
                      width: "1rem",
                      height: "1rem",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    <IoChevronDownOutline className="w-4 h-4" />
                  </div>
                )}
              </button>

              {/* Tooltip for collapsed sidebar */}
              {collapsed && (
                <div
                  className="absolute left-full ml-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none z-50 transition-all duration-200 ease-in-out"
                  style={{
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                >
                  {/* Tooltip Content */}
                  <div className="bg-gray-900 dark:bg-gray-700 text-white rounded-lg shadow-lg overflow-hidden">
                    {/* Main Label - Prominent at top */}
                    <div className="px-3 py-2 font-semibold text-sm whitespace-nowrap bg-gray-800 dark:bg-gray-600">
                      {menuKey}
                    </div>

                    {/* Subsections - Below label */}
                    {hasSubSections && (
                      <div className="px-3 py-2 text-xs text-gray-300 whitespace-nowrap">
                        {menu.subSections.join(", ")}
                      </div>
                    )}
                  </div>

                  {/* Tooltip Arrow */}
                  <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
                </div>
              )}
            </div>

            {/* Subsections with staggered animation */}
            {!collapsed && hasSubSections && isExpanded && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-3 animate-in slide-in-from-top-1 fade-in duration-200">
                {menu.subSections.map((subMenu, index) => {
                  const isSubActive = isSubMenuActive(subMenu);

                  return (
                    <button
                      key={subMenu}
                      onClick={() => handleSubMenuClick(subMenu)}
                      className="w-full flex items-center rounded-lg overflow-hidden relative transition-all duration-150 ease-in-out p-2"
                      style={{
                        animationDelay: `${index * 30}ms`,
                      }}
                    >
                      {/* Active Background */}
                      {isSubActive && (
                        <div
                          className="absolute inset-0 bg-red-50 dark:bg-red-900/20 rounded-lg transition-all duration-200 ease-in-out"
                          style={{
                            boxShadow: "0 1px 3px rgba(211, 47, 47, 0.15)",
                          }}
                        />
                      )}

                      {/* Hover Background (Non-Active) */}
                      {!isSubActive && (
                        <div className="absolute inset-0 bg-gray-50 dark:bg-gray-800 opacity-0 hover:opacity-100 rounded-lg transition-opacity duration-150 ease-in-out" />
                      )}

                      {/* Icon */}
                      <span
                        className={`relative z-10 flex-shrink-0 transition-all duration-200 ease-in-out ${
                          isSubActive
                            ? "text-red-700 dark:text-red-400"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                        style={{
                          transform: isSubActive ? "scale(1.05)" : "scale(1)",
                        }}
                      >
                        {subSectionIcons[subMenu]}
                      </span>

                      {/* Text */}
                      <span
                        className={`relative z-10 text-left truncate ml-2 text-sm transition-colors duration-200 ease-in-out ${
                          isSubActive
                            ? "text-red-700 dark:text-red-400 font-medium"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {subMenu}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// @ts-nocheck
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  IoChevronDownOutline,
  IoMenuOutline,
  IoCloseOutline,
} from "react-icons/io5";
import { getDashboardMenu } from "../../config/dashboardNavigationConfig";

export default function ModernSidebar({
  role = "admin",
  collapsed = false,
  onNavigate,
  selectedContent,
  selectedSubContent,
  onContentChange,
  onSubContentChange,
  onExpandRequest,
  onToggleSidebar,
  roleColors,
  isMobile = false,
}) {
  const menuItems = useMemo(() => {
    const rawMenu = getDashboardMenu(role) || {};
    return Object.entries(rawMenu).reduce((acc, [key, value]) => {
      acc[key] = {
        ...value,
        subSections: Array.isArray(value?.subSections) ? value.subSections : [],
      };
      return acc;
    }, {});
  }, [role]);
  const [expandedMenus, setExpandedMenus] = useState([]);
  const [viewportWidth, setViewportWidth] = useState(null);
  const hasHydratedExpandedState = useRef(false);
  const storageKey = useMemo(() => `modern-sidebar-expanded:${role}`, [role]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateWidth = () => {
      setViewportWidth(window.innerWidth);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const isTouchLayout =
    isMobile || (viewportWidth !== null && viewportWidth < 1024);
  const showCloseIcon = isTouchLayout && !collapsed;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const saved = window.localStorage.getItem(storageKey);
    if (!saved) {
      hasHydratedExpandedState.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        hasHydratedExpandedState.current = true;
        setExpandedMenus(parsed.filter((key) => Boolean(menuItems[key])));
      }
    } catch (error) {
      console.warn("Failed to parse sidebar expanded state", error);
      window.localStorage.removeItem(storageKey);
      hasHydratedExpandedState.current = true;
    }
  }, [menuItems, storageKey]);

  useEffect(() => {
    setExpandedMenus((current) => {
      const next = new Set(current);

      if (selectedSubContent) {
        for (const [menuKey, menu] of Object.entries(menuItems)) {
          if (menu.subSections.some((sub) => sub.key === selectedSubContent)) {
            next.add(menuKey);
          }
        }
      }

      if (selectedContent && menuItems[selectedContent]?.subSections.length) {
        next.add(selectedContent);
      }

      // Clean up stale menu keys when role changes
      for (const key of Array.from(next)) {
        if (!menuItems[key]) {
          next.delete(key);
        }
      }

      return Array.from(next);
    });
  }, [menuItems, selectedContent, selectedSubContent]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!hasHydratedExpandedState.current) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(expandedMenus));
  }, [expandedMenus, storageKey]);

  const handleMenuClick = (menuKey) => {
    const menu = menuItems[menuKey];
    if (!menu) {
      return;
    }

    if (collapsed && onExpandRequest) {
      onExpandRequest();
    }

    if (!menu.subSections.length) {
      onContentChange?.(menuKey);
      onSubContentChange?.(null);
      onNavigate?.(menuKey, null);
      if (isTouchLayout) {
        onToggleSidebar?.();
      }
      return;
    }

    setExpandedMenus((current) => {
      const next = new Set(current);
      if (next.has(menuKey)) {
        next.delete(menuKey);
      } else {
        next.add(menuKey);
      }
      return Array.from(next);
    });
    onContentChange?.(menuKey);

    // Parent navigation is intentionally suppressed when toggling dropdowns.
  };

  const handleSubMenuClick = (menuKey, subKey) => {
    if (collapsed && onExpandRequest) {
      onExpandRequest();
    }

    onContentChange?.(menuKey);
    onSubContentChange?.(subKey);
    onNavigate?.(menuKey, subKey);
    if (isTouchLayout) {
      onToggleSidebar?.();
    }
  };

  const isMenuActive = (menuKey) => {
    if (selectedContent === menuKey) {
      return true;
    }
    const menu = menuItems[menuKey];
    if (!menu) {
      return false;
    }
    return menu.subSections.some((sub) => sub.key === selectedSubContent);
  };
  const isSubMenuActive = (subKey) => selectedSubContent === subKey;

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
            ${
              collapsed
                ? "justify-start p-2.5 sm:p-3"
                : "justify-start p-2.5 sm:p-3"
            }
          `}
          style={{
            minHeight: "44px", // Minimum touch target
          }}
          aria-label={
            showCloseIcon
              ? "Close sidebar"
              : collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
        >
          {/* Icon Container - Perfectly Centered */}
          <div
            className="relative z-10 flex items-center justify-center flex-shrink-0 transition-all duration-300 ease-in-out"
            style={{
              width: "2rem", // 32px for better mobile sizing
              height: "2rem",
              minWidth: "2rem",
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
              {/* Show Close icon on touch/mobile layouts when expanded */}
              {showCloseIcon ? (
                <IoCloseOutline className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <IoMenuOutline className="w-5 h-5 sm:w-6 sm:h-6" />
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
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r ${roleColors.gradient} flex items-center justify-center flex-shrink-0 transition-transform duration-200 ease-in-out`}
                    >
                      <span className="text-white font-bold text-xs sm:text-sm">
                        {role.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-gray-900 dark:text-white min-w-0">
                      <p className="text-sm sm:text-base font-semibold truncate">
                        Vaulteer
                      </p>
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
        const isExpanded = expandedMenus.includes(menuKey);
        const isActive = isMenuActive(menuKey);
        const MenuIcon = menu.icon;

        return (
          <div key={menuKey} className="mb-1">
            {/* Main Menu Item */}
            <div className="group relative">
              <button
                type="button"
                onClick={() => handleMenuClick(menuKey)}
                className={`
                  w-full flex items-center rounded-lg overflow-hidden relative
                  transition-all duration-300 ease-in-out
                  ${
                    collapsed
                      ? "justify-start p-2.5 sm:p-3"
                      : "justify-start p-2.5 sm:p-3"
                  }
                  ${
                    isActive
                      ? "text-red-700 dark:text-red-300 font-semibold"
                      : "text-gray-700 dark:text-gray-300"
                  }
                `}
                style={{
                  minHeight: "44px", // Minimum touch target
                }}
                aria-expanded={hasSubSections ? isExpanded : undefined}
                aria-controls={
                  hasSubSections ? `${menuKey}-submenu` : undefined
                }
                aria-haspopup={hasSubSections ? "true" : undefined}
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
                    width: "2rem", // 32px for better mobile sizing
                    height: "2rem",
                    minWidth: "2rem",
                  }}
                >
                  <span
                    className="flex items-center justify-center transition-transform duration-200 ease-in-out"
                    style={{
                      transform: isActive ? "scale(1.1)" : "scale(1)",
                      width: "1.25rem", // 20px
                      height: "1.25rem",
                    }}
                  >
                    {MenuIcon && <MenuIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </span>
                </div>

                {/* Text label with smooth fade - Only in Expanded Mode */}
                {!collapsed && (
                  <div
                    className="relative z-10 flex items-center flex-1 min-w-0 transition-opacity duration-300 ease-in-out ml-2 sm:ml-3"
                    style={{
                      opacity: collapsed ? 0 : 1,
                    }}
                  >
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                      {menu.label}
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
                      {menu.label}
                    </div>

                    {/* Subsections - Below label */}
                    {hasSubSections && (
                      <div className="px-3 py-2 text-xs text-gray-300 whitespace-nowrap">
                        {menu.subSections.map((sub) => sub.label).join(", ")}
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
              <div
                id={`${menuKey}-submenu`}
                className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-3 animate-in slide-in-from-top-1 fade-in duration-200"
                role="group"
                aria-label={`${menu.label} submenu`}
              >
                {menu.subSections.map((subMenu, index) => {
                  const isSubActive = isSubMenuActive(subMenu.key);
                  const SubIcon = subMenu.icon;

                  return (
                    <button
                      key={subMenu.key}
                      type="button"
                      onClick={() => handleSubMenuClick(menuKey, subMenu.key)}
                      className="w-full flex items-center rounded-lg overflow-hidden relative transition-all duration-150 ease-in-out p-2 min-h-[44px]"
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
                        {SubIcon && (
                          <SubIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </span>

                      {/* Text */}
                      <span
                        className={`relative z-10 text-left truncate ml-2 text-xs sm:text-sm transition-colors duration-200 ease-in-out ${
                          isSubActive
                            ? "text-red-700 dark:text-red-400 font-medium"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {subMenu.label}
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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ModernDashboardLayout from "../../../components/layout/ModernDashboardLayout";
import ModernSidebar from "../../../components/sidebar/ModernSidebar";
import LogoutModal from "../../../components/modals/LogoutModal";
import RoleProtectedRoute from "../../../components/auth/RoleProtectedRoute";
import { useDashboardUser } from "../../../hooks/useDashboardUser";
import { getDashboardMenu } from "../../../config/dashboardNavigationConfig";

const LOADER_BORDER_COLORS = {
  admin: "border-red-600",
  staff: "border-green-600",
  volunteer: "border-yellow-500",
};

function Loader({ role }) {
  const borderClass = LOADER_BORDER_COLORS[role] || "border-red-600";
  return (
    <div
      suppressHydrationWarning
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"
    >
      <div suppressHydrationWarning className="text-center">
        <div
          className={`animate-spin rounded-full h-12 w-12 border-b-2 ${borderClass} mx-auto mb-4`}
        ></div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Loading...
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please wait while we load your dashboard.
        </p>
      </div>
    </div>
  );
}

export default function DashboardRouteRenderer({
  role,
  basePath,
  contentSlug,
  subContentSlug,
  defaultContent,
  mainRoutes,
  subRoutes,
  routingStrategy = "path",
  settingsRoute,
  profileRoute,
  onSettingsClickOverride,
  onProfileClickOverride,
}) {
  const router = useRouter();
  const { user, status, gamification, refreshGamification } =
    useDashboardUser();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const menuItems = useMemo(() => getDashboardMenu(role), [role]);

  const currentContent = contentSlug ?? defaultContent;
  const currentSub = subContentSlug ?? null;

  const menuEntry = menuItems[currentContent];
  const mainRoute = mainRoutes[currentContent];
  const subRoute = currentSub ? subRoutes[currentSub] : null;

  const resolvedSettingsRoute = useMemo(() => {
    if (settingsRoute === undefined) {
      return { content: "settings", subContent: "general-settings" };
    }
    return settingsRoute;
  }, [settingsRoute]);

  const resolvedProfileRoute = useMemo(() => {
    if (profileRoute === undefined) {
      return { content: "profile", subContent: null };
    }
    return profileRoute;
  }, [profileRoute]);

  const profileContentKey = resolvedProfileRoute?.content ?? null;

  const buildPath = useCallback(
    (targetContent, targetSub, extraParams) => {
      const normalizedContent = targetContent || defaultContent;

      if (routingStrategy === "query") {
        const params = new URLSearchParams();

        if (normalizedContent && normalizedContent !== defaultContent) {
          params.set("content", normalizedContent);
        }

        if (targetSub) {
          params.set("subcontent", targetSub);
        }

        if (extraParams) {
          Object.entries(extraParams).forEach(([key, value]) => {
            if (value === undefined || value === null) {
              params.delete(key);
              return;
            }
            params.set(key, String(value));
          });
        }

        const query = params.toString();
        return query ? `${basePath}?${query}` : basePath;
      }

      let path = basePath;

      if (normalizedContent !== defaultContent || targetSub) {
        path = `${basePath}/${normalizedContent}`;
      }

      if (targetSub) {
        path = `${path}/${targetSub}`;
      }

      if (extraParams) {
        const queryParams = new URLSearchParams();
        Object.entries(extraParams).forEach(([key, value]) => {
          if (value === undefined || value === null) {
            return;
          }
          queryParams.set(key, String(value));
        });
        const query = queryParams.toString();
        if (query) {
          return `${path}?${query}`;
        }
      }

      return path;
    },
    [basePath, defaultContent, routingStrategy]
  );

  const updateRoute = useCallback(
    (targetContent, targetSub, options = {}) => {
      const { replace = false, extraParams } = options;
      const nextPath = buildPath(targetContent, targetSub, extraParams);
      if (replace) {
        router.replace(nextPath, { scroll: false });
      } else {
        router.push(nextPath, { scroll: false });
      }
    },
    [buildPath, router]
  );

  // Redirect invalid or incomplete routes to sensible defaults
  useEffect(() => {
    if (!contentSlug && routingStrategy === "path") {
      if (currentContent !== defaultContent) {
        updateRoute(defaultContent, null, { replace: true });
      }
      return;
    }

    if (!menuEntry && !mainRoute) {
      updateRoute(defaultContent, null, { replace: true });
      return;
    }

    if (subRoute && subRoute.parent && subRoute.parent !== currentContent) {
      updateRoute(subRoute.parent, subRoute.key, { replace: true });
      return;
    }

    if (menuEntry?.subSections?.length) {
      const allowedSubs = menuEntry.subSections.map((section) => section.key);
      const fallbackSub = menuEntry.defaultSubSection || allowedSubs[0];

      if (!currentSub && fallbackSub) {
        updateRoute(currentContent, fallbackSub, { replace: true });
        return;
      }

      if (currentSub && !allowedSubs.includes(currentSub)) {
        if (fallbackSub) {
          updateRoute(currentContent, fallbackSub, { replace: true });
        } else {
          updateRoute(currentContent, null, { replace: true });
        }
        return;
      }
    }

    if (!currentSub && mainRoute && mainRoute.defaultSub) {
      updateRoute(currentContent, mainRoute.defaultSub, { replace: true });
    }
  }, [
    contentSlug,
    currentContent,
    currentSub,
    defaultContent,
    mainRoute,
    menuEntry,
    routingStrategy,
    subRoute,
    updateRoute,
  ]);

  const navigateTo = useCallback(
    (targetContent, targetSub = null, options = {}) => {
      const normalizedContent = targetContent || defaultContent;
      const normalizedSub = targetSub || null;
      const { extraParams, replace } = options;

      if (
        normalizedContent === currentContent &&
        (normalizedSub || null) === (currentSub || null)
      ) {
        return;
      }

      let nextParams = extraParams;

      if (
        user?.uid &&
        profileContentKey &&
        normalizedContent === profileContentKey
      ) {
        const hasUserUid =
          extraParams &&
          Object.prototype.hasOwnProperty.call(extraParams, "userUid");
        if (!hasUserUid) {
          nextParams = {
            ...(extraParams || {}),
            userUid: user.uid,
          };
        }
      }

      updateRoute(normalizedContent, normalizedSub, {
        replace,
        extraParams: nextParams,
      });
    },
    [
      currentContent,
      currentSub,
      defaultContent,
      profileContentKey,
      updateRoute,
      user?.uid,
    ]
  );

  const handleLogout = useCallback(() => {
    setShowLogoutModal(true);
  }, []);

  const handleSettingsClick = useCallback(() => {
    if (typeof onSettingsClickOverride === "function") {
      onSettingsClickOverride();
      return;
    }

    if (resolvedSettingsRoute) {
      const params =
        typeof resolvedSettingsRoute.params === "function"
          ? resolvedSettingsRoute.params({ user })
          : resolvedSettingsRoute?.params;

      navigateTo(
        resolvedSettingsRoute.content,
        resolvedSettingsRoute.subContent ?? null,
        { extraParams: params }
      );
    }
  }, [navigateTo, onSettingsClickOverride, resolvedSettingsRoute, user]);

  const handleProfileClick = useCallback(() => {
    if (typeof onProfileClickOverride === "function") {
      onProfileClickOverride();
      return;
    }

    if (resolvedProfileRoute) {
      const params =
        typeof resolvedProfileRoute.params === "function"
          ? resolvedProfileRoute.params({ user })
          : resolvedProfileRoute?.params;

      navigateTo(
        resolvedProfileRoute.content,
        resolvedProfileRoute.subContent ?? null,
        { extraParams: params }
      );
    }
  }, [navigateTo, onProfileClickOverride, resolvedProfileRoute, user]);

  const sidebarContentKey = useMemo(() => {
    if (subRoute?.parent && menuItems[subRoute.parent]) {
      return subRoute.parent;
    }

    if (mainRoute?.sidebarKey && menuItems[mainRoute.sidebarKey]) {
      return mainRoute.sidebarKey;
    }

    return menuItems[currentContent] ? currentContent : null;
  }, [currentContent, mainRoute, menuItems, subRoute]);

  const sidebarSubKey = useMemo(() => {
    if (!subRoute) return null;
    return menuItems[subRoute.parent] ? subRoute.key : null;
  }, [menuItems, subRoute]);

  const pageTitle = useMemo(() => {
    if (subRoute) {
      return subRoute.label || menuItems[subRoute.parent]?.label || "Dashboard";
    }
    if (mainRoute && mainRoute.label) {
      return mainRoute.label;
    }
    if (menuEntry && menuEntry.label) {
      return menuEntry.label;
    }
    return "Dashboard";
  }, [mainRoute, menuEntry, subRoute, menuItems]);

  const ActiveComponent = useMemo(() => {
    if (subRoute && subRoute.component) {
      return subRoute.component;
    }
    if (mainRoute && mainRoute.component) {
      return mainRoute.component;
    }
    const defaultRoute = mainRoutes[defaultContent];
    return defaultRoute?.component || null;
  }, [defaultContent, mainRoute, mainRoutes, subRoute]);

  const activeComponentProps = useMemo(() => {
    if (!ActiveComponent) {
      return {};
    }

    const props = {};

    if (user) {
      props.currentUser = user;
    }

    if (gamification) {
      props.gamificationSummary = gamification;
    }

    if (refreshGamification) {
      props.refreshGamification = refreshGamification;
    }

    const allowNavigate =
      (subRoute && subRoute.withNavigate) ||
      (!subRoute && mainRoute && mainRoute.withNavigate) ||
      (!subRoute && currentContent === "dashboard");

    if (allowNavigate) {
      props.onNavigate = navigateTo;
    }

    return props;
  }, [
    ActiveComponent,
    currentContent,
    gamification,
    mainRoute,
    navigateTo,
    refreshGamification,
    subRoute,
    user,
  ]);

  if (status !== "ready" || !user) {
    return <Loader role={role} />;
  }

  return (
    <RoleProtectedRoute requiredRole={role}>
      <ModernDashboardLayout
        role={role}
        user={user}
        pageTitle={pageTitle}
        onLogout={handleLogout}
        onSettingsClick={handleSettingsClick}
        onProfileClick={handleProfileClick}
        sidebar={
          <ModernSidebar
            role={role}
            selectedContent={sidebarContentKey}
            selectedSubContent={sidebarSubKey}
            onContentChange={() => {}}
            onSubContentChange={() => {}}
            onNavigate={navigateTo}
          />
        }
      >
        {ActiveComponent ? <ActiveComponent {...activeComponentProps} /> : null}
      </ModernDashboardLayout>

      {showLogoutModal && (
        <LogoutModal
          isOpen={showLogoutModal}
          onCancel={() => setShowLogoutModal(false)}
          setShowLogoutModal={setShowLogoutModal}
        />
      )}
    </RoleProtectedRoute>
  );
}

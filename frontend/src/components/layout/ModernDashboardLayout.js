// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  IoMenuOutline,
  IoCloseOutline,
  IoChevronDownOutline,
  IoSettingsOutline,
  IoLogOutOutline,
  IoPersonOutline,
} from "react-icons/io5";
import NotificationBell from "../notifications/NotificationBell";
import { getComprehensiveUserProfile } from "../../services/profileService";
import { API_BASE } from "../../config/config";
import { getCurrentUser } from "../../services/userService";
import { getAuth } from "firebase/auth";
import useIsClient from "../../hooks/useIsClient";
import useWindowSize from "../../hooks/useWindowSize";

export default function ModernDashboardLayout({
  children,
  sidebar,
  role = "admin",
  user,
  pageTitle = "Dashboard",
  onLogout,
  onSettingsClick,
  onProfileClick,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [dbProfile, setDbProfile] = useState(null);
  const [avatarSrc, setAvatarSrc] = useState(
    user?.photoURL || "/default-profile.png"
  );
  const userMenuRef = useRef(null);

  // SSR-safe client detection and window size tracking
  const isClient = useIsClient();
  const { width: windowWidth } = useWindowSize();

  // Update avatar from database profile or Firebase Auth
  useEffect(() => {
    if (dbProfile?.user?.profile_picture) {
      setAvatarSrc(dbProfile.user.profile_picture);
    } else if (user?.photoURL) {
      setAvatarSrc(user.photoURL);
    } else {
      setAvatarSrc("/default-profile.png");
    }
  }, [dbProfile?.user?.profile_picture, user?.photoURL]);

  // Fetch user ID and profile data from database
  useEffect(() => {
    const fetchUserProfile = async () => {
      const auth = getAuth();
      const firebaseUser = auth.currentUser;

      if (!firebaseUser) return;

      try {
        // Use centralized userService which supports caching/dedupe
        const meData = await getCurrentUser();
        const currentUserUid = meData?.uid;

        if (currentUserUid) {
          const profileData = await getComprehensiveUserProfile(currentUserUid);
          setDbProfile(profileData);
        }
      } catch (error) {
        console.error("Error fetching user profile for dashboard:", error);
        // Fallback to Firebase displayName if database fetch fails
      }
    };

    fetchUserProfile();
  }, []);

  // Role-based accent colors
  const roleColors = {
    admin: {
      gradient: "from-red-600 to-red-700",
      bg: "bg-red-600",
      hover: "hover:bg-red-700",
      text: "text-red-600",
      border: "border-red-600",
      light: "bg-red-50",
    },
    staff: {
      gradient: "from-green-600 to-green-700",
      bg: "bg-green-600",
      hover: "hover:bg-green-700",
      text: "text-green-600",
      border: "border-green-600",
      light: "bg-green-50",
    },
    volunteer: {
      gradient: "from-yellow-500 to-yellow-600",
      bg: "bg-yellow-500",
      hover: "hover:bg-yellow-600",
      text: "text-yellow-600",
      border: "border-yellow-600",
      light: "bg-yellow-50",
    },
  };

  const currentColors = roleColors[role.toLowerCase()] || roleColors.admin;

  // Function to get full name from database profile
  const getFullName = () => {
    if (dbProfile?.profile) {
      const { first_name, middle_initial, last_name } = dbProfile.profile;
      if (first_name && last_name) {
        return middle_initial
          ? `${first_name} ${middle_initial}. ${last_name}`
          : `${first_name} ${last_name}`;
      }
    }
    // Fallback to database user name, then user prop displayName
    return "Unknown User";
  };

  // Close mobile sidebar and user menu on resize to desktop
  // Auto-collapse sidebar on tablet and below
  useEffect(() => {
    if (!isClient || !windowWidth) return;

    // Desktop (≥1024px) - Keep sidebar expanded
    if (windowWidth >= 1024) {
      setMobileSidebarOpen(false);
      setSidebarOpen(true);
    }
    // Tablet (768px - 1023px) - Auto-collapse sidebar
    else if (windowWidth >= 768 && windowWidth < 1024) {
      setMobileSidebarOpen(false);
      setSidebarOpen(false);
    }
    // Mobile (<768px) - Use mobile sidebar overlay
    else {
      setSidebarOpen(false);
    }
  }, [isClient, windowWidth]);

  // Handler for sidebar expansion request from collapsed state
  const handleExpandRequest = () => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
    }
  };

  // Handler for mobile sidebar expansion request
  const handleMobileExpandRequest = () => {
    if (!mobileSidebarOpen) {
      setMobileSidebarOpen(true);
    }
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && userMenuOpen) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [userMenuOpen]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileSidebarOpen]);

  const originalSidebarNavigate = sidebar?.props?.onNavigate;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col z-40 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"
        style={{
          width: sidebarOpen ? "18rem" : "5rem",
          transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: sidebarOpen
            ? "0 0.625rem 0.9375rem -0.1875rem rgba(0, 0, 0, 0.1), 0 0.25rem 0.375rem -0.125rem rgba(0, 0, 0, 0.05)"
            : "0 0.25rem 0.375rem -0.0625rem rgba(0, 0, 0, 0.1), 0 0.125rem 0.25rem -0.0625rem rgba(0, 0, 0, 0.06)",
        }}
      >
        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
          {React.cloneElement(sidebar, {
            collapsed: !sidebarOpen,
            onExpandRequest: handleExpandRequest,
            onToggleSidebar: () => setSidebarOpen(!sidebarOpen),
            roleColors: currentColors,
            isMobile: false,
          })}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />

          {/* Sidebar */}
          <aside className="absolute inset-y-0 left-0 w-72 bg-white dark:bg-gray-800 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            {/* Mobile Sidebar Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {React.cloneElement(sidebar, {
                collapsed: false,
                isMobile: true,
                onNavigate: (...args) => {
                  originalSidebarNavigate?.(...args);
                  setMobileSidebarOpen(false);
                },
                onExpandRequest: handleMobileExpandRequest,
                onToggleSidebar: () => setMobileSidebarOpen(false),
                roleColors: currentColors,
              })}
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area - Fully Responsive with Smooth Transitions */}
      <div
        className="min-h-screen"
        style={{
          marginLeft:
            isClient && windowWidth >= 1024
              ? sidebarOpen
                ? "18rem"
                : "5rem"
              : "0",
          width:
            isClient && windowWidth >= 1024
              ? sidebarOpen
                ? "calc(100% - 18rem)"
                : "calc(100% - 5rem)"
              : "100%",
          transition:
            "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          willChange: "margin-left, width",
        }}
      >
        {/* Top Header - Responsive and Adaptive */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-300 ease-in-out">
          <div className="flex items-center justify-between h-19
           px-4 sm:px-6 lg:px-8 transition-all duration-300">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              {/* Mobile Burger Menu - Only Visible on Mobile */}
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-2 flex-shrink-0 transition-colors duration-200"
                aria-label="Open menu"
              >
                <IoMenuOutline className="w-6 h-6" />
              </button>

              {/* Page Title - Responsive text size */}
              <h1 className="text-sm sm:text-base md:text-lg lg:text-2xl font-semibold text-gray-900 dark:text-white truncate transition-all duration-300 max-w-[150px] sm:max-w-[200px] md:max-w-none">
                {pageTitle}
              </h1>
            </div>
            {/* Right Section - Notifications & User Profile */}
            {user && (
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                {/* Notification Bell */}
                <NotificationBell currentUser={user} />

                {/* User Profile Dropdown */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 sm:gap-3 md:gap-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-2 pr-2 sm:pr-3 md:pr-4 transition-all duration-200 hover:scale-[1.02]"
                    aria-label="User menu"
                    aria-expanded={userMenuOpen}
                  >
                    <div className="hidden sm:block text-right min-w-0 max-w-[120px] md:max-w-none">
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {getFullName()}
                      </p>
                      <p
                        className={`text-xs ${currentColors.text} capitalize font-medium truncate`}
                      >
                        {role}
                      </p>
                    </div>
                    {user?.photoURL ? (
                      <Image
                        src={avatarSrc}
                        alt={getFullName()}
                        width={40}
                        height={40}
                        sizes="(max-width: 640px) 36px, 40px"
                        className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full border-2 ${currentColors.border} object-cover transition-transform duration-200 flex-shrink-0`}
                        onError={() => setAvatarSrc("/default-profile.png")}
                        priority
                      />
                    ) : (
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full ${
                          currentColors.bg
                        } flex items-center justify-center text-white font-semibold text-xs sm:text-sm transition-transform duration-200 flex-shrink-0 ${
                          userMenuOpen
                            ? "ring-2 ring-offset-2 " + currentColors.border
                            : ""
                        }`}
                      >
                        {getFullName().charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>

                  {/* Dropdown Menu with smooth animation */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 sm:w-52 md:w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                      {/* User Info in Dropdown (Mobile) */}
                      <div className="md:hidden px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {getFullName()}
                        </p>
                        <p
                          className={`text-xs ${currentColors.text} capitalize font-medium`}
                        >
                          {role}
                        </p>
                      </div>

                      {/* Profile Option */}
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onProfileClick && onProfileClick();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <IoPersonOutline className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" />
                        <span className="text-sm font-medium">Profile</span>
                      </button>

                      {/* Settings Option */}
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onSettingsClick && onSettingsClick();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <IoSettingsOutline className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" />
                        <span className="text-sm font-medium">Settings</span>
                      </button>

                      {/* Logout Option */}
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onLogout && onLogout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-gray-200 dark:border-gray-700 group"
                      >
                        <IoLogOutOutline className="w-5 h-5 transition-transform group-hover:translate-x-1 duration-200" />
                        <span className="text-sm font-medium">Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Content - Responsive with Smooth Transitions */}
        <main className="min-h-[calc(100vh-4rem)] p-3 sm:p-4 md:p-6 lg:p-8 transition-all duration-300">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

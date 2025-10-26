"use client";

import { useState, useEffect, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Navigation from "../../../components/sidebar/VolunteerSidebar";
import SubmitForm from "../../../components/navigation/Form/SubmitForm";
import ViewSubmitted from "../../../components/navigation/Form/ViewSubmitted";
import VolunteerOverview from "../../../components/navigation/Overview/VolunteerOverview";

// Map sub-section names to components
const subContentComponentMap = {
  "Submit Form": SubmitForm,
  "View Submitted": ViewSubmitted,
};

function VolunteerDashboard() {
  const [user, setUser] = useState(null);
  const [selectedContent, setSelectedContent] = useState("Overview");
  const [selectedSubContent, setSelectedSubContent] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Responsive sidebar open/close
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleContentChange = (content) => {
    setSelectedContent(content);
    setSelectedSubContent(null);
  };

  const handleSubContentChange = (subContent) => {
    setSelectedSubContent(subContent);
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      try {
        if (currentUser) {
          setUser({
            displayName: currentUser.displayName || "Unknown User",
            photoURL: currentUser.photoURL || null,
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error handling auth state change:", error);
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // SSR/CSR hydration fix: Only render sidebar on client after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Render logic: show VolunteerOverview if Overview is selected, else show sub-content
  let ActiveComponent;
  if (selectedContent === "Overview") {
    ActiveComponent = VolunteerOverview;
  } else if (
    selectedSubContent &&
    Object.prototype.hasOwnProperty.call(
      subContentComponentMap,
      selectedSubContent
    )
  ) {
    ActiveComponent = subContentComponentMap[selectedSubContent];
  } else if (
    selectedContent &&
    Object.prototype.hasOwnProperty.call(
      subContentComponentMap,
      selectedContent
    )
  ) {
    ActiveComponent = subContentComponentMap[selectedContent];
  } else {
    ActiveComponent = VolunteerOverview;
  }

  // Close sidebar when clicking outside the sidebar (on mobile)
  const sidebarRef = useRef(null);

  useEffect(() => {
    if (!sidebarOpen || window.innerWidth >= 768) return;

    function handleClickOutside(event) {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        !event.target.closest(
          '[aria-label="Close sidebar"],[aria-label="Open sidebar"]'
        )
      ) {
        setSidebarOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed header */}
      <div className="flex items-center bg-[#bb3031] text-white p-4 fixed top-0 left-0 right-0 z-40">
        <button
          className="md:hidden flex items-center justify-center rounded focus:outline-none focus:ring-2 focus:ring-white mr-2"
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          aria-expanded={sidebarOpen}
          onClick={(e) => {
            e.stopPropagation();
            setSidebarOpen((v) => !v);
          }}
        >
          <svg
            className="h-7 w-7 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {sidebarOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
        <div className="text-xl font-bold">Vaulteer Dashboard</div>
      </div>
      {/* Main content area */}
      <div className="flex-1 flex pt-16">
        {/* Sidebar: show as column on mobile if open, always on md+ */}
        {mounted && (
          <div
            ref={sidebarRef}
            className={`
              absolute z-30 top-16 left-0 w-64 h-[calc(100vh-4rem)] pl-4 py-4 shadow-lg
              transition-all duration-300 ease-in-out
              ${
                sidebarOpen
                  ? "translate-x-0 opacity-100 pointer-events-auto"
                  : "-translate-x-full opacity-0 pointer-events-none"
              }
              md:static md:z-auto md:block md:w-64 md:h-auto md:bg-transparent  md:translate-x-0 md:opacity-100 md:pointer-events-auto
            `}
            style={{ willChange: "transform, opacity" }}
          >
            <Navigation
              user={user}
              onContentChange={handleContentChange}
              onSubContentChange={handleSubContentChange}
              setUser={setUser}
            />
          </div>
        )}
        {/* Main page content */}
        <div
          className={`flex-1 p-4 transition-all duration-300 ${
            mounted && sidebarOpen && window.innerWidth < 768
              ? "opacity-30 pointer-events-none select-none"
              : "opacity-100 pointer-events-auto"
          }`}
          onClick={() => {
            if (sidebarOpen && window.innerWidth < 768) setSidebarOpen(false);
          }}
        >
          {user ? (
            <section>
              <ActiveComponent />
            </section>
          ) : (
            <section>
              <h1 className="text-2xl font-bold mb-4">Loading...</h1>
              <p>Please wait while we load your dashboard.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default VolunteerDashboard;

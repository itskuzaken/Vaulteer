"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { searchUsersByRoleAndName } from "../../../services/searchService";
import UserFilter from "../../filter/UserFilter";
import { useFilteredAndSortedUsers } from "../../../hooks/useFilters";
import { createUserCard } from "../../card/UserCard";
import { SkeletonList } from "../../ui/SkeletonList";

function AdaptiveSearchBar({
  value,
  onChange,
  inputRef,
  showInput,
  setShowInput,
}) {
  const wrapperRef = useRef(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    function handleResize() {
      setIsDesktop(window.innerWidth >= 768);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!showInput || isDesktop) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setShowInput(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showInput, setShowInput, isDesktop]);

  useEffect(() => {
    if (!showInput || isDesktop) return;
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowInput(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showInput, setShowInput, isDesktop]);

  if (isDesktop) {
    return (
      <input
        ref={inputRef}
        type="text"
        placeholder="Search by name..."
        value={value}
        onChange={onChange}
        className="border border-gray-500 rounded px-3 py-2.25 text-sm transition-all w-full md:w-40 lg:w-60 focus:outline-none focus:ring-2 focus:ring-green-600 hover:ring-1 hover:ring-green-600"
        style={{ maxWidth: "20rem", minWidth: 0 }}
        aria-label="Search by name"
        tabIndex={0}
      />
    );
  }

  return (
    <div className="relative flex items-center min-w-0" ref={wrapperRef}>
      {!showInput && (
        <button
          className="p-2 bg-white border border-green-600 text-green-600 rounded hover:bg-green-600 hover:text-white transition flex items-center justify-center"
          aria-label="Open search"
          type="button"
          style={{
            width: 40,
            height: 40,
            minWidth: 40,
            minHeight: 40,
          }}
          onClick={() => setShowInput(true)}
          tabIndex={0}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
              stroke="currentColor"
              strokeWidth="2"
            />
            <line
              x1="21"
              y1="21"
              x2="16.65"
              y2="16.65"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
      {showInput && (
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by name..."
          value={value}
          onChange={onChange}
          onBlur={() => setShowInput(false)}
          className="border border-gray-500 rounded px-3 py-2 text-sm transition-all w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-green-600"
          style={{
            maxWidth: 300,
            minWidth: 0,
            opacity: showInput ? 1 : 0,
            zIndex: 10,
            transition: "opacity 0.2s, width 0.2s",
          }}
          aria-label="Search by name"
          autoFocus={showInput}
        />
      )}
    </div>
  );
}

export default function ViewAllStaff({
  onNavigate,
  profileBasePath = "/dashboard/admin/profile",
}) {
  const router = useRouter();
  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const inputRef = useRef(null);

  const [filters, setFilters] = useState({
    status: "",
    orderBy: "date",
    nameOrder: "name_asc",
    dateOrder: "date_desc",
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    if (showMobileSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showMobileSearch]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await searchUsersByRoleAndName(
          "staff",
          debouncedTerm,
          filters
        );
        setAllStaff(data);
      } catch (error) {
        console.error("Unable to load staff:", error);
        setAllStaff([]);
        setLoadError(error?.message || "Unable to load staff at this time.");
      }
      setLoading(false);
    }

    fetchData();
  }, [debouncedTerm, filters, refreshKey]);

  const filteredStaff = useFilteredAndSortedUsers(allStaff, filters);

  const handleStaffCardClick = (staff) => {
    if (!staff?.id) {
      return;
    }

    if (typeof onNavigate === "function") {
      onNavigate("profile", null, {
        extraParams: {
          userId: staff.id,
        },
      });
      return;
    }

    const basePath = profileBasePath || "/dashboard/admin/profile";
    router.push(`${basePath}?userId=${encodeURIComponent(staff.id)}`);
  };

  return (
    <div className="flex flex-col w-full gap-6">
      <div className="flex-1 flex justify-center">
        <div className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-md p-4 md:p-6 transition-all duration-300">
          <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
            <div className="flex flex-row items-center gap-2 w-full md:hidden">
              <h1 className="text-lg flex-shrink-0 text-green-600 dark:text-green-400 font-semibold tracking-tight">
                Staff
              </h1>
              <div className="flex flex-row items-center gap-2 flex-1 min-w-0 justify-end">
                <AdaptiveSearchBar
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  inputRef={inputRef}
                  showInput={showMobileSearch}
                  setShowInput={setShowMobileSearch}
                />
                <UserFilter
                  filters={filters}
                  onChange={setFilters}
                  role="staff"
                />
              </div>
            </div>
            <div className="hidden md:flex flex-row items-center justify-between w-full gap-3 flex-wrap">
              <h1 className="md:text-xl lg:text-2xl font-semibold text-green-600 dark:text-green-400 tracking-tight">
                Staff
              </h1>
              <div className="flex flex-row items-center gap-2">
                <AdaptiveSearchBar
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  inputRef={inputRef}
                  showInput={true}
                  setShowInput={() => {}}
                />
                <UserFilter
                  filters={filters}
                  onChange={setFilters}
                  role="staff"
                />
              </div>
            </div>
          </div>

          <div>
            {loading ? (
              <SkeletonList count={6} />
            ) : loadError ? (
              <div className="text-center text-sm md:text-base text-red-500 py-12">
                <div className="mb-2 font-semibold">{loadError}</div>
                <button
                  onClick={() => setRefreshKey((prev) => prev + 1)}
                  className="btn-outline text-xs"
                >
                  Retry
                </button>
              </div>
            ) : !filteredStaff.length ? (
              <div className="text-center text-sm md:text-base text-gray-500 py-12">
                <div className="mb-2 font-semibold text-[var(--color-text-subtle)]">
                  No staff found
                </div>
                <button
                  onClick={() => setSearchTerm("")}
                  className="btn-outline text-xs"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStaff.map((staff) => {
                  const card = createUserCard({
                    user: staff,
                    onClick: handleStaffCardClick,
                    tabIndex: 0,
                  });
                  return (
                    <div
                      key={staff.id}
                      className="ds-card cursor-pointer"
                      ref={(node) => {
                        if (node && node.firstChild !== card) {
                          node.innerHTML = "";
                          node.appendChild(card);
                        }
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

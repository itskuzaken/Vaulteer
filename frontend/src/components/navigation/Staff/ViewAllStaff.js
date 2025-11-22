"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { searchUsersByRoleAndName } from "../../../services/searchService";
import { useFilteredAndSortedUsers } from "../../../hooks/useFilters";
import { createUserCard } from "../../card/UserCard";
import { SkeletonList } from "../../ui/SkeletonList";
import Pagination from "../../pagination/Pagination";
import LogFilterSearch from "../../logs/LogFilterSearch";
import { useLogFiltersState } from "../../../hooks/useLogFiltersState";

const ITEMS_PER_PAGE = 9;

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "deactivated", label: "Deactivated" },
];

const SORT_OPTIONS = [
  { value: "date_desc", label: "Date Added - Newest" },
  { value: "date_asc", label: "Date Added - Oldest" },
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
];

export default function ViewAllStaff({
  onNavigate,
  profileBasePath = "/dashboard/admin/profile",
}) {
  const router = useRouter();
  const gridRef = useRef(null);

  const initialFilters = useMemo(
    () => ({
      search: "",
      status: "",
      orderBy: "date",
      nameOrder: "name_asc",
      dateOrder: "date_desc",
      sort: "date_desc",
    }),
    []
  );

  const {
    filters,
    debouncedSearch,
    setFilter,
    patchFilters,
    resetFilters,
    activeFilters,
  } = useLogFiltersState("staff-directory-filters", initialFilters, 400);

  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLoading, setPageLoading] = useState(false);

  const filterConfig = useMemo(
    () => ({
      searchPlaceholder: "Search staff by name...",
      fields: [
        {
          type: "select",
          key: "status",
          label: "Status",
          options: STATUS_OPTIONS,
        },
        {
          type: "select",
          key: "sort",
          label: "Sort By",
          options: SORT_OPTIONS,
        },
      ],
    }),
    []
  );

  const handleFilterChange = useCallback(
    (key, value) => {
      if (key === "status") {
        patchFilters({ status: value || "" });
        return;
      }
      if (key === "sort") {
        if (value === "name_asc" || value === "name_desc") {
          patchFilters({
            sort: value,
            orderBy: "name",
            nameOrder: value,
            dateOrder: "date_desc",
          });
        } else {
          patchFilters({
            sort: value,
            orderBy: "date",
            dateOrder: value,
            nameOrder: "name_asc",
          });
        }
        return;
      }
      setFilter(key, value);
    },
    [patchFilters, setFilter]
  );

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setLoadError(null);
      setPageLoading(false);
      try {
        const queryFilters = {
          status: filters.status,
          orderBy: filters.orderBy,
          nameOrder: filters.nameOrder,
          dateOrder: filters.dateOrder,
        };
        const data = await searchUsersByRoleAndName(
          "staff",
          debouncedSearch,
          queryFilters
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
  }, [
    debouncedSearch,
    filters.status,
    filters.orderBy,
    filters.nameOrder,
    filters.dateOrder,
    refreshKey,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filters.status, filters.sort, refreshKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleStatusUpdated = (event) => {
      const detail = event?.detail || {};
      const targetId = detail.userId;
      const nextStatus =
        typeof detail.status === "string" ? detail.status : undefined;

      if (targetId != null && nextStatus) {
        const targetIdString = String(targetId);
        setAllStaff((prev) => {
          if (!Array.isArray(prev) || !prev.length) {
            return prev;
          }
          return prev.map((staff) => {
            if (staff?.id == null) {
              return staff;
            }
            return String(staff.id) === targetIdString
              ? { ...staff, status: nextStatus }
              : staff;
          });
        });
      }

      setRefreshKey((prev) => prev + 1);
    };

    window.addEventListener(
      "vaulteer:user-status-updated",
      handleStatusUpdated
    );

    return () => {
      window.removeEventListener(
        "vaulteer:user-status-updated",
        handleStatusUpdated
      );
    };
  }, []);

  const filteredStaff = useFilteredAndSortedUsers(allStaff, filters);
  const totalStaff = filteredStaff.length;
  const totalPages = Math.max(1, Math.ceil(totalStaff / ITEMS_PER_PAGE));
  const hasResults = totalStaff > 0;
  const shouldShowPagination = hasResults && totalPages > 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!pageLoading) {
      return undefined;
    }
    const timeout = setTimeout(() => setPageLoading(false), 220);
    return () => clearTimeout(timeout);
  }, [pageLoading, currentPage]);

  useEffect(() => {
    if (loading) {
      setPageLoading(false);
    }
  }, [loading]);

  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStaff.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStaff, currentPage]);

  const pageRangeStart = totalStaff
    ? (currentPage - 1) * ITEMS_PER_PAGE + 1
    : 0;
  const pageRangeEnd = totalStaff
    ? Math.min(currentPage * ITEMS_PER_PAGE, totalStaff)
    : 0;

  const formatLastLogin = useCallback((value) => {
    if (!value) {
      return "Never";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Never";
    }
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const handleStaffCardClick = (staff) => {
    const staffUid = staff?.uid;
    if (!staffUid) {
      return;
    }

    if (typeof onNavigate === "function") {
      onNavigate("profile", null, {
        extraParams: {
          userUid: staffUid,
        },
      });
      return;
    }

    const basePath = profileBasePath || "/dashboard/admin/profile";
    router.push(`${basePath}?userUid=${encodeURIComponent(staffUid)}`);
  };

  const handlePageChange = useCallback(
    (nextPage) => {
      if (nextPage === currentPage) {
        return;
      }
      if (nextPage < 1 || nextPage > totalPages) {
        return;
      }
      setPageLoading(true);
      setCurrentPage(nextPage);
      window.requestAnimationFrame(() => {
        if (gridRef.current) {
          gridRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    },
    [currentPage, totalPages]
  );

  return (
    <div className="flex flex-col w-full gap-6">
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex justify-center">
          <div className="flex flex-col w-full max-w-7xl gap-2">
            <LogFilterSearch
              filters={filters}
              defaults={initialFilters}
              config={filterConfig}
              onChange={handleFilterChange}
              onReset={resetFilters}
              activeCount={activeFilters}
              isBusy={loading || pageLoading}
            />
          </div>
        </div>
        <div className="flex justify-center">
          <div className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-md transition-all duration-300 overflow-hidden">
            <div className="p-4 md:p-6">
              {loading ? (
                <SkeletonList count={ITEMS_PER_PAGE} />
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
              ) : !hasResults ? (
                <div className="text-center text-sm md:text-base text-gray-500 py-12">
                  <div className="mb-2 font-semibold text-[var(--color-text-subtle)]">
                    No staff found
                  </div>
                  <button
                    onClick={resetFilters}
                    className="btn-outline text-xs"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <div
                    className="flex items-center justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-300"
                    role="status"
                    aria-live="polite"
                  >
                    <span>
                      Showing {pageRangeStart}-{pageRangeEnd} of {totalStaff}{" "}
                      staff members
                    </span>
                    <span>
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                  <div ref={gridRef}>
                    {pageLoading ? (
                      <SkeletonList count={ITEMS_PER_PAGE} />
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paginatedStaff.map((staff) => {
                          const card = createUserCard({
                            user: staff,
                            onClick: handleStaffCardClick,
                            tabIndex: 0,
                            extraFields: [
                              {
                                label: "Last Login",
                                value: formatLastLogin(staff.last_login_at),
                              },
                            ],
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
              )}
            </div>
            {shouldShowPagination && (
              <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3 md:px-6 md:py-4">
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalStaff}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={handlePageChange}
                  maxPageButtons={5}
                  accentColor="var(--staff-accent, #16a34a)"
                  ariaLabel="Staff pagination"
                  previousLabel="Previous"
                  nextLabel="Next"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

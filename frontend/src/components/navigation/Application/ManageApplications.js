import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllApplicants } from "../../../services/applicantsService";
import { searchUsersByRoleAndName } from "../../../services/searchService";
import { useFilteredAndSortedUsers } from "../../../hooks/useFilters";
import { SkeletonList } from "../../ui/SkeletonList";
import { createUserCard } from "../../card/UserCard";
import LogFilterSearch from "../../logs/LogFilterSearch";
import Pagination from "../../pagination/Pagination";
import { useLogFiltersState } from "../../../hooks/useLogFiltersState";
import ApplicationControlPanel from "./ApplicationControlPanel";

const ITEMS_PER_PAGE = 9;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under Review" },
  { value: "interview_scheduled", label: "Interview Scheduled" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const SORT_OPTIONS = [
  { value: "date_desc", label: "Application Date - Newest" },
  { value: "date_asc", label: "Application Date - Oldest" },
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
];

// Avatar helper
function getAvatarUrl(applicant) {
  if (applicant.profile_picture) return applicant.profile_picture;
  if (applicant.photoUrl) return applicant.photoUrl;
  if (applicant.email || applicant.name)
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      applicant.name || applicant.email || "User"
    )}&background=bb3031&color=fff&size=128`;
  return "https://ui-avatars.com/api/?name=User&background=bb3031&color=fff&size=128";
}

function normalizeStatus(value) {
  if (!value) return "pending";
  return value.toString().trim().toLowerCase();
}

function formatStatusLabel(value) {
  return normalizeStatus(value)
    .split(/[ _]+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function normalizeApplicant(applicant) {
  if (!applicant || typeof applicant !== "object") return applicant;

  const normalizedStatus = normalizeStatus(
    applicant.application_status || applicant.status
  );

  return {
    ...applicant,
    application_status: normalizedStatus,
    status: normalizedStatus,
  };
}

const mapApplicants = (list) =>
  Array.isArray(list) ? list.map((item) => normalizeApplicant(item)) : [];

export default function ManageApplications({
  onNavigate,
  profileBasePath = "/dashboard/admin/profile",
}) {
  const router = useRouter();
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [notification, setNotification] = useState({ message: "", type: "" });
  const [refreshKey, setRefreshKey] = useState(0);
  const gridRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLoading, setPageLoading] = useState(false);

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
  } = useLogFiltersState("applicant-approval-filters", initialFilters, 400);

  const filterConfig = useMemo(
    () => ({
      searchPlaceholder: "Search applicants by name...",
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
    async function hydrateInitial() {
      try {
        const baseApplicants = await getAllApplicants();
        setApplicants(mapApplicants(baseApplicants));
      } catch (error) {
        console.warn("Unable to hydrate applicants", error);
      }
    }
    hydrateInitial();
  }, []);

  useEffect(() => {
    async function fetchApplicants() {
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
          "applicant",
          debouncedSearch,
          queryFilters
        );
        setApplicants(mapApplicants(data));
      } catch (error) {
        console.error("Failed to load applicants", error);
        setApplicants([]);
        setLoadError(error?.message || "Unable to load applicants right now.");
      }
      setLoading(false);
    }

    fetchApplicants();
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
    if (!pageLoading) return undefined;
    const timeout = setTimeout(() => setPageLoading(false), 220);
    return () => clearTimeout(timeout);
  }, [pageLoading, currentPage]);

  useEffect(() => {
    if (loading) {
      setPageLoading(false);
    }
  }, [loading]);

  // Notifications auto dismiss
  const notificationRef = useRef(null);
  useEffect(() => {
    if (notification.message) {
      const t = setTimeout(
        () => setNotification({ message: "", type: "" }),
        4000
      );
      return () => clearTimeout(t);
    }
  }, [notification]);
  useEffect(() => {
    if (notification.message && notificationRef.current)
      notificationRef.current.focus();
  }, [notification]);

  // Handle card click - navigate to profile
  const handleApplicantCardClick = (applicant) => {
    const applicantUid = applicant?.uid;
    if (!applicantUid) {
      console.warn("Applicant UID not found:", applicant);
      return;
    }

    if (typeof onNavigate === "function") {
      onNavigate("profile", null, {
        extraParams: {
          userUid: applicantUid,
        },
      });
      return;
    }

    const basePath = profileBasePath || "/dashboard/admin/profile";
    router.push(`${basePath}?userUid=${encodeURIComponent(applicantUid)}`);
  };

  // Derived (reuse hook for sorting/filtering consistency)
  const filteredApplicants = useFilteredAndSortedUsers(applicants, filters);
  const totalApplicants = filteredApplicants.length;
  const totalPages = Math.max(1, Math.ceil(totalApplicants / ITEMS_PER_PAGE));
  const hasResults = totalApplicants > 0;
  const shouldShowPagination = hasResults && totalPages > 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedApplicants = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredApplicants.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredApplicants, currentPage]);

  const pageRangeStart = totalApplicants
    ? (currentPage - 1) * ITEMS_PER_PAGE + 1
    : 0;
  const pageRangeEnd = totalApplicants
    ? Math.min(currentPage * ITEMS_PER_PAGE, totalApplicants)
    : 0;

  const handlePageChange = useCallback(
    (nextPage) => {
      if (nextPage === currentPage) return;
      if (nextPage < 1 || nextPage > totalPages) return;
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
      {notification.message && (
        <div
          ref={notificationRef}
          tabIndex={0}
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-md shadow-md text-white text-center font-semibold ${
            notification.type === "success"
              ? "bg-green-600"
              : "bg-[var(--color-brand-primary)]"
          }`}
          role="status"
          aria-live="polite"
        >
          {notification.message}
          <button
            className="ml-4 font-bold"
            onClick={() => setNotification({ message: "", type: "" })}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex justify-center">
          <div className="flex flex-col w-full max-w-7xl gap-6">
            {/* Header with Application Settings Button */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Manage Applications
              </h1>
              <ApplicationControlPanel />
            </div>
            
            {/* Filters */}
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
                    No applicants found
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
                      Showing {pageRangeStart}-{pageRangeEnd} of{" "}
                      {totalApplicants} applicants
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
                        {paginatedApplicants.map((applicant) => {
                          const normalized = normalizeApplicant({
                            ...applicant,
                            name:
                              applicant.name ||
                              applicant.full_name ||
                              applicant.email,
                          });
                          const cardEl = createUserCard({
                            user: normalized,
                            onClick: () => handleApplicantCardClick(normalized),
                            tabIndex: 0,
                            extraFields: [
                              {
                                label: "Application",
                                value: formatStatusLabel(
                                  normalized.application_status
                                ),
                              },
                            ],
                          });

                          return (
                            <div
                              key={normalized.id}
                              className="ds-card cursor-pointer"
                              ref={(node) => {
                                if (node && node.firstChild !== cardEl) {
                                  node.innerHTML = "";
                                  node.appendChild(cardEl);
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
                  totalItems={totalApplicants}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={handlePageChange}
                  maxPageButtons={5}
                  accentColor="var(--primary-red, #bb3031)"
                  ariaLabel="Applicant pagination"
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

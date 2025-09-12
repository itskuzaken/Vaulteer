import { useEffect, useRef, useState } from "react";
import {
  getAllApplicants,
  approveApplicant,
} from "../../../services/applicantsService";
import { searchUsersByRoleAndName } from "../../../services/searchService";
import UserFilter from "../../filter/UserFilter";
import { useFilteredAndSortedUsers } from "../../../hooks/useFilters";
import { SkeletonList } from "../../ui/SkeletonList";
import { createUserCard } from "../../card/UserCard"; // <-- added

// Avatar helper
function getAvatarUrl(applicant) {
  if (applicant.photoUrl) return applicant.photoUrl;
  if (applicant.email)
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      applicant.name || applicant.email
    )}&background=bb3031&color=fff&size=128`;
  return "https://ui-avatars.com/api/?name=User&background=bb3031&color=fff&size=128";
}

function Spinner({ className = "" }) {
  return (
    <svg
      className={`animate-spin h-5 w-5 text-[var(--color-brand-primary)] ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

// Modal
function ApprovalModal({ open, applicant, onApprove, onCancel, loading }) {
  const modalRef = useRef(null);
  useEffect(() => {
    if (open && modalRef.current) modalRef.current.focus();
  }, [open]);
  if (!open || !applicant) return null;
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="approval-modal-title"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-md p-6 w-full max-w-sm outline-none"
        tabIndex={0}
      >
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-black text-2xl"
          onClick={onCancel}
          aria-label="Close"
        >
          ×
        </button>
        <div className="flex flex-col items-center gap-3">
          <img
            src={getAvatarUrl(applicant)}
            alt={applicant.name || applicant.email}
            width={64}
            height={64}
            className="w-16 h-16 rounded-full border-4 border-[var(--color-brand-primary)] object-cover mb-2"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                "https://ui-avatars.com/api/?name=User&background=bb3031&color=fff&size=128";
            }}
          />
          <h2
            id="approval-modal-title"
            className="text-xl font-bold text-[var(--color-brand-primary)] mb-2 text-center"
          >
            Approve Applicant?
          </h2>
          <div className="text-center text-gray-700 mb-4">
            Approve <span className="font-semibold">{applicant.name}</span> as a
            volunteer?
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button
            className="px-4 py-2 rounded bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={`px-4 py-2 rounded bg-green-700 text-white font-semibold flex items-center gap-2 ${
              loading ? "opacity-60 cursor-not-allowed" : "hover:bg-green-800"
            }`}
            onClick={onApprove}
            disabled={loading}
            aria-busy={loading}
          >
            {loading && <Spinner className="w-4 h-4" />}
            {loading ? "Approving..." : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Adaptive Search (matches staff/volunteer pattern)
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
    const resize = () => setIsDesktop(window.innerWidth >= 768);
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    if (!showInput || isDesktop) return;
    function esc(e) {
      if (e.key === "Escape") setShowInput(false);
    }
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [showInput, isDesktop, setShowInput]);
  useEffect(() => {
    if (!showInput || isDesktop) return;
    function outside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setShowInput(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [showInput, isDesktop, setShowInput]);
  if (isDesktop)
    return (
      <input
        ref={inputRef}
        type="text"
        placeholder="Search by name..."
        value={value}
        onChange={onChange}
        className="border border-gray-500 rounded px-3 py-2 text-sm w-full md:w-48 lg:w-60 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
        aria-label="Search applicants by name"
      />
    );
  return (
    <div className="relative flex items-center" ref={wrapperRef}>
      {!showInput && (
        <button
          type="button"
          className="p-2 bg-white border border-[var(--color-brand-primary)] text-[var(--color-brand-primary)] rounded hover:bg-[var(--color-brand-primary)] hover:text-white transition"
          aria-label="Open applicant search"
          onClick={() => setShowInput(true)}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
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
          className="border border-gray-500 rounded px-3 py-2 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
          aria-label="Search applicants by name"
          autoFocus
        />
      )}
    </div>
  );
}

export default function ApplicationApproval() {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [notification, setNotification] = useState({ message: "", type: "" });
  const [error, setError] = useState("");

  // Search & filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef(null);
  const [filters, setFilters] = useState({
    status: "",
    orderBy: "date",
    nameOrder: "name_asc",
    dateOrder: "date_desc",
  });

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Initial full fetch (fallback) & subsequent filtered fetch
  useEffect(() => {
    getAllApplicants()
      .then(setApplicants)
      .catch(() => {});
  }, []);
  useEffect(() => {
    async function run() {
      setLoading(true);
      setError("");
      try {
        const data = await searchUsersByRoleAndName(
          "applicant",
          debouncedTerm,
          filters
        );
        setApplicants(data);
      } catch {
        setApplicants([]);
        setError("Failed to load applicants. Please try again.");
      }
      setLoading(false);
    }
    run();
  }, [debouncedTerm, filters]);

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

  // Approve flow
  const handleApproveClick = (applicant) => {
    setSelectedApplicant(applicant);
    setShowModal(true);
    setApprovingId(null);
  };
  const handleApprove = async () => {
    if (!selectedApplicant) return;
    setApprovingId(selectedApplicant.id);
    try {
      await approveApplicant(selectedApplicant.id);
      setNotification({
        message: `${selectedApplicant.name} approved successfully!`,
        type: "success",
      });
      setShowModal(false);
      setSelectedApplicant(null);
      // Refresh
      const refreshed = await searchUsersByRoleAndName(
        "applicant",
        debouncedTerm,
        filters
      );
      setApplicants(refreshed);
    } catch {
      setNotification({
        message: "Approval failed. Please try again.",
        type: "error",
      });
      setShowModal(false);
      setSelectedApplicant(null);
    }
    setApprovingId(null);
  };
  const handleModalClose = () => {
    setShowModal(false);
    setSelectedApplicant(null);
  };

  // Derived (reuse hook for sorting/filtering consistency)
  const filteredApplicants = useFilteredAndSortedUsers(applicants, filters);

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
      <ApprovalModal
        open={showModal}
        applicant={selectedApplicant}
        onApprove={handleApprove}
        onCancel={handleModalClose}
        loading={!!approvingId}
      />
      <div className="flex-1 flex justify-center">
        <div className="w-full bg-white border border-[var(--color-border-default)] rounded-2xl shadow-sm p-4 md:p-6">
          <div className="mb-6 border-b border-[var(--color-border-default)] pb-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
              <h1 className="text-xl md:text-2xl font-semibold text-[var(--color-brand-primary)] tracking-tight">
                Application Approval
              </h1>
              <div className="flex flex-row items-center gap-2 w-full md:w-auto">
                <AdaptiveSearchBar
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  inputRef={inputRef}
                  showInput={showMobileSearch}
                  setShowInput={setShowMobileSearch}
                />
                <div className="hidden md:block">
                  <UserFilter
                    filters={filters}
                    onChange={setFilters}
                    role="applicant"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Toggle filters"
                  className="md:hidden p-2 bg-white border border-[var(--color-brand-primary)] text-[var(--color-brand-primary)] rounded hover:bg-[var(--color-brand-primary)] hover:text-white transition"
                  onClick={() => setShowFilters((f) => !f)}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 4h18M6 12h12M10 20h4"
                    />
                  </svg>
                </button>
              </div>
            </div>
            {showFilters && (
              <div className="mt-4 md:hidden border border-[var(--color-border-default)] rounded-lg p-3 bg-[var(--color-surface-alt)]">
                <UserFilter
                  filters={filters}
                  onChange={setFilters}
                  role="applicant"
                />
              </div>
            )}
          </div>
          <div>
            {loading ? (
              <SkeletonList count={6} />
            ) : error ? (
              <div className="text-center text-[var(--color-accent-error)] font-semibold py-10">
                {error}
              </div>
            ) : !filteredApplicants.length ? (
              <div className="text-center text-sm text-[var(--color-text-subtle)] py-12">
                No applicants found
                {searchTerm && (
                  <div className="mt-4">
                    <button
                      className="btn-outline text-xs"
                      onClick={() => setSearchTerm("")}
                    >
                      Clear Search
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredApplicants.map((a) => {
                  const cardEl = createUserCard({
                    user: {
                      ...a,
                      name: a.name || a.full_name || a.email,
                      status: a.application_status || a.status || "pending",
                    },
                    onClick: () => handleApproveClick(a),
                    tabIndex: 0,
                    extraFields: [
                      {
                        label: "Application",
                        value: (a.application_status || "pending")
                          .replace(/_/g, " ")
                          .toLowerCase(),
                      },
                    ],
                  });

                  return (
                    <div
                      key={a.id}
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
      </div>
    </div>
  );
}

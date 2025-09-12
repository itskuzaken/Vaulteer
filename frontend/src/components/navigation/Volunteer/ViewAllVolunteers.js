import { useEffect, useState, useRef } from "react";
import { deleteUser, updateUser } from "../../../services/userService";
import { searchUsersByRoleAndName } from "../../../services/searchService";
import VolunteerInfoModal from "../../modals/VolunteerInfoModal";
import DeleteVolunteerModal from "../../modals/DeleteVolunteerModal";
import UserFilter from "../../filter/UserFilter";
import { useFilteredAndSortedUsers } from "../../../hooks/useFilters";
import { createUserCard } from "../../card/UserCard";
import { SkeletonList } from "../../ui/SkeletonList";

// --- Unified Responsive SearchBar Component ---
function AdaptiveSearchBar({
  value,
  onChange,
  inputRef,
  showInput,
  setShowInput,
}) {
  const wrapperRef = useRef(null);

  // Detect viewport width for responsive logic
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    function handleResize() {
      setIsDesktop(window.innerWidth >= 768);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close on Escape key (mobile/tablet only)
  useEffect(() => {
    if (!showInput || isDesktop) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") setShowInput(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showInput, setShowInput, isDesktop]);

  // Close on click outside (mobile/tablet only)
  useEffect(() => {
    if (!showInput || isDesktop) return;
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowInput(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showInput, setShowInput, isDesktop]);

  // Always show input on desktop
  if (isDesktop) {
    return (
      <input
        ref={inputRef}
        type="text"
        placeholder="Search by name..."
        value={value}
        onChange={onChange}
        className="border border-gray-500 rounded px-3 py-2.25 text-sm transition-all w-full md:w-40 lg:w-60 focus:outline-none focus:ring-2 focus:ring-[#bb3031] hover:ring-1 hover:ring-[#bb3031]"
        style={{ maxWidth: "20rem", minWidth: 0 }}
        aria-label="Search by name"
        tabIndex={0}
      />
    );
  }

  // Mobile/tablet: icon button, then animated input (identical to desktop style)
  return (
    <div className="relative flex items-center min-w-0" ref={wrapperRef}>
      {!showInput && (
        <button
          className="p-2 bg-white border border-[#bb3031] text-[#bb3031] rounded hover:bg-[#bb3031] hover:text-white transition flex items-center justify-center"
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
          className="border border-gray-500 rounded px-3 py-2 text-sm transition-all w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#bb3031]"
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

export default function ViewAllVolunteers() {
  const [allVolunteers, setAllVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingVolunteer, setEditingVolunteer] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "" });
  const [statusEdit, setStatusEdit] = useState("");
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ message: "", type: "" });

  // Modal state management
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [volunteerToDelete, setVolunteerToDelete] = useState(null);

  // Debounced search state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const inputRef = useRef(null);

  // Filter state (pattern matches ViewAllStaff)
  const [filters, setFilters] = useState({
    status: "",
    orderBy: "date",
    nameOrder: "name_asc",
    dateOrder: "date_desc",
  });

  // Debounce input for search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Focus input when toggling open
  useEffect(() => {
    if (showMobileSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showMobileSearch]);

  // Fetch all volunteers on mount and when filters/search change
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        let data;
        if (debouncedTerm.trim()) {
          data = await searchUsersByRoleAndName(
            "volunteer",
            debouncedTerm,
            filters
          );
        } else {
          data = await searchUsersByRoleAndName("volunteer", "", filters);
        }
        setAllVolunteers(data);
      } catch (error) {
        setAllVolunteers([]);
      }
      setLoading(false);
    }
    fetchData();
  }, [debouncedTerm, filters]);

  // Use shared filtering/sorting logic
  const filteredVolunteers = useFilteredAndSortedUsers(allVolunteers, filters);

  useEffect(() => {
    if (notification.message) {
      const timer = setTimeout(() => {
        setNotification({ message: "", type: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Open Info Modal
  const handleVolunteerCardClick = (volunteer) => {
    setSelectedVolunteer(volunteer);
    setEditingVolunteer(null);
    setShowDeleteModal(false);
    setVolunteerToDelete(null);
  };

  // Open edit mode in Info Modal
  const handleEditClick = (volunteer) => {
    setEditingVolunteer(volunteer);
    setEditForm({
      name: volunteer.name,
      email: volunteer.email,
      role: "volunteer",
    });
    setStatusEdit(
      volunteer.status === "active" || volunteer.status === "inactive"
        ? volunteer.status
        : "active"
    );
  };

  const handleEditChange = (e) => {
    setEditForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      await updateUser(editingVolunteer.id, {
        ...editForm,
        status: statusEdit,
      });
      setAllVolunteers((prev) =>
        prev.map((v) =>
          v.id === editingVolunteer.id
            ? { ...v, ...editForm, status: statusEdit }
            : v
        )
      );
      setEditingVolunteer(null);
      setSelectedVolunteer(null);
      setNotification({ message: "Volunteer updated.", type: "success" });
    } catch (error) {
      alert("Failed to update user.");
    }
    setSaving(false);
  };

  const handleEditCancel = () => {
    setEditingVolunteer(null);
  };

  // Delete flow: open Delete modal, close Info modal
  const handleDeleteClick = (volunteer) => {
    setVolunteerToDelete(volunteer);
    setShowDeleteModal(true);
    setSelectedVolunteer(null);
  };

  // Cancel delete: close Delete modal, reopen Info modal
  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setSelectedVolunteer(volunteerToDelete);
    setVolunteerToDelete(null);
  };

  // Confirm delete: close both modals, delete
  const handleDeleteConfirm = async () => {
    if (!volunteerToDelete) return;
    setShowDeleteModal(false);
    setSelectedVolunteer(null);
    try {
      await deleteUser(volunteerToDelete.id);
      setAllVolunteers((prev) =>
        prev.filter((v) => v.id !== volunteerToDelete.id)
      );
      setNotification({
        message: `${volunteerToDelete.name} has been deleted.`,
        type: "success",
      });
    } catch (error) {
      setNotification({
        message: "Failed to delete user.",
        type: "error",
      });
    }
    setVolunteerToDelete(null);
  };

  // Close Info Modal
  const handleCloseVolunteerModal = () => {
    setSelectedVolunteer(null);
    setEditingVolunteer(null);
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Notification */}
      {notification.message && (
        <div
          className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded shadow-lg text-white ${
            notification.type === "success"
              ? "bg-green-700"
              : "bg-[var(--color-brand-primary)]"
          }`}
        >
          {notification.message}
          <button
            className="ml-4 text-white font-bold"
            onClick={() => setNotification({ message: "", type: "" })}
          >
            ×
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteVolunteerModal
        isOpen={showDeleteModal}
        volunteer={volunteerToDelete}
        onCancel={handleDeleteCancel}
        onDelete={handleDeleteConfirm}
      />

      {/* Volunteer Info/Action Modal */}
      <VolunteerInfoModal
        isOpen={!!selectedVolunteer}
        volunteer={selectedVolunteer}
        editingVolunteer={editingVolunteer}
        editForm={editForm}
        statusEdit={statusEdit}
        saving={saving}
        onEditClick={handleEditClick}
        onEditChange={handleEditChange}
        onStatusChange={setStatusEdit}
        onEditSave={handleEditSave}
        onEditCancel={handleEditCancel}
        onDeleteClick={handleDeleteClick}
        onClose={handleCloseVolunteerModal}
        showDeleteModal={showDeleteModal}
        volunteerToDelete={volunteerToDelete}
        onDeleteCancel={handleDeleteCancel}
        onDeleteConfirm={handleDeleteConfirm}
      />

      <div className="flex-1 flex justify-center">
        <div className="w-full bg-white border border-[var(--color-border-default)] rounded-2xl shadow-sm p-4 md:p-6 transition-all duration-300">
          {/* Header with Responsive Search and Filters */}
          <div className="mb-6 border-b border-[var(--color-border-default)] pb-4">
            {/* Mobile/Tablet: All in a row */}
            <div className="flex flex-row items-center gap-2 w-full md:hidden">
              <h1 className=" text-lg flex-shrink-0 text-[var(--color-brand-primary)] font-semibold tracking-tight">
                Volunteers
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
                  role="volunteer"
                />
              </div>
            </div>
            {/* Desktop: Title left, search/filter right */}
            <div className="hidden md:flex flex-row items-center justify-between w-full gap-3 flex-wrap">
              <h1 className="md:text-xl lg:text-2xl font-semibold text-[var(--color-brand-primary)] tracking-tight">
                Volunteers
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
                  role="volunteer"
                />
              </div>
            </div>
          </div>
          <div>
            {loading ? (
              <SkeletonList count={6} />
            ) : !filteredVolunteers.length ? (
              <div className="text-center text-sm md:text-base text-gray-500 py-12">
                <div className="mb-2 font-semibold text-[var(--color-text-subtle)]">
                  No volunteers found
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
                {filteredVolunteers.map((v) => {
                  const card = createUserCard({
                    user: v,
                    onClick: handleVolunteerCardClick,
                    tabIndex: 0,
                  });
                  return (
                    <div
                      key={v.id}
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

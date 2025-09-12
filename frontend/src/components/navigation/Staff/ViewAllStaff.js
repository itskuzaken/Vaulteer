import { useEffect, useState, useRef } from "react";
import { deleteUser, updateUser } from "../../../services/userService";
import { searchUsersByRoleAndName } from "../../../services/searchService";
import UserFilter from "../../filter/UserFilter";
import { useFilteredAndSortedUsers } from "../../../hooks/useFilters";
import { createUserCard } from "../../card/UserCard";
import { SkeletonList } from "../../ui/SkeletonList";

// AdaptiveSearchBar reused (simplified if not already defined)
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
    const r = () => setIsDesktop(window.innerWidth >= 768);
    r();
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
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
        aria-label="Search by name"
      />
    );
  return (
    <div className="relative flex items-center" ref={wrapperRef}>
      {!showInput && (
        <button
          type="button"
          className="p-2 bg-white border border-[var(--color-brand-primary)] text-[var(--color-brand-primary)] rounded hover:bg-[var(--color-brand-primary)] hover:text-white transition"
          aria-label="Open search"
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
          aria-label="Search by name"
          autoFocus
        />
      )}
    </div>
  );
}

export default function ViewAllStaff() {
  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ message: "", type: "" });
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "staff",
  });
  const [statusEdit, setStatusEdit] = useState("");
  const [saving, setSaving] = useState(false);
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
    const t = setTimeout(() => setDebouncedTerm(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await searchUsersByRoleAndName(
          "staff",
          debouncedTerm,
          filters
        );
        setAllStaff(data);
      } catch {
        setAllStaff([]);
      }
      setLoading(false);
    }
    fetchData();
  }, [debouncedTerm, filters]);

  const filteredStaff = useFilteredAndSortedUsers(allStaff, filters);

  useEffect(() => {
    if (notification.message) {
      const t = setTimeout(
        () => setNotification({ message: "", type: "" }),
        5000
      );
      return () => clearTimeout(t);
    }
  }, [notification]);

  // Editing handlers (optional retained logic)
  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: "staff",
    });
    setStatusEdit(
      user.status === "active" || user.status === "inactive"
        ? user.status
        : "active"
    );
  };
  const handleEditChange = (e) =>
    setEditForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleEditSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await updateUser(editingUser.id, {
        ...editForm,
        status: statusEdit,
      });
      setAllStaff((prev) =>
        prev.map((s) =>
          s.id === editingUser.id
            ? { ...s, ...editForm, status: statusEdit }
            : s
        )
      );
      setEditingUser(null);
      setNotification({ message: "Staff updated.", type: "success" });
    } catch {
      setNotification({ message: "Failed to update staff.", type: "error" });
    }
    setSaving(false);
  };
  const handleEditCancel = () => setEditingUser(null);

  return (
    <div className="flex flex-col w-full gap-6">
      {notification.message && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-md shadow-md text-white font-semibold ${
            notification.type === "success"
              ? "bg-green-600"
              : "bg-[var(--color-brand-primary)]"
          }`}
        >
          {notification.message}
          <button
            className="ml-4 font-bold"
            onClick={() => setNotification({ message: "", type: "" })}
          >
            ×
          </button>
        </div>
      )}
      <div className="flex-1 flex justify-center">
        <div className="w-full bg-white border border-[var(--color-border-default)] rounded-2xl shadow-sm p-4 md:p-6">
          <div className="mb-6 border-b border-[var(--color-border-default)] pb-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
              <h1 className="text-xl md:text-2xl font-semibold text-[var(--color-brand-primary)] tracking-tight">
                Staff
              </h1>
              <div className="flex flex-row items-center gap-2 w-full md:w-auto">
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
          </div>
          <div>
            {loading ? (
              <SkeletonList count={6} />
            ) : !filteredStaff.length ? (
              <div className="text-center text-sm text-[var(--color-text-subtle)] py-12">
                No staff found
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
                {filteredStaff.map((s) => {
                  const card = createUserCard({
                    user: s,
                    onClick: handleEditClick,
                    tabIndex: 0,
                  });
                  return (
                    <div
                      key={s.id}
                      className="ds-card"
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
          {editingUser && (
            <div className="mt-8 p-4 border border-[var(--color-border-default)] rounded-lg bg-[var(--color-surface-alt)] space-y-3">
              <h2 className="text-lg font-semibold text-[var(--color-text-strong)]">
                Edit Staff
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="text-sm font-medium">
                  Name
                  <input
                    name="name"
                    value={editForm.name}
                    onChange={handleEditChange}
                    className="mt-1 w-full border border-[var(--color-border-strong)] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
                  />
                </label>
                <label className="text-sm font-medium">
                  Email
                  <input
                    name="email"
                    value={editForm.email}
                    onChange={handleEditChange}
                    className="mt-1 w-full border border-[var(--color-border-strong)] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
                  />
                </label>
                <label className="text-sm font-medium">
                  Status
                  <select
                    value={statusEdit}
                    onChange={(e) => setStatusEdit(e.target.value)}
                    className="mt-1 w-full border border-[var(--color-border-strong)] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleEditSave}
                  disabled={saving}
                  className={`btn-primary text-sm ${
                    saving ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={handleEditCancel}
                  className="btn-outline text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

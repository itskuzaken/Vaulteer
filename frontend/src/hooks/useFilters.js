import { useMemo } from "react";

/**
 * useFilteredAndSortedUsers
 * @param {Array} users - The list of users to filter and sort.
 * @param {Object} filters - { status, orderBy, nameOrder, dateOrder }
 * @returns {Array} - The filtered and sorted user list.
 */
export function useFilteredAndSortedUsers(users, filters) {
  return useMemo(() => {
    let filtered = Array.isArray(users) ? [...users] : [];

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(
        (u) => (u.status || "").toLowerCase() === filters.status.toLowerCase()
      );
    }

    // Sort by selected criterion and direction
    if (filters.orderBy === "name") {
      if (
        filters.nameOrder === "name_asc" ||
        filters.nameOrder === "name_desc"
      ) {
        filtered.sort((a, b) => {
          const nameA = (a.name || "").toLocaleLowerCase();
          const nameB = (b.name || "").toLocaleLowerCase();
          const cmp = nameA.localeCompare(nameB, undefined, {
            sensitivity: "base",
          });
          return filters.nameOrder === "name_asc" ? cmp : -cmp;
        });
      }
    } else if (filters.orderBy === "date") {
      if (
        filters.dateOrder === "date_asc" ||
        filters.dateOrder === "date_desc"
      ) {
        filtered.sort((a, b) => {
          const dateA = new Date(a.date_added || a.date || 0);
          const dateB = new Date(b.date_added || b.date || 0);
          if (dateA < dateB) return filters.dateOrder === "date_asc" ? -1 : 1;
          if (dateA > dateB) return filters.dateOrder === "date_asc" ? 1 : -1;
          return 0;
        });
      }
    }

    return filtered;
  }, [users, filters]);
}

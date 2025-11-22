export function createLogQueryParams(
  filters,
  debouncedSearch,
  itemsPerPage,
  currentPage
) {
  const params = {
    limit: itemsPerPage,
    offset: Math.max(0, (currentPage - 1) * itemsPerPage),
  };

  if (debouncedSearch && debouncedSearch.trim()) {
    params.searchTerm = debouncedSearch.trim();
  }

  if (filters.type && filters.type !== "ALL") {
    params.type = filters.type;
  }

  if (filters.severity && filters.severity !== "ALL") {
    params.severity = filters.severity;
  }

  if (filters.action && filters.action !== "ALL") {
    params.action = filters.action;
  }

  if (filters.actorRole && filters.actorRole !== "ALL") {
    params.actorRole = filters.actorRole;
  }

  if (filters.status && filters.status !== "ALL") {
    params.status = filters.status;
  }

  if (filters.startDate) {
    const start = new Date(filters.startDate);
    if (!Number.isNaN(start.getTime())) {
      start.setHours(0, 0, 0, 0);
      params.startDate = start.toISOString();
    }
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate);
    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      params.endDate = end.toISOString();
    }
  }

  return params;
}

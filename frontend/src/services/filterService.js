// Helper to build query string for user filters
// Accepts: { status, orderBy, nameOrder, dateOrder }
export function buildUserFilterQuery(filters = {}) {
  const params = [];
  if (filters.status)
    params.push(`status=${encodeURIComponent(filters.status)}`);
  if (filters.orderBy === "name") {
    const allowedSorts = ["name_asc", "name_desc"];
    const sort = allowedSorts.includes(filters.nameOrder)
      ? filters.nameOrder
      : "name_asc";
    params.push(`sort=${encodeURIComponent(sort)}`);
  } else if (filters.orderBy === "date") {
    const allowedDates = ["date_asc", "date_desc"];
    const date = allowedDates.includes(filters.dateOrder)
      ? filters.dateOrder
      : "date_desc";
    params.push(`date=${encodeURIComponent(date)}`);
  } else {
    params.push("sort=name_asc");
  }
  return params.length ? "&" + params.join("&") : "";
}

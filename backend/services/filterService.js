/**
 * Enum for allowed sort criteria and directions.
 */
const SORT_CRITERIA = {
  name: "name",
  date: "date",
};
const SORT_DIRECTIONS = {
  name_asc: "name_asc",
  name_desc: "name_desc",
  date_asc: "date_asc",
  date_desc: "date_desc",
};

/**
 * Builds SQL ORDER BY clause for user filters.
 * Accepts: { orderBy, nameOrder, dateOrder }
 * @returns {string} SQL ORDER BY clause
 */
function buildUserOrderByClause(filters = {}) {
  // Use Unicode/case-insensitive collation for robust name sorting
  const allowedNameOrders = {
    name_asc: "u.name COLLATE utf8mb4_unicode_ci ASC",
    name_desc: "u.name COLLATE utf8mb4_unicode_ci DESC",
  };
  const allowedDateOrders = {
    date_asc: "u.date_added ASC",
    date_desc: "u.date_added DESC",
  };

  // If orderBy is date and dateOrder is valid, use date ordering
  if (
    filters.orderBy === SORT_CRITERIA.date &&
    allowedDateOrders[filters.dateOrder]
  ) {
    return `ORDER BY ${allowedDateOrders[filters.dateOrder]}`;
  }
  // If orderBy is name and nameOrder is valid, use name ordering
  if (
    filters.orderBy === SORT_CRITERIA.name &&
    allowedNameOrders[filters.nameOrder]
  ) {
    return `ORDER BY ${allowedNameOrders[filters.nameOrder]}`;
  }
  // If only dateOrder is present, use date ordering
  if (filters.dateOrder && allowedDateOrders[filters.dateOrder]) {
    return `ORDER BY ${allowedDateOrders[filters.dateOrder]}`;
  }
  // If only nameOrder is present, use name ordering
  if (filters.nameOrder && allowedNameOrders[filters.nameOrder]) {
    return `ORDER BY ${allowedNameOrders[filters.nameOrder]}`;
  }
  // Default: order by name ascending
  return `ORDER BY u.name COLLATE utf8mb4_unicode_ci ASC`;
}

module.exports = {
  buildUserOrderByClause,
  SORT_CRITERIA,
  SORT_DIRECTIONS,
};

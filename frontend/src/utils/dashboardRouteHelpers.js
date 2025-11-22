export function normalizeDashboardRole(role) {
  return (role || "volunteer").toString().toLowerCase();
}

export function buildDashboardQueryPath(
  role,
  { content, subContent, params } = {}
) {
  const normalizedRole = normalizeDashboardRole(role);
  const basePath = `/dashboard/${normalizedRole}`;
  const searchParams = new URLSearchParams();

  if (content && content !== "dashboard") {
    searchParams.set("content", content);
  }

  if (subContent) {
    searchParams.set("subcontent", subContent);
  }

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      searchParams.set(key, String(value));
    });
  }

  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export function buildEventDetailPath(role, eventUid) {
  if (!eventUid) return null;
  return buildDashboardQueryPath(role, {
    content: "event",
    params: { eventUid },
  });
}

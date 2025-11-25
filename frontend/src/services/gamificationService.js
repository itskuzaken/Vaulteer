import { fetchWithAuth } from "./apiClient";

export async function getGamificationSummary() {
  // Cache gamification summary for 2 minutes - non-critical but frequently fetched
  const response = await fetchWithAuth("/gamification/summary", {
    method: "GET",
    cacheTTL: 120_000,
  });
  return response?.data ?? response;
}

export async function getLeaderboard(period = "all", limit = 5) {
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  if (limit) params.set("limit", String(limit));

  const response = await fetchWithAuth(
    `/gamification/leaderboard?${params.toString()}`
  );
  return response.data || [];
}

export async function recalculateUserGamification(userId) {
  if (!userId) {
    throw new Error("userId is required to recalculate gamification stats");
  }
  const response = await fetchWithAuth(`/gamification/recalculate/${userId}`, {
    method: "POST",
  });
  return response.data;
}

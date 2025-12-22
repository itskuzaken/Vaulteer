"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getFullLeaderboard } from "../../services/gamificationService";
import Podium from "./Podium";
import LeaderboardList from "./LeaderboardList";
import FiltersBar from "./FiltersBar";

export default function LeaderboardPage({ initialPeriod = "all" }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [period, setPeriod] = useState(initialPeriod);
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const [data, setData] = useState({ total: 0, entries: [] });
  const [loading, setLoading] = useState(true);

  // Initialize period from query param if present
  useEffect(() => {
    const p = searchParams.get('period');
    if (p) setPeriod(p);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await getFullLeaderboard({ period, page, perPage });
        if (cancelled) return;
        // support both shapes: { total, entries } or { top, entries, meta }
        const entries = res.entries || (res.data && res.data.entries) || (res.top ? [...(res.top || []), ...(res.entries || [])] : (res.entries || []));
        const total = res.total ?? (res.meta && res.meta.total) ?? 0;
        setData({ total, entries });
      } catch (err) {
        console.error('Failed to fetch leaderboard', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [period, page, perPage]);

  // Update URL when period changes
  const handleSetPeriod = (next) => {
    setPeriod(next);
    try {
      const path = window.location.pathname || window.location.href;
      router.replace(`${path}?content=leaderboard&period=${next}`);
    } catch (e) {
      console.error('Failed to update URL with period', e);
    }
  };

  const top3 = data.entries.slice(0, 3);
  const rest = data.entries.slice(3);

  return (
    <div className="space-y-6">
      <FiltersBar period={period} setPeriod={handleSetPeriod} />
      <Podium entries={top3} loading={loading} />
      <LeaderboardList entries={rest} loading={loading} total={data.total} page={page} setPage={setPage} perPage={perPage} />
    </div>
  );
}

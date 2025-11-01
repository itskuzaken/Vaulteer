"use client";

import { useSearchParams } from "next/navigation";

import VolunteerDashboardPage from "./_components/VolunteerDashboardPage";

export default function VolunteerDashboardRootPage() {
  const searchParams = useSearchParams();
  const contentSlug = searchParams.get("content") || undefined;
  const subContentSlug = searchParams.get("subcontent") || undefined;

  return (
    <VolunteerDashboardPage
      contentSlug={contentSlug}
      subContentSlug={subContentSlug}
      routingStrategy="query"
    />
  );
}

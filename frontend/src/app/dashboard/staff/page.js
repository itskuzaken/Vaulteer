"use client";

import { useSearchParams } from "next/navigation";

import StaffDashboardPage from "./_components/StaffDashboardPage";

export default function StaffDashboardRootPage() {
  const searchParams = useSearchParams();
  const contentSlug = searchParams.get("content") || undefined;
  const subContentSlug = searchParams.get("subcontent") || undefined;

  return (
    <StaffDashboardPage
      contentSlug={contentSlug}
      subContentSlug={subContentSlug}
      routingStrategy="query"
    />
  );
}

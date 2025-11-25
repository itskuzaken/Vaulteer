"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import StaffDashboardPage from "./_components/StaffDashboardPage";

function StaffDashboardLoader() {
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

export default function StaffDashboardRootPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      }
    >
      <StaffDashboardLoader />
    </Suspense>
  );
}

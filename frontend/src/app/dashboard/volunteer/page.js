"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import VolunteerDashboardPage from "./_components/VolunteerDashboardPage";

function VolunteerDashboardLoader() {
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

export default function VolunteerDashboardRootPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      }
    >
      <VolunteerDashboardLoader />
    </Suspense>
  );
}

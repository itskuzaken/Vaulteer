"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import AdminDashboardPage from "./_components/AdminDashboardPage";

function AdminDashboardLoader() {
  const searchParams = useSearchParams();
  const contentSlug = searchParams.get("content") || undefined;
  const subContentSlug = searchParams.get("subcontent") || undefined;

  return (
    <AdminDashboardPage
      contentSlug={contentSlug}
      subContentSlug={subContentSlug}
      routingStrategy="query"
    />
  );
}

export default function AdminDashboardRootPage() {
  return (
    <Suspense
      fallback={
        <div
          suppressHydrationWarning
          className="flex items-center justify-center min-h-screen"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      }
    >
      <AdminDashboardLoader />
    </Suspense>
  );
}

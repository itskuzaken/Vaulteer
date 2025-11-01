"use client";

import { useSearchParams } from "next/navigation";

import AdminDashboardPage from "./_components/AdminDashboardPage";

export default function AdminDashboardRootPage() {
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

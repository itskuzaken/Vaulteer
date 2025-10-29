"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getCurrentUser } from "../../services/userService";

/**
 * Higher-order component for role-based route protection
 * Redirects users to their appropriate dashboard if they try to access a dashboard for a different role
 */
export default function RoleProtectedRoute({ children, requiredRole }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        // User not authenticated, redirect to 403 page
        console.log(
          "[RoleProtection] No authenticated user, redirecting to 403"
        );
        router.push("/403");
        return;
      }

      try {
        // Fetch user data from backend to verify role
        const userInfo = await getCurrentUser();

        console.log(
          `[RoleProtection] User role: ${userInfo.role}, Required role: ${requiredRole}`
        );

        if (userInfo.role === requiredRole) {
          // User has correct role
          setIsAuthorized(true);
          setIsLoading(false);
        } else {
          // User has different role, redirect to their correct dashboard
          const correctRoute = {
            admin: "/dashboard/admin",
            staff: "/dashboard/staff",
            volunteer: "/dashboard/volunteer",
          }[userInfo.role];

          console.log(
            `[RoleProtection] Role mismatch. Redirecting ${userInfo.role} from /${requiredRole} to ${correctRoute}`
          );

          router.push(correctRoute);
        }
      } catch (error) {
        console.error("[RoleProtection] Error verifying user role:", error);
        // If there's an error fetching user info, redirect to 403
        router.push("/403");
      }
    });

    return () => unsubscribe();
  }, [router, requiredRole]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Verifying access...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please wait while we verify your permissions.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    // Show nothing while redirecting
    return null;
  }

  return <>{children}</>;
}

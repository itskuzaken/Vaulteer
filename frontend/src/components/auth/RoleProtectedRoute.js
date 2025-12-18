"use client";

import { useEffect, useState, useRef } from "react";
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

  // Debouncing refs to prevent rapid-fire API calls during Firebase auth events
  const fetchInProgressRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  const [rateLimitedUntil, setRateLimitedUntil] = useState(null);

  useEffect(() => {
    const auth = getAuth();

    let retryTimer = null;
    let countdownInterval = null;

    const clearTimers = () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    };

    const doFetchAndCheck = async () => {
      // Debounce: Skip if fetch in progress or called within 1 second
      const now = Date.now();
      if (fetchInProgressRef.current || now - lastFetchTimeRef.current < 1000) {
        console.log(
          "[RoleProtection] Skipping duplicate getCurrentUser() call (debounced)"
        );
        return;
      }

      fetchInProgressRef.current = true;
      lastFetchTimeRef.current = Date.now();

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
          setRateLimitedUntil(null);
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
        if (error && error.status === 429) {
          // Rate limited — show a friendly message and retry after suggested time
          const retryAfterMs = error.retryAfterMs || 15000;
          const until = Date.now() + retryAfterMs;
          setRateLimitedUntil(until);
          setIsLoading(false);
          setIsAuthorized(false);

          // Schedule automatic retry after the suggested time
          retryTimer = setTimeout(() => {
            // Reset refs so doFetchAndCheck can proceed
            fetchInProgressRef.current = false;
            lastFetchTimeRef.current = 0;
            doFetchAndCheck();
          }, retryAfterMs);

          // update a countdown every second to re-render the component
          countdownInterval = setInterval(() => {
            if (Date.now() >= until) {
              clearTimers();
              setRateLimitedUntil(null);
            } else {
              // force re-render by updating dummy state (we reuse rateLimitedUntil)
              setRateLimitedUntil((prev) => (prev ? prev : until));
            }
          }, 1000);

          return;
        }

        // For other errors, redirect to 403
        router.push("/403");
      } finally {
        fetchInProgressRef.current = false;
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        // User not authenticated, redirect to 403 page
        console.log(
          "[RoleProtection] No authenticated user, redirecting to 403"
        );
        router.push("/403");
        return;
      }

      // Start checking role
      doFetchAndCheck();
    });

    return () => {
      clearTimers();
      unsubscribe();
    };
  }, [router, requiredRole]);

  const manualRetry = async () => {
    setIsLoading(true);
    try {
      const userInfo = await getCurrentUser(true);
      if (userInfo.role === requiredRole) {
        setIsAuthorized(true);
        setIsLoading(false);
        setRateLimitedUntil(null);
      } else {
        const correctRoute = {
          admin: "/dashboard/admin",
          staff: "/dashboard/staff",
          volunteer: "/dashboard/volunteer",
        }[userInfo.role];
        router.push(correctRoute);
      }
    } catch (error) {
      if (error && error.status === 429) {
        const retryAfterMs = error.retryAfterMs || 15000;
        setRateLimitedUntil(Date.now() + retryAfterMs);
        setIsLoading(false);
      } else {
        router.push('/403');
      }
    }
  };

  if (rateLimitedUntil) {
    const secondsLeft = Math.max(0, Math.ceil((rateLimitedUntil - Date.now()) / 1000));
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Too many requests</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">We received too many requests from your network. Please wait <strong>{secondsLeft}s</strong> and try again.</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button onClick={manualRetry} className="px-4 py-2 border rounded">Retry now</button>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary-red text-white rounded">Reload page</button>
          </div>
        </div>
      </div>
    );
  }

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

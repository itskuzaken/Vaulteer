"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { API_BASE } from "../config/config";
import { getGamificationSummary } from "../services/gamificationService";
import realtimeService from "../services/realtimeService";

/**
 * Shared hook for dashboard pages to load the authenticated user along with
 * their role information from the backend.
 * @returns {{ user: object | null, status: "loading" | "ready" | "error", error: Error | null }}
 */
export function useDashboardUser() {
  const [user, setUser] = useState(null);
  const [gamification, setGamification] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const gamificationSubscriptionRef = useRef(null);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          setGamification(null);
          setStatus("ready");
          return;
        }

        try {
          const token = await firebaseUser.getIdToken();
          const response = await fetch(`${API_BASE}/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            console.warn(
              "Dashboard user fetch failed, falling back to Firebase data"
            );
            setUser({
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || "Unknown User",
              photoURL: firebaseUser.photoURL || null,
              email: firebaseUser.email || null,
            });
            setGamification(null);
            setStatus("ready");
            return;
          }

          const userData = await response.json();
          setUser({
            user_id: userData.user_id,
            uid: userData.uid || firebaseUser.uid,
            displayName:
              firebaseUser.displayName || userData.name || "Unknown User",
            photoURL: firebaseUser.photoURL || null,
            email: userData.email,
            role: userData.role,
            status: userData.status,
          });
          setGamification(userData.gamification || null);
          setStatus("ready");
          setError(null);
        } catch (networkError) {
          console.warn(
            "Dashboard user network error, using Firebase data only",
            networkError
          );
          setUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || "Unknown User",
            photoURL: firebaseUser.photoURL || null,
            email: firebaseUser.email || null,
          });
          setGamification(null);
          setStatus("ready");
        }
      } catch (authError) {
        console.error("Error handling dashboard auth state:", authError);
        setUser(null);
        setGamification(null);
        setStatus("error");
        setError(authError);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshGamification = useCallback(async () => {
    try {
      const summary = await getGamificationSummary();
      setGamification(summary);
      return summary;
    } catch (refreshError) {
      console.error("Unable to refresh gamification summary", refreshError);
      throw refreshError;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const cleanupSubscription = () => {
      if (gamificationSubscriptionRef.current) {
        realtimeService.unsubscribe(gamificationSubscriptionRef.current);
        gamificationSubscriptionRef.current = null;
      }
    };

    if (!user) {
      cleanupSubscription();
      return cleanupSubscription;
    }

    const subscribeToGamification = async () => {
      try {
        if (realtimeService.getConnectionState() === "disconnected") {
          await realtimeService.initialize(null, {
            pollingInterval: 20000,
            enableActivityLog: process.env.NODE_ENV === "development",
          });
        }

        cleanupSubscription();

        const subscriptionId = realtimeService.subscribe(
          `gamification-summary-${user.uid}`,
          getGamificationSummary,
          (data) => {
            if (isMounted) {
              setGamification(data);
            }
          },
          20000
        );

        gamificationSubscriptionRef.current = subscriptionId;
      } catch (realtimeError) {
        console.error(
          "Unable to start realtime gamification updates",
          realtimeError
        );
      }
    };

    subscribeToGamification();

    return () => {
      isMounted = false;
      cleanupSubscription();
    };
  }, [user?.uid]);

  return { user, status, error, gamification, refreshGamification };
}

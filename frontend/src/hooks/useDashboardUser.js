"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { API_BASE } from "../config/config";

/**
 * Shared hook for dashboard pages to load the authenticated user along with
 * their role information from the backend.
 * @returns {{ user: object | null, status: "loading" | "ready" | "error", error: Error | null }}
 */
export function useDashboardUser() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
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
              displayName: firebaseUser.displayName || "Unknown User",
              photoURL: firebaseUser.photoURL || null,
              email: firebaseUser.email || null,
            });
            setStatus("ready");
            return;
          }

          const userData = await response.json();
          setUser({
            user_id: userData.user_id,
            displayName:
              firebaseUser.displayName || userData.name || "Unknown User",
            photoURL: firebaseUser.photoURL || null,
            email: userData.email,
            role: userData.role,
            status: userData.status,
          });
          setStatus("ready");
          setError(null);
        } catch (networkError) {
          console.warn(
            "Dashboard user network error, using Firebase data only",
            networkError
          );
          setUser({
            displayName: firebaseUser.displayName || "Unknown User",
            photoURL: firebaseUser.photoURL || null,
            email: firebaseUser.email || null,
          });
          setStatus("ready");
        }
      } catch (authError) {
        console.error("Error handling dashboard auth state:", authError);
        setUser(null);
        setStatus("error");
        setError(authError);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, status, error };
}

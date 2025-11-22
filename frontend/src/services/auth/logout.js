import { getAuth, signOut } from "firebase/auth";
import { logActions } from "../activityLogService";
import { STORAGE_KEYS } from "../../config/config";

const TOKEN_STORAGE_KEY = STORAGE_KEYS?.AUTH_TOKEN || "token";

export function handleLogout(setShowLogoutModal) {
  setShowLogoutModal(true);
}

export async function confirmLogout(setShowLogoutModal, setUser) {
  const auth = getAuth();

  try {
    try {
      await logActions.logout();
    } catch (logError) {
      // Don't block logout if logging fails
      console.error("Failed to log logout activity:", logError);
    }

    await signOut(auth);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch (storageError) {
        console.warn("Unable to clear cached auth token", storageError);
      }
    }

    console.log("User logged out");
    if (typeof setUser === "function") {
      setUser(null);
    }

    window.location.href = "/";
  } catch (error) {
    console.error("Error during logout:", error);
  } finally {
    setShowLogoutModal(false);
  }
}

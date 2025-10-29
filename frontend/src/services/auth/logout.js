import { getAuth, signOut } from "firebase/auth";
import { logActions } from "../activityLogService";

export function handleLogout(setShowLogoutModal) {
  setShowLogoutModal(true);
}

export async function confirmLogout(setShowLogoutModal, setUser) {
  const auth = getAuth();

  try {
    // Log logout activity before signing out
    try {
      await logActions.logout();
    } catch (logError) {
      // Don't block logout if logging fails
      console.error("Failed to log logout activity:", logError);
    }

    // Sign out from Firebase
    await signOut(auth);

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

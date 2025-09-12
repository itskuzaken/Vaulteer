import { getAuth, signOut } from "firebase/auth";

export function handleLogout(setShowLogoutModal) {
  setShowLogoutModal(true);
}

export function confirmLogout(setShowLogoutModal, setUser) {
  const auth = getAuth();
  signOut(auth)
    .then(() => {
      console.log("User logged out");
      if (typeof setUser === "function") {
        setUser(null); // Ensure setUser is a valid function before calling it
      }
      window.location.href = "/";
    })
    .catch((error) => {
      console.error("Error during logout:", error);
    })
    .finally(() => {
      setShowLogoutModal(false); // Ensure modal is closed even if an error occurs
    });
}

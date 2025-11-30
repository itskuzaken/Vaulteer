"use client";

import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import { useRouter } from "next/navigation";
import { getCurrentUser, updateUserActivity } from "../userService";
import { logActions } from "../activityLogService";
import { STORAGE_KEYS } from "../../config/config";

const TOKEN_STORAGE_KEY = STORAGE_KEYS?.AUTH_TOKEN || "token";

export default function Login({ onClose }) {
  const [isModalOpen, setModalOpen] = useState(true);
  const [notRegistered, setNotRegistered] = useState(false);
  const [loginError, setLoginError] = useState("");
  const router = useRouter();

  const closeModal = () => {
    setModalOpen(false);
    setNotRegistered(false);
    setLoginError("");
    onClose();
  };

  const handleLogin = async () => {
    setLoginError("");

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Only allow login if user has a record in the database
      let userInfo;
      let currentUserError = null;
      try {
        userInfo = await getCurrentUser();
      } catch (fetchError) {
        currentUserError = fetchError;
        userInfo = null;
      }

      if (
        currentUserError?.status === 403 &&
        currentUserError?.message === "Account is deactivated by admin."
      ) {
        setLoginError(
          "Your account has been deactivated by an administrator. Please contact support to regain access."
        );

        try {
          await auth.signOut();
        } catch (signOutError) {
          console.error("Failed to sign out deactivated user:", signOutError);
        }

        try {
          await logActions.loginFailure(
            "Account deactivated by admin",
            user.email
          );
        } catch (logError) {
          console.error("Failed to log deactivated login attempt:", logError);
        }

        return;
      }

      if (userInfo && ["admin", "staff", "volunteer"].includes(userInfo.role)) {
        // User is valid and has an appropriate role
        const roleRoute = {
          admin: "/dashboard/admin",
          staff: "/dashboard/staff",
          volunteer: "/dashboard/volunteer",
        }[userInfo.role];

        const loginEventDate = new Date();
        const loginTimestamp = loginEventDate.toISOString();

        let reactivatedNotice = false;
        try {
          const activityResponse = await updateUserActivity(userInfo.user_id, {
            occurredAt: loginTimestamp,
          });
          if (activityResponse?.data?.reactivated) {
            reactivatedNotice = true;
          }
        } catch (activityError) {
          console.error("Failed to record user activity:", activityError);
        }

        // Log successful login
        try {
          await logActions.loginSuccess(
            {
              role: userInfo.role,
              email: userInfo.email,
              name: userInfo.name,
            },
            { occurredAt: loginTimestamp }
          );
        } catch (logError) {
          // Don't block login if logging fails
          console.error("Failed to log login activity:", logError);
        }

        if (reactivatedNotice) {
          try {
            window.sessionStorage.setItem(
              "vaulteer:reactivatedFromInactive",
              "true"
            );
          } catch (storageError) {
            console.warn(
              "Unable to persist reactivation notice in session storage",
              storageError
            );
          }
        }

        try {
          const freshToken = await user.getIdToken(true);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(TOKEN_STORAGE_KEY, freshToken);
          }
        } catch (tokenError) {
          console.warn("Unable to refresh auth token", tokenError);
        }

        router.push(roleRoute);
        closeModal();
      } else if (currentUserError?.status === 403) {
        // Check for structured error codes from backend
        const errorCode = currentUserError?.payload?.code;
        const msg = currentUserError?.message || currentUserError?.payload?.message || "Access forbidden";
        
        if (errorCode === "NOT_REGISTERED" || msg === "User not registered") {
          setNotRegistered(true);
          setLoginError("You need to sign up as a volunteer first.");
        } else if (errorCode === "DEACTIVATED" || msg === "Account is deactivated by admin.") {
          setLoginError("Your account has been deactivated by an administrator. Please contact support.");
          await auth.signOut();
        } else {
          // Other 403 reason - show as not registered fallback
          setNotRegistered(true);
          setLoginError(msg);
        }
      } else {
        // Fallback: user has no record in the database or no recognized role
        setNotRegistered(true);
        if (currentUserError?.message) setLoginError(currentUserError.message);

        // Log failed login - user not registered
        try {
          await logActions.loginFailure(
            "User not registered or invalid role",
            user.email
          );
        } catch (logError) {
          console.error("Failed to log failed login:", logError);
        }
      }
    } catch (error) {
      let errorMessage = "Login failed. Please try again.";
      let logReason = "Unknown error";

      if (error.code === "auth/unauthorized-domain") {
        errorMessage =
          "Login failed: Unauthorized domain. Please contact support.";
        logReason = "Unauthorized domain";
      } else if (error.code === "auth/popup-closed-by-user") {
        logReason = "User closed popup";
      } else if (error.code === "auth/cancelled-popup-request") {
        logReason = "Popup request cancelled";
      } else {
        logReason = error.message || "Authentication error";
      }

      // Log failed login attempt (except for user-cancelled actions)
      if (
        error.code !== "auth/popup-closed-by-user" &&
        error.code !== "auth/cancelled-popup-request"
      ) {
        setLoginError(errorMessage);

        // Log failed login
        try {
          await logActions.loginFailure(logReason);
        } catch (logError) {
          console.error("Failed to log failed login:", logError);
        }
      }
    }
  };

  const handleSignupRedirect = () => {
    closeModal();
    router.push("/volunteer/signup");
  };

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50 bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded shadow-lg w-96 relative">
        <button
          onClick={closeModal}
          className="absolute top-3 right-3"
          aria-label="Close"
        >
          <svg
            className="h-7 w-7 text-[var(--primary-red)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {!notRegistered ? (
          <>
            <h2 className="text-xl text-black font-bold mb-4 text-center">
              Login
            </h2>
            {loginError && (
              <div className="mb-4 text-center text-red-600 text-sm">
                {loginError}
              </div>
            )}
            <button
              onClick={handleLogin}
              className="bg-[var(--primary-red)] text-white px-4 py-2 rounded w-full hover:bg-[var(--dark)] transition"
            >
              Login with Google
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center">
            <h2 className="text-xl text-black font-bold mb-4 text-center">
              Not Registered
            </h2>
            <p className="mb-4 text-center text-gray-700">
              You’re not yet registered as a staff/volunteer. Please sign up
              first.
            </p>
            <button
              onClick={handleSignupRedirect}
              className="bg-[var(--primary-red)] text-white px-4 py-2 rounded w-full hover:bg-[var(--dark)] transition"
            >
              Go to Volunteer Sign Up
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

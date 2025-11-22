import React from "react";
import { confirmLogout } from "../../services/auth/logout";
import ModalShell from "./ModalShell";

export default function LogoutModal({
  isOpen = true,
  onCancel,
  setShowLogoutModal,
  setUser,
}) {
  const closeModal = (nextState = false) => {
    if (typeof setShowLogoutModal === "function") {
      setShowLogoutModal(nextState);
    } else if (!nextState && typeof onCancel === "function") {
      onCancel();
    }
  };

  const handleLogout = () => {
    confirmLogout(closeModal, setUser);
  };

  return (
    <ModalShell
      isOpen={isOpen}
      title="Confirm logout"
      description="You will be signed out of the dashboard and need to authenticate again."
      onClose={() => closeModal(false)}
      footer={
        <>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => closeModal(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleLogout}
          >
            Logout
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Make sure any unsaved changes are stored before you continue.
      </p>
    </ModalShell>
  );
}

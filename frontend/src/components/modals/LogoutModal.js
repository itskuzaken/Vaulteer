import React from "react";
import { confirmLogout } from "../../services/auth/logout";
import ModalShell from "./ModalShell";
import Button from "@/components/ui/Button";

export default function LogoutModal({
  isOpen = true,
  onCancel,
  setShowLogoutModal,
  setUser,
  mode = "auto",
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
        mode={mode}
        footer={
          <>
            <Button variant="ghost" onClick={() => closeModal(false)} disabled={false} mode={mode}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleLogout} mode={mode}>
              Logout
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Make sure any unsaved changes are stored before you continue.
        </p>
      </ModalShell>
  );
}

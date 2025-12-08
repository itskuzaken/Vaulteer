"use client";

import React from "react";
import ModalShell from "@/components/modals/ModalShell";
import Button from "@/components/ui/Button";
import { IoWarning, IoClose } from "react-icons/io5";

/**
 * Reusable confirmation modal component
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to call when closing the modal
 * @param {function} onConfirm - Function to call when confirming the action
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {string} confirmText - Text for confirm button (default: "Confirm")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {string} confirmButtonClass - Additional classes for confirm button
 * @param {boolean} loading - Whether the action is loading
 */
export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "danger",
  cancelVariant = "ghost",
  loading = false,
  mode = "auto",
}) {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={null}
      mode={mode}
      footer={
        <>
          <Button variant={cancelVariant} onClick={onClose} disabled={loading} mode={mode}>
            {cancelText}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={loading} loading={loading} mode={mode}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="text-sm text-gray-600 dark:text-gray-300">
        <p>{message}</p>
      </div>
    </ModalShell>
  );
}

"use client";

import React from "react";
import Button from "./Button";
import ModalShell from "@/components/modals/ModalShell";
import { IoCloseOutline } from "react-icons/io5";

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "danger",
  loading = false,
  mode = "auto",
}) => {
  if (!isOpen) return null;

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={loading} mode={mode}>
        {cancelText}
      </Button>
      <Button variant={confirmVariant} onClick={onConfirm} loading={loading} mode={mode}>
        {confirmText}
      </Button>
    </>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      mode={mode}
      footer={footer}
      role="alertdialog"
    >
      <div className="text-sm text-gray-600 dark:text-gray-300">
        <p>{message}</p>
      </div>
    </ModalShell>
  );
};

export default ConfirmModal;

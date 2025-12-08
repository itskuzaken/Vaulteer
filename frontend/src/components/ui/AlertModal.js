"use client";

import React from "react";
import Button from "./Button";
import ModalShell from "@/components/modals/ModalShell";
import { IoCloseOutline, IoAlertCircle, IoWarning, IoInformationCircle, IoCheckmarkCircle } from "react-icons/io5";

const AlertModal = ({
  isOpen,
  onClose,
  title,
  message,
  type = "info", // "info", "warning", "error", "success"
  confirmText = "OK",
  showCancel = false,
  cancelText = "Cancel",
  onConfirm,
  mode = "auto",
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  const getIcon = () => {
    switch (type) {
      case "error":
        return <IoAlertCircle className="text-red-500 dark:text-red-300" size={48} />;
      case "warning":
        return <IoWarning className="text-yellow-500 dark:text-yellow-300" size={48} />;
      case "success":
        return <IoCheckmarkCircle className="text-green-500 dark:text-green-300" size={48} />;
      default:
        return <IoInformationCircle className="text-blue-500 dark:text-blue-300" size={48} />;
    }
  };

  const getButtonVariant = () => {
    switch (type) {
      case "error":
        return "danger";
      case "warning":
        return "warning";
      case "success":
        return "success";
      default:
        return "primary";
    }
  };

  const panelModeClass =
    mode === "light"
      ? "bg-white text-slate-900"
      : mode === "dark"
      ? "bg-gray-900 text-white"
      : "bg-white dark:bg-gray-800 text-slate-900 dark:text-white";

  const footer = (
    <>
      {showCancel && (
        <Button variant="ghost" onClick={onClose} mode={mode}>
          {cancelText}
        </Button>
      )}
      <Button variant={getButtonVariant()} onClick={handleConfirm} mode={mode}>
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
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-1">{getIcon()}</div>
        <div className="flex-1 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{message}</div>
      </div>
    </ModalShell>
  );
};

export default AlertModal;

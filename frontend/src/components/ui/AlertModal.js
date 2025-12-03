"use client";

import React from "react";
import Button from "./Button";
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
        return <IoAlertCircle className="text-red-500" size={48} />;
      case "warning":
        return <IoWarning className="text-yellow-500" size={48} />;
      case "success":
        return <IoCheckmarkCircle className="text-green-500" size={48} />;
      default:
        return <IoInformationCircle className="text-blue-500" size={48} />;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <IoCloseOutline size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              {getIcon()}
            </div>
            <div className="flex-1">
              <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          {showCancel && (
            <Button
              variant="ghost"
              onClick={onClose}
            >
              {cancelText}
            </Button>
          )}
          <Button
            variant={getButtonVariant()}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;

import React from "react";
import { confirmLogout } from "../../services/auth/logout";

export default function LogoutModal({ onCancel, setShowLogoutModal, setUser }) {
  return (
    <div className="fixed inset-0 z-[1001] bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full">
        <h2 className="text-xl text-black font-bold mb-4">Confirm Logout</h2>
        <p className="mb-4 text-black">Are you sure you want to logout?</p>
        <div className="flex justify-end gap-2">
          <button
            className="bg-gray-300 text-black px-4 py-2 rounded"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded"
            onClick={() =>
              confirmLogout(setShowLogoutModal || onCancel, setUser)
            }
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

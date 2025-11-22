import { roleColors } from "./ProfileUtils";

export default function AdminControls({
  currentStatus,
  onToggleStatus,
  statusUpdating = false,
  disableStatusToggle = false,
  currentRole,
  roleDraft,
  onRoleDraftChange,
  onRoleSave,
  roleUpdating = false,
  roleOptions = [],
}) {
  const normalizedStatus = (currentStatus || "active").toLowerCase();
  const normalizedRole = (currentRole || "user").toLowerCase();
  const roleChoices = Array.from(
    new Set([...(roleOptions || []), normalizedRole].filter(Boolean))
  );
  const isDeactivated = normalizedStatus === "deactivated";
  const isInactive = normalizedStatus === "inactive";
  const statusButtonLabel =
    isDeactivated || isInactive ? "Activate User" : "Deactivate User";
  const statusButtonDescription = isDeactivated
    ? "Restore access to this account immediately."
    : isInactive
    ? "Reactivate this account to restore full access."
    : "Block access to the dashboard until reactivated.";
  const disableToggle = statusUpdating || disableStatusToggle;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Admin Controls
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage account visibility and permissions for this user. Changes are
            applied immediately.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Account Access
          </h4>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {statusButtonDescription}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  onToggleStatus?.(
                    isDeactivated || isInactive ? "active" : "deactivated"
                  )
                }
                disabled={disableToggle}
                className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isDeactivated
                    ? "bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white"
                    : "bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white"
                } ${disableToggle ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {statusUpdating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <>
                    <span>{statusButtonLabel}</span>
                  </>
                )}
              </button>
            </div>
            {disableStatusToggle && (
              <p className="text-xs text-amber-600 dark:text-amber-300">
                You cannot deactivate your own administrator account.
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Role Assignment
          </h4>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Current Role
              </label>
              <div
                className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                  roleColors[normalizedRole] || roleColors.applicant
                }`}
              >
                {normalizedRole.charAt(0).toUpperCase() +
                  normalizedRole.slice(1)}
              </div>
            </div>
            <div className="flex-1">
              <label
                htmlFor="role-select"
                className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1"
              >
                Assign New Role
              </label>
              <select
                id="role-select"
                value={roleDraft || ""}
                onChange={(event) =>
                  onRoleDraftChange?.(event.target.value.toLowerCase())
                }
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={roleUpdating}
              >
                <option value="" disabled>
                  Select role
                </option>
                {roleChoices.map((roleOption) => (
                  <option
                    key={roleOption}
                    value={roleOption}
                    className="capitalize"
                  >
                    {roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={onRoleSave}
              disabled={
                roleUpdating || !roleDraft || roleDraft === normalizedRole
              }
              className="inline-flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {roleUpdating ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving
                </span>
              ) : (
                "Update Role"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

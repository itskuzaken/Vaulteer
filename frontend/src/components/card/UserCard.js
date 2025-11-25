"use client";

/**
 * createUserCard - Modern reusable user card for staff/volunteer listings.
 * Matches the modern dashboard design with smooth animations and improved styling.
 *
 * @param {Object} options
 *   user: { id, name, email, status, ... }
 *   onClick: function(user) - called when card is clicked or activated
 *   extraFields: [{ label, value }] - optional extra fields to display
 *   tabIndex: number (default 0)
 *   className: string (optional)
 * @returns {HTMLElement} - The user card DOM element
 */
export function createUserCard({
  user,
  onClick,
  extraFields = [],
  tabIndex = 0,
  className = "",
}) {
  // Determine status styling
  const statusStyles = {
    active: {
      ring: "ring-2 ring-green-500",
      badge:
        "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
      dot: "bg-green-500",
    },
    inactive: {
      ring: "ring-2 ring-gray-400",
      badge:
        "bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600",
      dot: "bg-gray-400",
    },
    deactivated: {
      ring: "ring-2 ring-gray-900",
      badge:
        "bg-gray-900 dark:bg-black text-white dark:text-white border-gray-900 dark:border-black",
      dot: "bg-gray-900",
    },
    pending: {
      ring: "ring-2 ring-amber-500",
      badge:
        "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      dot: "bg-amber-500",
    },
    approved: {
      ring: "ring-2 ring-green-500",
      badge:
        "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
      dot: "bg-green-500",
    },
    rejected: {
      ring: "ring-2 ring-red-500",
      badge:
        "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
      dot: "bg-red-500",
    },
  };

  const status = (user.status || "active").toLowerCase();
  const statusLabel = status
    .split(/[_\s]+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
  const style = statusStyles[status] || statusStyles.active;

  // Card container - modern design with mobile optimization
  const card = document.createElement("div");
  card.className = `
    bg-white dark:bg-gray-800 
    rounded-xl sm:rounded-2xl 
    shadow-md hover:shadow-xl 
    border border-gray-200 dark:border-gray-700 
    p-4 sm:p-5 md:p-6 
    flex flex-col 
    gap-3 sm:gap-4 
    cursor-pointer 
    transition-all duration-300 
    hover:scale-[1.02] 
    hover:border-red-500 dark:hover:border-red-400
    focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400
    min-h-[44px]
    ${className || ""}
  `
    .trim()
    .replace(/\s+/g, " ");

  card.setAttribute("tabindex", tabIndex);
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `View details for ${user.name || "user"}`);

  // Click and keyboard handlers
  card.addEventListener("click", (e) => {
    if (typeof onClick === "function") onClick(user, e);
  });
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (typeof onClick === "function") onClick(user, e);
    }
  });

  // --- Header with Avatar and Status ---
  const header = document.createElement("div");
  header.className = "flex items-center gap-3 sm:gap-4";

  // Avatar wrapper with modern ring
  const avatarWrapper = document.createElement("div");
  avatarWrapper.className = "flex-shrink-0 relative";

  const avatar = document.createElement("img");
  avatar.className = `w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full object-cover ${style.ring}`;

  // Determine avatar src
  let avatarUrl = "";
  if (user.photoUrl) {
    avatarUrl = user.photoUrl;
  } else if (user.email) {
    avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.name || user.email
    )}&background=D32F2F&color=fff&size=128`;
  } else {
    avatarUrl =
      "https://ui-avatars.com/api/?name=User&background=D32F2F&color=fff&size=128";
  }

  avatar.src = avatarUrl;
  avatar.alt = user.name ? `${user.name}'s profile picture` : "Profile picture";
  avatar.onerror = function () {
    avatar.onerror = null;
    avatar.src =
      "https://ui-avatars.com/api/?name=User&background=D32F2F&color=fff&size=128";
  };

  // Status indicator dot
  const statusDot = document.createElement("div");
  statusDot.className = `absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 ${style.dot} rounded-full border-2 border-white dark:border-gray-800`;
  statusDot.setAttribute("aria-label", `Status: ${statusLabel}`);

  avatarWrapper.appendChild(avatar);
  avatarWrapper.appendChild(statusDot);
  header.appendChild(avatarWrapper);

  // Info section
  const info = document.createElement("div");
  info.className = "flex-1 min-w-0";

  // Name
  const nameSpan = document.createElement("h3");
  nameSpan.className =
    "font-bold text-gray-900 dark:text-white text-base sm:text-lg truncate mb-1";
  nameSpan.textContent = user.name || "Unknown User";
  info.appendChild(nameSpan);

  // Email
  const emailSpan = document.createElement("p");
  emailSpan.className =
    "text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate";
  emailSpan.textContent = user.email || "";
  info.appendChild(emailSpan);

  header.appendChild(info);
  card.appendChild(header);

  // --- Extra Fields ---
  if (Array.isArray(extraFields) && extraFields.length > 0) {
    const fieldsContainer = document.createElement("div");
    fieldsContainer.className =
      "space-y-2 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700";

    extraFields.forEach((field) => {
      const fieldRow = document.createElement("div");
      fieldRow.className =
        "flex justify-between items-center text-xs sm:text-sm gap-2";

      const label = document.createElement("span");
      label.className = "text-gray-600 dark:text-gray-400 font-medium truncate";
      label.textContent = field.label + ":";

      const value = document.createElement("span");
      value.className = "text-gray-900 dark:text-white font-semibold truncate";
      value.textContent = field.value;

      fieldRow.appendChild(label);
      fieldRow.appendChild(value);
      fieldsContainer.appendChild(fieldRow);
    });

    card.appendChild(fieldsContainer);
  }

  return card;
}

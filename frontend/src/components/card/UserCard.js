/**
 * createUserCard - Reusable user card for staff/volunteer listings.
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
  // Determine avatar ring color based on status
  const ringColor =
    user.status === "active"
      ? "border-2 border-green-600"
      : "border-2 border-gray-600";

  // Card container (now flex-row for avatar+info)
  const card = document.createElement("div");
  card.className =
    "bg-white rounded-lg shadow border border-red-300 p-4 flex flex-row items-center gap-4 text-xs cursor-pointer hover:shadow-lg hover:border-[#bb3031] transition " +
    (className || "");
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

  // --- Profile Picture with Status Ring ---
  const avatarWrapper = document.createElement("div");
  avatarWrapper.className = "flex-shrink-0 flex items-center justify-center";
  const avatar = document.createElement("img");
  avatar.className = "w-12 h-12 rounded-full object-cover " + ringColor;
  // Determine avatar src (Google profile or fallback)
  let avatarUrl = "";
  if (user.photoUrl) {
    avatarUrl = user.photoUrl;
  } else if (user.email) {
    // Try Google profile image (may not always be available)
    // This is a placeholder; Google profile images are not public by email, so fallback to initials avatar
    avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.name || user.email
    )}&background=bb3031&color=fff&size=128`;
  } else {
    avatarUrl =
      "https://ui-avatars.com/api/?name=User&background=bb3031&color=fff&size=128";
  }
  avatar.src = avatarUrl;
  avatar.alt = user.name ? `${user.name}'s profile picture` : "Profile picture";
  avatar.onerror = function () {
    avatar.onerror = null;
    avatar.src =
      "https://ui-avatars.com/api/?name=User&background=bb3031&color=fff&size=128";
  };
  avatarWrapper.appendChild(avatar);
  card.appendChild(avatarWrapper);

  // --- Info Section ---
  const info = document.createElement("div");
  info.className = "flex flex-col gap-1 min-w-0";

  // Name
  const nameSpan = document.createElement("span");
  nameSpan.className = "font-bold text-gray-900 text-base truncate";
  nameSpan.textContent = user.name || "";
  info.appendChild(nameSpan);

  // Email
  const emailSpan = document.createElement("span");
  emailSpan.className = "text-gray-700 truncate";
  emailSpan.textContent = user.email || "";
  info.appendChild(emailSpan);

  // Extra fields (optional)
  if (Array.isArray(extraFields)) {
    extraFields.forEach((field) => {
      const fieldSpan = document.createElement("span");
      fieldSpan.className = "text-gray-600";
      fieldSpan.textContent = `${field.label}: ${field.value}`;
      info.appendChild(fieldSpan);
    });
  }

  card.appendChild(info);

  return card;
}

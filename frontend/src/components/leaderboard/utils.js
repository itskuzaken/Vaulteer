export function formatName(entry) {
  if (entry?.name) return entry.name;
  if (entry?.email) return entry.email?.split("@")[0];
  return "Volunteer";
}

export function getAvatarUrl(user) {
  if (user?.profile_picture) return user.profile_picture;
  if (user?.photoUrl) return user.photoUrl;
  const name = user?.name || user?.email || "User";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=D32F2F&color=fff&size=128`;
}

export function getRankIconStyle(rank) {
  switch (rank) {
    case 1:
      return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30";
    case 2:
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30";
    case 3:
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30";
    default:
      return "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700";
  }
}

export function getRowStyle(rank) {
  switch (rank) {
    case 1:
      return "border-yellow-400 dark:border-yellow-600 bg-yellow-50/50 dark:bg-yellow-900/10";
    case 2:
      return "border-slate-300 dark:border-slate-500 bg-slate-50/50 dark:bg-slate-900/10";
    case 3:
      return "border-orange-300 dark:border-orange-600 bg-orange-50/50 dark:bg-orange-900/10";
    default:
      return "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900";
  }
}
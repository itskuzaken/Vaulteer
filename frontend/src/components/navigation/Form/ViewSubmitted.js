import { useEffect, useState } from "react";
import { createUserCard } from "../../card/UserCard";

// Dummy data for demonstration; replace with real fetch in production
const demoSubmissions = [
  {
    id: 1,
    name: "Jane Smith",
    email: "jane@email.com",
    imageName: "form123.jpg",
    submissionDate: "2025-06-08T14:45:00Z",
    avatarUrl:
      "https://ui-avatars.com/api/?name=Jane+Smith&background=bb3031&color=fff",
  },
  {
    id: 2,
    name: "John Doe",
    email: "john@email.com",
    imageName: "john_form.png",
    submissionDate: "2025-06-07T11:18:00Z",
    avatarUrl:
      "https://ui-avatars.com/api/?name=John+Doe&background=bb3031&color=fff",
  },
  // ...more submissions
];

// Format date to "Month Day, Year, HH:MM AM/PM"
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  // Format: HH:MM AM/PM, Month Day, Year
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const date = d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `${time}, ${date}`;
}

export default function ViewSubmitted() {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    // Replace with real fetch in production
    setSubmissions(demoSubmissions);
  }, []);

  // Compose a user object for createUserCard
  function toUserCardData(sub) {
    // Use name split for initials, fallback to email
    let first_name = "";
    let last_name = "";
    if (sub.name) {
      const parts = sub.name.split(" ");
      first_name = parts[0] || "";
      last_name = parts.slice(1).join(" ") || "";
    }
    return {
      ...sub,
      first_name,
      last_name,
      email: sub.email,
      photoUrl: sub.avatarUrl,
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex-1 flex justify-center items-start">
        <div className="w-full max-w-5xl bg-gradient-to-br from-red-100 via-white to-red-200 border-2 border-red-700 rounded-2xl shadow-2xl p-4 md:p-8 transition-all duration-300">
          <div className="mb-8 border-2 p-3 rounded-xl bg-white bg-opacity-10">
            <h2 className="text-xl md:text-2xl font-extrabold text-red-700 tracking-tight text-start">
              Submitted Forms
            </h2>
          </div>
          {/* Responsive Card List */}
          <div className="flex flex-col gap-3">
            {submissions.map((s) => (
              <div
                key={s.id}
                className={`
                  flex flex-col sm:grid sm:grid-cols-5 gap-2 sm:gap-4
                  bg-white rounded-lg shadow border border-red-300 px-4 py-3
                  hover:shadow-lg hover:border-[#bb3031] transition
                  items-start sm:items-center
                `}
              >
                {/* Profile Picture + Name compressed */}
                <div className="flex items-center gap-2 mb-2 sm:mb-0">
                  <img
                    src={s.avatarUrl}
                    alt={s.name}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-red-300 flex-shrink-0"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://ui-avatars.com/api/?name=User&background=bb3031&color=fff";
                    }}
                  />
                  <span className="font-semibold text-gray-900 truncate w-24 sm:w-32">
                    {s.name}
                  </span>
                </div>
                {/* Email */}
                <span className="text-gray-700 truncate w-full break-all">
                  {s.email}
                </span>
                {/* Image Name */}
                <span className="text-gray-600 truncate w-full break-all">
                  {s.imageName}
                </span>
                {/* Submission Date */}
                <span className="text-gray-500 truncate w-full">
                  {formatDate(s.submissionDate)}
                </span>
                {/* Mobile labels */}
                <div className="flex flex-col gap-1 sm:hidden mt-2 w-full text-xs text-gray-500">
                  <div>
                    <span className="font-semibold text-[#bb3031]">
                      Email:{" "}
                    </span>
                    {s.email}
                  </div>
                  <div>
                    <span className="font-semibold text-[#bb3031]">
                      Image Name:{" "}
                    </span>
                    {s.imageName}
                  </div>
                  <div>
                    <span className="font-semibold text-[#bb3031]">
                      Submission Date:{" "}
                    </span>
                    {formatDate(s.submissionDate)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import Image from "next/image";

// Dummy fetch function for scheduled posts (replace with real API)
async function fetchScheduledPosts() {
  // Example: fetch from backend or Firebase
  // return await api.getScheduledPosts();
  // For now, return mock data:
  return [
    {
      id: 201,
      title: "Upcoming Pride Event",
      author: "Admin",
      dateScheduled: "2024-07-01T10:00:00Z",
      content: "Join us for the Pride event this July!",
      tags: ["events", "pride"],
      imageUrl: "",
    },
    {
      id: 202,
      title: "Scheduled Announcement",
      author: "Staff",
      dateScheduled: "2024-07-10T15:00:00Z",
      content: "Stay tuned for our big announcement.",
      tags: ["announcement"],
      imageUrl: "",
    },
  ];
}

export default function ScheduledPosts() {
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadScheduled() {
      setLoading(true);
      const data = await fetchScheduledPosts();
      setScheduledPosts(data);
      setLoading(false);
    }
    loadScheduled();
  }, []);

  return (
    <div className="flex flex-row gap-6">
      {/* Main Container */}
      <div className="flex-1 flex justify-center items-start">
        <div className="w-full bg-gradient-to-br from-red-100 via-white to-red-200 border-2 border-red-700 rounded-2xl shadow-2xl p-8 transition-all duration-300">
          <div className="mb-8 bg-white border-2 bg-opacity-10 p-3 rounded-xl">
            <h1 className="text-2xl font-extrabold text-red-700 tracking-tight">
              Scheduled Posts
            </h1>
          </div>
          {loading ? (
            <div className="text-center text-lg text-red-700">Loading...</div>
          ) : !scheduledPosts.length ? (
            <div className="text-center text-gray-500">
              No scheduled posts found.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {scheduledPosts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white border border-red-100 rounded-lg shadow p-4"
                >
                  {post.imageUrl && (
                    <Image
                      src={post.imageUrl}
                      alt={post.title}
                      width={800}
                      height={400}
                      className="w-full h-48 object-cover rounded mb-3"
                      unoptimized
                    />
                  )}
                  <h3 className="text-xl font-bold text-[var(--primary-red)] mb-1">
                    {post.title}
                  </h3>
                  <div className="text-xs text-gray-500 mb-2">
                    By <span className="font-medium">{post.author}</span>{" "}
                    &middot;{" "}
                    <span>
                      Scheduled for:{" "}
                      {new Date(post.dateScheduled).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-gray-800 mb-2">{post.content}</div>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-[var(--primary-red)] text-white text-xs font-semibold px-3 py-1 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

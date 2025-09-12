import React, { useState, useEffect } from "react";

// Accept externalArchivedPosts as prop for dynamic archiving
export default function ArchivedPosts({ externalArchivedPosts }) {
  const [archivedPosts, setArchivedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // If externalArchivedPosts is provided, use it; otherwise, fetch from backend/mock
  useEffect(() => {
    if (externalArchivedPosts) {
      setArchivedPosts(externalArchivedPosts);
      setLoading(false);
    } else {
      async function fetchArchivedPosts() {
        // Example: fetch from backend or Firebase
        // return await api.getArchivedPosts();
        // For now, return mock data:
        return [
          {
            id: 101,
            title: "Old News: Bagani Launch",
            author: "Admin",
            datePosted: "2023-12-01",
            content: "Bagani Community Center was launched in December 2023.",
            tags: ["news", "launch"],
            imageUrl: "",
            archivedAt: "2024-06-01T10:00:00Z",
          },
          {
            id: 102,
            title: "Past Event: Outreach 2023",
            author: "Staff",
            datePosted: "2023-11-15",
            content: "Our outreach event in 2023 was a success.",
            tags: ["events"],
            imageUrl: "",
            archivedAt: "2024-06-02T14:30:00Z",
          },
        ];
      }
      setLoading(true);
      fetchArchivedPosts().then((data) => {
        setArchivedPosts(data);
        setLoading(false);
      });
    }
  }, [externalArchivedPosts]);

  return (
    <div className="flex flex-row gap-6">
      {/* Main Container */}
      <div className="flex-1 flex justify-center items-start">
        <div className="w-full bg-gradient-to-br from-red-100 via-white to-red-200 border-2 border-red-700 rounded-2xl shadow-2xl p-8 transition-all duration-300">
          <div className="mb-8 bg-white border-2 bg-opacity-10 p-3 rounded-xl">
            <h1 className="text-2xl font-extrabold text-red-700 tracking-tight">
              Archived Posts
            </h1>
          </div>
          {loading ? (
            <div className="text-center text-lg text-red-700">Loading...</div>
          ) : !archivedPosts.length ? (
            <div className="text-center text-gray-500">
              No archived posts found.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {archivedPosts.map((post) => (
                <article
                  key={post.id}
                  className="bg-gray-100 border border-red-100 rounded-lg shadow p-4 opacity-80"
                >
                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-48 object-cover rounded mb-3"
                    />
                  )}
                  <h3 className="text-xl font-bold text-gray-500 mb-1 line-through">
                    {post.title}
                  </h3>
                  <div className="text-xs text-gray-400 mb-2">
                    By <span className="font-medium">{post.author}</span>{" "}
                    &middot; <span>{post.datePosted}</span>
                  </div>
                  <div className="text-gray-500 mb-2 line-through">
                    {post.content}
                  </div>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-gray-400 text-white text-xs font-semibold px-3 py-1 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    Archived at:{" "}
                    {post.archivedAt &&
                      new Date(post.archivedAt).toLocaleString()}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";

// Dummy fetch function, replace with real API call or context as needed
async function fetchPublishedPosts() {
  // Example: fetch from backend or Firebase
  // return await api.getPublishedPosts();
  // For now, return mock data:
  return [
    {
      id: 1,
      title: "First Published Post",
      author: "Admin",
      datePosted: "2024-06-01",
      content: "This is the first published post.",
      tags: ["news", "update"],
      imageUrl: "",
    },
    {
      id: 2,
      title: "Community Event Announcement",
      author: "Staff",
      datePosted: "2024-06-02",
      content: "Join our upcoming community event!",
      tags: ["events"],
      imageUrl: "",
    },
  ];
}

export default function PublishedPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    async function loadPosts() {
      setLoading(true);
      const data = await fetchPublishedPosts();
      setPosts(data);
      setLoading(false);
    }
    loadPosts();
  }, []);

  const handleEdit = (id) => {
    setEditId(id);
    // You can expand this to show an edit modal or inline form
    alert(`Edit post with ID: ${id}`);
  };

  const handleDelete = (id) => {
    // Just remove from published
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="flex flex-row gap-6">
      {/* Main Container */}
      <div className="flex-1 flex justify-center items-start">
        <div className="w-full bg-gradient-to-br from-red-100 via-white to-red-200 border-2 border-red-700 rounded-2xl shadow-2xl p-8 transition-all duration-300">
          <div className="mb-8 bg-white border-2 bg-opacity-10 p-3 rounded-xl">
            <h1 className="text-2xl font-extrabold text-red-700 tracking-tight">
              Published Posts
            </h1>
          </div>
          {loading ? (
            <div className="text-center text-lg text-red-700">Loading...</div>
          ) : !posts.length ? (
            <div className="text-center text-gray-500">
              No published posts found.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white border border-red-100 rounded-lg shadow p-4"
                >
                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-48 object-cover rounded mb-3"
                    />
                  )}
                  <h3 className="text-xl font-bold text-[var(--primary-red)] mb-1">
                    {post.title}
                  </h3>
                  <div className="text-xs text-gray-500 mb-2">
                    By <span className="font-medium">{post.author}</span>{" "}
                    &middot; <span>{post.datePosted}</span>
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
                  <div className="flex justify-end mt-4 gap-2">
                    <button
                      className="bg-[var(--primary-red)] text-white px-4 py-1 rounded hover:bg-red-800 transition text-sm font-semibold"
                      onClick={() => handleEdit(post.id)}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-gray-300 text-[var(--primary-red)] px-4 py-1 rounded hover:bg-red-400 transition text-sm font-semibold"
                      onClick={() => handleDelete(post.id)}
                    >
                      Delete
                    </button>
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

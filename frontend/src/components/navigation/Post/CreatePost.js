import React, { useState } from "react";

const categories = [
  { value: "", label: "Select category" },
  { value: "news", label: "News" },
  { value: "events", label: "Events" },
  { value: "announcement", label: "Announcement" },
];

export default function CreatePost() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [publishType, setPublishType] = useState("immediate");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ message: "", type: "" });

  // Validation
  const validate = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = "Title is required.";
    if (!content.trim()) newErrors.content = "Content is required.";
    if (!category) newErrors.category = "Category is required.";
    if (publishType === "schedule") {
      if (!scheduleDate) newErrors.scheduleDate = "Date is required.";
      if (!scheduleTime) newErrors.scheduleTime = "Time is required.";
    }
    return newErrors;
  };

  // Handle submit
  const handleSubmit = async (e, status = "published") => {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    // Prepare data
    const postData = {
      title,
      content,
      category,
      status,
      publishAt:
        publishType === "immediate"
          ? new Date().toISOString()
          : new Date(`${scheduleDate}T${scheduleTime}`).toISOString(),
    };
    // TODO: Integrate with Firebase or backend API here
    // await api.savePost(postData);

    setTimeout(() => {
      setSubmitting(false);
      setNotification({
        message:
          status === "draft"
            ? "Draft saved successfully!"
            : "Post published successfully!",
        type: "success",
      });
      // Optionally reset form
      // setTitle(""); setContent(""); setCategory(""); setPublishType("immediate"); setScheduleDate(""); setScheduleTime("");
    }, 800);
  };

  // Notification auto-hide
  React.useEffect(() => {
    if (notification.message) {
      const timer = setTimeout(() => {
        setNotification({ message: "", type: "" });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <div className="flex flex-row gap-6">
      {/* Notification */}
      {notification.message && (
        <div
          className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded shadow-lg text-white ${
            notification.type === "success" ? "bg-green-700" : "bg-red-700"
          }`}
        >
          {notification.message}
          <button
            className="ml-4 text-white font-bold"
            onClick={() => setNotification({ message: "", type: "" })}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Form Container */}
      <div className="flex-1 flex justify-center items-start">
        <div className="w-full bg-gradient-to-br from-red-100 via-white to-red-200 border-2 border-red-700 rounded-2xl shadow-2xl p-8 transition-all duration-300">
          <div className="mb-8 bg-white border-2 bg-opacity-10 p-3 rounded-xl">
            <h1 className="text-2xl font-extrabold text-red-700 tracking-tight">
              Create New Post
            </h1>
          </div>
          <form
            className="flex flex-col gap-6"
            onSubmit={(e) => handleSubmit(e, "published")}
            autoComplete="off"
          >
            {/* Title */}
            <div>
              <label
                htmlFor="post-title"
                className="block font-semibold mb-1 text-[var(--primary-red)]"
              >
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="post-title"
                type="text"
                className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-red)] ${
                  errors.title ? "border-red-500" : "border-gray-300"
                }`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                aria-invalid={!!errors.title}
              />
              {errors.title && (
                <p className="text-red-600 text-sm mt-1">{errors.title}</p>
              )}
            </div>
            {/* Content */}
            <div>
              <label
                htmlFor="post-content"
                className="block font-semibold mb-1 text-[var(--primary-red)]"
              >
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                id="post-content"
                className={`w-full border rounded px-3 py-2 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[var(--primary-red)] ${
                  errors.content ? "border-red-500" : "border-gray-300"
                }`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                aria-invalid={!!errors.content}
              />
              {errors.content && (
                <p className="text-red-600 text-sm mt-1">{errors.content}</p>
              )}
            </div>
            {/* Category */}
            <div>
              <label
                htmlFor="post-category"
                className="block font-semibold mb-1 text-[var(--primary-red)]"
              >
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="post-category"
                className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-red)] ${
                  errors.category ? "border-red-500" : "border-gray-300"
                }`}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                aria-invalid={!!errors.category}
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-600 text-sm mt-1">{errors.category}</p>
              )}
            </div>
            {/* Publish Schedule */}
            <div>
              <label className="block font-semibold mb-1 text-[var(--primary-red)]">
                Publish Options
              </label>
              <div className="flex flex-col md:flex-row gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="publishType"
                    value="immediate"
                    checked={publishType === "immediate"}
                    onChange={() => setPublishType("immediate")}
                    className="mr-2"
                  />
                  Publish Immediately
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="publishType"
                    value="schedule"
                    checked={publishType === "schedule"}
                    onChange={() => setPublishType("schedule")}
                    className="mr-2"
                  />
                  Schedule for later
                </label>
              </div>
              {publishType === "schedule" && (
                <div className="flex flex-col md:flex-row gap-2 mt-2">
                  <input
                    type="date"
                    className={`border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-red)] ${
                      errors.scheduleDate ? "border-red-500" : "border-gray-300"
                    }`}
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    aria-label="Schedule date"
                    required
                  />
                  <input
                    type="time"
                    className={`border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-red)] ${
                      errors.scheduleTime ? "border-red-500" : "border-gray-300"
                    }`}
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    aria-label="Schedule time"
                    required
                  />
                </div>
              )}
              {(errors.scheduleDate || errors.scheduleTime) && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.scheduleDate || errors.scheduleTime}
                </p>
              )}
            </div>
            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-3 justify-end">
              <button
                type="button"
                className="bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded hover:bg-gray-300 transition"
                onClick={(e) => handleSubmit(e, "draft")}
                disabled={submitting}
              >
                Save as Draft
              </button>
              <button
                type="submit"
                className="bg-[var(--primary-red)] text-white font-bold px-4 py-2 rounded hover:bg-red-800 transition"
                disabled={submitting}
              >
                {submitting ? "Publishing..." : "Publish"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

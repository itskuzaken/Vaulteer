import { useState } from "react";

/**
 * @param {Object} props
 * @param {string} props.placeholder
 * @param {Function} props.onSearch
 * @param {string} [props.initialValue]
 */
export default function SearchBar({
  placeholder,
  onSearch,
  initialValue = "",
}) {
  const [query, setQuery] = useState(initialValue);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  return (
    <form
      className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto items-center"
      onSubmit={handleSubmit}
    >
      <input
        type="text"
        className="border border-gray-300 rounded px-3 py-2 w-full sm:w-64 text-sm"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button
        type="submit"
        className="bg-[var(--primary-red)] text-white px-4 py-2 rounded text-sm font-semibold"
      >
        Search
      </button>
      {query && (
        <button
          type="button"
          className="text-xs text-gray-500 hover:text-red-700 ml-1"
          onClick={() => {
            setQuery("");
            onSearch("");
          }}
        >
          Clear
        </button>
      )}
    </form>
  );
}

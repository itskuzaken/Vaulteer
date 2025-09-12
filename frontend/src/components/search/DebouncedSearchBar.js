import { useState, useEffect } from "react";
import { useDebounce } from "../../hooks/useDebounce";

/**
 * @param {Object} props
 * @param {string} props.placeholder
 * @param {Function} props.onDebouncedSearch
 * @param {number} [props.delay]
 */
export default function DebouncedSearchBar({
  placeholder,
  onDebouncedSearch,
  delay = 400,
}) {
  const [input, setInput] = useState("");
  const debouncedValue = useDebounce(input, delay);

  useEffect(() => {
    onDebouncedSearch(debouncedValue.trim());
    // eslint-disable-next-line
  }, [debouncedValue]);

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto items-center">
      <input
        type="text"
        className="border border-gray-300 rounded px-3 py-2 w-full sm:w-64 text-sm"
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      {input && (
        <button
          type="button"
          className="text-xs text-gray-500 hover:text-red-700 ml-1"
          onClick={() => setInput("")}
        >
          Clear
        </button>
      )}
    </div>
  );
}

"use client";

import { memo, useMemo } from "react";

function buildPageList(totalPages, currentPage, maxButtons) {
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const half = Math.floor(maxButtons / 2);
  let start = currentPage - half;
  let end = currentPage + half;

  if (maxButtons % 2 === 0) {
    end -= 1;
  }

  if (start < 1) {
    start = 1;
    end = maxButtons;
  }

  if (end > totalPages) {
    end = totalPages;
    start = totalPages - maxButtons + 1;
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

const Pagination = memo(function Pagination({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange = () => {},
  maxPageButtons = 5,
  accentColor = "var(--primary-red, #bb3031)",
  className = "",
  ariaLabel = "Pagination",
  nextLabel = "Next",
  previousLabel = "Previous",
}) {
  const { totalPages, safeCurrentPage, pages, pageDescriptor } = useMemo(() => {
    const safeItemsPerPage = Math.max(1, itemsPerPage);
    const computedTotalPages = Math.max(
      0,
      Math.ceil(totalItems / safeItemsPerPage)
    );

    const normalizedCurrent = computedTotalPages
      ? Math.min(Math.max(currentPage, 1), computedTotalPages)
      : 1;

    const pageList = buildPageList(
      computedTotalPages,
      normalizedCurrent,
      Math.max(3, maxPageButtons)
    );

    const startIndex = computedTotalPages
      ? (normalizedCurrent - 1) * safeItemsPerPage + 1
      : 0;
    const endIndex = computedTotalPages
      ? Math.min(normalizedCurrent * safeItemsPerPage, totalItems)
      : 0;

    const descriptor = computedTotalPages
      ? `Page ${normalizedCurrent} of ${computedTotalPages}. Showing ${startIndex} to ${endIndex} of ${totalItems} items.`
      : "No results available.";

    return {
      totalPages: computedTotalPages,
      safeCurrentPage: normalizedCurrent,
      pages: pageList,
      pageDescriptor: descriptor,
    };
  }, [currentPage, itemsPerPage, maxPageButtons, totalItems]);

  if (totalPages <= 1) {
    return null;
  }

  const handleChange = (page) => {
    if (page === safeCurrentPage) {
      return;
    }
    if (page < 1 || page > totalPages) {
      return;
    }
    onPageChange(page);
  };

  const sharedButtonClasses =
    "relative inline-flex items-center justify-center h-10 min-w-[2.5rem] rounded-full border text-sm font-medium transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  const numberButtonClasses =
    "data-[inactive=true]:bg-white data-[inactive=true]:dark:bg-gray-900 data-[inactive=true]:text-gray-600 data-[inactive=true]:dark:text-gray-300 data-[inactive=true]:border-gray-200 data-[inactive=true]:dark:border-gray-700 hover:data-[inactive=true]:border-gray-400 hover:data-[inactive=true]:text-gray-900 hover:data-[inactive=true]:dark:text-white hover:data-[inactive=true]:-translate-y-0.5";

  const controlButtonClasses =
    "px-4 gap-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:border-gray-400 hover:text-gray-900 hover:dark:text-white";

  const accentStyles = { outlineColor: accentColor };

  return (
    <nav
      className={`flex flex-col items-center gap-3 ${className}`.trim()}
      role="navigation"
      aria-label={ariaLabel}
    >
      <div className="sr-only" aria-live="polite">
        {pageDescriptor}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`${sharedButtonClasses} ${controlButtonClasses}`}
          style={{ ...accentStyles, color: accentColor }}
          onClick={() => handleChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          aria-label={`${previousLabel} page`}
          aria-disabled={safeCurrentPage === 1}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path
              d="M12.5 5L7.5 10L12.5 15"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="hidden sm:inline">{previousLabel}</span>
        </button>

        <div className="flex items-center gap-2">
          {pages.map((pageNumber) => {
            const isActive = pageNumber === safeCurrentPage;
            return (
              <button
                key={pageNumber}
                type="button"
                data-inactive={isActive ? undefined : true}
                className={`${sharedButtonClasses} ${numberButtonClasses}`}
                style={{
                  ...accentStyles,
                  backgroundColor: isActive ? accentColor : undefined,
                  borderColor: isActive ? accentColor : undefined,
                  color: isActive ? "#ffffff" : undefined,
                  boxShadow: isActive
                    ? "0px 14px 24px -12px rgba(0,0,0,0.35)"
                    : undefined,
                }}
                onClick={() => handleChange(pageNumber)}
                aria-label={`Page ${pageNumber}`}
                aria-current={isActive ? "page" : undefined}
              >
                {pageNumber}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={`${sharedButtonClasses} ${controlButtonClasses}`}
          style={{ ...accentStyles, color: accentColor }}
          onClick={() => handleChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages}
          aria-label={`${nextLabel} page`}
          aria-disabled={safeCurrentPage === totalPages}
        >
          <span className="hidden sm:inline">{nextLabel}</span>
          <svg
            className="w-4 h-4"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path
              d="M7.5 5L12.5 10L7.5 15"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </nav>
  );
});

export default Pagination;

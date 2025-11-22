import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "./useDebounce";

const isBrowser = typeof window !== "undefined";

function loadStoredFilters(storageKey, defaults) {
  if (!isBrowser) return defaults;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return { ...defaults, ...parsed };
    }
  } catch (error) {
    console.warn("Failed to hydrate persisted log filters", error);
  }
  return defaults;
}

export function useLogFiltersState(
  storageKey,
  initialFilters,
  debounceMs = 400
) {
  const defaultsRef = useRef(initialFilters);

  useEffect(() => {
    defaultsRef.current = initialFilters;
  }, [initialFilters]);

  const [filters, setFilters] = useState(() =>
    loadStoredFilters(storageKey, defaultsRef.current)
  );

  useEffect(() => {
    if (!isBrowser) return;
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(filters));
    } catch (error) {
      console.warn("Unable to persist log filters", error);
    }
  }, [storageKey, filters]);

  const debouncedSearch = useDebounce(filters.search || "", debounceMs);

  const setFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const patchFilters = useCallback((patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultsRef.current);
    if (isBrowser) {
      try {
        window.sessionStorage.removeItem(storageKey);
      } catch {
        /* noop */
      }
    }
  }, [storageKey]);

  const activeFilters = useMemo(() => {
    const defaults = defaultsRef.current;
    return Object.entries(filters).reduce((count, [key, value]) => {
      const defaultValue = defaults[key];
      if (key === "search") {
        return value && value.trim() ? count + 1 : count;
      }
      if (value == null) {
        return count;
      }
      if (typeof value === "string") {
        if (!value) return count;
        if (defaultValue === undefined) {
          return value ? count + 1 : count;
        }
        return value !== defaultValue ? count + 1 : count;
      }
      if (typeof value === "object") {
        const defaultObj = defaultValue || {};
        const changed = Object.keys(value).some((innerKey) => {
          const innerValue = value[innerKey];
          const defaultInner = defaultObj[innerKey];
          if (typeof innerValue === "string") {
            return innerValue && innerValue !== defaultInner;
          }
          return innerValue !== defaultInner;
        });
        return changed ? count + 1 : count;
      }
      return value !== defaultValue ? count + 1 : count;
    }, 0);
  }, [filters]);

  return {
    filters,
    debouncedSearch,
    setFilter,
    setFilters,
    patchFilters,
    resetFilters,
    activeFilters,
  };
}

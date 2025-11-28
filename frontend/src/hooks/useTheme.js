"use client";

import { useState, useEffect } from "react";

const THEME_STORAGE_KEY = "theme-preference";
const THEMES = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
};

function getSystemTheme() {
  if (typeof window === "undefined") return THEMES.LIGHT;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? THEMES.DARK
    : THEMES.LIGHT;
}

function applyTheme(theme) {
  if (typeof document === "undefined") return;

  const resolvedTheme = theme === THEMES.SYSTEM ? getSystemTheme() : theme;
  
  // Apply to document root
  document.documentElement.classList.remove(THEMES.LIGHT, THEMES.DARK);
  document.documentElement.classList.add(resolvedTheme);
  
  // Also set data attribute for CSS selectors
  document.documentElement.dataset.theme = resolvedTheme;
}

export function useTheme() {
  const [theme, setThemeState] = useState(THEMES.SYSTEM);
  const [resolvedTheme, setResolvedTheme] = useState(THEMES.LIGHT);

  // Initialize theme on mount
  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) || THEMES.SYSTEM;
    setThemeState(storedTheme);
    
    const resolved = storedTheme === THEMES.SYSTEM ? getSystemTheme() : storedTheme;
    setResolvedTheme(resolved);
    applyTheme(storedTheme);
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    if (theme !== THEMES.SYSTEM) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = (e) => {
      const newResolvedTheme = e.matches ? THEMES.DARK : THEMES.LIGHT;
      setResolvedTheme(newResolvedTheme);
      applyTheme(THEMES.SYSTEM);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = (newTheme) => {
    if (!Object.values(THEMES).includes(newTheme)) {
      console.warn(`Invalid theme: ${newTheme}`);
      return;
    }

    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    
    const resolved = newTheme === THEMES.SYSTEM ? getSystemTheme() : newTheme;
    setResolvedTheme(resolved);
    applyTheme(newTheme);
  };

  return {
    theme,
    resolvedTheme,
    setTheme,
    themes: THEMES,
  };
}

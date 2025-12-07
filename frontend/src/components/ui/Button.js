"use client";

/**
 * Standardized button component for consistent styling across the application
 * Based on the design system patterns from the UI/UX improvement plan
 */

import React from "react";

const Button = ({ 
  variant = "primary", 
  size = "medium", 
  icon: Icon, 
  iconPosition = "left",
  children, 
  className = "", 
  loading = false,
  disabled = false,
  mode = "auto", // 'auto' | 'light' | 'dark'
  ...props 
}) => {
  // Base styles
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  // Variant styles
  const variants = {
    primary: {
      auto: "bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 focus:ring-red-500 shadow-sm dark:bg-red-600 dark:text-white",
      light: "bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 focus:ring-red-500 shadow-sm",
      dark: "bg-red-700 text-white rounded-lg hover:bg-red-600 active:bg-red-800 focus:ring-red-500 shadow-sm",
    },
    secondary: {
      auto: "rounded-full border border-gray-200 bg-white text-gray-700 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus:ring-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200",
      light: "rounded-full border border-gray-200 bg-white text-gray-700 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus:ring-gray-400",
      dark: "rounded-full border border-gray-700 bg-gray-900 text-white hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus:ring-gray-500",
    },
    danger: {
      auto: "bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 focus:ring-red-500",
      light: "bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 focus:ring-red-500",
      dark: "bg-red-700 text-white rounded-lg hover:bg-red-600 active:bg-red-800 focus:ring-red-500",
    },
    success: {
      auto: "bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 focus:ring-green-500",
      light: "bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 focus:ring-green-500",
      dark: "bg-green-700 text-white rounded-lg hover:bg-green-600 active:bg-green-800 focus:ring-green-500",
    },
    ghost: {
      auto: "text-gray-700 rounded-lg focus:ring-gray-400 dark:text-gray-200",
      light: "text-gray-700  rounded-lg focus:ring-gray-400",
      dark: "text-gray-200 rounded-lg focus:ring-gray-400",
    },
    icon: {
      auto: "p-2 text-gray-700 hover:bg-gray-100 rounded-lg focus:ring-gray-400 dark:text-gray-200 dark:hover:bg-gray-700",
      light: "p-2 text-gray-700 hover:bg-gray-100 rounded-lg focus:ring-gray-400",
      dark: "p-2 text-gray-200 hover:bg-gray-700 rounded-lg focus:ring-gray-400",
    },
  };
  
  // Size styles - supports responsive mapping
  const sizes = {
    small: variant === "icon" ? "p-1.5" : "px-3 py-1.5 text-sm gap-1.5",
    medium: variant === "icon" ? "p-2" : "px-4 py-2 text-sm gap-2",
    large: variant === "icon" ? "p-3" : "px-6 py-3 text-base gap-2.5",
  };

  const breakpoints = ["sm", "md", "lg", "xl", "2xl"];

  const prefixClasses = (prefix, cls) =>
    cls.split(/\s+/).map((c) => `${prefix}:${c}`).join(" ");

  const getSizeClasses = (sizeProp) => {
    // sizeProp can be a string or an object map like { default: 'small', md: 'medium' }
    if (typeof sizeProp === "string") return sizes[sizeProp] || sizes.medium;
    if (!sizeProp || typeof sizeProp !== "object") return sizes.medium;

    const defaultSizeName = sizeProp.default || sizeProp.base || "medium";
    const defaultClass = sizes[defaultSizeName] || sizes.medium;

    const bpClasses = Object.keys(sizeProp)
      .filter((k) => breakpoints.includes(k))
      .map((bp) => prefixClasses(bp, sizes[sizeProp[bp] || defaultSizeName]))
      .join(" ");

    return [defaultClass, bpClasses].filter(Boolean).join(" ");
  };
  
  // Icon size
  const iconSizes = {
    small: 16,
    medium: 18,
    large: 20,
  };
  
  const variantObj = variants[variant] || variants.primary;
  const variantClass = typeof variantObj === 'string' ? variantObj : (variantObj[mode] || variantObj.auto);

  const sizeClass = getSizeClasses(size);
  const resolvedSizeName = typeof size === 'string' ? size : (size?.default || size?.md || size?.sm || 'medium');
  const iconSize = iconSizes[resolvedSizeName] || iconSizes['medium'];

  return (
    <button
      className={`${baseStyles} ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : (
        <>
          {Icon && iconPosition === "left" && <Icon size={iconSize} />}
          {children}
          {Icon && iconPosition === "right" && <Icon size={iconSize} />}
        </>
      )}
    </button>
  );
};

export default Button;

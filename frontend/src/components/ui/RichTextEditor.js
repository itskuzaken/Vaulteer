"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
// Importing Quill CSS globally in app layout

// Dynamically import Quill to avoid SSR issues (using react-quill-new for React 19 compatibility)
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

/**
 * RichTextEditor Component
 * Wrapper for React Quill with custom toolbar configuration
 * 
 * @param {Object} props
 * @param {string} props.value - HTML content
 * @param {Function} props.onChange - Callback when content changes
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.readOnly - Read-only mode
 * @param {string} props.className - Additional CSS classes
 */
export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write your content here...",
  readOnly = false,
  className = "",
}) {
  const quillRef = useRef(null);

  // Toolbar configuration
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ indent: "-1" }, { indent: "+1" }],
      ["blockquote", "code-block"],
      ["link"],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ["clean"],
    ],
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "indent",
    "blockquote",
    "code-block",
    "link",
    "color",
    "background",
    "align",
  ];

  return (
    <div className={`rich-text-editor-wrapper ${className}`}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        className="quill-editor w-full"
      />
      <style jsx global>{`
        .rich-text-editor-wrapper .ql-container {
          min-height: 300px;
          font-size: 16px;
          font-family: inherit;
        }

        .rich-text-editor-wrapper .ql-editor {
          min-height: 300px;
          padding: 15px;
        }

        .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }

        .rich-text-editor-wrapper .ql-toolbar {
          background-color: #f9fafb;
          border-color: #e5e7eb;
          border-radius: 0.375rem 0.375rem 0 0;
        }

        .rich-text-editor-wrapper .ql-container {
          border-color: #e5e7eb;
          border-radius: 0 0 0.375rem 0.375rem;
        }

        .rich-text-editor-wrapper .ql-editor h1 {
          font-size: 2em;
          font-weight: bold;
          margin-bottom: 0.5em;
        }

        .rich-text-editor-wrapper .ql-editor h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-bottom: 0.5em;
        }

        .rich-text-editor-wrapper .ql-editor h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin-bottom: 0.5em;
        }

        .rich-text-editor-wrapper .ql-editor p {
          margin-bottom: 1em;
        }

        .rich-text-editor-wrapper .ql-editor ul,
        .rich-text-editor-wrapper .ql-editor ol {
          margin-bottom: 1em;
          padding-left: 1.5em;
        }

        .rich-text-editor-wrapper .ql-editor blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1em;
          margin-left: 0;
          margin-right: 0;
          color: #6b7280;
        }

        .rich-text-editor-wrapper .ql-editor a {
          color: var(--primary-red, #dc2626);
          text-decoration: underline;
        }

        .rich-text-editor-wrapper .ql-editor code {
          background-color: #f3f4f6;
          padding: 0.2em 0.4em;
          border-radius: 0.25rem;
          font-family: monospace;
        }

        .rich-text-editor-wrapper .ql-editor pre {
          background-color: #f3f4f6;
          padding: 1em;
          border-radius: 0.375rem;
          overflow-x: auto;
        }

        /* Dark mode overrides */
        :global(.dark) .rich-text-editor-wrapper .ql-toolbar {
          background-color: #0f172a; /* slate-900 */
          border-color: #374151; /* slate-700 */
          color: #e5e7eb;
        }

        :global(.dark) .rich-text-editor-wrapper .ql-container {
          background-color: #0b1220; /* slightly darker */
          border-color: #374151;
        }

        :global(.dark) .rich-text-editor-wrapper .ql-editor {
          background-color: transparent;
          color: #e5e7eb;
          caret-color: #f8fafc;
        }

        :global(.dark) .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          color: #9ca3af;
        }

        :global(.dark) .rich-text-editor-wrapper .ql-editor blockquote {
          border-left-color: #374151;
          color: #9ca3af;
        }

        :global(.dark) .rich-text-editor-wrapper .ql-editor a {
          color: var(--primary-red, #f87171);
        }

        /* Dark mode code block */
        :global(.dark) .rich-text-editor-wrapper .ql-editor code,
        :global(.dark) .rich-text-editor-wrapper .ql-editor pre {
          background-color: #111827;
          color: #e5e7eb;
        }

        /* Ensure toolbar controls/icons are visible in dark mode */
        :global(.dark) .rich-text-editor-wrapper .ql-toolbar .ql-picker-label,
        :global(.dark) .rich-text-editor-wrapper .ql-toolbar .ql-stroke,
        :global(.dark) .rich-text-editor-wrapper .ql-toolbar .ql-fill {
          color: #e5e7eb;
          stroke: #e5e7eb;
          fill: #e5e7eb;
        }

        /* Fix for read-only mode */
        .rich-text-editor-wrapper.read-only .ql-toolbar {
          display: none;
        }

        .rich-text-editor-wrapper.read-only .ql-container {
          border-radius: 0.375rem;
        }
      `}</style>
    </div>
  );
}

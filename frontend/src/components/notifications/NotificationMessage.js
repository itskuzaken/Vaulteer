"use client";

import dynamic from "next/dynamic";
// global Quill CSS imported in app layout

// Dynamically import Quill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

/**
 * NotificationMessage Component
 * Lightweight wrapper for displaying notification messages with rich text
 * Optimized for small message display in notifications
 * 
 * @param {string} message - HTML content of the notification message
 * @param {string} className - Additional CSS classes
 */
export default function NotificationMessage({ message = "", className = "" }) {
  return (
    <div className={`notification-message-wrapper ${className}`}>
      <ReactQuill
        value={message}
        readOnly={true}
        theme="bubble"
        modules={{ toolbar: false }}
        className="notification-quill"
      />
      <style jsx global>{`
        .notification-message-wrapper .ql-container {
          font-size: inherit;
          font-family: inherit;
        }

        .notification-message-wrapper .ql-editor {
          padding: 0;
          line-height: inherit;
        }

        .notification-message-wrapper .ql-editor p {
          margin: 0;
          line-height: inherit;
        }

        .notification-message-wrapper .ql-editor strong {
          font-weight: 600;
        }

        .notification-message-wrapper .ql-editor em {
          font-style: italic;
        }

        .notification-message-wrapper .ql-editor a {
          color: var(--primary-red, #dc2626);
          text-decoration: underline;
        }

        .notification-message-wrapper .ql-editor ul,
        .notification-message-wrapper .ql-editor ol {
          padding-left: 1.5em;
          margin: 0.25em 0;
        }

        /* Dark mode support */
        :global(.dark) .notification-message-wrapper .ql-editor {
          color: inherit;
        }

        :global(.dark) .notification-message-wrapper .ql-editor a {
          color: var(--primary-red, #f87171);
        }

        /* Ensure bubble theme doesn't add extra spacing */
        .notification-message-wrapper .ql-container.ql-bubble {
          border: none;
        }

        .notification-message-wrapper .ql-tooltip {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

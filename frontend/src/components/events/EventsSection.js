import React from 'react';
import PropTypes from 'prop-types';

// Wrapper used by event pages to keep a consistent dashboard card look
export default function EventsSection({ title, subtitle, actions, children, className }) {
  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md overflow-hidden ${className || ''}`}>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            {title}
          </div>
          <div>{actions}</div>
        </div>
        {subtitle ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">{subtitle}</p>
        ) : null}
        <div>{children}</div>
      </div>
    </div>
  );
}

EventsSection.propTypes = {
  title: PropTypes.node,
  subtitle: PropTypes.node,
  actions: PropTypes.node,
  children: PropTypes.node,
  className: PropTypes.string,
};

EventsSection.defaultProps = {
  title: null,
  subtitle: null,
  actions: null,
  children: null,
  className: '',
};

'use client';

import { Component } from 'react';
import { IoAlertCircleOutline, IoRefreshOutline } from 'react-icons/io5';

/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex justify-center w-full p-4 sm:p-6">
          <div className="w-full max-w-2xl">
            <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 sm:p-8">
              {/* Error Icon */}
              <div className="flex items-center justify-center mb-6">
                <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                  <IoAlertCircleOutline className="h-10 w-10 text-red-600 dark:text-red-400" />
                </div>
              </div>

              {/* Error Message */}
              <div className="text-center space-y-4">
                <h2 className="text-xl sm:text-2xl font-bold text-red-900 dark:text-red-100">
                  Something went wrong
                </h2>
                <p className="text-sm sm:text-base text-red-700 dark:text-red-300">
                  {this.state.error?.message || 'An unexpected error occurred while rendering this component.'}
                </p>

                {/* Error Details (only in development) */}
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="text-left mt-4 p-4 bg-red-100 dark:bg-red-900/40 rounded-lg">
                    <summary className="cursor-pointer text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
                      Error Details (Development Only)
                    </summary>
                    <pre className="text-xs text-red-800 dark:text-red-200 overflow-auto">
                      {this.state.error?.stack}
                      {'\n\n'}
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                >
                  <IoRefreshOutline className="h-5 w-5" />
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                >
                  Reload Page
                </button>
              </div>

              {/* Help Text */}
              <p className="text-center text-xs text-red-600 dark:text-red-400 mt-6">
                If this problem persists, please contact support or try refreshing the page.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

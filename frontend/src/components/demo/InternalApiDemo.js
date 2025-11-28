/**
 * Example Client Component demonstrating internal API usage through Server Actions
 * This shows the correct pattern: Client Component -> Server Action -> Internal API
 */

"use client";

import { useState } from "react";
import {
  getInternalStats,
  triggerCacheRefresh,
  checkSystemHealth,
} from "@/services/examples/internalServerAction";

export default function InternalApiDemo() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAction = async (actionFn, actionName) => {
    setLoading(true);
    setError(null);

    try {
      const response = await actionFn();
      setResult({ action: actionName, ...response });
    } catch (err) {
      setError(`${actionName} failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Internal API Demo</h1>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <button
          onClick={() => handleAction(checkSystemHealth, "Health Check")}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Check Health"}
        </button>

        <button
          onClick={() => handleAction(getInternalStats, "Get Stats")}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Get Stats"}
        </button>

        <button
          onClick={() =>
            handleAction(
              () => triggerCacheRefresh("test", false),
              "Cache Refresh"
            )
          }
          disabled={loading}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh Cache"}
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={clearResults}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
        >
          Clear Results
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
          <h3 className="font-semibold">Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-gray-100 rounded-lg p-6">
          <h3 className="font-semibold mb-3">Result from {result.action}:</h3>
          <div className="bg-white p-4 rounded border">
            <pre className="text-sm overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h3 className="font-semibold text-yellow-800 mb-2">
          🔒 Security Note:
        </h3>
        <p className="text-sm text-yellow-700">
          This demo shows how to safely use internal APIs from client
          components. The internal API token is never exposed to the browser -
          all calls go through Server Actions that run on the server and have
          access to environment variables.
        </p>

        <div className="mt-3 text-sm text-yellow-700">
          <p>
            <strong>Network Tab:</strong> Check your browser&apos;s network tab
            - you won&apos;t see any direct calls to /api/internal/* endpoints.
          </p>
          <p>
            <strong>Token Security:</strong> The INTERNAL_API_TOKEN remains
            server-side only and is never sent to the client.
          </p>
        </div>
      </div>
    </div>
  );
}

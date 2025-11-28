/**
 * Test page for Internal API functionality
 * This demonstrates both server-side (SSR) and client-side (Server Actions) internal API usage
 */

import { checkSystemHealth } from "@/services/examples/internalServerAction";
import InternalApiDemo from "@/components/demo/InternalApiDemo";

export default async function TestPage() {
  let health = null;
  let error = null;

  try {
    const result = await checkSystemHealth();
    if (result.success) {
      health = result.data;
    } else {
      error = result.error;
    }
  } catch (err) {
    error = err.message;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Server-Side Rendering Example */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            🖥️ Server-Side Health Check (SSR)
          </h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}

          {health && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              <strong>Status:</strong> {health.status}
            </div>
          )}

          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">
              Server Response (Generated at Page Load):
            </h3>
            <pre className="text-sm overflow-x-auto">
              {JSON.stringify(health || { error }, null, 2)}
            </pre>
          </div>

          <div className="mt-6 text-sm text-gray-600">
            <p>
              <strong>📝 Note:</strong> This data was fetched server-side during
              page rendering. The internal API was called directly from the
              server component.
            </p>
          </div>
        </div>

        {/* Client-Side Demo */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            🌐 Client-Side Demo (Server Actions)
          </h2>
          <InternalApiDemo />
        </div>
      </div>
    </div>
  );
}

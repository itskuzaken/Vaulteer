/**
 * Example Next.js Server Action demonstrating internal API usage
 *
 * This file shows how to use the internal API client from server-side Next.js code.
 * Server Actions run on the server and can safely use internal API tokens.
 *
 * To use this in your pages:
 * import { getInternalStats } from '@/services/examples/internalServerAction';
 */

"use server";

import { callInternalApiJson } from "../internalApiClient";

/**
 * Server action to get detailed internal statistics
 * This can be called from client components but executes on the server
 */
export async function getInternalStats() {
  try {
    const stats = await callInternalApiJson("/api/internal/stats/detailed", {
      method: "GET",
    });

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("[getInternalStats] error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Server action to refresh application cache
 */
export async function triggerCacheRefresh(cacheKey, force = false) {
  try {
    const result = await callInternalApiJson("/api/internal/refresh-cache", {
      method: "POST",
      body: JSON.stringify({ cacheKey, force }),
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("[triggerCacheRefresh] error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Server action to check internal health
 */
export async function checkSystemHealth() {
  try {
    const health = await callInternalApiJson("/api/internal/health", {
      method: "GET",
    });

    return {
      success: true,
      data: health,
    };
  } catch (error) {
    console.error("[checkSystemHealth] error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

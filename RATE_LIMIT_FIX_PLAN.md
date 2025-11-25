# Rate Limit Issue - Fix Plan

## Problem Analysis

**Error:** `Too many requests from this IP, please try again later.`

**Root Causes:**

1. **Multiple Parallel API Calls** - RoleProtectedRoute and useDashboardUser both call `getCurrentUser()` and `getGamificationSummary()` simultaneously on every page load
2. **Aggressive Polling** - RealtimeService polls gamification data every 20 seconds
3. **No Request Deduplication** - Multiple components make identical API calls without coordination
4. **Tight Rate Limits** - Backend `apiLimiter` allows only 100 requests per 15 minutes (6.67 req/min)

**Call Stack Evidence:**

- `RoleProtectedRoute.useEffect` → `getCurrentUser()` (on every auth state change)
- `useDashboardUser.useEffect` → fetch `/api/me` (duplicate call)
- `useDashboardUser.useEffect` → realtime polling → `getGamificationSummary()` every 20s
- All dashboard components use `useDashboardUser` causing cascading requests

## Impact Assessment

**Severity:** High - Blocks dashboard functionality for legitimate users

**Affected Features:**

- Dashboard access (all roles: admin, staff, volunteer)
- Gamification widgets (leaderboard, badges, stats)
- Real-time updates
- User authentication flow

**Rate Limit Math:**

- 100 requests per 15 minutes = ~6.67 requests/minute
- Current behavior:
  - 2x `getCurrentUser()` on page load (RoleProtectedRoute + useDashboardUser)
  - 1x `getGamificationSummary()` on page load
  - 3 requests/min from polling (20s interval = 3 calls/min)
  - **Total: ~9 req/min from single user = exceeds limit immediately**

## Solution Strategy

### Phase 1: Immediate Fixes (Reduce Request Volume)

#### 1.1 Deduplicate getCurrentUser Calls

**Problem:** Both RoleProtectedRoute and useDashboardUser fetch user data separately

**Solution:**

- Remove duplicate `/api/me` call from `useDashboardUser`
- Let RoleProtectedRoute handle authentication verification
- Have useDashboardUser rely on Firebase auth state only
- Share user data via React Context to avoid prop drilling

**Files to modify:**

- `frontend/src/hooks/useDashboardUser.js` - Remove redundant fetch
- `frontend/src/contexts/DashboardUserContext.js` (NEW) - Shared state
- `frontend/src/components/auth/RoleProtectedRoute.js` - Provide user data via context

#### 1.2 Increase Polling Intervals

**Problem:** 20-second polling is too aggressive (3 req/min per user)

**Solution:**

- Increase default polling interval from 20s → 60s (1 req/min)
- For gamification data: Use 2-minute intervals (non-critical data)
- Add exponential backoff on rate limit errors
- Pause polling when tab is hidden (Page Visibility API)

**Files to modify:**

- `frontend/src/hooks/useDashboardUser.js` - Change gamification polling to 120s
- `frontend/src/services/realtimeService.js` - Add visibility detection, backoff

#### 1.3 Implement Request Caching

**Problem:** No client-side caching between components/pages

**Solution:**

- Add in-memory cache with TTL for API responses
- Cache `getCurrentUser()` for 5 minutes
- Cache `getGamificationSummary()` for 2 minutes
- Use cache-first strategy with background refresh

**Files to modify:**

- `frontend/src/services/apiClient.js` - Add cache layer
- `frontend/src/utils/requestCache.js` (NEW) - Cache implementation

### Phase 2: Backend Adjustments (Relax Rate Limits)

#### 2.1 Increase Rate Limits for Authenticated Users

**Problem:** 100 req/15min is too restrictive for authenticated dashboard users

**Solution:**

- Increase `apiLimiter` to 300 req/15min (20 req/min) for authenticated routes
- Keep 100 req/15min for unauthenticated/public routes
- Add separate, higher limit for `/api/me` endpoint (critical for auth)

**Files to modify:**

- `backend/middleware/rateLimiter.js` - Create `dashboardLimiter` (300/15min)
- `backend/server.js` - Apply different limiters based on route type
- `backend/routes/me.js` - Use relaxed limiter

#### 2.2 Use User-Based Rate Limiting

**Problem:** IP-based limiting penalizes shared networks (office, NAT)

**Solution:**

- Already implemented: `keyGenerator` uses `firebaseUid` when available
- Ensure all dashboard routes extract uid from JWT token
- Keep IP fallback for unauthenticated requests

**Status:** ✅ Already implemented in `rateLimiter.js`

### Phase 3: Architectural Improvements (Long-term)

#### 3.1 Implement Request Batching

**Solution:**

- Create `/api/dashboard/init` endpoint that returns user + gamification data in one call
- Reduce 3 requests → 1 request on dashboard load

**Files to create:**

- `backend/routes/dashboardRoutes.js` - New batch endpoint
- `frontend/src/services/dashboardService.js` - Batch request wrapper

#### 3.2 Add WebSocket for Real-time Updates

**Solution:**

- Replace polling with WebSocket/SSE for gamification updates
- Push updates only when data changes (server-side)
- Eliminates periodic polling entirely

**Files to modify:**

- `backend/server.js` - Add Socket.IO server
- `frontend/src/services/realtimeService.js` - Implement WebSocket connection

#### 3.3 Add Request Queue with Debouncing

**Solution:**

- Queue rapid duplicate requests and deduplicate
- Prevent race conditions during auth state changes

**Files to create:**

- `frontend/src/utils/requestQueue.js` - Smart request queue

## Implementation Priority

### Critical (Do First) - Estimated 2-3 hours

1. ✅ Remove duplicate getCurrentUser call from useDashboardUser
2. ✅ Increase polling intervals (20s → 120s for gamification)
3. ✅ Increase backend rate limits (100 → 300 for authenticated users)
4. ✅ Add page visibility detection to pause polling

### High Priority (Do Soon) - Estimated 3-4 hours

5. ⬜ Implement request caching layer
6. ⬜ Create DashboardUserContext for shared state
7. ⬜ Add exponential backoff on rate limit errors
8. ⬜ Create `/api/dashboard/init` batch endpoint

### Nice to Have (Future) - Estimated 8+ hours

9. ⬜ Implement WebSocket for real-time updates
10. ⬜ Add request queue with deduplication
11. ⬜ Add Sentry/DataDog monitoring for rate limit events

## Testing Plan

### Functional Testing

1. **Load Dashboard** - Verify only 1-2 requests on initial load
2. **Switch Tabs** - Ensure polling pauses when tab hidden
3. **Rapid Navigation** - Test clicking between dashboard sections quickly
4. **Multiple Tabs** - Open 3+ dashboard tabs, verify no rate limit errors
5. **Slow Connection** - Test with Network throttling (3G simulation)

### Performance Testing

1. **Request Count** - Monitor Network tab, count requests over 15 minutes
2. **Cache Hit Rate** - Log cache hits vs misses
3. **Response Times** - Measure P50, P95, P99 latencies

### Monitoring

- Add custom error tracking for rate limit (429) responses
- Log `RateLimit-Remaining` headers to track proximity to limits
- Alert when user hits >80% of rate limit

## Rollback Plan

If issues arise:

1. Revert frontend changes → restore original polling intervals
2. Revert backend changes → restore original rate limits
3. Emergency: Disable rate limiting temporarily (comment out middleware)

## Success Metrics

**Before:**

- 9+ requests/min per user
- Rate limit errors occurring within 2-3 minutes

**After (Target):**

- <3 requests/min per user (excluding initial load)
- Zero rate limit errors for normal usage
- Cache hit rate >70% for repeated requests
- Dashboard loads in <2s with cached data

## Files to Create/Modify

### Create New Files:

1. `frontend/src/contexts/DashboardUserContext.js`
2. `frontend/src/utils/requestCache.js`
3. `backend/routes/dashboardRoutes.js` (optional batch endpoint)
4. `RATE_LIMIT_FIX_PLAN.md` (this document)

### Modify Existing Files:

1. `frontend/src/hooks/useDashboardUser.js` - Remove duplicate fetch, increase polling
2. `frontend/src/components/auth/RoleProtectedRoute.js` - Provide context (optional)
3. `frontend/src/services/realtimeService.js` - Add visibility detection, backoff
4. `frontend/src/services/apiClient.js` - Add caching layer
5. `backend/middleware/rateLimiter.js` - Increase limits for dashboard
6. `backend/server.js` - Apply new rate limiter
7. `backend/routes/me.js` - Use relaxed limiter

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Create GitHub issue** with this plan as description
3. **Implement Critical items** (1-4) first for immediate relief
4. **Test thoroughly** before deploying
5. **Monitor metrics** after deployment
6. **Iterate** on High Priority items based on metrics

---

**Created:** November 24, 2025  
**Status:** Ready for Implementation  
**Estimated Total Time:** 8-12 hours for Critical + High Priority items

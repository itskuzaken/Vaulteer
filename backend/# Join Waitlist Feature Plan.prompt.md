# Join Waitlist Feature Plan

TL;DR: The backend already supports waitlisting via `registerParticipant` and `promoteFromWaitlist`. We’ll expose a per-user participation status on event details, update frontend services/UI to show and act on 'waitlisted' status, and add tests & UX improvements so a user can join/leave the waitlist.

## Goal
Allow users to join or leave an event waitlist when an event is full. Keep existing join/leave flows for registered participants. Support promotion of waitlisted users when space opens due to cancellation.

## Summary of Current Findings
- Database has `event_participants` with `status` values including `registered`, `waitlisted`.
- `eventRepository.registerParticipant` determines `status = 'waitlisted'` when an event is full and returns the registration status. It also restores historical participations.
- `eventRepository.promoteFromWaitlist` promotes the earliest waitlisted participant when capacity is available.
- `eventsController.joinEvent` returns the status via `registerParticipant` result; `leaveEvent` triggers `cancelParticipation` which attempts to promote from waitlist.
- `frontend/src/services/eventService.js` exposes `joinEvent` and `leaveEvent` methods that call `/events/:uid/join` and `/events/:uid/leave` respectively.
- The `JoinEventButton` in the frontend currently disables joining if `isFull` is true and shows `Join Waitlist` text on full events — but it does not currently manage joining or leaving waitlist states explicitly (the backend supports it already, but UI prevents joining when full).

## Implementation Plan: Add Join Waitlist Functionality

### 1) Backend: Add helper to expose per-user participation status
- Add method `getParticipantStatus(eventUid, userId)` in `backend/repositories/eventRepository.js`:
  - Query `event_participants` for `status` for the given `event_id` and `user_id`.
  - Return status string or `null` if none.
- This is helpful for the frontend to render state accurately.

### 2) Backend: Return participation status in `getEventDetails`
- Update `getEventDetails` controller to return `participation_status` along with existing `is_registered`:
  - `is_registered` can be kept for backwards compatibility as `status === 'registered' || status === 'waitlisted'`.
  - `participation_status` should be `'registered' | 'waitlisted' | null`.
- `getEventByUid` already returns `participant_count` and `waitlist_count`.

### 3) Frontend: Use participation_status in event details
- Update `frontend/src/components/events/EventDetailsPage.js`:
  - When the `getEventDetails` response is set into state, ensure the UI captures `participation_status`.
  - Keep `is_registered` for components that rely on booleans (like `JoinEventButton`) while passing the `participation_status` to `JoinEventButton`.

### 4) Frontend: Update JoinEventButton to be stateful for waitlist
- `frontend/src/components/events/JoinEventButton.js` changes:
  - Add prop `initialParticipationStatus` (instead of / alongside `initialIsRegistered`).
  - Local state `participationStatus` defaulting to the initial prop.
  - Derived booleans: `const isRegistered = participationStatus === 'registered'`, `const isWaitlisted = participationStatus === 'waitlisted'`.
  - Toggle actions:
    - If `!isRegistered && !isWaitlisted && event.isFull`: onClick -> `joinEvent` (POST) -> update `participationStatus` with response.status (should be `waitlisted`).
    - If `isWaitlisted`: show `Leave Waitlist` and call `leaveEvent` (DELETE) -> set `participationStatus` null.
    - If `isRegistered`: existing leave flow remains (call leaveEvent -> set `participationStatus` null and adjust participant count updates).
  - Button labels and styles:
    - Not registered & not waitlisted & full -> `Join Waitlist` (call join)
    - Not registered & not waitlisted & not full -> `Join Event` (call join)
    - Waitlisted -> `Leave Waitlist` (call leave)
    - Registered -> `Leave Event` (as existing)
  - Keep `isLoading` to disable button while the action is in-flight.

### 5) UI: Add waitlist information & optional position
- The backend already provides `waitlist_count` in `getEventByUid` so display it beneath the participant count or next to the event capacity.
- Optional: Add `waitlist_position` for the current user (calculate via `SELECT COUNT(*) FROM event_participants WHERE event_id = ? AND status = 'waitlisted' AND registration_date < currentRegistrationDate` or a query counting earlier registrations), return it in `getEventDetails`.
- Display `waitlist_position` in `EventDetailsPage` when appropriate — optional for MVP.

### 6) Tests and QA
- Backend tests:
  - Test `registerParticipant` when capacity reached returns `waitlisted`.
  - Test `promoteFromWaitlist` promotes earliest waitlisted user when space becomes available.
  - Test `getParticipantStatus` returns correct statuses.
  - Test `getEventDetails` returns `participation_status` field.
- Frontend tests:
  - Component tests for `JoinEventButton` states:
    - Not full: shows `Join Event`; clicking registers.
    - Full: shows `Join Waitlist`; clicking adds to waitlist.
    - Waitlisted: shows `Leave Waitlist`; clicking removes waitlist registration.
    - Registered: Leave Event flow works and triggers promotion cycles.
- Manual QA checklist (end-to-end):
  - User can join a waitlist when event is full.
  - User can leave waitlist.
  - When a registered user leaves, the earliest waitlisted is promoted.
  - Promoted users are updated in UI and receive gamification reward if configured.

### 7) Docs and Notifications
- Update the README or frontend documentation to note that users can join a waitlist when an event reaches capacity.
- Update `frontend/src/components/gamification/MyImpactWidget.js` to ensure WAITLIST_JOIN and WAITLIST_PROMOTION are accounted for and displayed properly.
- Optionally, add email/push notifications for waitlist promotions if the project uses a notification system.

## Acceptance Criteria ✅
1. Users can click `Join Waitlist` when the event is full and not registered; API returns `status = 'waitlisted'`.
2. After joining waitlist, the button shows `Leave Waitlist` and allows cancelling waitlist entry.
3. Registered users can still leave the event; promotions occur automatically and promoted users' status updates in UI.
4. Event details reflect the user's `participation_status` and `waitlist_count`.
5. Unit and integration tests cover the new behavior in both frontend and backend.

---

Would you like me to implement this change (create a branch and open a PR) or just save and refine this plan first? If you want implementation, I'll proceed with: create a new feature branch, add repository changes, tests, and a PR ready diff.

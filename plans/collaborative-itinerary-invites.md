# Plan: Collaborative Itinerary Invitations, Notification Bell Delivery & Companion Routing

**Branch**: `main`  
**Status**: Active — Pending User Approval  

## Goal
Enable seamless travel companion invitations from `/trip/[sessionId]`, deliver interactive notifications directly to the invited user's top hotbar notification bell, preserve accepted itineraries permanently in the notification bell for instant access, and render the companion's own live location with shortest A* routes from their location to the destination stops on the Leaflet map.

---

## Acceptance Criteria

### 1. Robust Invitation Pipeline & UUID Fix
- [ ] **No Validation Error**: Clicking "Invite" never fails with `Validation failed (uuid is expected)`.
- [ ] **Auto-Promotion for Local Sessions**: If a session was created with a local ID (`session_...`), the system automatically syncs it to the backend via `POST /trip-sessions`, acquires a valid database UUID, seamlessly updates the route URL to `/trip/[newUuid]`, and executes the invitation without user friction.
- [ ] **Unambiguous User Targeting**: The invitation uses unique identifier `u.email || u.id` rather than display name `u.name`, correctly targeting the exact registered user clicked when multiple users share the same name (e.g., "Milind Sahu").
- [ ] **Timeout Extension**: Replaces premature 1.2s timeout aborts in `trip-session-store.ts` with 10s timeout to prevent unnecessary fallback to offline IDs.

### 2. Notification Bell Delivery & Persistent Itinerary Roster
- [ ] **Hotbar Bell Integration**: When an invitation is sent, the recipient's notification bell in the top hotbar immediately reflects the invitation (with badge counter and sound/vibration cue if supported).
- [ ] **Accept & Reject Actions**: Recipient can accept or decline directly inside the notification dropdown.
- [ ] **Permanent Itinerary Bookmark**: Once accepted, the itinerary **stays in the notification bell** for the invited user, displaying an "Accepted — Joined Itinerary" badge and a direct "View Itinerary →" button to jump back into the live trip anytime.
- [ ] **Live Polling & Refresh**: Notification bell polls every 10 seconds and automatically updates on window focus and auth state changes.

### 3. Companion Live Location & Personalized A* Navigation
- [ ] **Companion Geolocation**: When an invited companion views the trip page, the map (`TripAreaMap`) identifies the current user and displays their own live location marker (`● You (Your Location)`).
- [ ] **Personalized Shortest Route**: The A* road engine (`calculateRealRoadRoute`) and local train planner (`calculateMumbaiTrainPlan`) compute routes starting from the companion's live location to the itinerary's stops.
- [ ] **Origin Switcher**: Map provides an interactive origin toggle between `📍 My Live Location` and `🚩 Organizer Start Point`, letting the companion view routes from both their spot and the group organizer's starting spot.
- [ ] **Same Continuous Itinerary**: The companion views the exact same ordered stops, timing, and experience details as the organizer.

---

## Slices

### Slice 1: Invitation Pipeline Fix & Automatic Session Promotion
- **Class**: Behavior change
- **Actor**: Trip Organizer
- **Trigger**: Clicks "Invite" in `AddMemberModal`
- **Observable Outcome**:
  - The modal checks if `sessionId` is a valid UUID. If it's a local session (`session_...`), it persists the itinerary to backend `POST /trip-sessions`, receives a real UUID, updates the browser URL, and calls `POST /trip-sessions/:id/members` with `u.email || u.id`.
  - Removes 1200ms abort timers from `createTripSession`, `fetchTripSession`, and `fetchRecommendations` in `trip-session-store.ts`.
  - Shows success notification: `"Invitation sent successfully to [email]! They will receive a notification to join."`
- **Production Path**: `frontend/src/components/AddMemberModal.tsx` -> `frontend/src/lib/trip-session-store.ts` -> backend `trip-session.controller.ts` (`POST /trip-sessions/:id/members`) -> `trip-session.service.ts` -> `notifications.service.ts`.
- **Acceptance Criteria**: Sending an invite to any registered user creates a pending `tripMember` record and a `TRIP_INVITATION` database notification with zero UUID validation errors.

---

### Slice 2: Notification Bell Delivery & Accepted Itinerary Retention
- **Class**: Behavior change
- **Actor**: Invited Companion
- **Trigger**: Views top hotbar notification bell and accepts invitation
- **Observable Outcome**:
  - Notification bell shows unread count badge.
  - Dropdown displays trip invitation with inviter name, trip city, and `[Accept & View Route]` / `[Decline]` buttons.
  - Clicking `[Accept & View Route]` marks the invite accepted and redirects to `/trip/${sessionId}`.
  - **The notification remains in the bell permanently** with an "Accepted — Joined Itinerary" pill and a "View Itinerary →" button for one-click access.
  - Notification bell refreshes on `window.focus`, custom event `notification-refresh`, and 10s interval.
- **Production Path**: `frontend/src/components/NotificationBell.tsx` -> `backend/src/modules/notifications/` & `backend/src/modules/trip-session/trip-session.service.ts` (`respondInvitation`).
- **Acceptance Criteria**: Accepted invitation stays visible in the bell dropdown with an active navigation link to `/trip/${sessionId}`.

---

### Slice 3: Personalized Map Location & Shortest Route from Companion's Origin
- **Class**: Behavior change
- **Actor**: Invited Companion on `/trip/[sessionId]`
- **Trigger**: Loads itinerary page and views Leaflet map
- **Observable Outcome**:
  - `TripAreaMap` detects whether the viewer is an accepted member vs organizer.
  - User's own live coordinates are locked via `navigator.geolocation` or prompt button.
  - Pulse marker shows `● You (Your Location)` at the companion's actual GPS coordinates.
  - A* road router and railway router compute shortest paths starting from the companion's coordinates to the destination stops.
  - Map controls include a toggle to switch origin between `📍 My Location` and `🚩 Organizer Starting Point`.
- **Production Path**: `frontend/src/app/trip/[sessionId]/page.tsx` -> `frontend/src/components/TripAreaMap.tsx` -> `frontend/src/lib/a-star-router.ts` & `frontend/src/lib/mumbai-train-router.ts`.
- **Acceptance Criteria**: Companion sees their own live GPS dot on the map and the route navigation starts from their location to the stops.

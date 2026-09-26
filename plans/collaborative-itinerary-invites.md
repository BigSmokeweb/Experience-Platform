# Plan: Collaborative Itinerary Invites, Notifications & A* Companion Routing

**Branch**: `main`  
**Status**: Ready for Execution (Pending Approval)

---

## Root Cause Analysis (Internal Server Error 500)

| Failure Point | Cause | Fix |
|---|---|---|
| **Invalid UUID Cast** | `trimmed.length === 36 ? [{ id: trimmed }] : []` in `trip-session.service.ts` treats any 36-char string (e.g. `jaipur.artisan@experienceplatform.in`) as UUID, causing Prisma/Postgres crash `P2023: Error creating UUID`. | Test with strict UUID regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`. |
| **Enum Mismatch in SQL** | Raw SQL cast `$8::"Category"[]` in `createSession` fails with Postgres code `22P02` if interests contain lowercase or unmapped tags. | Normalize & filter interests against uppercase `Category` enum values before query. |
| **Active Session 409 Conflict** | When `ensureBackendTripSession` tries to sync a local session to backend, if an active session already exists, backend returns 409 and invite fails. | If 409 returned, retrieve the existing active session ID and seamlessly continue. |

---

## Acceptance Criteria

- [ ] **Zero 500 Errors on Invite**: Clicking "Invite" on any registered user (by email, username, or ID) creates pending member & notification without 500 or UUID errors.
- [ ] **Interactive Notification**: Invited user sees real-time bell badge and dropdown card with `[Accept & View Itinerary]` and `[Decline]`.
- [ ] **Persistent Itinerary Access**: Accepted itinerary remains accessible in the notification bell with an `[Open Route →]` shortcut.
- [ ] **Companion Live Location**: When accepted companion opens `/trip/[sessionId]`, map renders their own GPS live location (`● You`).
- [ ] **A* Shortest Route Calculation**: Road router (`a-star-router.ts`) and railway engine compute shortest path from companion's coordinates to itinerary destination stops.
- [ ] **Origin Switcher**: Companion can toggle route between `📍 My Location` and `🚩 Organizer Start`.

---

## Vertical Slices

### Slice 1: Fix 500 Server Error & Robust Invite Creation
- **Class**: Behavior change
- **Actor**: Trip Organizer
- **Trigger**: Clicks "Invite" in [AddMemberModal.tsx](file:///c:/Daily/Work/Projects/Celesthackathon/frontend/src/components/AddMemberModal.tsx)
- **Path**: `AddMemberModal` → `trip-session-store.ts` (`inviteTripMember`) → `POST /trip-sessions/:id/members` → [trip-session.service.ts](file:///c:/Daily/Work/Projects/Celesthackathon/backend/src/modules/trip-session/trip-session.service.ts)
- **Changes**:
  1. Replace `trimmed.length === 36` with strict UUID regex in `trip-session.service.ts`.
  2. Sanitize `interests` enum mapping in `createSession`.
  3. In `ensureBackendTripSession`, handle 409 by reusing existing active session.
- **Criteria**:
  - Inviting `milindsahu011@gmail.com` or any registered user succeeds immediately.
  - Success banner: `"Invitation sent successfully to [user]!"`.

---

### Slice 2: Notification Bell Delivery & Accept Flow
- **Class**: Behavior change
- **Actor**: Invited Companion
- **Trigger**: Logs in and checks hotbar notification bell
- **Path**: [NotificationBell.tsx](file:///c:/Daily/Work/Projects/Celesthackathon/frontend/src/components/NotificationBell.tsx) → `GET /notifications` → `POST /trip-sessions/:id/respond` → [trip-session.service.ts](file:///c:/Daily/Work/Projects/Celesthackathon/backend/src/modules/trip-session/trip-session.service.ts)
- **Changes**:
  1. Ensure `respondInvitation` endpoint transitions member to `ACCEPTED` and marks notification read.
  2. Bell displays `TRIP_INVITATION` card with inviter name, trip destination, and `[Accept & View Itinerary]` / `[Decline]` buttons.
  3. On click `[Accept]`, updates status and navigates to `/trip/[sessionId]`.
  4. Keeps accepted card permanently in bell under "Accepted Itineraries" for quick re-entry.
- **Criteria**:
  - Companion receives notification, accepts invite, and redirects into the shared itinerary.

---

### Slice 3: Companion Geolocation & A* Navigation to Destinations
- **Class**: Behavior change
- **Actor**: Companion on `/trip/[sessionId]`
- **Trigger**: Opens shared trip page and map loads
- **Path**: `/trip/[sessionId]/page.tsx` → [TripAreaMap.tsx](file:///c:/Daily/Work/Projects/Celesthackathon/frontend/src/components/TripAreaMap.tsx) → [a-star-router.ts](file:///c:/Daily/Work/Projects/Celesthackathon/frontend/src/lib/a-star-router.ts)
- **Changes**:
  1. Detect companion role in `TripAreaMap` vs organizer.
  2. Acquire companion live coordinates via `navigator.geolocation` and render `● You (Your Location)` marker.
  3. Add origin toggle button: `📍 My Location` vs `🚩 Organizer Start`.
  4. Run A* routing (`calculateRealRoadRoute`) from companion's location to itinerary stops, drawing the polyline and step-by-step navigation.
- **Criteria**:
  - Companion sees their own position on the Leaflet map.
  - A* algorithm generates shortest path connecting companion's live location to the trip stops.

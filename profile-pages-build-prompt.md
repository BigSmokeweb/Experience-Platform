# Build Prompt — Traveler & Provider Profile Pages

Give this to your coding agent. Login/register are done — this builds the two distinct profile pages that follow. Reuse the existing auth session, design tokens (`alpine-ivory`, `alpine-teal`, `alpine-charcoal`, `alpine-stone`, `alpine-sage`, gold accent `#C4A265`), and component patterns already established in the auth flow. Do not fork the design language — these pages should feel like the same product.

---

## Why two different profile pages

Travelers and Providers use the platform completely differently, so their profile pages should show different information and different actions — not the same generic "edit account" form with a role flag. Build them as two separate route/pages, sharing only what's genuinely shared (name, email, avatar, logout).

## File structure

```
frontend/src/app/profile/
├── traveler/
│   └── page.tsx              # Traveler profile page
├── provider/
│   └── page.tsx              # Provider profile page
└── components/
    ├── ProfileHeader.tsx      # Shared: avatar, name, email, edit toggle
    ├── TravelerPreferences.tsx# Interests, budget band, travel style editor
    ├── TripHistoryList.tsx    # Traveler: past/saved itineraries
    ├── ProviderBusinessCard.tsx # Provider: business info, verification badge
    ├── ProviderListingsGrid.tsx # Provider: their experiences, draft/published status
    └── ProviderAnalyticsPanel.tsx # Provider: views/saves/inquiries summary
```

Backend: reuse existing `users`, `travelerProfile`, `providerProfile`, `experiences` modules — this is a read/edit UI on top of data that mostly already exists from registration and the provider features work. Only add new endpoints where noted below.

## Routing & access control

- `/profile/traveler` — only accessible if `session.user.role === 'TRAVELER'`. If a Provider hits this URL, redirect to `/profile/provider` (and vice versa) — do not show a role-mismatched profile page even briefly.
- Both pages require an authenticated session; unauthenticated users redirect to `/auth/login`.
- Enforce this check server-side (in the page's data-loading logic / middleware), not just by hiding UI client-side.

---

## Traveler Profile Page (`/profile/traveler`)

### Layout
Single column, generous whitespace, cream background — matches the calmer, personal feel of the rest of the traveler-facing app (not the denser dashboard feel of the provider side).

### Sections

**1. Profile header** (`ProfileHeader.tsx`, shared component)
- Avatar (initials-based placeholder if no photo uploaded — don't require photo upload for hackathon scope), name, email.
- "Edit" toggle switching the header into an inline-editable state (name only — email changes should go through a separate, more careful flow, or be out of scope for this pass).

**2. Preferences** (`TravelerPreferences.tsx`)
- Interests (multi-select chips — reuse the same category set already used in the itinerary builder: Food, Culture, Adventure, Hidden Gems, Nightlife, etc.)
- Budget band (₹ / ₹₹ / ₹₹₹ / ₹₹₹₹ — matches original PRD)
- Travel style (Solo / Couple / Family / Friends / Business — matches original PRD)
- Home city
- Save button — updates `TravelerProfile` via `PATCH /users/me/traveler-profile`. Changes here should actually feed into future recommendation scoring (per the original design intent), not just sit as unused display data — confirm the recommendation engine reads from this profile as a default context when a session doesn't override it.

**3. Trip history** (`TripHistoryList.tsx`)
- List of past/completed `TripSession`s (if the itinerary builder feature is already built) — show a compact card per trip: date, number of stops, city, a "View itinerary" link back to the summary.
- If no trip history exists yet, show a calm empty state ("Your completed itineraries will appear here") rather than an empty broken-looking list.
- New endpoint if needed: `GET /trip-sessions?userId=me&status=COMPLETED`.

**4. Saved experiences** (reuse existing "favorites/saved" concept if built; otherwise a simple placeholder section is fine for hackathon scope — don't invent a whole new save system just for this page).

**5. Account actions**
- Change password (link to a dedicated flow, don't cram inline)
- Logout button

---

## Provider Profile Page (`/profile/provider`)

### Layout
Denser, dashboard-style layout (two-column on desktop) — this is a working tool for the host, not a personal profile, so it should feel more like the existing provider portal than the traveler's calmer page.

### Sections

**1. Business card** (`ProviderBusinessCard.tsx`)
- Business name, contact info, verification status badge (Unverified / Pending / Verified — pull from the existing `verificationStatus` field). Make the badge visually distinct (e.g., muted grey for unverified, gold/teal for verified) so a host is nudged toward completing verification.
- Edit toggle for business name, description, contact details.

**2. Listings overview** (`ProviderListingsGrid.tsx`)
- Grid/list of the provider's own `Experience` rows, using `GET /experiences/my-listings` (already built in the provider features work).
- Each card shows: photo, name, **draft/published badge**, and the **missing-info nudges** for that listing if any exist (reuse the nudge logic already built — don't reimplement it here).
- "Add new listing" button linking to the existing listing-creation flow.
- Clicking a listing opens/edits it in the existing listing form, not a new separate edit UI.

**3. Analytics summary** (`ProviderAnalyticsPanel.tsx`)
- Simple, honest numbers only — don't fabricate metrics. Show whatever is real and available: total listings, total published, and if `Interaction` events are being logged already, a basic count of views/saves per listing (or an aggregate). If real interaction volume is too low to be meaningful (likely, at hackathon scale), it's fine to show the counts as-is or show a light "Analytics improve as more travelers discover you" note rather than fabricating impressive numbers.

**4. Verification status detail**
- If `verificationStatus !== 'VERIFIED'`, show a clear next-step call-to-action ("Complete verification to appear higher in traveler search") linking to whatever KYC/document upload flow already exists.

**5. Account actions**
- Change password
- Logout button

---

## Shared component notes

- `ProfileHeader.tsx` takes a `role` prop only to adjust minor copy/spacing — it should not contain role-specific business logic; keep that in the parent pages.
- Reuse existing button/input/badge styling from the auth and provider-portal work — don't introduce new component variants for buttons/inputs on this page.
- Loading states: skeleton placeholders while profile data loads, not a blank page or spinner-only screen.

## Security / data rules

- `GET`/`PATCH` endpoints for profile data must check `resource.userId === session.user.id` — a user must only ever be able to view/edit their own profile, never another user's by guessing an ID in the URL (this page should be `/profile/traveler` and `/profile/provider` with the session determining *whose* data loads, not a route param like `/profile/:userId`).
- Do not expose `passwordHash`, `mfaSecret`, or any other sensitive field in the profile GET response.
- Provider's KYC document references, if shown at all, should only ever be accessed via signed short-lived URLs (per the existing storage design) — never a raw public link.

## Before writing code, confirm back to me:

1. Whether `TripSession`/trip history is already built and has completed sessions to query, or whether the Traveler page's trip-history section should ship as a clean empty-state-only placeholder for now.
2. Whether `Interaction` events (views/saves) are actually being recorded anywhere yet — if not, the analytics panel should say so honestly rather than showing fabricated/zeroed-out numbers that look broken.
3. That role-based redirect (traveler hitting `/profile/provider` or vice versa) is enforced server-side, not just a client-side conditional render.

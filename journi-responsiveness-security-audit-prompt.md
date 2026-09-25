# Journi — Responsiveness + Security Audit Prompt

**Use with:** an agent that has a real browser (Claude with computer use, Playwright,
Antigravity, BrowserStack, or a human on devtools) for the responsiveness half, and
an agent with repo + terminal access for the security half. These are two separate
passes — don't run them in the same breath, since one needs a browser and the other
needs the codebase/network layer.

Target: https://experience-platform-sigma.vercel.app/ (Journi)

---

## PART 1 — Responsiveness Audit Prompt

```
You are doing a full responsiveness audit of the Journi web app at
https://experience-platform-sigma.vercel.app/ — a travel/experience discovery
platform. You need real rendered output (DevTools device toolbar or actual devices),
not static HTML — screenshot or describe what you see at each breakpoint.

BREAKPOINTS TO TEST (test every page below at all five)
- 320px  (smallest common phone — iPhone SE / older Android)
- 375px  (iPhone standard)
- 768px  (iPad portrait / small tablet)
- 1024px (iPad landscape / small laptop)
- 1440px (standard desktop)
Also test one real device if available (not just emulation) — emulators miss
real touch/keyboard behavior.

PAGES TO TEST
- / (homepage — hero, catalog, itinerary builder, footer)
- /explore (with a filter pill active)
- /experiences/:id (an experience detail page, with photo gallery and map)
- /cities/:slug (a city page)
- /auth/login and /auth/register
- /trip (itinerary/trip page)
- /profile/traveler (if reachable)
- /provider/portal

FOR EACH PAGE, AT EACH BREAKPOINT, CHECK:

1. Layout integrity
   - Any horizontal scroll/overflow that shouldn't exist (drag finger/cursor
     right on the page — does content bleed off screen?)
   - Any overlapping text, images, or buttons
   - Any element cut off at the edge of the viewport
   - Do grid/flex layouts reflow to a single column at narrow widths, or do they
     stay multi-column and squash?

2. Navigation
   - Does the header nav collapse into a working hamburger menu below ~1024px?
   - Does the hamburger menu open/close correctly, and does it trap focus
     sensibly (not scroll the page behind it)?
   - Is the "Cities" dropdown (or any dropdown) usable via touch, not just hover?
   - Are nav tap targets at least ~44x44px on mobile (Apple/Android minimum)?

3. Hero section
   - Does the hero video/image scale correctly, or does it get cropped badly or
     force a huge scroll on mobile?
   - Is hero text legible against the background at every breakpoint (not
     overlapping, not too small)?
   - Any layout shift (CLS) as the video loads in?

4. Cards / catalog grid
   - Do experience cards reflow from grid to a scrollable row or single column
     correctly on mobile, or do they get squashed into unreadable widths?
   - Do card images maintain aspect ratio, or stretch/distort?
   - Are "Explore →" or CTA buttons on cards reachable and not clipped?

5. Forms (login/register, itinerary builder)
   - Do input fields take full width on mobile without overflowing?
   - Does the on-screen keyboard on a real/simulated mobile device cover the
     submit button or the field being typed into?
   - Are date pickers / sliders / steppers usable via touch (not just mouse
     drag)?

6. Floating elements
   - "Celene Concierge" chat widget: does its closed bubble block content or
     nav on mobile? When opened, does the modal fit within the viewport, and
     does the input field stay reachable above the keyboard?
   - Any sticky headers/footers: do they overlap content when the keyboard is
     open, or take up too much vertical space on short viewports (e.g. landscape
     phone, ~375x667 rotated)?

7. Images and media
   - Do all images have appropriate `srcset`/responsive sizing, or is a
     desktop-sized image being downloaded and squeezed on mobile (check Network
     tab for oversized image payloads on a 375px viewport)?
   - Gallery/lightbox on experience pages — swipeable on touch? Closeable
     without a mouse?

8. Typography and spacing
   - Any text that becomes illegibly small (<14px effective) on mobile?
   - Excessive whitespace or cramped spacing at any breakpoint?
   - Line lengths on mobile — is body text readable, or is it edge-to-edge with
     no padding?

9. Orientation
   - Rotate a mobile viewport to landscape (e.g. 667x375) — does anything break,
     especially fixed-height sections or the chat widget?

10. Touch-specific behavior
    - Any hover-only interactions (tooltips, dropdown menus, card overlays) that
      have no touch equivalent — i.e. content or actions unreachable without a
      mouse?
    - Pinch-zoom disabled unintentionally (check meta viewport for
      `user-scalable=no` or `maximum-scale=1` — flag if present, it's an
      accessibility issue)?

OUTPUT FORMAT
A table per page: Breakpoint | Issue | Severity (Blocker/High/Medium/Low) |
Screenshot or description | Suggested CSS/layout fix. Group by page. End with a
top-5 "fix these first" summary ranked by how demo-visible they are.
```

---

## PART 2 — Security Audit Prompt

```
You are doing a security audit of the Journi web app (frontend at
https://experience-platform-sigma.vercel.app/, backend likely at
https://experience-backend.onrender.com or similar — confirm actual API base URL
from network requests). This is a hackathon project, so focus on issues that are
realistic to have snuck in, not exotic enterprise-grade concerns. Use the repo if
available; otherwise use browser devtools + curl against the live site.

DO NOT perform any destructive testing (no actual SQL injection attempts against
production data, no attempts to delete/modify real records, no load-testing/DoS).
Read-only reconnaissance and safe probes only, on this specific target, since this
is your own team's project — not a third-party pentest.

CHECK EACH OF THE FOLLOWING:

1. Secrets and credentials exposure
   - Search the deployed frontend bundle (View Source, and check
     /_next/static/*.js or equivalent build output) for hardcoded API keys,
     Supabase service role keys, JWT secrets, database URLs, or third-party
     API tokens. A leaked Supabase ANON key is expected/fine; a leaked
     SERVICE_ROLE key is a critical bug.
   - Check `.env` files are NOT committed to the repo (git history included —
     `git log --all --full-history -- .env*`).
   - Check any API keys used client-side (maps, analytics, chat widget) are
     scoped/restricted keys, not master keys.

2. Authentication & session handling
   - Are JWTs/session tokens stored in localStorage (vulnerable to XSS theft) or
     httpOnly cookies (safer)? Flag localStorage usage as a finding, not
     necessarily a blocker for a hackathon, but note it.
   - Does the login/register form allow weak passwords with no minimum length/
     complexity check?
   - Is there any rate limiting on login attempts, or can you brute-force
     (check response behavior after ~10 rapid failed attempts — don't go
     beyond that)?
   - Do auth-gated pages (/profile/*, /provider/portal) properly reject access
     server-side when the token is missing/invalid, or do they only hide UI
     client-side while still fetching/exposing data underneath (check Network
     tab — does the API call still succeed with no token)?
   - Password reset flow (if present): does it leak whether an email exists in
     the system (user enumeration via different error messages for
     "email not found" vs "wrong password")?

3. API authorization (IDOR checks)
   - Pick two different user accounts (or one account + one anonymous session).
     Try fetching another user's profile, trip/itinerary, or provider dashboard
     data by directly changing an ID in the API URL or request body (e.g.
     `/api/v1/users/:id`, `/api/v1/trips/:id`). Does the API return another
     user's private data when you're not authorized to see it?
   - Can a regular traveler account access provider-only or admin-only
     endpoints by calling the API directly (bypassing the UI that hides the
     button)?

4. Input validation / injection
   - Test the search/filter inputs and login form with basic XSS payloads like
     `<script>alert(1)</script>` and SQL-injection-flavored strings like
     `' OR '1'='1` — submit them, check if they're reflected unescaped in the
     page (XSS) or cause a 500 error/stack trace leak (potential injection or
     at minimum poor error handling). Do not attempt to actually exploit a
     found vulnerability further than confirming it exists.
   - Check if user-generated content (reviews, ratings, any free-text field) is
     sanitized before being rendered elsewhere (stored XSS risk).

5. CORS and API exposure
   - Check the backend's CORS headers (`Access-Control-Allow-Origin`) — is it
     set to `*` (wide open) or restricted to the actual frontend origin? A
     wildcard combined with credentialed requests is a real bug worth flagging.
   - Is the API base URL/backend publicly reachable and enumerable (e.g. can
     you hit `/api/v1/users` without auth and get a list of all users, even
     partial data)?
   - Check for an exposed API docs/swagger endpoint (`/api/docs`, `/swagger`)
     that's publicly accessible in production and reveals the full API surface
     including admin routes.

6. Sensitive data exposure
   - Do any API responses return more fields than the UI displays — e.g. does
     fetching a user profile return their password hash, full email, phone
     number, or internal flags that shouldn't leave the server?
   - Check error responses — do 500 errors leak stack traces, file paths, or
     database error messages to the client in production?
   - Check if the health endpoint or any debug/status endpoint reveals internal
     infra details (versions, environment variables, internal hostnames).

7. Transport & headers
   - Confirm the site is HTTPS-only (no mixed content warnings, no HTTP
     endpoints being called from an HTTPS page).
   - Check security headers via browser devtools Network tab or
     `curl -I <url>`: is there a Content-Security-Policy, X-Frame-Options (or
     frame-ancestors), X-Content-Type-Options: nosniff? Missing these isn't
     necessarily a blocker for a hackathon demo, but note what's missing.
   - Can the site be iframed by an arbitrary third-party page (clickjacking
     risk) — check X-Frame-Options/CSP frame-ancestors.

8. File upload handling (if the app has any — e.g. profile photos, provider
   listing images)
   - Does upload validate file TYPE server-side (not just by file extension or
     client-side check)?
   - Is there a file SIZE limit enforced server-side?
   - Are uploaded files served from a separate domain/subdomain or object
     storage (not executed as part of the app's own origin) — check this isn't
     something that could allow uploading an HTML/JS file that then gets served
     and executed as same-origin content.

9. Dependency vulnerabilities
   - Run `npm audit` (frontend) and `npm audit` or equivalent (backend) if repo
     access is available. Report any HIGH or CRITICAL findings — don't worry
     about low/moderate ones under time pressure, just flag if anything
     critical needs a version bump before the demo.

10. Rate limiting / abuse surface
    - Is there any rate limiting on the AI chat widget ("Celene Concierge")
      backend endpoint, or could someone hammer it with requests and run up an
      API bill / cause a denial of service? This matters especially if it's
      calling a paid LLM API — check for basic abuse protection.

OUTPUT FORMAT
A findings table: Category | Finding | Severity (Critical/High/Medium/Low/Info) |
Evidence (request/response, screenshot, or code snippet) | Suggested fix.

Then a top-3 "fix before demo if judges might poke at the API directly" list —
hackathon judges sometimes do open devtools and check the network tab, so
anything in category 1 (leaked secrets), 3 (IDOR), or 5 (open CORS/exposed
admin API) is the highest-value fix, even under time pressure.

Do NOT attempt anything beyond read-only checks and the specific safe probes
listed above. If you find something that looks like it could let you seriously
damage or exfiltrate real user data at scale, STOP and report it immediately
rather than continuing to probe further.
```

---

## Notes before you run these

- **Responsiveness pass needs a real browser.** A static HTML fetch (what I did
  earlier) genuinely cannot tell you about overflow, touch targets, or keyboard
  behavior — don't skip getting this in front of an actual browser/device.
- **Security pass — scope it to your own site only.** These prompts are written so
  the agent stays read-only and non-destructive against your own deployed app. If
  you're on a shared/free-tier Supabase or Render plan, be aware that aggressive
  testing (even "safe" probing) can hit rate limits — don't run this back-to-back
  with the responsiveness pass on the same free backend right before your demo slot.
- **Fastest high-value security checks if you're short on time:** #1 (secrets in the
  bundle), #3 (IDOR — can user A see user B's data by changing an ID), and #5 (is
  CORS wide open / is the API publicly listable without auth). Those three catch the
  most common "we shipped this in 24 hours" mistakes.
- **If either audit finds something**, don't hand the finding straight back to a
  coding agent to "just fix it" — for security findings especially, review the fix
  yourself before merging; auth/authorization code is exactly the kind of thing that
  looks fixed but isn't.

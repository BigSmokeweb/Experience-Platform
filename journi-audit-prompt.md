# Journi — Pre-Hackathon Site Audit Prompt

**Target site:** https://experience-platform-sigma.vercel.app/
**Purpose:** Hand this to an AI agent (or human QA pass) with real browser/testing
access — Claude with computer use, a Playwright-based agent, Cursor/Copilot with the
repo open, or a human clicking through devtools. It needs to *see* the rendered site,
not just fetch raw HTML, to catch responsiveness and JS-driven bugs.

---

## Copy-paste prompt for an AI agent

```
You are auditing a hackathon web app called "Journi" (a travel/experience discovery
platform for Mumbai, Thane, Navi Mumbai, Powai, Panvel, Kalyan-Dombivli, Kanjur Marg)
hosted at: https://experience-platform-sigma.vercel.app/

Do a full QA + responsiveness audit. Be specific — file, selector, or page URL for every
issue, not general observations. Go page by page:

PAGES TO COVER
- / (homepage)
- /explore (and /explore?cat=FOOD, ?cat=WORKSHOPS, ?cat=CULTURE, ?cat=ADVENTURE,
  ?cat=HIDDEN_GEMS, ?cat=NIGHTLIFE)
- /experiences/:id (test at least 3 — one from Mumbai's curated listings, one from a
  "Local Experience Intelligence — Curated Dataset" city like Thane/Powai)
- /cities/mumbai, /cities/thane, /cities/navi-mumbai, /cities/powai, /cities/panvel,
  /cities/kalyan-dombivli
- /auth/login, /auth/register
- /profile/traveler, /profile/provider
- /provider/portal
- /trip
- /journal
- /seasonal
- /legal/privacy-policy, /legal/terms, /legal/cookies, /legal/accessibility
- /sitemap.xml

FOR EACH PAGE, CHECK:
1. Console errors/warnings (open devtools, reload, report every red/yellow line)
2. Network tab: any failed requests (404s, 500s, CORS errors, slow >3s requests)
3. Broken images (missing alt content actually failing to load, not just missing alt text)
4. Broken/dead links — click every nav item, footer link, card CTA, "Explore All X" link
5. Responsiveness at 375px, 768px, 1024px, 1440px — screenshot each breakpoint and flag:
   - overlapping/cut-off text or elements
   - horizontal scroll/overflow that shouldn't be there
   - nav not collapsing to a working mobile menu
   - floating chat widget ("Celene Concierge") covering content or the input field on mobile
   - images not scaling / wrong aspect ratio
   - buttons/tap targets too small or too close together on mobile
6. Interactive elements actually working, not just rendered:
   - category filter pills on /explore — do they filter the list?
   - city filter pills — same
   - "Filter" button
   - itinerary builder stepper (location → interests → duration/budget) — does the
     "Expedition Calibrations" summary update, or is it frozen at default values?
   - "Use Current Device Location" — does it request geolocation and handle denial
     gracefully?
   - login/register forms — submit with valid data, invalid data, empty fields;
     confirm real error messages appear, not silent failure
   - auth-gated pages (/profile/*, /provider/portal) — confirm proper redirect when
     logged out, not a blank/broken page
7. Data quality: compare description depth/quality across listings. Flag any listing
   with generic placeholder-style copy (e.g. repeated "Free Public Spot", one-line
   auto-generated descriptions) vs. richly written listings, and report which cities/
   categories are affected.
8. Accessibility basics: color contrast on hero text over video/image background,
   missing alt text, keyboard navigation (tab through the page, does focus order
   make sense and is focus visible?), form labels.
9. Performance: hero background video (/hero-bg-2.mp4) load time on 3G-throttled
   connection, largest contentful paint, total page weight.

OUTPUT FORMAT
A prioritized bug list, grouped by severity:
- BLOCKER (breaks demo / looks broken to judges)
- HIGH (visibly wrong but workaround exists)
- MEDIUM (polish issue)
- LOW (nice to fix if time allows)

For each bug: page, what's broken, how to reproduce, and a one-line suggested fix.
```

---

## Findings so far (from a static HTML fetch — not a live browser)

These were caught without rendering the page, so treat them as leads to confirm live,
not confirmed bugs:

| # | Issue | Where | Confirm by |
|---|---|---|---|
| 1 | Hero text may render as doubled "JourniJourni" | Homepage hero | Visually check the hero on load |
| 2 | Data quality gap — Mumbai listings are rich/hand-written; Thane, Navi Mumbai, Powai, Panvel, Kalyan-Dombivli, Kanjur Marg listings are generic one-liners ("X in Y. Cozy.") all marked "Free Public Spot" | `/explore`, city pages, experience detail pages | Click into 2–3 non-Mumbai listings |
| 3 | Category and city filter pills render as plain text/links in static HTML — unclear if they're functional client-side filters | `/explore` | Click each pill, confirm the list actually filters |
| 4 | Itinerary builder ("Bespoke Route Atelier") shows hardcoded defaults (Mumbai, 3h, ₹5,000, 2 travelers) — unclear if the stepper updates them | Homepage `#itinerary` | Step through all 3 phases, confirm summary updates |
| 5 | "Cities" nav item has no visible href in markup (unlike other nav links) | Header nav | Click it on desktop and mobile — should open a dropdown, not dead-end |
| 6 | Floating "Celene Concierge" chat widget — common mobile failure point (covers content, keyboard pushes it off-screen) | All pages | Test on a real phone or 375px emulator with keyboard open |

---

## Quick manual pass if you don't have an AI agent with browser access

1. **Console first** — F12 → Console, reload every page in the list above. Any red = fix first.
2. **375 / 768 / 1440px** — DevTools device toolbar, check nav, hero, cards, chat widget at each.
3. **Click everything once** — every nav link, footer link, filter pill, card CTA, form submit button.
4. **Lead your demo with Mumbai** — its listings are visibly more polished than the auto-generated ones in other cities; avoid clicking into generic "Free Public Spot" cards live in front of judges.
5. **Test login/register with bad input** — empty fields, wrong password — confirm you get a real error message, not a silent failure or crash.

---

*Generated as a pre-hackathon audit aid — pair this with a live browser pass, since a
static fetch can't catch JS-driven bugs, console errors, or actual responsive behavior.*

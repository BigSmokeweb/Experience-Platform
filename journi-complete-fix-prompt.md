# Journi — COMPLETE Fix Prompt (All Issues)

**Use this with:** Claude Code, Cursor, Copilot, Antigravity, or any agent with the
repo AND a browser/dev-server available (several fixes below need the agent to
actually look at rendered output, not just guess from code).

This covers **everything** from the audit — blockers, highs, mediums, and the
content/data items — in one prompt, still with the same guardrails: fix only what's
listed, stop after each numbered item, report the diff, wait for confirmation before
continuing. That discipline is what prevents a "complete" fix pass from turning into
a refactor that breaks something working.

---

## Copy-paste prompt

```
You are fixing a complete list of confirmed bugs in the Journi codebase ahead of a
hackathon demo. This is a SURGICAL fix pass across the whole list, not a refactor.

GROUND RULES (apply to every fix below, no exceptions)
- Fix ONLY what is described in each numbered item. Do not "improve" adjacent code,
  rename variables, reformat files, upgrade dependencies, or restructure components
  while you're in there. If you spot something else that looks off, list it at the
  end under "Other things I noticed" instead of fixing it.
- Work through the items IN ORDER. After each numbered fix, STOP, tell me exactly
  which file(s) and line(s) you changed and why, show me the diff, and wait for me
  to say "continue" before starting the next one. Do not batch multiple fixes into
  one commit or one uninterrupted run — if something regresses, I need to know which
  single fix caused it.
- Before editing any file, read the whole file (and any component that imports it)
  first, so you understand what else depends on it. Do not guess at prop names,
  types, or state shape — search the codebase to confirm them.
- Do not delete or rename any existing prop, export, route, or API field — only add
  fallbacks or new fields. Other parts of the app may depend on the current shape.
- Do not touch styling or layout of anything not explicitly named in a fix below.
- After each fix, run the app locally (dev server / existing build command) and
  confirm it still builds/starts with no new console errors before reporting back.
- If a fix requires touching shared seed data, a shared component, or a shared
  utility used by multiple pages, tell me which OTHER pages/features consume that
  same data/component BEFORE you make the change, so I can confirm it's safe.
- Some fixes below require you to actually load the page in a browser (or ask me to
  and describe what you see) before writing code — these are marked
  "[REQUIRES LIVE CHECK FIRST]". Do not guess-fix these from reading code alone.

===========================================================================
PART A — BLOCKERS (fix first)
===========================================================================

FIX 1 — B2: Provider name fallback for dataset-seeded listings
Problem: Experience detail pages show "Presented by Local Experience Intelligence —
Curated Dataset" as the provider name — an internal dataset label leaking into the UI.

Find where "Presented by <provider name>" renders on the experience detail page
(likely `ExperienceDetail.tsx` or a `ProviderCard`/`ProviderInfo` component reading
`provider.name` or `listing.providerName`). Confirm the exact literal string used in
seed data / DB for this dataset label first.

Change ONLY the display fallback — not the underlying data:
    const displayName =
      provider?.name === "Local Experience Intelligence — Curated Dataset"
        ? "Curated by Journi"
        : provider?.name;

Check if this same provider-name field is rendered anywhere else (provider profile
pages, search result snippets, admin views) — if so, tell me before deciding whether
the fallback should apply there too, since an admin view might legitimately want to
see the real dataset name.

Verify: a Mumbai listing still shows "Bombay Coastal Bites & Walks" unchanged; a
Thane/Powai/etc. listing now shows "Curated by Journi".

---

FIX 2 — B3: Backend health check 404
Problem: GET /api/v1/health returns 404, though the app itself runs fine.

First, find the ACTUAL registered health route in the backend (search for
`@Controller` + health-related decorators / route registration). Tell me the real
route path before changing anything.

Update `render.yaml`'s `healthCheckPath` to match reality — do not invent a new
route or change the controller's existing path, since other tooling (Render deploy
pipeline, uptime monitors) may already depend on whatever currently works.

If no health route exists at all, add a minimal one consistent with the existing API
prefix (confirm the prefix first — e.g. if everything is under `/api/v1`, mount this
the same way):
    @Get('health')
    health() { return { status: 'ok' }; }

Verify: curl the corrected endpoint, confirm 200 OK. Confirm catalog/experience
endpoints still return data normally — i.e. you haven't changed any global routing
prefix.

---

FIX 3 — B1: Write real descriptions for the most-visible non-Mumbai listings
Problem: Non-Mumbai listings (Thane, Navi Mumbai, Powai, Panvel, Kalyan-Dombivli,
Kanjur Marg) have auto-generated one-line descriptions like "Cakeaddict in Upvan,
Thane West, Thane. Cozy" instead of real copy.

This is a CONTENT task, not a code-logic fix — do not auto-generate filler
descriptions and silently write them into seed data. Instead:
1. List the 5–8 listings that appear highest/most-prominently in the homepage
   catalog and city pages (the first 2–3 cards shown per non-Mumbai city section).
2. For each, draft a 2–3 sentence description in the same voice/style as the
   existing Mumbai listings (specific, sensory, mentions real local detail — not
   generic "Cozy"/"Bustling" adjectives).
3. Show me all drafts together in one message. Do NOT write them into seed data /
   the database until I approve them.
4. Once I approve, update only those specific rows/records — do not touch the
   listings I didn't approve, and do not change the schema or add new fields to
   accommodate this.

===========================================================================
PART B — HIGH (visibly wrong, but workaround exists)
===========================================================================

FIX 4 — H2: "Return to Curated Experiences" back button dead-ends
Problem: No href fallback — if a user opens an experience URL directly (no browser
history), the back button does nothing.

Check if the back button component already accepts a `fallbackHref` prop. If so,
just pass `fallbackHref="/explore"` at the experience detail page usage — don't
change the component itself.

If it doesn't support a fallback, add minimally:
    onClick={() => {
      if (window.history.length > 1) router.back();
      else router.push('/explore');
    }}

Check if this component is shared with other pages — if so, apply the fallback only
at the experience detail page's usage, not globally, unless you confirm every other
usage wants the same behavior.

Verify: open an experience URL directly in a new tab, click back, confirm it goes to
/explore instead of nothing.

---

FIX 5 — H1: OG meta tags generic on experience detail pages
Problem: og:title / og:description / og:url / og:image are the site-wide defaults on
every experience page, so sharing a link shows the wrong preview.

Find (or add) `generateMetadata()` for the experience detail route. Confirm the
route currently has no dynamic metadata function, or has one that's incomplete.
Generate metadata from the fetched experience data:
    export async function generateMetadata({ params }): Promise<Metadata> {
      const exp = await fetchExperience(params.id);
      return {
        title: `${exp.title} — ${exp.city}`,   // layout template adds "| Journi"
        description: exp.description,
        openGraph: {
          title: exp.title,
          description: exp.description,
          url: `https://experience-platform-sigma.vercel.app/experiences/${exp.id}`,
          images: [exp.coverImageUrl ?? '/og-image.png'],
        },
      };
    }
Match the exact fetch function/data shape already used elsewhere on that page — do
not create a second/duplicate fetch call if the page already fetches this data
server-side; reuse it.

Verify: view source of an experience detail page, confirm og:title/description/url
match that specific experience, not the site defaults. Confirm homepage/other pages'
OG tags are unaffected.

---

FIX 6 — H3: Duplicate footer links
Problem: Footer city/guild links render twice in HTML — once inside a `<ul>`, once
as a duplicate block right after.

Open the Footer component. Find the `.map()` over cities/guilds rendering inside a
list, and locate the second, duplicate block. Determine which is the intended one
(check which has correct wrapper/styling classes) and remove ONLY the orphaned
duplicate. Do not touch the legal links, social links, or Company section.

Verify: view source of homepage footer, each city/guild link appears exactly once.
Visually confirm footer layout is unchanged/still correct after removing the block.

---

FIX 7 — H4: "Free Public Spot" price fallback
Problem: Listings with priceMin=0 and priceMax=0 (due to missing price data) show
"Free Public Spot" — same label as genuinely free public spots (temples, public art),
so the distinction is lost.

First check the data model: is there an explicit flag (e.g. `admissionType`,
`isFreeSpot`, a specific category) distinguishing "genuinely free public place" from
"no price data entered"? Tell me what you find before editing anything.

If such a flag exists: only listings WITHOUT it (i.e. free purely because price data
is missing) should change to show "Price on request" instead of "Free Public Spot".
Genuinely free spots keep their current label unchanged.

If no such flag exists, do NOT invent new data or reclassify listings — just tell me
this needs a data decision, and skip the code change until I decide how to
distinguish them.

Verify (if fixed): a real free public spot (e.g. a temple) still says "Free Public
Spot"; a listing free only due to missing data says "Price on request".

===========================================================================
PART C — MEDIUM (needs live-browser confirmation first)
===========================================================================

FIX 8 — M5: Duplicate "| Journi | Journi" in page title
Problem: Experience detail `<title>` shows "Journi" twice.

Find `generateMetadata()`/title logic for the experience detail route AND the
root/layout-level title template (likely `title.template: '%s | Journi'` in
`layout.tsx`). One of the two is appending "| Journi" redundantly. Keep the
layout-level template as the single source of the "| Journi" suffix; make sure the
page-level title does not also append it.

Check homepage, /explore, and /cities/:slug titles are unaffected (they likely share
the same layout template) — confirm each still shows "Journi" exactly once after
your change.

Verify: view source of an experience page — title reads "<Name> — <City> | Journi"
once. Spot-check 2 other page titles are unchanged.

---

FIX 9 — H2/related — "Add to Day Plan" CTA loses context
Problem: "Add to Day Plan" button on experience detail pages links to `/#itinerary`
(homepage anchor) with nothing pre-selected, losing the experience the user was
viewing.

Check if `/trip` (the dedicated itinerary page) accepts a query param to pre-add an
experience (e.g. `/trip?add=<id>`) — search for how the trip/itinerary state is
initialized. If such a mechanism exists, change the CTA's href to use it. If it does
NOT exist, do not build new state-management logic for this in an unscoped way —
report back what exists today and propose the minimal addition (e.g. reading an
`add` query param on `/trip` mount and calling the existing "add experience" function
if one exists) before writing it, since this touches itinerary state that other
features depend on.

Verify: click "Add to Day Plan" from an experience page, confirm you land somewhere
with that experience either pre-added or clearly still accessible to add — not a
context-free homepage anchor.

---

FIX 10 — M1: Hero "JourniJourni" doubling [REQUIRES LIVE CHECK FIRST]
Problem: Possible doubled "Journi" text in the hero, possibly from a page-transition
overlay clashing with the hero title during load.

DO NOT touch animation/transition code yet. First:
1. Load the homepage with DevTools Network tab set to "Slow 3G", hard reload.
2. Record/describe exactly what renders in the hero during the first 2 seconds of
   load — is there a page-transition overlay with a "Journi" logo, and does the
   hero's own title also say "Journi" at the same time, causing visual doubling? Or
   is this a false read from static HTML (i.e. it's actually fine)?
3. Report what you observe to me BEFORE writing any fix.
Only after I confirm it's a real bug should you adjust the transition overlay's
fade-out timing relative to the hero title's fade-in — and only that timing, nothing
else about the hero animation.

---

FIX 11 — M3: Itinerary builder stepper may be frozen [REQUIRES LIVE CHECK FIRST]
Problem: The "Expedition Calibrations" summary panel shows hardcoded-looking
defaults (Mumbai, 3h, ₹5,000, 2 travelers) — unclear if it updates as the user steps
through the builder.

DO NOT touch state logic yet. First:
1. Load the homepage, scroll to "Create Your Itinerary".
2. Click a different location option (e.g. "Flamingo Trails & Forts" instead of the
   default). Does the "Expedition Calibrations" panel update to reflect it?
3. Do the same for interests and duration/budget.
4. Report exactly what updates and what doesn't, to me, before touching any code.
If something is genuinely frozen, locate the specific piece of state that isn't
wired to the summary display (likely a missing prop pass-through or a summary
component reading a hardcoded default instead of the builder's live state) and fix
only that connection — do not rewrite the builder's state management.

---

FIX 12 — M4: Celene chat widget mobile overflow [REQUIRES LIVE CHECK FIRST]
Problem: Floating chat widget may cover content or get pushed off-screen by the
on-screen keyboard on mobile.

DO NOT touch the modal's CSS yet. First:
1. Open the site on a 375px-wide viewport (DevTools responsive mode is a reasonable
   proxy, but an actual phone is better if available).
2. Open the Celene widget, tap the text input, and if possible simulate/observe
   keyboard appearance.
3. Report exactly what breaks — does the modal get cut off, does the input become
   unreachable, does content underneath become inaccessible?
Only after I confirm the actual failure mode should you adjust the modal's max
height / sticky positioning (e.g. `max-h-[80dvh]`, `sticky bottom-0` on the input
row) — scoped to fixing only the confirmed failure, not a general redesign of the
widget.

===========================================================================
PART D — LOW (only if time remains, do last)
===========================================================================

FIX 13 — L4: Leftover render.yaml health path (only if not already covered by Fix 2)
If Fix 2 already resolved this, skip.

FIX 14 — L1: Leaflet CSS loaded unconditionally on every experience detail page
Only touch this if Fixes 1–12 are done and stable. Lazy-load the Leaflet stylesheet
only when the map component actually mounts (i.e. only for listings that have
coordinates), rather than a global `<link>` in the page head. Do not change how the
map itself renders or its behavior — only when its CSS is loaded.

FIX 15 — L2: `referrerPolicy="no-referrer"` on gallery images
Only touch if time remains. Change to `strict-origin-when-cross-origin` on the
experience gallery image components only — do not change referrer policy anywhere
else in the app without checking why `no-referrer` was chosen (it may be intentional
for the Supabase storage URLs).

FIX 16 — L3: Footer "Company" section is sparse
Skip unless explicitly asked — this is a content/IA decision, not a bug, and doesn't
need fixing for a hackathon demo.

===========================================================================
AFTER ALL FIXES
===========================================================================
Do a full click-through: homepage, /explore with each category filter, one Mumbai
experience, one non-Mumbai experience, itinerary builder, footer links, /auth/login
with bad input, and Celene widget on both desktop and 375px mobile view. Confirm
nothing regressed. Report a final summary of everything changed, file by file.
```

---

## How to run this practically tonight

Given time pressure, don't run all 16 fixes end-to-end blind. Suggested sequencing:

1. **Fixes 1, 2, 4, 6** — safe, isolated, no live-browser dependency. Do these first,
   review each diff.
2. **Fix 5** (OG tags) — safe but slightly more code, still no live check needed.
3. **Fixes 10, 11, 12** — these start with "look and report," not "fix." Run those
   observation steps yourself or with the agent now, so you know by tonight whether
   they're real bugs or non-issues. Only apply the actual code change if confirmed.
4. **Fix 7** — depends on a data-model answer; resolve the question first, decide if
   it's even worth doing before the demo.
5. **Fix 3** (descriptions) — do this in parallel, by hand or with a teammate
   reviewing drafts, it doesn't block or depend on any code fix.
6. **Fixes 8, 9** — nice-to-have polish, do only if 1–7 are done and stable.
7. **Fixes 13–16** — skip entirely unless everything else is done early.

If you're truly short on time, **Fixes 1, 2, 4, 6 alone** remove the most
demo-visible rough edges with the lowest risk of the agent breaking something else.

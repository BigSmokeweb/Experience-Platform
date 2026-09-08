# Build Prompt — Comprehensive Site Footer (Full Navigation + Legal Links)

Give this to your coding agent along with the current footer screenshot for reference. This extends the existing footer (Journi branding, "Signature Cities," "Curated Guilds," "Our Promise" columns already look good — keep that visual style) to be a complete, legally-sound footer that links to every real page on the site, not just a curated content sample.

---

## Why this matters

Right now the footer only links to a few content pages (cities, guilds) and the bottom bar only has 3 links (The Collection, Your Journey, Partner With Us) plus a copyright line — no legal pages, no full sitemap, no way to reach account/support pages from the footer. A production-ready site (and a hackathon judge scanning for polish) expects a footer that acts as a genuine secondary navigation system and includes standard legal links.

## Keep the existing visual style

Match the current footer exactly: cream/ivory background, small-caps letter-spaced column headers (`SIGNATURE CITIES`, `CURATED GUILDS`, `OUR PROMISE` style), muted charcoal/sage link text, the "Verified & Trusted" badge pill, and the thin divider line above the bottom copyright bar. Do not redesign the visual language — only expand the content/links.

## New footer structure

**Keep the existing top section as-is** (brand blurb + logo, Signature Cities, Curated Guilds, Our Promise/trust badge) — these stay exactly as currently built.

**Add a new column (or restructure into more columns) covering full site navigation:**

```
EXPLORE                    ACCOUNT                    COMPANY                    LEGAL
The Collection              Log In                     About Journi                Privacy Policy
Seasonal                    Sign Up                     Partner With Us             Terms of Service
Your Journey                Traveler Profile            Contact Us                  Cookie Policy
Journal                     Partner Portal              Careers (if applicable)     Refund/Cancellation Policy
Cities                      (Provider) Dashboard                                    Accessibility Statement
```

Adjust exact labels/links to match whatever routes actually exist in the app — do not invent pages that don't exist (e.g., don't add a "Careers" link if there's no careers page; only link to real routes). If a legal page (Privacy Policy, Terms, etc.) doesn't exist yet, still add the link but point it to a placeholder page (see below) rather than omitting it — a footer with a broken/missing link looks worse than a placeholder page that says "Coming soon."

## Legal pages to create (if they don't already exist)

At minimum, for a two-sided marketplace handling user data and payments-adjacent info, create simple placeholder pages for:

- `/legal/privacy-policy` — should at least outline what data is collected (location, preferences, account info per the DPDP-aligned data practices already specified in the system design), how it's used, and that it's not sold to third parties. Even a straightforward, honestly-written page is better than nothing for a judge or real user checking policy.
- `/legal/terms-of-service` — basic terms: platform is a discovery/marketplace tool, not a booking/payment processor (matches the actual scope — no real transactions happen on-platform), user responsibilities, provider responsibilities.
- `/legal/cookie-policy` — should accurately reflect what's actually used (matches the "3 third-party cookies" finding from the earlier Lighthouse audit — be honest about what's actually set, don't write a generic policy that doesn't match reality).
- `/legal/accessibility` — brief statement of accessibility commitment, referencing the WCAG AA work already done on contrast/labels/focus states.

Keep these pages simple — single-column text content using the existing typography system (serif headline, sans-serif body), not elaborate new layouts. This is about having correct, real links, not writing exhaustive legal documents (recommend a note at the bottom of each: "This is a student hackathon project; this policy is illustrative" if that's factually accurate for your situation — don't overclaim legal force you don't have).

## Bottom bar

Expand the bottom bar (currently just 3 links + copyright) to include:
```
© 2026 Journi. All rights reserved.     [Privacy] [Terms] [Cookies] [Sitemap]
```
Keep it on one line on desktop, wrap cleanly on mobile.

## Sitemap consideration

If a `sitemap.xml`/`sitemap.ts` already exists (from the earlier SEO work), you may optionally add a small `/sitemap` human-readable page listing every real route, linked from the bottom bar — genuinely useful for both users and looks thorough to judges. Not required if time is short; the legal links matter more.

## Technical requirements

- Every link in the footer must point to a real, working route — audit the app's actual route list first (`frontend/src/app/**`) and only link to what exists, or to the new placeholder legal pages you're creating in this same pass.
- Footer must remain a single shared component (`Footer.tsx` or wherever it currently lives) rendered once in the root layout — do not duplicate footer markup per page.
- Maintain responsive behavior: columns stack cleanly on mobile, no horizontal overflow.
- All links keyboard-accessible with visible focus states (same requirement as the rest of the site).

## Before writing code, confirm back to me:

1. The full list of real routes you found in the app, so we can agree on exactly what the footer should link to before you build it.
2. Whether Privacy Policy / Terms / Cookie Policy / Accessibility pages already exist anywhere, or need to be created from scratch as described above.
3. Confirm the Cookie Policy content will accurately describe what's actually set on the site (from the Lighthouse finding of 3 third-party cookies) rather than generic boilerplate that might misstate reality.

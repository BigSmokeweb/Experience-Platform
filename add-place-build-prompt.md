# Build Prompt — Simple "Add a Place" Feature (Traveler & Host, One Shared Flow)

Give this to your coding agent. This replaces the complexity concern with the existing 4-step provider listing wizard by adding a **much simpler, shared "Add a Place" flow** that both a traveler (who discovered somewhere) and a shop/host owner (who runs a business) can use to submit a new location. This does not remove the existing detailed provider listing wizard — it adds a lightweight alternative entry point that funnels into the same underlying data.

---

## The core idea, in plain terms

Anyone — a traveler who just found a great local spot, or a shopkeeper who wants their own place listed — should be able to tap **"Add a Place"** and fill out ONE simple form, not a multi-step business wizard. No KYC, no verification tab, no MFA setup, no category-specific extra fields. Just: what is it, where is it, and a couple of basic details.

## Where this lives

- A single new page/modal: `/add-place` (or a modal triggered from a floating "+ Add a Place" button visible on the Explore page, city pages, and both profile pages).
- Accessible to **any logged-in user, regardless of role** (Traveler or Provider) — this is the key difference from the existing provider-only listing wizard.

## The form — one screen, not a wizard

Keep this to a single scrollable form, no multi-step progress tracker:

```
ADD A PLACE

What did you find? *
[ Text input — e.g. "Best vada pav stall near Thane station" ]

What kind of place is it? *
[ Simple category chips — same 8 categories already used elsewhere:
  Food, Culture, Adventure, Hidden Gems, Nightlife, Events, Workshops, Shopping ]

Where is it? *
[ "Use my current location" button ]  or  [ Search/type an address ]
(reuses the same geolocation + geocoding already built for the provider form)

Tell us about it *
[ Short text area, 1-3 sentences — "Why is this worth visiting?" ]
(minimum ~20 characters, same validation pattern already used, but framed
as a friendly placeholder, not a strict business description field)

Add a photo (optional)
[ Single photo upload/URL — not a gallery, just one representative image ]

Roughly how much does it cost? (optional)
[ Free / ₹ / ₹₹ / ₹₹₹ — simple tier buttons, not a min/max price range ]

Are you the owner of this place?
[ Toggle: "No, I just discovered it" / "Yes, this is my business" ]

[ SUBMIT ]
```

That's the entire form. No availability hours grid, no accessibility tag checklist, no duration field, no group size — those stay exclusive to the full provider wizard for hosts who want a complete, bookable listing.

## What happens after submit — this is the important design decision

The "Are you the owner?" toggle determines what happens to the submission, but the **form itself is identical either way** — this is what makes it feel like one simple shared feature instead of two different systems:

- **If submitted by a traveler who says "I just discovered it":** creates the `Experience` row with `published: false` (or a new lightweight `status: 'COMMUNITY_SUBMITTED'` state) and `submittedByRole: 'TRAVELER'`. It goes into a light moderation queue (even a simple admin-reviews-before-publish step is fine for hackathon scope) before appearing in search — since a traveler isn't the business owner and can't verify pricing/hours/authenticity themselves.
- **If submitted by a shop owner who says "Yes, this is my business":** creates the `Experience` row linked to their `ProviderProfile` (auto-creating a minimal provider profile if they don't have one yet), same as the existing listing flow, but skips straight to a simple published/draft state — no need to route them through the KYC-heavy wizard for a first, minimal listing. They can always go complete the full wizard later to add hours, accessibility info, etc.

## Data model note

Reuse the existing `Experience` model — do not create a separate table for "community submissions." Add only what's needed:
- `submittedByRole` (`TRAVELER` | `PROVIDER`) — for moderation/trust context
- `submittedByUserId` — whoever created it, regardless of role
- A lightweight status field if one doesn't already fit (`published` boolean may already be enough — a traveler-submitted place simply stays `published: false` until an admin/moderator flips it, same mechanism as drafts already use)

## Why this design is better for your actual goal

- **One form, one mental model** — "see something worth sharing? Add it." Works the same whether you're a tourist or a shop owner, which is the actual feature you're asking for.
- **No new complexity added to the backend** — this reuses the existing `Experience` table, the existing draft/published mechanism, the existing geolocation component, and the existing category set. It's a new frontend entry point and one or two new fields, not a new system.
- **Doesn't compete with or complicate the existing provider wizard** — hosts who want a full, detailed, bookable listing still use `/provider/portal`'s 4-step flow. This is just a fast, friendly on-ramp for casual submissions from anyone.

## Moderation (keep it simple)

- A basic admin view (if one already exists from earlier work) should show a list of `submittedByRole: 'TRAVELER'` places pending review, with an approve/reject action that flips `published` to `true`. If no admin panel exists yet and time is short, a simple manual database flip for demo purposes is acceptable — don't over-build moderation UI for a hackathon.

## Before writing code, confirm back to me:

1. Whether you'll extend the existing `Experience` model with the two new fields above, or if there's a structural reason a separate lightweight table would be simpler given the current schema.
2. Where the "+ Add a Place" entry point button will actually appear (floating button vs. nav link vs. profile page button) — pick one primary location so it's easy to find, not scattered inconsistently.
3. Confirm this new simple form does NOT replace or remove the existing provider 4-step wizard — both should exist side by side, serving different needs (quick community submission vs. full business listing).

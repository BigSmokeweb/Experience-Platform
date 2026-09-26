# Local Experience Intelligence Platform
## Production System Design & Security Architecture (PS-6, HackCelestial 3.0)

**Document type:** Engineering design doc, written as if for production deployment at scale — not a hackathon-only prototype spec.
**Scope:** Backend architecture, data strategy, security/threat model, and feature set for a two-sided (Traveler/Provider) local-experience discovery platform in India.

---
see
## 1. System Overview

The product connects two actors through an AI-assisted matching layer:

- **Traveler** — supplies real-time context (location, time, budget, group, interests); receives ranked, explained, adaptable recommendations.
- **Provider** — local restaurants, guides, artists, workshop hosts, event organizers, adventure operators; manages listings, availability, and gets discovered by relevant travelers.
- **Platform core** — Context → Understand → Match → Rank → Explain → Plan → Adapt pipeline, sitting on top of a structured relational dataset, with an LLM layer for reasoning/explanation, not for decision authority.

A company shipping this for real would treat it as **three separable services**, not one monolith, even in an MVP:

1. **Core Platform API** (auth, users, providers, experiences, bookings-lite, reviews)
2. **Recommendation Engine** (filtering, scoring, ranking — deterministic, testable, versioned)
3. **AI Reasoning Service** (LLM calls for intent parsing, explanation text, itinerary generation) — isolated behind its own service boundary so a prompt-injection or model outage never touches the core data path.

This separation is the single most important architectural decision: **the recommendation engine must be able to produce a valid, ranked result set with zero calls to the LLM.** The LLM only explains and phrases what the deterministic engine already decided. This is both a security boundary and a reliability boundary.

---

## 2. High-Level Architecture

```
                          ┌─────────────────────┐
                          │   CDN / Edge (WAF)   │
                          └──────────┬───────────┘
                                     │
                          ┌──────────▼───────────┐
                          │   API Gateway / BFF   │  (rate limiting, authN,
                          │                       │   request validation)
                          └──────────┬───────────┘
             ┌───────────────────────┼───────────────────────┐
             ▼                       ▼                       ▼
   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────────┐
   │  Core Platform    │   │  Recommendation   │   │   AI Reasoning        │
   │  Service          │   │  Engine (internal) │   │   Service (internal)  │
   │  - Auth           │   │  - Hard filters    │   │  - Intent extraction  │
   │  - Users          │   │  - Scoring         │   │  - Explanation text   │
   │  - Providers       │   │  - Ranking         │   │  - Itinerary drafts   │
   │  - Experiences     │   │  - Caching layer   │   │  - Sandboxed, no DB   │
   │  - Reviews         │   │                     │   │    write access       │
   │  - Notifications   │   │                     │   │                       │
   └─────────┬─────────┘   └─────────┬──────────┘   └──────────┬────────────┘
             │                       │                          │
             ▼                       ▼                          ▼
   ┌───────────────────────────────────────────────────────────────────┐
   │                       PostgreSQL (Primary) + PostGIS               │
   │           Redis (cache/session/rate-limit) | Object storage (S3)   │
   │                     Search index (OpenSearch/Meilisearch)          │
   └───────────────────────────────────────────────────────────────────┘
```

Key point for a "company-ready" build: **the AI Reasoning Service never talks to the database directly.** It receives a pre-filtered, pre-scored candidate list (already stripped of anything the user shouldn't see) and returns text/structure only. This closes off an entire class of prompt-injection-to-data-exfiltration attacks.

---

## 3. Tech Stack (Production-Grade)

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | SSR for SEO on discovery pages, React ecosystem |
| API | Node.js (NestJS) or Next.js server actions for MVP, migrating to NestJS/FastAPI microservices at scale | Structure, DI, testability |
| Primary DB | PostgreSQL + PostGIS extension | Geo queries (radius search, distance) are first-class, not bolted on |
| Cache/session | Redis | Rate limiting, session store, hot recommendation cache |
| Search | Meilisearch (MVP) → OpenSearch (scale) | Typo-tolerant place/experience search |
| Object storage | S3-compatible (Supabase Storage / AWS S3) | Provider images, documents |
| Auth | Supabase Auth or Auth0/Clerk, backed by OAuth2 + short-lived JWTs | Don't hand-roll auth |
| AI | Gemini/Claude via server-side proxy only, never client-side key | Isolation, cost control, auditability |
| Infra | Vercel (frontend) + containerized services on a managed platform (Render/Fly.io/AWS ECS) | MVP-to-scale path without a rewrite |
| Observability | Sentry (errors) + OpenTelemetry traces + structured logs | You cannot secure what you cannot see |

---

## 4. Data Model (Core Entities)

```
User (id, email_hash, phone_hash, role, created_at, ...)
 ├── TravelerProfile (interests[], budget_band, travel_style, home_city)
 └── ProviderProfile (business_name, verification_status, kyc_ref)

Experience
 ├── provider_id (FK)
 ├── category (enum)
 ├── geo (PostGIS POINT)
 ├── price_range
 ├── availability_rules (structured, not free text)
 ├── accessibility_tags[]
 ├── media[] (S3 refs)
 └── quality_score (derived, recomputed nightly)

Review
 ├── experience_id, user_id
 ├── structured_ratings (authenticity, value, experience, accessibility)
 └── text (moderated before publish)

Interaction (append-only event log)
 ├── user_id, experience_id, event_type (view/save/click/complete)
 └── used to retrain ranking weights, NOT to store PII beyond FK

Recommendation_Log
 ├── request_context (hashed/anonymized), candidates_returned, chosen_id
 └── critical for auditability — "why did we recommend X" must be replayable
```

**Design rule:** never store raw lat/long history tied to identity longer than needed for the active session/trip. Store city/area-level aggregates for anything long-term (see Section 6, data minimization).

---

## 5. Security Architecture (the part a real company would not skip)

### 5.1 Threat model — what a two-sided marketplace is actually exposed to

1. **Account takeover** (traveler & provider accounts)
2. **Fake/malicious provider listings** (scams, phishing links in descriptions, fraudulent businesses)
3. **Location data leakage** (traveler GPS is sensitive — reveals home, routine, real-time whereabouts)
4. **Prompt injection via user-generated content** (a provider's "description" field or a traveler's free-text search reaching the LLM layer)
5. **Scraping / recommendation-engine abuse** (competitors scraping your entire provider database via the search API)
6. **Review manipulation** (fake 5-star reviews, competitor sabotage via fake 1-stars)
7. **Payment/booking fraud** (once bookings exist)
8. **IDOR** (insecure direct object references — traveler A viewing traveler B's saved trips via predictable IDs)

### 5.2 Controls, mapped to threats

| Threat | Control |
|---|---|
| Account takeover | OAuth2/JWT with short-lived access tokens (15 min) + refresh token rotation, MFA optional for travelers, **mandatory** for provider accounts (they hold business/payment data), bcrypt/argon2 for any local credentials, breached-password check on signup |
| Fake providers | Verification pipeline: phone OTP → business document upload → manual/automated review → `verified` badge; unverified providers rank lower and are visually flagged; rate-limit listing creation per account |
| Location leakage | Geolocation is **on-demand**, never background-tracked without explicit opt-in; store precise coordinates only for the duration of an active session; persist only city/area granularity historically; all location data encrypted at rest; never log raw coordinates in application logs |
| Prompt injection | Strict input/output schema for the AI Reasoning Service — it receives structured JSON candidates, not raw user text pasted into a system prompt unsanitized; system prompt is never user-overridable; output is validated against an expected schema before being shown to users; treat any free-text field (provider description, review text) as untrusted input, never concatenated directly into a prompt that has tool access |
| Scraping / recommendation abuse | Rate limiting per IP + per account at the gateway (Redis token bucket), pagination caps, no bulk-export endpoints, CAPTCHA on anomalous request patterns, response randomization/jitter on ranking to blunt exact reverse-engineering |
| Review manipulation | One review per completed interaction only (tie review eligibility to a recorded "experience completed" event, not free-form), velocity checks (N reviews from same device/IP in short window → flagged), sentiment/duplicate-text detection |
| IDOR | Never expose sequential integer IDs externally — use UUIDs; every resource fetch checks `resource.owner_id == session.user_id` at the service layer, not just the UI |
| Injection (SQL/NoSQL) | Parameterized queries only (ORM — Prisma/Drizzle/TypeORM), no raw string concatenation, input validation with a schema library (Zod) at every API boundary |
| XSS | Output-encode all user-generated content (provider descriptions, reviews) before render; strict CSP headers; sanitize on write with a library like DOMPurify for any rich text |
| CSRF | SameSite=strict cookies, CSRF tokens on state-changing requests if cookie-based auth is used at all |
| Secrets | All API keys (Gemini, Supabase service role, etc.) live server-side only, in a secrets manager (Vercel env / AWS Secrets Manager), rotated regularly, never in client bundles |
| DDoS / abuse at edge | WAF + CDN (Cloudflare) in front of everything, geo-based anomaly alerts |

### 5.3 Compliance & data governance (India context)

- Design for **DPDP Act 2023** (India's Digital Personal Data Protection Act) compliance from day one: explicit consent for location tracking, purpose limitation, right to erasure, data localization considerations if scaling to enterprise/B2B clients.
- Maintain a data retention policy per table (e.g., raw interaction logs purged/anonymized after 12 months).
- Every PII field (email, phone) should be encrypted at rest and access-logged.

---

## 6. Location Dataset Strategy

This is the practical question of "how do we actually get provider/location data for India," broken into the three sources already identified, with a production lens on each:

### 6.1 Provider-submitted (primary, long-term source of truth)
This should be the platform's real backbone — providers self-register and add their own listing with geo-pin, hours, pricing. It's the only source that stays accurate without you maintaining it. Build the submission flow to be low-friction (progressive profile completion, not a 40-field form up front) since provider onboarding is usually the growth bottleneck in a marketplace.

### 6.2 Seed/curated dataset (for MVP + cold-start problem)
Every two-sided marketplace has a cold-start problem — travelers won't show up if there's nothing to recommend, and providers won't join if there are no travelers. For the hackathon prototype and early production, hand-curate 50–150 real experiences across 2–3 demo cities (Ahmedabad, Mumbai, Jaipur are reasonable choices given the India-only V1 scope). This can be sourced legitimately from:
- Public government tourism board listings (India Tourism, state tourism boards — often public data)
- OpenStreetMap POI data (`amenity`, `tourism`, `shop` tags) via the Overpass API — free, open-licensed, good coverage for restaurants/landmarks
- Direct outreach/manual entry for a curated "hero" set used in demos

**Do not scrape Google Maps, Zomato, TripAdvisor, or similar platforms directly** — this violates their Terms of Service and is a real legal exposure for a "company-ready" product, not just a hackathon shortcut. Use their official APIs (Google Places API, etc.) under their licensing terms if you need supplemental data, and budget for the API costs.

### 6.3 External API augmentation (future/optional)
Once past MVP, Google Places API or similar can supplement discovery (fill gaps where you have no provider yet) but should be clearly distinguished in the data model from "verified platform providers" — don't let unclaimed third-party listings pollute your ranking signals or imply a business relationship that doesn't exist.

### 6.4 Storing geo data correctly
Use **PostGIS** (`geography(Point, 4326)` type) rather than plain lat/lng floats — this gets you correct radius queries (`ST_DWithin`), distance calculation, and indexing (`GiST`) for free, which matters the moment you have more than a few hundred experiences and need sub-100ms search.

---

## 7. Recommendation Engine Design (production version of the PRD's ranking logic)

```
Layer 1 — Hard filters (deterministic, cheap)
   location radius, open/closed now, budget ceiling, accessibility match
Layer 2 — Weighted scoring (deterministic, versioned, unit-testable)
   score = w1*location_match + w2*intent_match + w3*budget_fit
         + w4*time_availability + w5*rating + w6*authenticity - w7*distance_penalty
   Weights stored as config, A/B-testable, NOT hardcoded magic numbers.
Layer 3 — AI reasoning (LLM, stateless, receives only the top-N candidates)
   generates natural-language "why this" explanation and itinerary phrasing
Layer 4 — Response assembly
   candidates + scores + AI explanation returned to client, full request
   logged to Recommendation_Log for auditability/replay
```

Why this separation matters for a "no vulnerabilities, ready for anything" product: the ranking logic is **fully explainable, testable, and cannot be manipulated by adversarial prompt content**, because the LLM never sees raw user-controlled text that could reach a scoring decision — it only phrases decisions already made deterministically.

---

## 8. Feature Set (production-scoped, mapped to MVP/Should-have/Future)

**Must-have (MVP / Ideathon build):**
- Traveler & Provider auth with role separation, provider verification workflow
- On-demand geolocation + manual city/area search
- Category-based discovery (Food, Culture, Adventure, Hidden Gems, Nightlife, Events, Workshops, Shopping)
- Deterministic filter+scoring engine (Layers 1–2 above) — this alone is demoable and defensible without any AI dependency
- AI explanation layer ("why this") — Layer 3
- Provider dashboard: add/manage experience, set availability, view basic analytics
- Structured reviews tied to completed interactions
- Admin moderation panel (approve providers, handle reports)

**Should-have:**
- Trip/itinerary creation with AI-assisted planning
- Adaptive replanning when an experience becomes unavailable
- Location-change notification ("you're in a new city")
- Provider opportunity insights (demand trend surfacing)

**Future / wow:**
- Conversational natural-language search interface
- Real-time availability sync with providers
- B2B integration layer (hotels/travel agencies consuming the recommendation API)
- Personalization that improves from the Interaction event log over time

---

## 9. What "production-ready" actually requires beyond code

A judge or a real engineering team will look for these, so the doc should state them explicitly even if not fully built for the hackathon:

- **CI/CD** with automated tests gating deploys (unit tests on the scoring engine are especially high-value — they're pure functions, easy to test exhaustively)
- **Staging environment** separate from production, with synthetic/seed data only
- **Backup & disaster recovery** plan for the primary database (point-in-time recovery)
- **Incident response runbook** (who gets paged, how a data breach is disclosed — required under DPDP Act)
- **Load testing** on the recommendation engine before claiming it "scales" — this is where most marketplace demos quietly lie
- **Versioned API** (`/v1/...`) from day one, so ranking algorithm changes don't break existing clients

---

## 10. Summary

The defensible, "company-ready" story is: a **deterministic, testable, explainable recommendation core** with AI strictly confined to a reasoning/phrasing layer that never has direct data access or decision authority, built on PostGIS for correct geo-search, with security controls mapped explicitly to marketplace-specific threats (fake listings, location privacy, review fraud, prompt injection) rather than generic boilerplate — and a location dataset strategy that starts with legitimately-sourced curated/open data and grows through provider self-registration, not scraping.

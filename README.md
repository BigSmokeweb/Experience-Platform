# Journi — Local Experience Intelligence Platform

> Discover authentic India. Thoughtfully presented.

Journi is a full-stack, AI-powered experience discovery and itinerary planning platform built for Maharashtra's hidden cultural, culinary, and adventure experiences. Travellers get personalised recommendations; local experience providers get a vetted marketplace to showcase their offerings.

**Built for:** Pillai College of Engineering — Student Hackathon 2026

---

## Live Deployments

| Service | URL |
|---|---|
| 🌐 Frontend (Vercel) | https://experience-platform-sigma.vercel.app |
| 🔌 Backend API (Render) | https://experience-backend.onrender.com/api/v1 |
| 📖 API Docs (Swagger) | https://experience-backend.onrender.com/api/docs |

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Monorepo Structure](#monorepo-structure)
- [Tech Stack](#tech-stack)
- [Key Features](#key-features)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Reference](#api-reference)
- [Frontend Pages & Routes](#frontend-pages--routes)
- [Backend Modules](#backend-modules)
- [Deployment](#deployment)
- [Scripts Reference](#scripts-reference)

---

## Overview

Journi operates as a **two-sided marketplace**:

- **Travellers** — create a profile with travel vibes and preferences, get an AI-curated list of experiences, build a day-by-day itinerary, and navigate with an interactive area map.
- **Providers** — register as a local experience provider, submit KYC documents, list experiences with pricing and availability, and manage their dashboard.

The platform is a **discovery and planning tool — it does not process real payments**. Commercial arrangements between travellers and providers happen directly and independently.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 14)                    │
│  Vercel · App Router · TypeScript · Tailwind · Three.js         │
│  Leaflet Maps · WebGL AI Concierge · Framer-style animations     │
└─────────────────┬───────────────────────────────────────────────┘
                  │  REST API (JWT Bearer)
┌─────────────────▼───────────────────────────────────────────────┐
│                       BACKEND (NestJS 10)                       │
│  Render · Express · Prisma ORM · Passport JWT · Swagger         │
│  Rate Limiting · Helmet · Redis Cache · Zod Validation          │
└──────────┬──────────────────────────────────┬───────────────────┘
           │                                  │
┌──────────▼───────────┐          ┌───────────▼───────────────────┐
│  Main DB (Supabase)  │          │  Media DB (Supabase)          │
│  PostgreSQL + Prisma │          │  Separate schema for media    │
│  Users, Experiences, │          │  assets & KYC documents       │
│  Providers, Reviews, │          └───────────────────────────────┘
│  Trip Sessions       │
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│  Redis (Upstash)     │
│  Rate limit windows  │
│  Session caching     │
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│  Gemini AI API       │
│  Recommendation      │
│  reasoning engine    │
└──────────────────────┘
```

---

## Monorepo Structure

```
Experience-Platform/
├── package.json              # Root workspace (npm workspaces)
├── render.yaml               # Render deployment config (backend)
├── vercel.json               # Vercel deployment config (frontend)
│
├── shared/                   # @experience-platform/shared
│   └── src/                  # Shared TypeScript types & DTOs
│
├── backend/                  # @experience-platform/backend
│   ├── prisma/
│   │   ├── schema.prisma          # Main DB schema
│   │   ├── schema.media.prisma    # Media/KYC DB schema
│   │   └── seed.ts               # Database seeder
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       └── modules/
│           ├── auth/              # JWT auth, refresh tokens, 2FA
│           ├── users/             # User profiles & preferences
│           ├── experiences/       # Experience CRUD & search
│           ├── providers/         # Provider onboarding & KYC
│           ├── recommendation-engine/  # AI-powered scoring
│           ├── ai-reasoning/      # Gemini AI integration
│           ├── trip-session/      # Itinerary session management
│           ├── reviews/           # Reviews & ratings
│           └── admin/             # Admin tools
│
├── frontend/                 # @experience-platform/frontend
│   └── src/
│       ├── app/              # Next.js App Router pages
│       │   ├── page.tsx                  # Home
│       │   ├── explore/                  # Experience collection
│       │   ├── cities/[slug]/            # City detail pages
│       │   ├── experiences/[id]/         # Experience detail
│       │   ├── trip/                     # Active journey planner
│       │   ├── auth/login|register/      # Authentication
│       │   ├── profile/traveler|provider/
│       │   ├── provider/portal/          # Provider dashboard
│       │   └── legal/                    # Privacy, Terms, Cookies, A11y
│       └── components/       # Shared UI components (21 components)
│           ├── Navbar.tsx                # Floating pill navbar
│           ├── Footer.tsx                # Full-nav footer
│           ├── FloatingChatSupport.tsx   # AI concierge chat
│           ├── FloatingRobotCanvas.tsx   # WebGL 3D model (Three.js)
│           ├── ItineraryBuilder.tsx      # Day-by-day planner
│           ├── TripAreaMap.tsx           # Leaflet area map
│           ├── CitiesLeafletMap.tsx      # Cities overview map
│           ├── NearbyCitiesDropdown.tsx  # Geolocation city radar
│           ├── CuratedDirectory.tsx      # Filterable experience grid
│           └── HeroParallaxVideo.tsx     # Homepage video hero
│
└── infra/
    └── docker-compose.yml    # Local Postgres + Redis
```

---

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS |
| 3D / WebGL | Three.js + React Three Fiber |
| Maps | Leaflet.js + OpenStreetMap / CartoCDN |
| Fonts | Google Fonts (Playfair Display, Cormorant Garamond, JetBrains Mono) |
| Animations | CSS + Intersection Observer (scroll-fade) |
| Deployment | Vercel |

### Backend
| Layer | Technology |
|---|---|
| Framework | NestJS 10 (Express) |
| Language | TypeScript 5 |
| ORM | Prisma 5 |
| Database | PostgreSQL (Supabase — dual schema) |
| Auth | Passport JWT (access + refresh tokens) + argon2 hashing |
| Cache | Redis (Upstash) via ioredis |
| AI | Google Gemini API |
| Validation | Zod + class-validator + class-transformer |
| Security | Helmet, @nestjs/throttler, sanitize-html |
| API Docs | Swagger / OpenAPI (@nestjs/swagger) |
| Deployment | Render |

---

## Key Features

### For Travellers
- 🎯 **AI-Personalised Recommendations** — Gemini-powered scoring adjusts results based on your vibe profile (budget, interests, travel style)
- 🗺️ **Interactive Itinerary Builder** — Day planning with cost estimates and route visualisation on a Leaflet map
- 📍 **Nearby Cities Radar** — Browser geolocation detects your nearest city and surfaces relevant experiences
- 💬 **Celene — AI Concierge** — WebGL 3D chat assistant powered by Gemini for trip Q&A
- 🔖 **Bookmarks** — Save experiences to your collection for later

### For Providers
- 📋 **Provider Portal** — List and manage experiences with rich metadata (pricing, availability, category, location)
- 🪪 **KYC Verification** — Document submission with a "Verified & Trusted" badge on approved listings
- 📊 **Provider Dashboard** — See booking interest signals and manage your experience catalogue

### Platform
- 🔐 **JWT Auth** with access + refresh token rotation
- 🛡️ **Rate limiting** — global (100 req/min), auth (5 req/min), search (30 req/min)
- 🌏 **City coverage** — Mumbai, Thane, Navi Mumbai, Powai, Panvel, Kalyan-Dombivli, Kanjur Marg
- 📂 **6 experience categories** — Food, Culture, Workshops, Adventure, Hidden Gems, Nightlife
- ♿ **Accessibility** — WCAG AA target: semantic HTML, keyboard nav, visible focus states, `prefers-reduced-motion` support

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- Docker (for local database)
- A Supabase project (or local Postgres)
- A Redis instance (Upstash free tier works)
- Google Gemini API key

### 1. Clone & Install

```bash
git clone https://github.com/BigSmokeweb/Experience-Platform.git
cd Experience-Platform
npm install
```

### 2. Start Local Infrastructure

```bash
npm run docker:up
# Starts Postgres on :5432 and Redis on :6379
```

### 3. Configure Environment Variables

```bash
cp backend/.env.example backend/.env
# Fill in the values — see Environment Variables section below
```

### 4. Run Database Migrations & Seed

```bash
npm run db:push        # Push Prisma schema to DB
npm run db:seed        # Seed experiences, cities, and demo data
```

### 5. Start Development Servers

```bash
# Terminal 1 — Backend (NestJS on :4000)
npm run dev:backend

# Terminal 2 — Frontend (Next.js on :3000)
npm run dev:frontend
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

All secrets live in `backend/.env`. See `backend/.env.example` for the full template.

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase transaction pooler URL (main DB) |
| `DIRECT_URL` | Supabase direct URL for Prisma migrations |
| `MEDIA_DATABASE_URL` | Supabase URL for media/KYC schema |
| `MEDIA_DIRECT_URL` | Supabase direct URL for media schema |
| `REDIS_HOST` | Redis host (e.g. Upstash endpoint) |
| `REDIS_PORT` | Redis port (default: `6379`) |
| `REDIS_PASSWORD` | Redis auth password |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens |
| `JWT_ACCESS_EXPIRATION` | Access token TTL (default: `15m`) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `JWT_REFRESH_EXPIRATION` | Refresh token TTL (default: `7d`) |
| `GEMINI_API_KEY` | Google Gemini API key for AI features |
| `AI_SERVICE_ENABLED` | Enable/disable AI reasoning (`true`/`false`) |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated |
| `STORAGE_ENDPOINT` | S3-compatible storage endpoint |
| `STORAGE_ACCESS_KEY` | Storage access key |
| `STORAGE_SECRET_KEY` | Storage secret key |
| `STORAGE_PUBLIC_BUCKET` | Bucket for public experience media |
| `STORAGE_PRIVATE_KYC_BUCKET` | Bucket for restricted KYC documents |
| `SESSION_ABANDON_HOURS` | Hours before inactive trip session is abandoned |

Frontend variables in `frontend/.env.local`:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |

---

## Database

Journi uses **two separate Prisma schemas** (dual-database pattern on Supabase):

### Main Schema (`prisma/schema.prisma`)
| Model | Purpose |
|---|---|
| `User` | Traveller and provider accounts |
| `TravelerProfile` | Preferences, vibe, budget, travel style |
| `ProviderProfile` | Business info, KYC status, verification |
| `Experience` | Listings with geo, category, pricing, availability |
| `Review` | Traveller reviews and ratings on experiences |
| `TripSession` | Active itinerary sessions per user |
| `TripStop` | Individual experience stops within a session |
| `Bookmark` | Saved experiences per user |

### Media Schema (`prisma/schema.media.prisma`)
Media assets and KYC document references — isolated for access control.

### Database Commands
```bash
npm run db:migrate      # Run Prisma migrations (dev)
npm run db:push         # Push schema without migration history
npm run db:seed         # Seed with demo data
npm run db:studio       # Open Prisma Studio (main DB)
npm run db:studio:media # Open Prisma Studio (media DB)
```

---

## API Reference

Full interactive docs: **https://experience-backend.onrender.com/api/docs**

### Base URL
```
https://experience-backend.onrender.com/api/v1
```

### Authentication
```
POST   /auth/register           Register a new user
POST   /auth/login              Login → returns access + refresh tokens
POST   /auth/refresh            Exchange refresh token for new access token
POST   /auth/logout             Invalidate refresh token
```

### Experiences
```
GET    /experiences             List/search (filter: city, category, vibe, budget)
GET    /experiences/:id         Get experience detail
POST   /experiences             Create experience (Provider role)
PATCH  /experiences/:id         Update experience (Provider role)
DELETE /experiences/:id         Delete experience (Provider role)
```

### Recommendations
```
GET    /recommendations         AI-scored personalised experience list
```

### Trip Sessions
```
GET    /trip-sessions           Get user's active session
POST   /trip-sessions           Create new trip session
POST   /trip-sessions/:id/stops Add a stop to session
DELETE /trip-sessions/:id/stops/:stopId  Remove a stop
```

### Providers
```
POST   /providers/onboard       Submit provider application + KYC docs
GET    /providers/profile       Get provider profile + verification status
```

### Reviews
```
POST   /reviews                 Submit a review for an experience
GET    /reviews/experience/:id  Get all reviews for an experience
```

### Health
```
GET    /health                  Liveness check (returns 200 OK)
```

---

## Frontend Pages & Routes

| Route | Page |
|---|---|
| `/` | Home — hero, curated experiences, itinerary teaser, cities |
| `/explore` | The Collection — full filterable experience grid |
| `/explore?cat=FOOD` | Pre-filtered by Food category |
| `/explore?cat=CULTURE` | Pre-filtered by Heritage & Culture |
| `/explore?cat=WORKSHOPS` | Pre-filtered by Artisan Workshops |
| `/explore?cat=ADVENTURE` | Pre-filtered by Outdoor & Adventure |
| `/explore?cat=HIDDEN_GEMS` | Pre-filtered by Off the Map |
| `/explore?cat=NIGHTLIFE` | Pre-filtered by Nightlife & Music |
| `/cities/[slug]` | City detail — experiences + Leaflet map |
| `/experiences/[id]` | Experience detail page |
| `/trip` | Active Journey — itinerary planner + area map |
| `/trip/[sessionId]` | Specific trip session |
| `/auth/login` | Log in |
| `/auth/register` | Sign up |
| `/profile/traveler` | Traveller profile & preferences |
| `/profile/provider` | Provider profile |
| `/provider/portal` | Provider dashboard — manage listings |
| `/legal/privacy-policy` | Privacy Policy |
| `/legal/terms` | Terms of Service |
| `/legal/cookies` | Cookie Policy |
| `/legal/accessibility` | Accessibility Statement |

---

## Backend Modules

| Module | Responsibility |
|---|---|
| `auth` | JWT auth, refresh token rotation, optional 2FA (TOTP/QR via otplib) |
| `users` | User CRUD, traveller preference updates |
| `experiences` | Experience CRUD, geo-proximity search, category + vibe filtering |
| `providers` | Provider onboarding, KYC document handling, badge verification |
| `recommendation-engine` | Multi-factor scoring: vibe match × proximity × rating × recency |
| `ai-reasoning` | Gemini API integration — natural language trip planning Q&A |
| `trip-session` | Itinerary session lifecycle: create, add/remove stops, abandon |
| `reviews` | Review submission, moderation, and rating aggregation |
| `admin` | Admin tools, catalogue export (xlsx), bulk data sync |

---

## Deployment

### Frontend → Vercel

Auto-deploys on push to `main`. Config in `vercel.json`.

```
Framework:    Next.js
Build:        npm run build --workspace=@experience-platform/shared
              && npm run build --workspace=@experience-platform/frontend
Output:       frontend/.next
```

### Backend → Render

Auto-deploys on push to `main`. Config in `render.yaml`.

```
Runtime:      Node.js
Build:        npm install
              && npm run build --workspace=@experience-platform/shared
              && npm run build --workspace=@experience-platform/backend
Start:        node backend/dist/main
Health check: GET /api/v1/health
Region:       Oregon (us-west-2)
```

---

## Scripts Reference

All commands run from the **monorepo root**:

```bash
# Development
npm run dev:frontend        # Next.js dev server → http://localhost:3000
npm run dev:backend         # NestJS watch mode → http://localhost:4000

# Building
npm run build               # Build shared + frontend (used by Vercel)
npm run build:all           # Build all workspaces including backend

# Database
npm run db:migrate          # Prisma migrate dev (main schema)
npm run db:push             # Prisma db push (main schema)
npm run db:seed             # Seed database with demo experiences & cities
npm run db:studio           # Prisma Studio → http://localhost:5555
npm run db:studio:media     # Prisma Studio for media schema

# Docker (local infrastructure)
npm run docker:up           # Start Postgres + Redis containers
npm run docker:down         # Stop containers

# Testing
npm run test                # Run all workspace tests
npm run test:cov            # Test coverage report

# Code quality
npm run lint                # ESLint across all workspaces
```

---

## Legal

This is a student hackathon project built at Pillai College of Engineering (2026).

- [Privacy Policy](https://experience-platform-sigma.vercel.app/legal/privacy-policy)
- [Terms of Service](https://experience-platform-sigma.vercel.app/legal/terms)
- [Cookie Policy](https://experience-platform-sigma.vercel.app/legal/cookies)
- [Accessibility Statement](https://experience-platform-sigma.vercel.app/legal/accessibility)

All policies are illustrative and do not carry legal force. The platform does not process real payments or handle production user data.

---

## Team

Built with ❤️ by the Journi team — Pillai College of Engineering, New Panvel, 2026.

---

*© 2026 Journi. All rights reserved.*

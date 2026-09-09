# Journi — Local Experience Intelligence Platform

> Discover authentic India. Thoughtfully presented.

Journi is a full-stack, AI-powered experience discovery and itinerary planning platform built for Maharashtra's hidden cultural, culinary, and adventure experiences. Travellers get personalised recommendations; local experience providers get a vetted marketplace to showcase their offerings.

---

## Live Deployments

| Service | URL |
|---|---|
| 🌐 Frontend (Vercel) | https://experience-platform-sigma.vercel.app |
| 🔌 Backend API (Render) | https://experience-backend.onrender.com/api/v1 |
| 📖 API Docs (Swagger) | https://experience-backend.onrender.com/api/docs |

---

## Overview

Journi operates as a **two-sided marketplace**:

- **Travellers** — create a profile with travel vibes and preferences, get an AI-curated list of experiences, build a day-by-day itinerary, and navigate with an interactive area map.
- **Providers** — register as a local experience provider, submit KYC documents, list experiences with pricing and availability, and manage their dashboard.

The platform is a **discovery and planning tool — it does not process real payments**. Commercial arrangements between travellers and providers happen directly and independently..

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

Built By Milind Sahu & Kunal Waghmare 

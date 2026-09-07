# Backend Service — Local Experience Intelligence Platform

Production-grade NestJS REST API with PostgreSQL (Supabase PostGIS), Redis, and isolated AI proxy architecture.

## Cloud Architecture
- **API Runtime**: Render (`https://experience-backend-k4aw.onrender.com`)
- **Database**: Supabase PostgreSQL 15 with PostGIS extensions
- **Frontend Client**: Vercel (`https://experience-platform-sigma.vercel.app`)

## Architecture Highlights
- **Role-based Authentication (RBAC)**: Traveler, Provider, and Admin roles.
- **Provider Security & Enforced MFA**: TOTP-based multi-factor authentication for providers.
- **Private KYC Storage**: Short-lived (15 min) signed URLs for KYC document verification with zero public bucket access.
- **Spatial Geo-Search**: PostGIS `geography(Point,4326)` for sub-millisecond radius search and distance ordering.
- **Deterministic Recommendation Engine**: Isolated 2-layer scoring (Hard Filters + Configurable Weighted Scoring), 100% unit-tested, zero LLM dependency.
- **Stateless AI Phrasing Proxy**: Secure natural-language "Why this" explanations that never have database or ranking authority.
- **DPDP Act Compliance**: Coarse location anonymization (never logs or stores raw GPS history in recommendation logs).
- **Security Guardrails**: Rate limiting (Redis token bucket), strict Zod schemas, UGC input sanitization (DOMPurify/sanitize-html), Helmet CSP, and IDOR protection.

## Setup & Local Development
1. Configure `.env` with your Supabase connection strings (`DATABASE_URL` and `DIRECT_URL`).
2. Run database synchronization: `npx prisma db push`.
3. Run unit tests: `npm run test`.
4. Start dev server: `npm run start:dev`.

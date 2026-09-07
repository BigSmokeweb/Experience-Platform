# Build Prompt — Register Page + Password Hashing + Supabase Storage (Hackathon Scope)

Give this to your coding agent. This is the simplified, hackathon-scoped version — just what's needed for a working, secure register flow that stores users in Supabase Postgres. Skip anything from earlier auth docs not mentioned here (MFA, OAuth, magic links) unless you already built them — this is the minimum solid version.

---

We're using **Supabase only as our Postgres database** (via the connection string / Prisma), not Supabase's built-in Auth product. So password hashing and user creation are handled by our own backend code, not by Supabase automatically. Build accordingly.

## 1. Database — `User` table

If not already present, add/confirm this in `schema.prisma`:

```prisma
model User {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email        String   @unique
  passwordHash String   @map("password_hash")
  role         Role     @default(TRAVELER)   // TRAVELER | PROVIDER | ADMIN
  name         String?
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("users")
}

enum Role {
  TRAVELER
  PROVIDER
  ADMIN
}
```

Run the migration against the Supabase Postgres connection string already configured in `.env` (`DATABASE_URL`):
```
npx prisma migrate dev --name add_user_auth
npx prisma generate
```

**Never store the raw password anywhere** — only `passwordHash` goes in the database. Confirm no other field, log line, or table accidentally captures the plaintext password.

## 2. Password hashing

Use **argon2** (`npm install argon2` in `/backend`):

```typescript
import * as argon2 from 'argon2';

// On register:
const passwordHash = await argon2.hash(plainPassword);

// On login:
const isValid = await argon2.verify(user.passwordHash, plainPasswordAttempt);
```

- If argon2 has native-binding install issues in your environment, `bcrypt` (`npm install bcrypt`, 10-12 salt rounds) is an acceptable fallback for hackathon scope — just pick one and use it consistently, don't mix both.
- Never write your own hashing function. Never use plain MD5/SHA256 alone for passwords (those are fast hashes, not designed for passwords, and are crackable at scale).

## 3. Register endpoint

`POST /auth/register` in `/backend/src/modules/auth/auth.controller.ts` (or wherever the existing auth module lives):

```typescript
// Request body (validate with Zod/class-validator):
{
  email: string;      // valid email format
  password: string;   // minimum 8 characters for hackathon scope
  name?: string;
  role: 'TRAVELER' | 'PROVIDER';
}
```

Backend logic:
1. Validate input shape (email format, password length).
2. Check if a user with that email already exists — if so, return a clear error ("An account with this email already exists"), do not create a duplicate.
3. Hash the password with argon2/bcrypt.
4. Create the `User` row via Prisma with `passwordHash`, `email`, `role`, `name`.
5. Return a success response — either issue a JWT immediately (auto-login after register, simplest for a hackathon demo) or just confirm creation and redirect to login, whichever is simpler for your timeline. **Do not return `passwordHash` in the response.**

## 4. Login endpoint (minimum version)

`POST /auth/login`:
1. Look up user by email.
2. If no user found, return a generic error ("Invalid email or password") — don't reveal whether the email exists.
3. If found, `argon2.verify()` the submitted password against `passwordHash`.
4. If valid, issue a JWT (can be a single access token for hackathon simplicity — full refresh-token rotation is a nice-to-have, not required to demo this well).
5. If invalid, same generic error as step 2.

## 5. Register page (frontend)

Reuse the split-screen auth layout already built for login (`AuthSplitLayout`, same visual style — cream background, sage/teal accent, serif headline). Fields:
- Name
- Email
- Password (with the lightweight strength bar already planned)
- Role toggle (Traveler / Provider) — same segmented control component as login

On submit: call `POST /auth/register`, handle the "email already exists" error inline under the email field, and on success either auto-login and redirect, or redirect to the login page with a "check your email to log in" style confirmation — match whichever behavior the backend implements.

## 6. Environment / Supabase connection

- Confirm `DATABASE_URL` in `.env` points to the Supabase connection string (found in Supabase project settings → Database → Connection string), using the **pooled connection** string if using Prisma with serverless/edge deployment, or the direct connection for a standard long-running server.
- Never commit the real `.env` — confirm `.env` is in `.gitignore` and only `.env.example` (with placeholder values) is committed.
- If deploying the backend somewhere (Render/Railway/Vercel), set `DATABASE_URL` as an environment variable there, not in code.

## What to skip for now (explicitly out of scope for this pass)

- MFA, OAuth, magic links — not needed for a working hackathon demo of core registration/login.
- Refresh token rotation — a single reasonably-short-lived JWT (e.g., 1 hour) is fine for demo purposes; don't spend hackathon time building full rotation unless time allows later.
- Email verification — skip unless you have time; note it as a "future work" item in your pitch instead.

## Confirm before starting

1. Whether you want auto-login-after-register or redirect-to-login-with-confirmation — pick one so the frontend and backend agree.
2. Whether argon2 installs cleanly in your environment — if not, confirm switching to bcrypt.
3. That `DATABASE_URL` is correctly pointed at Supabase and the migration runs successfully against it before writing any more code.

# Plan: Real Ratings & Live Operating Status on Experience Cards

**Branch**: `main`  
**Status**: Active — Pending User Approval  

## Goal
Show authentic Google Review ratings on every experience card and display an auto-updating, client-side green **"Open"** or red **"Closed"** status badge in the bottom-right corner based on the user's local clock and the dataset operating schedule (`openingTime`, `closingTime`, `operatingHours`, `closedDays`).

---

## Acceptance Criteria
- [ ] **Accurate Rating Display**: Experience cards display `reviewStars` (or `googleReviewStars` / `ratingAverage` fallback), formatted to two decimal places (e.g., `5.00`, `4.80`, `4.40`), matching the top-right badge style in the screenshot.
- [ ] **Automatic User Time Detection**: The user's local browser timezone, day of week, and time (e.g., IST) are automatically detected via standard `Date` API without requiring manual timezone configuration.
- [ ] **Live "Open" / "Closed" Status**:
  - Displays green **"Open"** (with live indicator dot) when user's current time falls inside the spot's operating window and today is not a closed day.
  - Displays red **"Closed"** when current time is outside the operating window or today is in `closedDays`.
  - Accurately handles **overnight/late-night hours** (e.g., `18:00 - 01:00`, `12:00 - 03:00` crossing midnight).
  - Accurately handles **"Open 24 hours"** spots (`00:00 - 23:59`).
  - Accurately handles **closed days** (e.g., `"Monday"`, `"Tuesday, Thursday"`, `"None"`).
- [ ] **Zero Hydration Mismatches**: Renders safely in Next.js App Router without SSR/CSR hydration errors.
- [ ] **Design Match**: The bottom-right corner of the card cleanly houses the status tag opposite to `Est. Spend`, matching Journi's clean editorial aesthetic.

---

## Slices

### Slice 1: Pure Logic Engine — `operating-hours.ts` & Unit Tests
- **Class**: Behavior change
- **Value**: Deterministic, reusable function `getOperatingStatus(experience, currentDate?)` that evaluates whether an experience is currently open or closed.
- **Path**: `frontend/src/lib/operating-hours.ts` -> Pure date & time parsing logic.
- **Key Edge Cases Covered**:
  1. Standard daytime: `10:00 - 23:00` (e.g., 14:00 is Open, 09:00 is Closed).
  2. Late-night crossing midnight: `18:00 - 01:00` (e.g., 22:00 is Open, 00:30 is Open from previous evening session, 02:00 is Closed).
  3. Midnight closing: `15:00 - 00:00` (treated as open until 24:00).
  4. 24-Hour spots: `Open 24 hours` or `00:00 - 23:59` (Open every day except closedDays).
  5. Multi-day closure strings: `"Monday"`, `"Tuesday, Thursday"`, `"None"`, comma-separated lists.
- **Acceptance Criteria**: Comprehensive test cases cover normal hours, overnight hours, closed days, and 24h venues.

---

### Slice 2: Data Pipeline & Type Flow Synchronization
- **Class**: Behavior change
- **Value**: Ensure all 6 updated dataset fields flow seamlessly from `catalog-dataset.json` (and backend catalog API) to the UI components.
- **Files**:
  - `frontend/src/app/page.tsx`: Map `reviewStars`, `googleReviewStars`, `openingTime`, `closingTime`, `operatingHours`, `closedDays` in `getAllExperiences()`.
  - `frontend/src/app/explore/page.tsx`: Same mapping in `getAllExperiences()`.
  - `frontend/src/app/api/experiences/route.ts`: Normalize and pass through these fields in API responses.
  - `backend/src/modules/experiences/experiences.service.ts`: Expose these fields in `catalogExperiences` mapped output.
- **Acceptance Criteria**: Calling `GET /api/experiences` or loading homepage passes all timing and rating fields to cards.

---

### Slice 3: Card Component UI Update (`CuratedDirectory.tsx`)
- **Class**: Behavior change
- **Value**: Render the updated legit ratings in the top-right pill and the green "Open" / red "Closed" badge in the bottom-right corner.
- **File**: `frontend/src/components/CuratedDirectory.tsx` (`ExperienceCard`).
- **UI Details**:
  1. **Top-right Star Badge**:
     ```tsx
     const ratingVal = exp.reviewStars ?? exp.googleReviewStars ?? exp.ratingAverage ?? 4.8;
     <span>{Number(ratingVal).toFixed(2)}</span>
     ```
  2. **Bottom-right Status Section** (opposite `Est. Spend`):
     ```tsx
     <div className="text-right flex flex-col items-end">
       <span className="text-[9px] font-mono uppercase tracking-widest text-[#555E5A] block mb-0.5">
         Status
       </span>
       <div className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold ${
         status.isOpen ? 'text-emerald-700' : 'text-rose-600'
       }`}>
         <span className={`w-2 h-2 rounded-full ${
           status.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
         }`} />
         <span>{status.isOpen ? 'Open' : 'Closed'}</span>
       </div>
     </div>
     ```
  3. **Auto-refresh**: Periodically updates every 60 seconds so status transitions seamlessly without page reloads.
- **Acceptance Criteria**: Cards on homepage and explore page show the new ratings and green Open / red Closed status tag.

---

### Slice 4: Experience Detail Page & Verification
- **Class**: Behavior change
- **Value**: Ensure `/experiences/[id]` also reflects the updated ratings and live operating hours tag.
- **Files**:
  - `frontend/src/app/experiences/[id]/page.tsx`
- **Acceptance Criteria**: Detail view displays the exact same rating and hours badge; full Next.js compilation succeeds.

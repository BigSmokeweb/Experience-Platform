# Agent Task: Update Experience Prices on Journi

## What to do

You have access to the Journi platform (Next.js frontend, NestJS backend, PostgreSQL via Prisma).

Your only job is to **update the price/budget field** of each experience on the platform to match the values in the Excel dataset (`Experiences_Price_Ratings.xlsx`, sheet: **All Experiences**).

Do not touch ratings. Do not touch categories. Do not touch any other field.

---

## Dataset

The Excel sheet has 137 experiences. The relevant columns are:

- `Local Experience` — the experience name (use this to find the matching listing)
- `Budget` — the correct price to set

---

## Steps

1. Read the full Excel sheet and store each experience name + its `Budget` value.

2. Go through every experience listing on the website (at `/explore` or via the backend API at `/api/v1/experiences`).

3. For each listing, find its match in the Excel sheet by experience name (case-insensitive, trim spaces).

4. If matched — update the price/budget field to the exact value from the `Budget` column.

5. If no match found — skip it, log `[SKIP] Experience name — not found in dataset`.

---

## Logging

Log one line per experience:

```
[UPDATED]  Karnala Fort trek         | Price set to: ₹60/person
[NO CHANGE] Marine Drive sunset walk | Price already correct: Free
[SKIP]     Some Other Place          | Not found in dataset
[ERROR]    Dharavi walk              | Could not update — manual review needed
```

---

## Rules

- Only update the **price / budget** field. Nothing else.
- If the `Budget` value in the Excel sheet is blank for an entry, leave that listing unchanged and log `"Dataset value missing — skipped"`.
- Do not delete any listing.
- Do not create any new listing.
- Process one at a time.

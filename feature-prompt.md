# Feature Prompt: "Make a Trip" Entry Point

## Goal
Add a new call-to-action on the **Ganesh Utsav Pandal Trails & Celebrations** seasonal collection page (see reference screenshot 1) that lets a user start building a multi-stop itinerary from the seasonal spots listed on that page.

## 1. Placement & Trigger
- Add a button/icon labeled **"Make a Trip"** positioned directly **above the yellow horizontal divider line** that currently sits under the page subtitle/description, and above the row of experience cards (Thanyacha Raja, Tembhi Naka Ganesh Mandal, Kanjurmarg East Ganesh Mandals, etc.).
- The button should be visually consistent with existing header buttons (e.g. "Plan Journey", "Partner With Us") — pill-shaped, clear icon + label, same font/weight as the rest of the UI.
- On click, it should navigate the user into the itinerary-builder flow described below.

## 2. Destination Screen
- Clicking "Make a Trip" should open a screen matching the look, layout, and behavior of the **"Curate Your Journey"** page (see reference screenshot 2):
  - Left column: **"Candidate Stops"** — a scrollable list of recommended stops with thumbnail, category tag, title, distance, duration, price, an "Explore Details" link, and "Dismiss" / "+ Add Stop" actions.
  - Right column: **"Curated Route"** — shows the running list of added stops (or an empty state: "No stops added yet"), a live map with turn-by-turn / driving-transit-walk mode toggles, a "Locate Me" control, and an "Open in Google Maps" link.
  - Top of page: "Sequential Route Atelier" eyebrow label, "Curate Your Journey" heading, short description, a step indicator ("Step 1"), stop counter, and a "Finalize" button.

## 3. Data Source Requirement
- The **candidate stops shown must be pulled from the same seasonal spot dataset** as the source page (i.e., the Ganesh Utsav / seasonal collection results the user was already browsing), not a generic or unrelated dataset.
- Preserve each stop's existing metadata (image, category tag, distance, duration, price/free tag) when carrying it into the Candidate Stops list.

## 4. Non-Functional Requirements
- **UI-only feature**: no backend/business logic changes beyond wiring navigation and passing the seasonal-spot data through; do not introduce new data storage, auth, or third-party calls beyond what's already used for maps/navigation.
- **Security**: no new attack surface — sanitize any dynamic content rendered into the page, avoid inline script injection, validate/escape any URL or map parameters, and do not expose internal IDs or unvalidated user input in the URL/query string.
- **Quality bar**: pixel-consistent with the two reference screenshots, responsive across breakpoints, accessible (proper labels/alt text, keyboard-navigable buttons), and free of console errors or broken states (including the "no stops added yet" empty state).
- Thoroughly test the add/dismiss/finalize interactions and the map rendering before considering this complete.

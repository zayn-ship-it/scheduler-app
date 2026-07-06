# Business Requirements Specification — Client Schedule App

## 1. Purpose & Background

Project schedules are currently maintained manually in a Google Sheet (see the "RunJumpFly" reference document used to design this app). Each project has a header/meta block, fixed Terms & Conditions, a deliverables table, and a week-by-week grid tracking five categories of activity per day (agency, suppliers, internal team, client, and staff leave), plus a spanning "phase" bar and manually-noted public holidays.

This process is slow to maintain, easy to break visually when edited, and has no way for a client to see a live, always-current view — schedules are shared as static exports (PDF/spreadsheet) that go stale the moment something changes.

**Goal:** build a purpose-built web application that:
- Gives the agency a fast, visual, drag-and-drop way to build and adjust a project schedule.
- Gives each client a clean, read-only, always-current live view reachable by a URL, replacing static exports.

## 2. Scope

### Phase 1 (this build)
- Frontend-only application (React + shadcn/ui + Tailwind), runnable locally via `npm run dev` — no paid services, no real backend.
- Data is stored in the browser's localStorage (per-browser, per-device).
- Back office is protected by a single hardcoded password (`1234`) — a placeholder, not real security.
- "Export to Google Sheet" is a stub button that shows a "coming soon" message; no real export happens yet.
- South African public holidays are a static, manually-maintained dataset (no live API).

### Phase 2 (future, not built now)
- Real Google OAuth login for back office access.
- Real Google Sheets export via the Google Sheets API.
- A real backend/database so schedules are accessible from any device/browser via their public link.
- Deployment to low-cost hosting (e.g. static hosting for the frontend, a lightweight API/database if needed).
- Possible print/PDF export matching the original weekly-page spreadsheet layout.

## 3. User Roles

- **Admin** — agency staff with the back office password. Can create/edit/delete projects, manage people, and build out each project's schedule.
- **Client** — anyone with a project's public link. Read-only access to that project's schedule; no login required, no edit capability.

## 4. Functional Requirements

### 4.1 Back Office
- Password gate (`1234`) protects all back office routes for the current browser session.
- **Project management:** create, view, edit, and delete projects. Each project has its own independent schedule.
- **Date range:** admin sets a project's start and end date on creation, and can change either date at any time afterward. The schedule view only displays this date range — never a full year or unrelated dates.
- **Header/meta fields per project:** Project Code, Client, Date, Schedule Version, Project Name, Brand, Project Manager, Producer.
- **Terms & Conditions:** an editable text block per project, pre-filled with a standard default so it doesn't need retyping each time.
- **Deliverables table:** editable rows of Identifier / Description / Qty.
- **People management:** add and remove people (name + role) who can be referenced in the schedule (primarily for the Leave Tracker).
- **Export to Google Sheet:** button present in the UI; shows "coming soon" in Phase 1.

### 4.2 Schedule Grid
- Five lanes per project, matching current practice: **RJF (Agency)**, **Suppliers**, **Internal**, **Client**, **Leave Tracker**.
- A spanning **Phase** bar showing project phases (e.g. "Web Design", "Web Development") across the days they cover.
- A **Public Holiday** row, auto-populated from the South African holidays dataset, including the agency's own multi-day office-closure periods (e.g. the December/January shutdown).
- **Schedule blocks** — the core building unit, placed into a lane on one or more consecutive days. Each block has: title, sub-heading, date range, time (free text, e.g. "16:00–17:00"), online/offline indicator, notes (one or more lines), an assigned colour, and optionally a linked person.
- Blocks are **resizable** by dragging their left or right edge, changing the date range they cover.
- Blocks are **movable** by dragging their body: the block shifts to new dates while keeping the same length — e.g. if a client causes a delay, the whole block (and everything in it) can be dragged forward in one motion rather than rebuilt.
- The grid only ever displays the project's selected date range, shown as a single continuous horizontal (scrollable) timeline — not a full calendar year.

### 4.3 Public View
- Each project has a live, read-only view reachable via its own link.
- Shows the same header/meta info, deliverables, Terms & Conditions, and full schedule grid (all lanes, phase bar, holidays, blocks) as the back office — with no editing controls of any kind.

## 5. Data Model Summary

- **Project** — id, project code, client, date, schedule version, project name, brand, project manager, producer, start date, end date, terms & conditions text, list of deliverables, list of schedule blocks, list of phase-bar entries, created/updated timestamps.
- **Deliverable** — id, identifier, description, quantity.
- **Schedule Block** — id, lane (Agency/Suppliers/Internal/Client/Leave Tracker), title, sub-heading, start date, end date, time (free text), online/offline flag, notes (list), colour, linked person (optional).
- **Phase Bar Entry** — id, label, start date, end date, colour.
- **Person** — id, name, role.
- **Holiday** — date, name, type (public holiday vs. agency office-closure), used to auto-populate the Public Holiday row.

## 6. Non-Functional Requirements

- Must run entirely locally for testing (`npm install && npm run dev`) before any hosting decision is made — no paid services required for Phase 1.
- Every source file carries a top-of-file comment explaining its purpose; non-obvious logic (especially date math and drag/resize behaviour) is explained with inline comments, since this codebase should be understandable to a non-engineer stakeholder reviewing it later.
- Although Phase 1 has no backend, the data-access code is written as a single, swappable layer so that a real backend can replace localStorage in Phase 2 without rewriting the UI.
- Hosting target for later phases should be low-cost (e.g. static hosting); Phase 1 architecture avoids assumptions that would lock in an expensive backend.

## 7. Known Phase 1 Limitations

- **No real authentication.** The `1234` back-office password is a placeholder for testing only and must not be relied on for real client data.
- **No cross-device sharing yet.** Because data lives in the browser's localStorage, a project's public link only works on the same browser/device where the project was created. Real link-sharing to clients requires the Phase 2 backend.
- **No real Google Sheets export or Google login yet** — both are stubbed/deferred to Phase 2.
- **South African public holidays require manual yearly updates** — there is no live holiday API in Phase 1.

## 8. Model/Tooling Recommendation

For building this application with Claude Code, **Sonnet** is recommended for the bulk of the work — scaffolding, CRUD forms, the data layer, static rendering, and routing are well-specified and straightforward, where Sonnet is fast and cost-effective. **Opus** is worth reserving specifically for the drag/resize/move interaction logic (converting pointer movement into date changes, clamping, and distinguishing an edge-drag from a body-drag) if the first implementation attempt doesn't behave correctly after a couple of iterations — that is the one piece of genuinely tricky spatial/state reasoning in this build. **Fable** is not suited to this task, as it is oriented toward narrative/creative writing rather than structured application code.

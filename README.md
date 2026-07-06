# Client Schedule App (Phase 1 — Frontend Only)

A drag-and-drop client project scheduler, built to replace a manual Google
Sheet process. See [BRS.md](./BRS.md) for the full requirements, scope, and
Phase 1/Phase 2 split.

**This phase is frontend-only.** There is no backend and no real
authentication. All data is stored in your browser's `localStorage`, and the
back office is protected by a hardcoded placeholder password. It is meant to
be run locally to test the UX before any hosting/backend work happens.

## Running it locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

- **Back office:** go to `/backoffice` and enter the password `1234`.
- **Public client view:** each project has a "Copy Client Link" button in the
  project list — this only works in the *same browser* you created the
  project in, since there's no backend yet (see BRS.md "Known Limitations").

## What's here

- `src/lib/storage/` — the data model (`types.ts`) and the only code that
  reads/writes localStorage (`projectRepository.ts`, `peopleRepository.ts`).
  Every other file goes through these instead of touching `localStorage`
  directly, so a real backend can replace it later without UI changes.
- `src/data/saPublicHolidays.ts` — static South African public holiday
  dates (manually maintained, see the comment at the top of that file for
  how to update it each year).
- `src/auth/` — the temporary password gate. Clearly marked as insecure;
  replace with real Google OAuth in Phase 2.
- `src/features/backoffice/` — admin pages: project list, project
  create/edit form, people manager.
- `src/features/schedule/` — the schedule grid itself: day headers, the
  public holiday row, the phase bar, the five lanes, and the draggable/
  resizable block component (`ScheduleBlock.tsx` + `useBlockDragResize.ts`).
- `src/features/public/PublicScheduleView.tsx` — the read-only page a client
  sees via their link.

## Tech stack

Vite + React + TypeScript, Tailwind CSS, shadcn/ui components, React Router,
and plain Pointer Events for the drag/resize interactions (no drag-and-drop
library needed for that part — see the comment at the top of
`useBlockDragResize.ts` for why).

## Not built yet (Phase 2)

- Real Google OAuth login
- Real Google Sheets export (the button in the back office is a stub)
- A real backend/database, so public schedule links work across devices
- Deployment/hosting

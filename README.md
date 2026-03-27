# Orbit

Warm, lightweight personal relationship manager MVP built with Expo + React Native.

## What works now

- Expo + TypeScript project configured for Expo Router
- Tab/navigation shell for Home, People, and Settings
- Real Add Contact flow that validates input and saves to SQLite
- Real Edit Contact flow for name, nickname, relationship, cadence, and notes
- Pause/unpause cadence and archive/unarchive actions persisted to SQLite from contact detail
- Simple snooze flow for 3 days, 1 week, or 2 weeks from contact detail, backed by SQLite via `cadence_snoozed_until`
- Real People screen backed by repository data, sorted by urgency and filterable by due state
- Home aggregates for overdue, due today, and upcoming contacts with live counts and previews
- Real interaction logging for one or more contacts in a single save flow
- Cadence recalculation on interaction save for `last_interaction_at`, `next_due_at`, `cadence_snoozed_until`, and `due_state` across every selected contact
- Contact detail screen reflecting updated cadence fields, status, snooze state, and recent interaction history after saves
- Local notification scheduling for active due contacts with one scheduled reminder per person
- Reminder resync after app startup, interaction save, cadence edit, pause/unpause, archive/unarchive, and snooze changes
- SQLite foundation with initial migration, repository/service layers, and development seed data
- Basic theme, constants, date helpers, validation, types, and Zustand UI store

## Architecture choices

- SQLite is the source of truth
- Zustand is limited to UI state only
- Screen components stay thin; business logic belongs in services/repositories/helpers
- Effective due dates are derived from base cadence plus optional snooze windows for fast urgency-based list queries
- Home aggregates are built from repository-backed SQLite reads on focus/navigation
- Notifications are intentionally simple: Orbit keeps one local reminder scheduled per active contact instead of repeated nags
- `interaction_contacts` is used directly for shared interaction history and multi-person logging

## Project structure

```text
app/
  _layout.tsx
  (tabs)/
    _layout.tsx
    index.tsx
    people.tsx
    settings.tsx
  contact/
    [id].tsx
    edit/[id].tsx
    new.tsx
  interaction/
    new.tsx
features/
  contacts/
  interactions/
  reminders/
  settings/
db/
  client.ts
  schema.ts
  migrations/
  repositories/
lib/
  constants.ts
  dates.ts
  reminders.ts
  theme.ts
  validation.ts
store/
  ui.ts
types/
  models.ts
```

## Run it

```bash
cd orbit
npm install
npm run start
```

Then press:
- `i` for iOS simulator
- `a` for Android
- `w` for web

You can also run:

```bash
npm run ios
npm run android
npm run web
npm run typecheck
```

## Core loop to test

1. Start the app with `npm run start`
2. On device/simulator, allow notification permissions when Orbit asks
3. Open Home to see overdue, due today, and upcoming aggregates from live data
4. Open People to see active contacts sorted by urgency
5. Add a new person, then open that person and edit their cadence/notes
6. Snooze a due person for 3 days, 1 week, or 2 weeks and confirm:
   - their card shows `snoozed`
   - their next due date moves forward in People and Home
   - Home counts update because snoozed contacts become upcoming until the snooze expires
7. Clear the snooze and confirm the person returns to the correct due bucket
8. Pause or archive them from detail, then navigate back to Home or People to confirm the lists refresh on focus and reminders are suppressed
9. Log an interaction for one or multiple people and confirm the due state, last-contact timing, snooze clearing, and next reminder timing update again
10. Open a contact detail screen and confirm the recent activity card reflects solo and shared interactions

## What this block covers

- Local Expo notifications for due contacts
- SQLite-backed snooze behavior beyond pause
- Rescheduling after relevant contact and interaction mutations
- Reminder suppression for paused and archived contacts

## Recommended next implementation sequence

1. Add a lightweight in-app way to inspect notification permission state and deep-link to system settings if needed
2. Decide whether Orbit should support custom snooze durations or only the three simple presets
3. Revisit imports/sync only after the offline reminder loop feels solid

## Notes

- Seed data only runs in development and only when the contacts table is empty.
- The UI remains intentionally warm and simple; this milestone focuses on the core save/query/recalculate/remind loop.
- Expo local notifications require a native build path for full verification; web will not behave like iOS/Android here.
- Deferred on purpose: sync, auth, import flows, AI, widgets, advanced analytics, elaborate UI polish.

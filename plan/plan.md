# Deploy `usp-india-final`

Take the uploaded project archive, get it running inside this platform's preview
environment, verify it works end to end, and publish it to a live URL.

## Who it's for
The owner of the `usp-india-final` project who wants their existing, finished
application running on a public, shareable URL.

## Core features and experience
- The uploaded archive is unpacked and its contents reviewed to understand what
  the app is, what it does, and what it needs to run.
- The app is fitted into this platform's hosting setup so every part of it starts
  and stays running.
- Whatever the app already does — its pages, screens, and features — is preserved
  exactly as built. Nothing in the product experience is changed, redesigned, or
  removed.
- Once running in preview, the app is checked to confirm the main screens load and
  the core actions work, then it is published to a live URL.

## User flow
1. The archive is opened and its structure identified (frontend, backend, data,
   configuration).
2. The code is placed into the platform so the frontend and backend run as
   services, with internal addresses and database connection wired to the
   platform's environment settings.
3. The app is started in preview and its main flows are exercised to confirm it
   behaves the way it was built to.
4. Anything that stops it from running in this environment (addresses, ports,
   connection strings, missing setup) is corrected — without changing what the app
   does for its users.
5. The app is published and a live URL is returned.

## UI/UX feel
Unchanged. The look, layout, and interactions stay exactly as they are in the
uploaded project. This is a deployment, not a redesign.

## Implementation phases

**Phase 1 — MVP (built now): Get it live.**
Unpack the archive, adapt only what's required for it to run on this platform,
confirm the main flows work in preview, and publish to a live URL.

**Phase 2 — Hardening (later).**
Wire up any third-party keys or integrations the app expects (payments, auth,
email, etc.) with real credentials, and seed or connect real data if needed.

**Phase 3 — Enhancements (later).**
Any new features, content updates, or design changes requested after the app is
live.

## Assumptions
- The clarifying questions were skipped, so the following are assumed and can be
  corrected after the archive is inspected:
- The app is already built and functionally complete; the goal is deployment, not
  new feature work.
- The product experience should be kept as-is; only changes strictly needed to run
  and deploy on this platform will be made.
- If the app uses a database, it will be connected to the platform's provided
  MongoDB. A different database engine, if present, may need to be swapped or
  externally hosted — flagged once confirmed from the code.
- If the stack differs from the platform's native frontend/backend setup, the app
  is adapted to run here; parts that are fundamentally incompatible will be
  flagged before proceeding.
- No API keys, secrets, or paid third-party integrations are needed for a first
  live version. If the code requires them to function, those will be requested
  before or shortly after the first deploy.
- The exact contents and stack of the archive are unknown until it is unpacked;
  this plan will be refined the moment its structure is known.

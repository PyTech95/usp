# USP India website — handover (private preview)

## Stack
- React 19 (CRA/craco) public site + admin at `/admin`; FastAPI backend (`/api/*`); MongoDB; Emergent object storage for media.
- Public pages are **server-rendered by FastAPI** (`backend/ssr.py`, endpoint `/api/ssr?path=`) and served at the real public URLs by `frontend/src/setupProxy.js`: every HTML GET of a public route returns full content, title, description, canonical, robots, Open Graph and JSON-LD, with **real 301/404 status codes**. React then takes over in the browser. Publishing updates SSR output, sitemap and listings instantly (they read the database live).
- **Production note:** `setupProxy.js` runs in the dev server used by this preview. A production host must route public HTML requests to `/api/ssr?path=<url>` (and `/sitemap.xml`, `/robots.txt` to `/api/...`) and set `SSR_SCRIPT_TAGS` to the built bundle filenames (from `build/asset-manifest.json`). Until then, a static build would fall back to a client-rendered shell.

## Environment variables (no secrets in code)
backend/.env: `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS` (comma list), `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (owner seed; changing it resets the owner hash on restart), `SITE_URL` (canonical production origin, https://www.uspindia.org), `PREVIEW_URL` (used in invite/reset links), `EMERGENT_LLM_KEY` (object storage), `SSR_SCRIPT_TAGS`.
frontend/.env: `REACT_APP_BACKEND_URL`, `SSR_BACKEND_ORIGIN` (internal backend for SSR proxy).

## Storage and backup
- Database: MongoDB collections `pages, notes, media, revisions, comments, redirects, register, settings, enquiries, users, tokens, login_attempts`.
- Media: originals at `uspindia/originals/<id>/v<n>.<ext>` (untouched, never public), display derivatives at `uspindia/display/...` (EXIF/GPS stripped, max 1600px, never upscaled). Storage has no delete API: deletion is a soft-delete flag and public URLs stop working immediately.
- Backup: Admin > Settings > "Download backup" (JSON of all content & metadata, no password hashes). Full DB backup: `mongodump --uri "$MONGO_URL" --db "$DB_NAME" --out backup/`; restore: `mongorestore --uri "$MONGO_URL" --nsInclude "$DB_NAME.*" backup/`. Media objects persist in object storage at the recorded paths.
- Re-import the supplied photo set (idempotent): `cd backend && python scripts/import_assets.py /app/assets_src/imgs`.

## Security
bcrypt passwords; httpOnly Secure SameSite=Lax cookies; 60-min access + 7-day refresh; CSRF double-submit header on every cookie-authenticated write + Origin check; login lockout (5 tries/15 min); invitation (72h) and reset (1h) one-time hashed tokens; server-side role checks on every endpoint; HTML sanitised (nh3 allow-list); uploads validated by decoding content (JPEG/PNG/WebP/PDF only, 20 MB), served with nosniff + restrictive CSP; admin/auth responses `no-store` + `X-Robots-Tag: noindex`. No public sign-up.

## Roles
Owner: everything. Editor: pages, notes, media approval, publishing, enquiries. Contributor: create/edit own Field Note drafts, upload media, edit captions — cannot publish or change permissions. Client reviewer: view drafts/previews, comment, approve/request changes; cannot edit.

## Photo eligibility rule (enforced on the server)
A photo appears publicly only if: source = Original or Edited original; permission = Approved; edit approval = Approved for edited originals (and not Rejected for originals); not expired; minors flag requires documented approval. Withdrawal removes it from pages, Open Graph images and its public URL immediately (public cache max-age 5 min; copies already cached by third parties, e.g. social networks, cannot be recalled by this system).

## Short CMS guide
1. Pages: Admin > Pages > Edit. Click a section name to open it; arrows or drag to reorder; duplicate/hide/remove icons. Save draft (private) → Preview / Responsive preview → Publish. Revision history (right) restores any earlier version into the draft.
2. Field Notes: New Field Note → write → Save draft → Preview → Publish. Changing the address of a published note offers a 301 redirect.
3. Media Library: Upload → open item → fill alt text, caption, credit → editors set Source / Permission / Edit approval. "Upload edited version" creates a separate derivative with an edit log and before/after slider; "Revert placements to original" swaps it back.
4. Appearance: colours, fonts, size, spacing, buttons, logo, favicon, footer, privacy text; contrast check blocks unreadable combinations; reset to provisional palette.
5. Settings: verified contact details, social links, preview banner, search indexing switch (keep OFF until launch), asset & consent register.

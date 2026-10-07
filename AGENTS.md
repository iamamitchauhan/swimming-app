# Project notes

## Verification

- **Server typecheck:** `cd server && npx tsc --noEmit` (CommonJS, strict TS; this is the server's build check).
- **Client build:** `cd client && npm run build` (Vite). This does **not** typecheck.
- **Client typecheck:** `cd client && npx tsc --noEmit`. On a clean `npm ci` (what CI and `deploy-client.sh` see) it reports **17 pre-existing** errors, all confined to three areas:
  - `src/components/tokenized-text-editor/*` — 12 errors. This directory imports `slate` / `slate-react`, which are **not declared** in `package.json`, so a clean install leaves them unresolvable. The directory is dead code (nothing imports it) and is not in the Vite build graph, so builds still pass. Installing `slate` + `slate-react` ad-hoc masks all but one of these (leaving `TokenDropdown.tsx`'s missing `classes` export from `@/lib/utils`).
  - `src/hooks/use-invitations.ts` (`AuthUser.club` missing)
  - `src/lib/api/example.functions.ts` (missing `@tanstack/react-start` / `../config.server`)
    Treat any _new_ errors as regressions; ignore these unless they are being fixed.

## Testing

- There is **no test runner configured** (jest is declared but has no config and no tests exist). Verify changes with the typecheck/build commands above, plus a manual/curl smoke test against a running server.
- **Don't verify UI changes visually unless asked.** Assert on computed styles, DOM presence and `getBoundingClientRect()` geometry from a headless script (see `/tmp/pptr/*.js`), and report the measured numbers. Don't take or read screenshots as a routine step — only when the user explicitly asks for a visual check.
- **Authenticated UI smoke test:** with `NODE_ENV=development`, `POST /api/v1/auth/login` returns the 6-digit OTP in `data.otp` (no inbox needed). Exchange it at `POST /api/v1/auth/verify-otp` for a JWT, then set `localStorage["swimclub.token"]` in the browser to load protected routes (e.g. `/tryouts/view/:id/bulk-scoring?ids=...`).

## Conventions

- API responses use the `sendSuccess(res, data, message, statusCode)` envelope; errors are thrown from `src/shared/errors/domain.errors.ts`.
- Any new or changed API endpoint **must** be documented in `server/src/docs/*.yaml` (with component schemas in `server/src/config/swagger.ts`) in the same change.
- Responsive variants live in `client/src/styles.css` as `@custom-variant`s: `phone` (any phone orientation — use this for compact chrome), `phone-landscape`, `phone-portrait`. Tailwind silently drops all but the **first** media query in the one-line `@custom-variant name (@media A, B);` form — for a query list you must use the block form (`@custom-variant name { @media A, B { @slot; } }`).
- The compact chrome sizes (48px app header, 48px bulk-scoring action bar, 44px pagination bar) are tied together: `BulkScoreTab`'s action bar is **bottom-anchored**, so the content's `phone:pb-16` and the matrix's `phone:max-h-[calc(100vh-9rem)]` compensate for the 48px action bar. Update them together if a height changes.
- `PUT /tryouts/:id/registrations/:regId/score` **replaces** `detailed_scores` (it does not merge). Callers must send the swimmer's **complete** criteria set — `BulkScoreTab` does this on save — so answers to removed questions don't linger and skew the roster/leaderboard counts. The server recomputes `scores.totalScore` from the numeric values sent (nulling it when none remain).

## Deployment

- The client is served as a **static build**, not the Vite dev server. `deploy/deploy-client.sh` builds `client/dist` and rsyncs it to `/var/www/swimtryout-app`, which nginx serves using `deploy/nginx/app.swimtryout.feteboard.ai.conf` (SPA fallback + immutable `/assets/` caching). The api and landing vhosts keep proxying to their Node processes.
- `VITE_API_BASE_URL` is inlined by Vite **at build time** from `client/.env`; the deployed value must be `https://api.swimtryout.feteboard.ai/api/v1`. Changing it requires a rebuild, and `deploy-client.sh` refuses to build if it is not https.
- **CSS browser targets matter.** `client/vite.config.ts` sets `build.cssMinify: "lightningcss"` with targets `chrome 90, safari 14`. Tailwind v4 emits `oklch()` colours plus native CSS nesting and range-syntax media queries; older Android tablets parse none of those, so without the targets a build renders a colourless (black/white) UI _and_ drops every responsive variant — the roster then shows the phone card list even on a tablet. After touching that config, assert on the built CSS:
  - `grep -c oklch client/dist/assets/*.css` → `0`
  - the output contains hex fallbacks (e.g. `--primary:#0766ee;`) and flat `@media(min-width:…)` queries
- Never validate a deploy against `npm run dev`: the dev server ships raw Tailwind v4 CSS and does not represent the built output.

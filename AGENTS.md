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
- Chrome always supports modern CSS, so older-device bugs are invisible in it. To emulate an older tablet, load the **built** `client/dist` over a static server and rewrite the loaded stylesheets with the unsupported declarations stripped (`/tmp/pptr/measure.js … strip-dvh`), then assert on the geometry.
- **Authenticated UI smoke test:** with `NODE_ENV=development`, `POST /api/v1/auth/login` returns the 6-digit OTP in `data.otp` (no inbox needed). Exchange it at `POST /api/v1/auth/verify-otp` for a JWT, then set `localStorage["swimclub.token"]` in the browser to load protected routes (e.g. `/tryouts/view/:id/bulk-scoring?ids=...`).

## Conventions

- API responses use the `sendSuccess(res, data, message, statusCode)` envelope; errors are thrown from `src/shared/errors/domain.errors.ts`.
- Any new or changed API endpoint **must** be documented in `server/src/docs/*.yaml` (with component schemas in `server/src/config/swagger.ts`) in the same change.
- Responsive variants live in `client/src/styles.css` as `@custom-variant`s: `phone` (any phone orientation — use this for compact chrome), `phone-landscape`, `phone-portrait`. Tailwind silently drops all but the **first** media query in the one-line `@custom-variant name (@media A, B);` form — for a query list you must use the block form (`@custom-variant name { @media A, B { @slot; } }`).
- Table↔card switches use Tailwind's `lg` (1024px) as the boundary, matching `RosterTab`/`ScoringTab`: cards are `lg:hidden`, the table `hidden lg:block`. The tryouts list follows the same rule — cards on phone **and** tablet (single column below `md`, `md:grid-cols-2` at ≥768px), table only at ≥1024px. Note a 1024px-wide landscape tablet therefore still gets the table.
- The compact chrome sizes (48px app header, 48px bulk-scoring action bar, 44px pagination bar) are tied together: `BulkScoreTab`'s action bar is **bottom-anchored**, so the content's `phone:pb-16` and the matrix's `phone:max-h-[calc(100vh-9rem)]` compensate for the 48px action bar. Update them together if a height changes.
- `PUT /tryouts/:id/registrations/:regId/score` **replaces** `detailed_scores` (it does not merge). Callers must send the swimmer's **complete** criteria set — `BulkScoreTab` does this on save — so answers to removed questions don't linger and skew the roster/leaderboard counts. The server recomputes `scores.totalScore` from the numeric values sent (nulling it when none remain).

## Deployment

- The client is served as a **static build**, not the Vite dev server. `deploy/deploy-client.sh` builds `client/dist` and rsyncs it to `/var/www/swimtryout-app`, which nginx serves using `deploy/nginx/app.swimtryout.feteboard.ai.conf` (SPA fallback + immutable `/assets/` caching). The api and landing vhosts keep proxying to their Node processes.
- `VITE_API_BASE_URL` is inlined by Vite **at build time** from `client/.env`; the deployed value must be `https://api.swimtryout.feteboard.ai/api/v1`. Changing it requires a rebuild, and `deploy-client.sh` refuses to build if it is not https.
- **CSS browser targets matter.** `client/vite.config.ts` sets `build.cssMinify: "lightningcss"` with targets `chrome 90, safari 14`. Tailwind v4 emits `oklch()` colours plus native CSS nesting and range-syntax media queries; older Android tablets parse none of those, so without the targets a build renders a colourless (black/white) UI _and_ drops every responsive variant — the roster then shows the phone card list even on a tablet. After touching that config, assert on the built CSS:
  - `grep -c oklch client/dist/assets/*.css` → `0`
  - the output contains hex fallbacks (e.g. `--color-primary:#0766ee;`) and flat `@media(min-width:…)` queries
  - every opacity modifier still has an **alpha** fallback: for each `{prop:color-mix(in oklab, var(--color-x) n%, transparent)}` inside an `@supports (color:color-mix(in lab, red, red))` block there must be a sibling `{prop:#rrggbbAA}` declaration. `grep -o '{[a-z-]*:var(--color-[a-z0-9-]*)}@supports (color:color-mix' client/dist/assets/*.css` must return nothing.
- **Opacity modifiers need literal theme colours.** Tailwind writes `bg-<colour>/<n>` as the _plain_ colour plus an `@supports (color: color-mix(...))` override. `color-mix()` only landed in Chrome 111 / Safari 16.2, so on the older tablets this app targets the fallback is what actually paints — and if the theme colour is a `var()` alias, the build can't compute the alpha, so the fallback is the **fully opaque** colour. `bg-destructive/10 text-destructive` then renders red text on a solid red pill (invisible), and `bg-primary/5` containers (e.g. `SegmentedTabs`) render solid blue. Declaring the colours with **literal** values in a plain `@theme` block (not `@theme inline` aliasing `:root` variables) makes the fallback `color-mix(in srgb, <literal> n%, transparent)`, which lightningcss downlevels to a real 8-digit hex. `:root` then re-exposes the old names as aliases (`--primary: var(--color-primary)`) for code reading them directly, and `.dark` overrides `--color-*`. Keep it that way — reverting to `@theme inline` silently reintroduces the bug.
- **Viewport units are never downlevelled.** lightningcss keeps `100dvh` / `100svh` verbatim (there is no safe `vh` equivalent), and its minifier **collapses duplicate declarations of the same property inside one rule** — so `min-height: 100vh; min-height: 100dvh;` builds as `min-height: 100dvh` alone, silently dropping the fallback. On browsers without `dvh` (older Android tablets, Safari < 15.4) that declaration is dropped too, and a `min-h-*` grid collapses to its content height — e.g. the login page's split layout shrank to a third of the screen. Put the fallback in a separate rule (`@supports` guard) instead — see the `min-h-viewport` utility in `client/src/styles.css`.
- Never validate a deploy against `npm run dev`: the dev server ships raw Tailwind v4 CSS and does not represent the built output.

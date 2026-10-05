# Project notes

## Verification

- **Server typecheck:** `cd server && npx tsc --noEmit` (CommonJS, strict TS; this is the server's build check).
- **Client build:** `cd client && npm run build` (Vite). This does **not** typecheck.
- **Client typecheck:** `cd client && npx tsc --noEmit` — currently reports 5 **pre-existing** errors unrelated to most changes:
  - `src/components/tokenized-text-editor/TokenDropdown.tsx` (missing `classes` export from `@/lib/utils`)
  - `src/hooks/use-invitations.ts` (`AuthUser.club` missing)
  - `src/lib/api/example.functions.ts` (missing `@tanstack/react-start` / `../config.server`)
    Treat any _new_ errors as regressions; ignore those five unless they are being fixed.

## Testing

- There is **no test runner configured** (jest is declared but has no config and no tests exist). Verify changes with the typecheck/build commands above, plus a manual/curl smoke test against a running server.
- **Authenticated UI smoke test:** with `NODE_ENV=development`, `POST /api/v1/auth/login` returns the 6-digit OTP in `data.otp` (no inbox needed). Exchange it at `POST /api/v1/auth/verify-otp` for a JWT, then set `localStorage["swimclub.token"]` in the browser to load protected routes (e.g. `/tryouts/view/:id/bulk-scoring?ids=...`).

## Conventions

- API responses use the `sendSuccess(res, data, message, statusCode)` envelope; errors are thrown from `src/shared/errors/domain.errors.ts`.
- Any new or changed API endpoint **must** be documented in `server/src/docs/*.yaml` (with component schemas in `server/src/config/swagger.ts`) in the same change.

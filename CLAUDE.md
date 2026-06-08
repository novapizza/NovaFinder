# NovaFinder (nova-directory)

A macOS file manager built with Electron + React + Vite (electron-vite). Source
layout: `src/main` (main process), `src/preload` (context bridge), `src/renderer`
(React UI), `src/shared` (code shared between main and renderer).

## Release procedure

Releases are cut by pushing a `v*.*.*` tag. The `.github/workflows/release.yml`
workflow builds, signs, notarizes, and publishes the macOS app to Cloudflare R2
and a GitHub release. To release a new version (e.g. 0.2.5):

1. Bump `version` in **`package.json`** AND in **`package-lock.json`** (two
   places: the top-level `version` and `packages[""].version`). All must match.
2. Commit directly to `main` (version bumps are not PR'd — match prior commits):
   `chore: bump version to X.Y.Z`
3. `git push origin main`
4. Tag and push to trigger the release:
   `git tag vX.Y.Z && git push origin vX.Y.Z`
5. Watch it: `gh run list --workflow=release.yml --limit 1`

Notes:
- The tag push is what triggers the build — pushing `main` alone does nothing.
- CI uses pnpm with `--frozen-lockfile`; the root `version` bump doesn't affect
  the dependency graph, so the lockfile install still passes.
- Release secrets (Apple notarization, R2, signing cert) live in the
  `Production` GitHub environment — nothing to configure locally.

## Common commands

- `npm run dev` — run the app in dev
- `npm run build` — build all three bundles (main/preload/renderer); the real
  build gate. The repo's `tsc` project config is loose and reports pre-existing
  errors that the esbuild-based build does not.
- `npm run test:run` — unit tests (vitest). Note: `useFileOps.test.ts` has one
  pre-existing failure unrelated to current work.

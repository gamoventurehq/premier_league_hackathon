# 0008: Frontend Stack Version Baseline

- **Status**: Accepted
- **Date**: 2026-10-22
- **Supersedes**: [ADR 0005](0005-unified-fullstack-monorepo.md) — the frontend technology version pins only. The monorepo layout decision in ADR 0005 remains in force.

To correct a three-year-old framework pin before any application code exists, we decided to re-baseline the frontend stack onto Next.js 16 and its current supporting toolchain. ADR 0005 pinned Next.js 14, released 2023-10-26, which predates the App Router stabilisation in Next.js 15, Turbopack's graduation to the default bundler, and React 19. Because the repository currently contains no application code, this correction costs a version bump today and would otherwise cost a two-major-version migration against the submission deadline. The monorepo layout, the Python FastAPI backend with WebSockets and NumPy spatial math, the TypeScript frontend, the HTML5 Canvas radar, and the single `docker compose` local evaluation story are all unchanged by this decision.

## Pinned baseline

| Component | Version | Rationale |
| :--- | :--- | :--- |
| Next.js | `16.4.2` | Current `latest` (2026-10-15). Turbopack is stable and the default bundler — 2–5× faster production builds and up to 10× faster Fast Refresh, which is the direct lever on the ADR 0007 frontend-first iteration loop. |
| React / React DOM | `19.2.9` | The Next 16 App Router runs on React 19.2, adding View Transitions, `useEffectEvent`, and `<Activity/>`. |
| TypeScript | `5.9.3` | Next 16 requires TypeScript ≥ 5.1. TypeScript 7.0.2 is npm `latest` (released 2026-07-08) — the Go-based native port, roughly 10× faster — with 7.1 in beta. We still pin 5.9.3: Next's `next typegen` and the ESLint TypeScript plugin were built against the 5.x line, and a compiler rewrite is not a risk worth taking inside a fixed submission window. Revisit after submission. |
| Tailwind CSS | `4.3.3` | Current v4 line. The `v3-lts` tag (3.4.19) remains available if a pinned legacy plugin requires it. |
| Node.js | `24.x` LTS | Next 16 requires Node ≥ 20.9.0. Node 24 is Maintenance LTS through April 2028 and is the safest target for Azure App Service and Container Apps; Node 26 only entered Active LTS on 2026-10-20. |
| ESLint | `9.x` or later | `next lint` is removed in Next 16, and `eslint-config-next@16.4.2` requires ESLint ≥ 9. |
| Bundler | Turbopack | Default in Next 16. Opt out with `--webpack` only if a plugin forces it. |

Pin exact versions in `frontend/package.json` and commit the lockfile so judge-facing builds are reproducible. Patch and minor updates within a pinned major may be taken without a new ADR; a major-version change requires a superseding ADR. `16.5.0` is in canary — do not track a caret range across a fixed submission window.

## Breaking changes to honour on day one

- `next lint` is removed and `next build` no longer lints. CI must invoke ESLint (or Biome) directly.
- Synchronous `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` access is fully removed — all must be awaited. `next typegen` provides the `PageProps`, `LayoutProps`, and `RouteContext` type helpers.
- `middleware.ts` is renamed `proxy.ts` and runs on the Node.js runtime only.
- `revalidateTag()` requires a second `cacheLife` argument; `updateTag()` and `refresh()` are new Server Action-only APIs.
- `cacheComponents` replaces the removed `experimental.ppr` and `experimental.dynamicIO` flags. Keep it **off** for live match views: the studio consumes a WebSocket stream, so request-time dynamic rendering plus client-side updates is the correct model, not partial prerendering.
- `next/image` defaults changed — `minimumCacheTTL` 60s → 4h, `qualities` narrowed to `[75]`, local-IP optimisation blocked by default, `images.domains` deprecated in favour of `images.remotePatterns`, and `next/legacy/image` deprecated.
- `serverRuntimeConfig` and `publicRuntimeConfig` are removed; use environment variables with the `NEXT_PUBLIC_` prefix for client-visible values.

## Consequences for the radar

React Compiler support is stable in Next 16 but remains opt-in, and no React version substitutes for keeping high-frequency telemetry off the React render path. The 60FPS pitch radar must draw to a `useRef` canvas driven by `requestAnimationFrame`, fed directly by the ADR 0003 WebSocket stream, with React state reserved for persona and overlay selection — the discrete, low-frequency state. This keeps the ADR 0007 frame-rate target independent of React reconciliation cost and makes leaving React Compiler off safe.

Next 16 also ships a built-in DevTools MCP server exposing routing, caching, and rendering context alongside unified browser and server logs. It is a local-development counterpart to the Azure MCP server in ADR 0006 and can be exposed to the agent swarm during development.

## Out of scope

The backend stack named in ADR 0005 — FastAPI, Pydantic, NumPy spatial math, Uvicorn, and the Azure AI SDK — carries no version pins in that ADR and is unaffected by this decision. It should be baselined separately before the backend is implemented, using the same pin-exactly-and-commit-the-lockfile discipline.

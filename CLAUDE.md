# CLAUDE.md — FinPlan Project Conventions

## What is this?

FinPlan is a local-first financial planning SPA built with SvelteKit + sql.js. All data lives in a SQLite file in the browser (via File System Access API or IndexedDB fallback). No backend, no cloud.

## Tech Stack

- **SvelteKit** with `adapter-static` → deploys to GitHub Pages at `/finplan`
- **Svelte 5 runes** (`$state`, `$derived`, `$effect`) — all components use runes mode
- **sql.js** — SQLite compiled to WASM, runs entirely in browser
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- **Vitest** for unit tests (`src/**/*.test.ts`)

## Critical: WASM + Svelte 5 Proxy Issue

**Never store the sql.js `Database` instance in `$state`.**

Svelte 5's `$state()` wraps objects in a deep Proxy. This breaks sql.js's internal WASM memory operations and parameter binding. The pattern we use:

```ts
let _instance: Database | null = null; // raw reference, NOT in $state

export const db = $state<{ instance: Database | null; ... }>({ instance: null, ... });
// db.instance is set but the actual queries use _instance directly
```

## DB Layer (`src/lib/db/`)

- `connection.svelte.ts` — DB open/save/close, File System Access API + IDB fallback
- `schema.ts` — `CREATE_TABLES` SQL string, all table definitions
- `audit.ts` — `logAudit()` and `computeChanges()` helpers
- `migrate.ts` — run once after DB open for schema migrations

## Repository Layer (`src/lib/repositories/`)

Pattern: interface + SQLite implementation + singleton registry.

```
repositories/
  types.ts          — all shared types/interfaces
  index.ts          — singleton `repositories` object
  sqlite/
    ScenarioRepository.ts
    IncomeRepository.ts
    ... etc
```

Each repository:
- Has `get*()` methods (sync — query directly)
- Has `create/update/delete` methods (async — call `save()` after writes)
- Logs audit entries on mutations

## Calc Engine (`src/lib/calc/`)

Pure functions, fully testable, no DB access:

- `projections.ts` — cash flow, net worth, runway calculations
- `property.ts` — VIC stamp duty, mortgage payments, property analysis
- `vehicle.ts` — finance payments, total cost of ownership

## Frequency Normalisation

All monetary amounts normalise to monthly for calculations:
- weekly × (52/12)
- fortnightly × (26/12)
- monthly × 1
- annually ÷ 12

## Conventions

- UUIDs for all entity IDs (`crypto.randomUUID()`)
- SQLite booleans stored as `INTEGER` (0/1), convert on read
- Dates as ISO strings (`TEXT`)
- Always run `PRAGMA foreign_keys = ON` after opening DB
- Run `save()` after every mutation

## Testing

```bash
npm test           # run vitest
npm run test:ui    # vitest UI
npm run build      # must succeed before PR
npm run check      # svelte-check type check
```

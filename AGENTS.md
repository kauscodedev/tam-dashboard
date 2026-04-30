# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## What This Project Is

An external web dashboard mirroring Spyne.ai's internal HubSpot "TAM Distribution" dashboard. Each HubSpot Company record = one dealership rooftop. Multiple rooftops share a `gd_id` (dealer group). `#ROOFTOPS` = COUNT of records; `#COMPANIES` = COUNT DISTINCT `gd_id`.

## Commands

```bash
npm run sync          # fetch HubSpot → aggregate → upload to Vercel Blob
npm run dev           # Next.js dev server (app/ not yet built)
npm run build         # Next.js production build
```

No lint or test scripts exist yet.

## Architecture

```
GitHub Actions (workflow_dispatch or scheduled)
  └── scripts/sync.ts
        1. fetchMetadata()      → LabelMap
        2. fetchAllCompanies()  → MinifiedRecord[] (~168K records, ~1,700 pages)
        3. aggregate()          → AggregatedData (O(n) single pass)
        4. PUT tam-data.json    → Vercel Blob (private)
        5. PUT sync-status.json → Vercel Blob (public)

Next.js on Vercel Hobby (free):
  /api/data          → auth check → read tam-data.json from Blob → return JSON
  /api/sync-status   → read sync-status.json from Blob → return progress
  /api/trigger-sync  → POST to GitHub Actions workflow_dispatch

Browser:
  page load    → GET /api/data → AggregatedData → render all 19 reports
  filter change → useMemo re-runs aggregate() on relevantRecords (O(n), no API call)
  "Refresh"    → POST /api/trigger-sync → poll /api/sync-status every 5s
```

**Why GitHub Actions instead of a serverless function:** Vercel Hobby has a 10s function timeout. The HubSpot fetch takes ~90s (~1,700 pages × 100ms). GitHub Actions has a 30-minute job limit.

## Environment Variables

| Variable | Where Used | Notes |
|---|---|---|
| `HUBSPOT_PAT` | `.env.local`, GitHub Secret, Vercel | HubSpot private app token |
| `BLOB_READ_WRITE_TOKEN` | `.env.local`, GitHub Secret, Vercel | Vercel Blob token |
| `GITHUB_TOKEN` | `.env.local`, Vercel | PAT with `repo` + `workflow` scopes — for dispatch |
| `GITHUB_REPO` | `.env.local`, Vercel | `owner/repo`, e.g. `kaustubhchauhan/tam-dashboard` |
| `DASHBOARD_SECRET` | `.env.local`, Vercel | Checked server-side in `/api/data` |
| `NEXT_PUBLIC_DASHBOARD_SECRET` | Vercel only | Same value — sent as `X-Dashboard-Secret` header from browser |

`GITHUB_TOKEN`, `BLOB_READ_WRITE_TOKEN`, and `DASHBOARD_SECRET` must never have the `NEXT_PUBLIC_` prefix.

## HubSpot API Notes

**Use List API, not Search API.** `POST /crm/v3/objects/companies/search` has an undocumented 10K result cap. The List API (`GET /crm/v3/objects/companies`) has no cap. `website_status` filtering is done in `aggregate()` after the full fetch.

**Pagination:** response has `paging.next.after` (opaque cursor). Pass as `after` query param. Loop until `paging.next` is absent.

**Team names:** The `hubspot_team_id` property has no enum options defined in this account. Team names are resolved by reading `owner.teams[].id/name` from `GET /crm/v3/owners` — no extra OAuth scopes required. Implemented in `lib/hubspot/fetchMetadata.ts`.

**`(No value)` vs `(No Team)`:** Records with a null `tm` field are grouped under the key `"(No value)"` during aggregation, then the `resolveTeam` label function maps that key to `"(No Team)"`. This is distinct from the real "Not Assigned" team (which has a numeric ID).

## Report Filter Logic

Business logic for all 19 reports — not encoded in the existing codebase.

### Summary Cards

| Card | Filters |
|---|---|
| Relevant TAM | `ws = "Relevant"` |
| #Without Domains | `ws = "Relevant"` + `dm` is null/empty |
| #Carsforsale.com | `dn = "Carsforsale.Com"` (no `ws` filter) |
| #Contract Closed | `ws = "Relevant"` + `lv = "Contract Closed"` |
| #Franchise TAM | `ws = "Relevant"` + `td = "Franchise"` |
| #Independent TAM | `ws = "Relevant"` + `td = "Independent"` |

### Breakdown Reports (base: `ws = "Relevant"`, grouped by one field)

| Report | Group-by field |
|---|---|
| Size Wise | `ot` (org tier) |
| Dealership Type | `td` |
| Competitor | `cn` |
| State | `st` |
| CRM | `cp` |
| Team | `tm` (resolved to name) |
| Lifecycle Stage | `ls` (resolved to label) |
| Partnership | `pn` |

### Sub-breakdown Reports

| Report | Base filter | Group-by |
|---|---|---|
| #Franchise CRM Wise | `ws = "Relevant"` + `td = "Franchise"` | `cp` |
| #Independent CRM Wise | `ws = "Relevant"` + `td = "Independent"` | `cp` |
| #Franchise Stage Wise | `ws = "Relevant"` + `td = "Franchise"` | `ls` |
| #Independent Stage Wise | `ws = "Relevant"` + `td = "Independent"` | `ls` |

### Cross-Tab

**State × Team Wise** — rows = `st`, columns = resolved team names, cells = `{ rooftops, companies }`. Composite key in the aggregation map: `"${state}|||${teamId}"`. The `stateTeamMatrix.cells` structure uses `cells[state][teamName]` (team names, not IDs).

### Global Filters (client-side)

Three filter dropdowns — Org Tier (`ot`), HubSpot Team (`tm`), DMS Name (`dn`) — are applied client-side. On filter change, `applyFilters()` in `lib/aggregation/filters.ts` slices `relevantRecords` and re-runs `aggregate()`. Wrapped in `useMemo` in the `useFilters` hook. No API call on filter change.

## Technical Constraints

- Do not use `export const runtime = 'edge'` on any API route — `@vercel/blob` requires Node.js runtime.
- Do not call `/api/data` on filter changes — filter client-side using `relevantRecords` from the initial payload.
- Do not use `POST /crm/v3/objects/companies/search` anywhere — hits the undocumented 10K cap.

## TODO (in order)

1. `lib/aggregation/filters.ts` — `applyFilters(data, FilterState): AggregatedData`
2. `.github/workflows/sync-hubspot.yml` — scheduled (daily) + `workflow_dispatch`
3. `app/api/data/route.ts` — verify `X-Dashboard-Secret` header, read `tam-data.json` from Blob
4. `app/api/sync-status/route.ts` — read public `sync-status.json` from Blob
5. `app/api/trigger-sync/route.ts` — POST to GitHub Actions `workflow_dispatch` API
6. Next.js app scaffolding (`create-next-app` already done via `package.json`), add shadcn/ui
7. `hooks/useDashboardData.ts` + `hooks/useSyncStatus.ts` + `hooks/useFilters.ts`
8. UI components: `MetricCard`, `BreakdownTable`, `CrossTabTable`, `FilterBar`, `RefreshButton`, `SyncStatusBanner`
9. `app/page.tsx` — full dashboard layout with all 19 reports
10. Vercel Blob provisioning + deploy to Vercel

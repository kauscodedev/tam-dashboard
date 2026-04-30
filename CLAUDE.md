# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

An external web dashboard mirroring Spyne.ai's internal HubSpot "TAM Distribution" dashboard.

Each HubSpot Company record is one dealership rooftop.

- `#ROOFTOPS` = count of matching HubSpot company records.
- `#COMPANIES` = count distinct HubSpot `org_id`, falling back to `gd_id` when `org_id` is missing.
- Blank/missing `org_id` and `gd_id` values count as individual companies, matching HubSpot report behavior.

The synced dashboard payload intentionally includes row-level records so the browser can re-aggregate and open in-dashboard drilldowns without another API call.

## Commands

```bash
npm run sync          # fetch HubSpot -> aggregate -> upload to Vercel Blob
npm run dev           # start the Next.js dev server
npm run build         # production build
```

No lint or test scripts exist yet.

## Architecture

```text
GitHub Actions (workflow_dispatch or scheduled)
  └── scripts/sync.ts
        1. fetchMetadata()      -> LabelMap
        2. fetchAllCompanies()  -> MinifiedRecord[] (~168K+ records)
        3. aggregate()          -> AggregatedData (O(n) single pass)
        4. PUT tam-data.json    -> Vercel Blob (private)
        5. PUT sync-status.json -> Vercel Blob (public)

Next.js on Vercel:
  /api/data          -> auth check -> read tam-data.json from Blob -> return JSON
  /api/sync-status   -> read sync-status.json from Blob -> return progress
  /api/trigger-sync  -> POST to GitHub Actions workflow_dispatch

Browser:
  page load      -> GET /api/data -> AggregatedData -> render reports
  filter change  -> useMemo re-runs aggregate() on relevantRecords (no API call)
  Refresh button -> POST /api/trigger-sync -> poll /api/sync-status
  table click    -> open DrilldownModal from current filtered records
```

**Why GitHub Actions instead of a serverless function:** HubSpot fetches take longer than Vercel Hobby function limits. GitHub Actions has enough runtime for the full List API pagination.

## Environment Variables

| Variable | Where Used | Notes |
|---|---|---|
| `HUBSPOT_PAT` | `.env.local`, GitHub Secret, Vercel | HubSpot private app token |
| `BLOB_READ_WRITE_TOKEN` | `.env.local`, GitHub Secret, Vercel | Vercel Blob token |
| `GITHUB_TOKEN` | `.env.local`, Vercel | PAT with `repo` + `workflow` scopes for dispatch |
| `GITHUB_REPO` | `.env.local`, Vercel | `owner/repo`, e.g. `kaustubhchauhan/tam-dashboard` |
| `DASHBOARD_SECRET` | `.env.local`, Vercel | Checked server-side in `/api/data` |
| `NEXT_PUBLIC_DASHBOARD_SECRET` | Vercel only | Same value, sent as `X-Dashboard-Secret` from browser |

`GITHUB_TOKEN`, `BLOB_READ_WRITE_TOKEN`, and `DASHBOARD_SECRET` must never have the `NEXT_PUBLIC_` prefix.

Never print secrets from `.env.local` into logs, commits, issues, or PR messages.

## HubSpot API Notes

**Use List API, not Search API.** `POST /crm/v3/objects/companies/search` has an undocumented 10K result cap. The List API (`GET /crm/v3/objects/companies`) has no cap. Filtering is done in `aggregate()` after the full fetch.

**Pagination:** responses include `paging.next.after` as an opaque cursor. Pass it as the next `after` query param until `paging.next` is absent.

**Required properties:** `lib/constants.ts` defines `FIELD_MAP` and `REQUIRED_PROPERTIES`. When adding a synced field, update the map and `MinifiedRecord` together.

Current minified identity fields:

| HubSpot property/source | Minified key | Purpose |
|---|---|---|
| `result.id` | `hi` | HubSpot company object ID for record links |
| `name` | `nm` | Company display name in drilldowns |
| `org_id` | `oi` | Preferred distinct-company key |
| `gd_id` | `gi` | Fallback distinct-company key and displayed GD ID |

**Team names:** `hubspot_team_id` has no enum options in this account. Team names are resolved by reading `owner.teams[].id/name` from `GET /crm/v3/owners`. Implemented in `lib/hubspot/fetchMetadata.ts`.

**`(No value)` vs `(No Team)`:** Records with null `tm` are grouped under the raw key `"(No value)"`, then `resolveTeam()` displays that key as `"(No Team)"`. This is distinct from the real "Not Assigned" team ID.

## Report Filter Logic

All current HubSpot-matched reports use this base relevant-market filter:

```text
Country Dropdown = United States
AND (Website Status = Relevant OR Website Status is unknown)
```

`aggregate()` enables country filtering only when synced records include `co` (`country_dropdown`), so older blobs without country data can still render.

Most visible report cards and all breakdown tables then use the known-domain base:

```text
base relevant-market filter
AND Company domain name is known
```

### Summary Cards

| Card | Filters |
|---|---|
| Relevant TAM | relevant-market base |
| Without Domains | relevant-market base + missing/empty `dm` |
| Carsforsale.com | relevant-market base + known `dm` + `dn = "Carsforsale.Com"` |
| Contract Closed | relevant-market base + known `dm` |
| Franchise TAM | relevant-market base + known `dm` + `td = "Franchise"` |
| Independent TAM | relevant-market base + known `dm` + `td = "Independent"` |

Important: the "Contract Closed" card is currently the known-domain relevant TAM count, matching the requested HubSpot report filters. Do not filter it by `lv = "Contract Closed"` unless the business rule changes again.

### Breakdown Reports

All breakdown reports use the known-domain relevant-market base.

| Report | Group-by field |
|---|---|
| Size Wise Relevant TAM | `ot` (org tier) |
| Dealership Type Wise Relevant TAM | `td` |
| Competitor Wise Relevant TAM | `cn` |
| State Wise Relevant TAM | `st` |
| CRM Wise Relevant TAM | `cp` |
| Team Wise Relevant TAM | `tm` (resolved to team name) |
| Lifecycle Stage Wise Relevant TAM | `ls` (resolved to label) |
| Partnership Wise Relevant TAM | `pn` |

### Sub-Breakdown Reports

| Report | Base filter | Group-by |
|---|---|---|
| Franchise CRM Wise TAM | known-domain relevant-market base + `td = "Franchise"` | `cp` |
| Independent CRM Wise TAM | known-domain relevant-market base + `td = "Independent"` | `cp` |
| Franchise Stage Wise TAM | known-domain relevant-market base + `td = "Franchise"` | `ls` |
| Independent Stage Wise TAM | known-domain relevant-market base + `td = "Independent"` | `ls` |

### Cross-Tab

**State-Team Wise Relevant TAM** uses the known-domain relevant-market base.

- Rows: `st`
- Columns: resolved `tm` team names
- Cell values: `{ rooftops, companies }`
- Composite aggregation key: `"${state}|||${teamId}"`
- `stateTeamMatrix.cells` stores `cells[state][teamName]`
- `stateTeamMatrix.teamIds` stores raw team IDs in parallel with `stateTeamMatrix.teams`

The UI renders each team as two subcolumns: `#Rooftops` and `#Companies`.

## Global Filters

Client-side filters live in `FilterState` and `lib/aggregation/filters.ts`.

Current filters:

- Org Tier (`ot`)
- HubSpot Team (`tm`)
- DMS Name (`dn`)
- Dealership Type (`td`)
- State (`st`)
- CRM Platform (`cp`)
- Lifecycle Stage (`ls`)

On filter changes, `applyFilters()` slices `data.relevantRecords`, re-runs `aggregate()`, preserves the original `fetchedAt`, and keeps original `filterOptions`. Do not call `/api/data` for filter changes.

## Row-Level Drilldowns

Breakdown table `#Rooftops` and `#Companies` values are clickable.

- `Rooftops` opens one row per matching HubSpot company record.
- `Companies` groups matching records by `org_id`, falling back to `gd_id`; blank IDs count as individual groups.
- State-Team matrix nonzero cells are also clickable.
- Drilldowns use the current filtered dashboard data, so global filters remain respected.
- Drilldowns apply the same known-domain base as the table aggregation.

HubSpot company record links are generated as:

```text
https://app-na2.hubspot.com/contacts/242626590/record/0-2/{companyObjectId}
```

Report-level backlinks are centralized in `hubspotReportLinks` in `app/page.tsx`.

## Technical Constraints

- Do not use `export const runtime = 'edge'` on API routes that use `@vercel/blob`; keep Node.js runtime.
- Do not call `/api/data` on filter changes; filter client-side using `relevantRecords`.
- Do not use `POST /crm/v3/objects/companies/search`; it can silently cap at 10K results.
- Keep aggregation O(n). Avoid nested loops over the full record set.
- When changing aggregation identity fields, update `types/dashboard.ts`, `lib/constants.ts`, `lib/aggregation/aggregate.ts`, and `components/DrilldownModal.tsx` together.

## Verification Checklist

Run at least:

```bash
npm run build
```

For data-affecting changes, also run the GitHub sync workflow or `npm run sync` with valid local secrets, then spot-check `tam-data.json` in Vercel Blob.

Known HubSpot parity checks after the `org_id` company-count fix:

- Franchise TAM companies: `9,730`
- Independent TAM companies: `40,894`
- Size Wise `(No value)` companies: `125`
- Dealership Type Wise: Independent `40,894`, Franchise `9,730`
- Franchise CRM Wise: `(No value)` `8,463`, DriveCentric `469`

## Current UI Notes

- Header title is `TAM Distribution Dashboard` and links to the HubSpot dashboard view.
- Metric cards keep report-level HubSpot backlinks.
- The old Generate Report button and unused bell icon were removed.
- Duplicate Contract Closed and Relevant TAM Coverage cards were removed from the GTM ownership section.
- "Market Concentration" is a local dashboard section, not a HubSpot report card by itself.

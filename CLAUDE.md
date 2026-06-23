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
npm run sync          # fetch HubSpot -> aggregate -> upload to Vercel Blob (ts-node, tsconfig.scripts.json)
npm run dev           # start the Next.js dev server
npm run build         # production build
npm run start         # serve the production build
```

No lint or test scripts exist yet.

Use Node 22+ (`.nvmrc`, `engines.node` in `package.json`, and the `setup-node` pin in
`.github/workflows/sync-hubspot.yml` must all agree). Every script is prefixed with
`NODE_OPTIONS=--no-experimental-webstorage` to suppress Node 22's experimental Web Storage globals
(`localStorage`/`sessionStorage`).

Important: this flag is **only valid on Node 22.4+** — that is where `--experimental-webstorage` was
introduced. On Node 20 the flag is unknown and `NODE_OPTIONS` rejects it outright (`exit code 9`), which
previously broke the CI sync. If you change the Node version, keep `.nvmrc`, `engines.node`, and the
workflow's `node-version` in lockstep, all at 22+.

## Architecture

```text
GitHub Actions (workflow_dispatch or daily cron)
  └── scripts/sync.ts
        0. PUT sync-status.json = { status: 'syncing' } -> Vercel Blob (public)
        1. fetchMetadata()      -> LabelMap
        2. fetchAllCompanies()  -> MinifiedRecord[] (~168K+ records)
        3. fetchDealerGroups()  -> DealerGroup[] (Dealership Group Names custom object)
        4. tagSegments()        -> bakes sg/gt/ss onto records + pre-drop pod/stage
                                   computations (smb*/mmRooftopPodSplit); returns group list
        5. aggregate()          -> AggregatedData (O(n) single pass)
        6. PUT tam-data.json    -> Vercel Blob (private)
        7. PUT sync-status.json = { status: 'success' } -> Vercel Blob (public)

Next.js on Vercel:
  /api/data          -> auth check -> read tam-data.json from Blob -> return JSON
  /api/sync-status   -> read sync-status.json from Blob -> return progress
  /api/trigger-sync  -> POST to GitHub Actions workflow_dispatch

Browser (app/page.tsx, driven by three hooks):
  useDashboardData() -> GET /api/data -> AggregatedData (initial load)
  useFilters(data)   -> applyFilters() re-slices relevantRecords + re-aggregates (no API call)
  useSyncStatus()    -> polls /api/sync-status during a refresh
  Refresh button     -> POST /api/trigger-sync -> useSyncStatus polls until done
  table click        -> open DrilldownModal from current filtered records
```

The `hooks/` directory (`useDashboardData`, `useFilters`, `useSyncStatus`) is the seam between the
API/blob layer and the React UI. `useFilters` owns `FilterState` and calls `applyFilters()` — this is
where the "filter client-side, never re-fetch" rule is enforced.

**Why GitHub Actions instead of a serverless function:** HubSpot fetches take longer than Vercel Hobby function limits. GitHub Actions has enough runtime for the full List API pagination.

### Active vs. Legacy Components

`app/page.tsx` is the single dashboard page. It imports the `*New` components and aliases them to clean names:

```ts
import { BreakdownTable } from '@/components/BreakdownTableNew'
import { FilterBar } from '@/components/FilterBarNew'
```

So the **active** UI files are: `BreakdownTableNew.tsx`, `FilterBarNew.tsx`, `CrossTabTable.tsx`,
`DrilldownModal.tsx`, `SyncStatusBanner.tsx`, `DealerGroupTable.tsx` (AOP group target list), and
`PodView.tsx` (Pod View section). `MetricCard` is defined **inline** near the top of `app/page.tsx`,
not imported. `components/ui/` holds shared low-level primitives.

`components/BreakdownTable.tsx`, `components/FilterBar.tsx`, `components/MetricCard.tsx`, and
`components/MetricCardNew.tsx` are **unused legacy files** — do not edit them expecting UI changes.

> `AGENTS.md` is stale (it predates the `org_id` company-count and known-domain filter rules and still
> describes `gd_id`-only counts and a `ws = "Relevant"` base). Treat this `CLAUDE.md` as the source of truth.

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
| Contract Closed | relevant-market base + known `dm` + `lv = "Contract Closed"` |
| Franchise TAM | relevant-market base + known `dm` + `td = "Franchise"` |
| Independent TAM | relevant-market base + known `dm` + `td = "Independent"` |

Important: the "Contract Closed" card filters known-domain records by `lv ∈ CONTRACT_CLOSED_GD_LEVELS`
(a `Set` currently holding `"Contract Closed"`, defined in `lib/constants.ts`, matching HubSpot's
"GD Level is any of …" filter). It is **not** the full known-domain TAM count. `aggregate()` builds a
dedicated `contractClosedRecords` bucket in its single pass. If HubSpot's filter 5 selects more
GD-Level values, add them to the set.

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

## TAM Segmentation (AOP)

RevOps' TAM Segmentation framework, surfaced as the **AOP Segments** section.

**Inputs (synced fields):** `uc` (`number_of_used_cars`) and `gn` (`dealership_group_name`)
were added to `FIELD_MAP`/`MinifiedRecord`. The **Dealership Group Names** custom object
(`2-169112502`, see `DEALER_GROUP_OBJECT_TYPE`) is fetched separately by
`lib/hubspot/fetchDealerGroups.ts` for each group's canonical `rooftops` rollup and
`dealership_rank`. It has no gd_id/org_id, so companies join to groups by **normalized
`dealership_group_name`** (`normalizeGroupName`).

**Tagging (`lib/aggregation/segment.ts → tagSegments`)** runs once at sync and bakes three
tags onto every record (`sg`/`gt`/`ss`), then returns the canonical group list. The full
decision tree (this is the authoritative spec — see also `docs/market-segment-hubspot-spec.md`
for the HubSpot `Market_segment` property mirroring it):

**Step 1 — Group vs Single.** A record is a **Group** only if it has a `gn` (`dealership_group_name`)
**and** the group's canonical rooftop count is **≥ 2** (`MID_MARKET_ROOFTOP_MIN`). Otherwise it is a
**Single** — this includes records with no group name *and* records whose "group" has only 1 rooftop
(a 1-rooftop group is functionally a single dealer). Canonical rooftops = group-object `rooftops`
rollup, falling back to member-record count when the rollup is 0/missing. **Exception:** a
`dealership_rank = "Top 150"` group is always a Group regardless of rooftop count.

- **Group** (sized by canonical rooftops): `Top 150` → `ENT_C` (overrides all); `> 15` → `ENT_B`;
  `11–15` → `ENT_A`; `2–10` → `MM_GROUP`. Group type `gt` is the majority of `td` across members
  (50/50 tie → IGD). MM groups get a rooftop sub-sector `ss` — two bands, `2-5` and `6-10` (see
  `SubSector`/`SUBSECTORS`).
- **Single** (sized by used cars `uc`, **type-dependent** ceiling): missing `uc` → `UNSIZED`;
  **Franchise** (`td = "Franchise"`) `uc <= 50` → `SMB`, `> 50` → `MM_SINGLE`;
  **Independent / other** `uc <= 100` → `SMB`, `> 100` → `MM_SINGLE`. `gt`/`ss` are null for singles.

The asymmetric SMB ceiling (`SMB_USED_CAR_MAX_FRANCHISE = 50`, `SMB_USED_CAR_MAX = 100`) is
deliberate: franchise rooftops monetize differently, so a franchise single above 50 used cars is
Mid Market while an independent single stays SMB up to 100.

Because the tags are baked onto records, `buildSegmentation()` recomputes segment counts on
every client-side filter with no extra plumbing. The **group target list**
(`segmentation.groups`) is canonical (sync-time) and is preserved unchanged through
`applyFilters` — filtered records can't rebuild a group's true rooftop count.

**Account view:** a dealer group counts as one account; single dealers count individually.
Group/account counts are **canonical and region-independent** — derived from `segmentation.groups`
(seeded from the group object), so "Top 150" always reads **150** regardless of filters or region.
Single-segment account counts come from `segmentation.accounts` (relevant base). The Enterprise and
MM-Group metric cards lead with this group count; single-dealer cards stay rooftop-first.

**Payload:** `uc`/`gn` are dropped from stored records after `tagSegments` (only needed during
tagging) — `sg`/`gt`/`ss` carry segmentation client-side and the group list lives in
`segmentation.groups`.

**Franchise vs Independent split:** every segment card and the **TAM Segmentation Matrix** table
show a Franchise/Independent split. Singles split by record `td` (filter-responsive); groups split
by canonical group type GFD↔Franchise / IGD↔Independent (region-independent). The matrix and the
MM-Group cards bucket groups by **2–5** and **6–10** rooftops; this matches the `mmSubSectors`
`2-5`/`6-10` bands (the framework's 2–10 Mid Market group band — 1-rooftop "groups" are singles). The
card-level Fr/Ind splits are recomputed client-side in `app/page.tsx` (the `seg` memo) from the baked
`sg`/`gt`/`ss` tags.

**Sync-time pre-computed splits (NOT client-derived):** some splits need *exact* counts that a
filtered client record set cannot reconstruct, so `scripts/sync.ts` computes them once at sync
(before `uc`/`gn` are dropped) and bakes them onto `segmentation` (declared in `types/dashboard.ts`):

- `smbGt50` — SMB dealers with >50 used cars (aggregate Fr/Ind/rooftops).
- `smbPodGt50` / `smbPodLe50` — per-pod SMB Fr/Ind breakdown for >50 / ≤50 used cars (array indexed by `PODS` order).
- `smbStageGt50` / `smbStageLe50` — SMB Fr/Ind by lifecycle (GD Level) stage for >50 / ≤50 used cars.
- `mmRooftopPodSplit` — MM_GROUP per-rooftop-count (`"2".."10"`) per-pod Fr/Ind split. Each group is
  assigned to its **plurality-of-rooftop-ownership** pod so the numbers reconcile with the group-count rows.

The `seg` memo *consumes* these fields; it does not recompute them.

**UI surfaces:** a **Mid Market — Total** card rolls up MM_SINGLE + MM_GROUP (2–5 and 6–10). Each
MM-Group card embeds a "By rooftop" breakdown table (`MMRooftopCountTable`, range starts at 2 rooftops,
fed by `mmRooftopPodSplit`), and the SMB card / SMB Deep Dive has a >50 / ≤50 used-car split (fed by
`smbStage*`/`smbPod*`). After the franchise re-tag the SMB **>50** band is effectively
Independent-only (franchise singles >50 are now Mid Market). These are presentations of the
pre-computed payload fields above, not new data sources.

**Export:** every metric card, breakdown table, the segmentation matrix, the dealer-group target
list, the cross-tab, and the Pod View have a CSV download (`lib/exportCsv.ts`) that opens in Excel/Sheets.

## Pod View

The **Pod View** section maps companies to the 5 sales pods by **company owner** (`hubspot_owner_id`,
synced as `ow`) and shows the Franchise vs Independent split per market (SMB / Mid Market / Enterprise /
Unsized). Pod rosters + owner IDs are hard-coded in `lib/pods.ts` (`PODS`, `OWNER_TO_POD`); resolved
against `/crm/v3/owners`. A few HubSpot display names differ from the org chart (Namrata Sharma = "Nam
Harrison", Vanshit Kothari = "Vans", Anisha = Anisha Jaiswal, Jaiaditya Berry = "Jay Berry"). Pod stats
are computed in `app/page.tsx` (the `seg` memo) over the relevant base; records owned by non-pod people
are not attributed. The exception is the SMB ≤50/>50 and MM rooftop-count pod splits, which are
**pre-computed at sync** (`segmentation.smbPod*` and `segmentation.mmRooftopPodSplit`; see the
"Sync-time pre-computed splits" note above) — the `seg` memo reads these rather than re-deriving them.
Update `lib/pods.ts` when the roster changes — no re-sync needed for roster edits, only the one-time
addition of the `ow` field required a sync (and pod-split pre-computation is keyed off `OWNER_TO_POD`
order at sync time, so adding/reordering pods does require a re-sync to refresh those fields).

Boundary resolutions (the framework's open items): SMB single ceiling is **type-dependent**
(Franchise ≤50, Independent ≤100, both inclusive); a group needs **≥2 rooftops** (1-rooftop
"groups" are singles); Enterprise-A is 11–15 and Enterprise-B is 16+; MM sub-sectors (`2-5`/`6-10`)
apply to both GFD and IGD; 50/50 type ties → IGD. Segment counts cover the **relevant base** (so they
sum to Relevant TAM rooftops), not the known-domain base. A global **AOP Segment** filter
(`FilterState.segment`, key `sg`) was added. Validated against live HubSpot (relevant US base):
franchise single 51–100 cars = 1,989 (move to MM-Single); franchise single ≤50 = 3,382 and
independent single ≤100 = 33,823 (stay SMB).

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
- AOP Segment (`sg`)

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

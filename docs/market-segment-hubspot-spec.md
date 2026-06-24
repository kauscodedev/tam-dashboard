# HubSpot `Market_segment` Property — Implementation Spec

This is the authoritative segmentation logic for tagging every HubSpot **Company** (one
company record = one dealership rooftop) with a `Market_segment` value. It mirrors the
dashboard's sync-time tagging in `lib/aggregation/segment.ts` (`tagSegments`) exactly — the
dashboard is the reference implementation, this property is the HubSpot mirror.

Validated against live HubSpot on 2026-06-24 (relevant US base). See **Validation** below.

---

## 1. The segment values

Property: `market_segment` — single-select **enumeration** on the Company object. Create the
options with these exact **internal values** (the write-back sends the internal value; the
label is display-only and can be edited freely):

| Internal value | Label | Meaning |
|---|---|---|
| `smb` | SMB | Independent single dealer with ≤100 used cars |
| `mm_single` | Mid Market - Single | Single that is Mid Market — **all franchise singles**, plus independent singles with >100 used cars (1 rooftop) |
| `mm_group` | Mid Market - Group (2-6) | Dealer group with 2–6 rooftops |
| `enterprise_a` | Enterprise A (7-10) | Dealer group with 7–10 rooftops |
| `enterprise_b` | Enterprise B (11-15) | Dealer group with 11–15 rooftops |
| `enterprise_c` | Enterprise C (16+) | Dealer group with 16+ rooftops (not Top 150) |
| `top_150` | Top 150 | Top-150 ranked dealer group (`dealership_rank = "Top 150"`), counted across **all regions** |
| `unsized` | Unsized | Single with no used-car count (incl. unsized franchise) — enrich to classify |

> The earlier `mm_group_2_5` / `mm_group_6_10` options are deprecated (merged into `mm_group`); they
> remain in the property only so HubSpot doesn't reject removing in-use values — archive them in the UI
> once the re-tag has emptied them.

---

## 2. Inputs

Per-company fields (already on the Company object):

- `type_of_dealership` — `Franchise` | `Independent` (may be empty)
- `number_of_used_cars` — number (may be empty)
- `dealership_group_name` — text (empty = standalone single dealer)
- `country_dropdown`, `website_status` — only used to scope the **relevant base**
  (United States AND website status Relevant or empty). Tag everything; the dashboard
  filters to the relevant base downstream. Tagging out-of-region records is harmless.

**Group-level fields that must be resolved onto the company (the one prerequisite):**

- `group_rooftop_count` — the canonical rooftop count of the company's dealer group
- `group_is_top_150` — boolean: is the group `dealership_rank = "Top 150"`?

These live on the **Dealership Group Names** custom object (`2-169112502`), which has the
canonical `rooftops` rollup and `dealership_rank`. The company joins to its group by
**normalized `dealership_group_name`** (trim, collapse internal whitespace, lowercase).
**A per-company HubSpot formula cannot read the group object directly** — so one of these
must happen first:

1. Associate each company to its group record and use an association-based rollup to copy
   `rooftops` and a Top-150 flag onto the company, **or**
2. Stamp `group_rooftop_count` / `group_is_top_150` onto companies via a data-ops workflow
   keyed on the normalized group name, **or**
3. Let the dashboard sync write the final `market_segment` value back (see §5, Approach A —
   recommended, because the sync already does the join and computes the exact value).

Canonical rooftop count fallback (match the dashboard): use the group object's `rooftops`
rollup; if it is 0 or missing, fall back to the count of member company records in the group.

---

## 3. Decision tree (authoritative)

Evaluate top to bottom; first match wins.

```
STEP 1 — Group or Single?
  IF dealership_group_name is set
     AND (group_rooftop_count >= 2 OR group_is_top_150 = true):
        → GROUP  (go to Step 2)
  ELSE:
        → SINGLE (go to Step 3)
  # A "group" with only 1 rooftop (and not Top 150) is a single dealer.

STEP 2 — GROUP, by canonical rooftop count (v2 bands):
  IF group_is_top_150 = true        → Top 150            # overrides all (all regions)
  ELSE IF group_rooftop_count > 15  → Enterprise C       # 16+
  ELSE IF group_rooftop_count >= 11 → Enterprise B       # 11–15
  ELSE IF group_rooftop_count >= 7  → Enterprise A       # 7–10
  ELSE                              → Mid Market - Group  # 2–6

STEP 3 — SINGLE, by dealership type + used cars:
  IF number_of_used_cars is empty          → Unsized   # incl. unsized franchise
  ELSE IF type_of_dealership = "Franchise" → Mid Market - Single   # ALL franchise singles
  ELSE:   # Independent or untyped
        IF number_of_used_cars <= 100        → SMB
        ELSE                                 → Mid Market - Single
```

Thresholds (from `lib/constants.ts`): `SMB_USED_CAR_MAX = 100` (independent/untyped only),
`MID_MARKET_ROOFTOP_MIN = 2`, `MID_MARKET_ROOFTOP_MAX = 6` (MM-Group 2–6),
`ENTERPRISE_A_ROOFTOP_MAX = 10` (Ent-A 7–10), `ENTERPRISE_B_ROOFTOP_MAX = 15` (Ent-B 11–15; 16+ → Ent-C),
`TOP_150_RANK = "Top 150"`.

**Top 150 spans all regions.** Unlike the other segments (US relevant base), the write-back tags every
Top-150 group member regardless of country or website status, and the dashboard counts Top-150 across
all regions (`segmentation.top150AllRegions`).

**Franchise singles are always Mid Market** (never SMB), regardless of used-car count —
franchise rooftops monetize differently. SMB is therefore independent-only (among singles).
An unsized franchise single (no used-car count) stays `Unsized`, not Mid Market — it has no
size signal and is not "SMB". `type_of_dealership` is read only for this franchise
short-circuit; rooftop-based group sizing is type-agnostic.

---

## 4. Implementation in HubSpot (native)

If implemented as a **workflow** (company-based, re-enrollment on changes to the input
fields), build the branches in the Step 1→2→3 order above. Order matters: Top 150 and the
group/single split must be evaluated before the used-car bands.

A **calculated property** can express Step 3 (single sizing) alone, but cannot do the
group join in Step 1/2 — so it still needs `group_rooftop_count` / `group_is_top_150`
present on the company. Practically, a workflow is the cleaner native option.

---

## 5. Recommended: tag from the dashboard sync (Approach A) — IMPLEMENTED

The sync pipeline (`scripts/sync.ts` → `tagSegments`) already does the group-name join and
computes the exact segment (`sg` tag) for every company, using the canonical Dealership Group
Names rollup. So the write-back lives in the sync rather than re-implementing the group join as a
workflow. Implemented in `lib/hubspot/writeMarketSegment.ts` and called (gated) at the end of
`scripts/sync.ts`. Top-150 members are tagged regardless of region (write-back scope exception).

`sg` → `market_segment` internal value (see `marketSegmentValue()`):

| `sg` | `market_segment` value |
|---|---|
| `SMB` | `smb` |
| `MM_SINGLE` | `mm_single` |
| `MM_GROUP` | `mm_group` |
| `ENT_A` | `enterprise_a` |
| `ENT_B` | `enterprise_b` |
| `ENT_C` | `enterprise_c` |
| `TOP_150` | `top_150` |
| `UNSIZED` | `unsized` |

### One-time setup
1. **Create the property.** `market_segment` single-select enum on Company, with the option
   internal values from §1. (The MCP integration cannot create properties — use the HubSpot
   UI: Settings → Properties → Create property → Company → Dropdown select; or the Management
   API `POST /crm/v3/properties/companies` with those `options`.)
2. **Scope the PAT.** `HUBSPOT_PAT` needs `crm.objects.companies.write` (read-only PATs fail
   the batch update with 403).

### Running it
The write-back is **off by default** — a normal sync never mutates the CRM. Control it with env:

| Env var | Values | Default |
|---|---|---|
| `MARKET_SEGMENT_WRITEBACK` | `off` \| `dry-run` \| `write` | `off` |
| `MARKET_SEGMENT_SCOPE` | `relevant` \| `all` | `relevant` |

```bash
# 1) Dry run first — logs the segment distribution, writes nothing:
MARKET_SEGMENT_WRITEBACK=dry-run npm run sync
# 2) Verify the printed counts match expectations, then write for real:
MARKET_SEGMENT_WRITEBACK=write npm run sync
```

`relevant` (default) tags only the relevant US base (the dashboard universe and the validated
numbers below); `all` tags every fetched company. Write-back runs **after** the dashboard blob
+ success status are written and is wrapped in its own try/catch, so a tagging failure cannot
mark the dashboard sync as failed. Batches of 100 via
`POST /crm/v3/objects/companies/batch/update`, reusing `lib/hubspot/client.ts` (429 backoff).
Re-running re-tags from fresh data, so the property stays current with used-car / rollup changes.

---

## 6. Validation (live HubSpot, relevant US base, 2026-06-24)

Single = `dealership_group_name` empty; relevant base = `country_dropdown = United States`
AND (`website_status = Relevant` OR empty). All reproduced via independent HubSpot counts:

| Slice | Count | Resulting segment |
|---|---|---|
| Franchise single, ≤100 used cars (**all** franchise SMB) | **5,371** | `mm_single` (all move to Mid Market) |
| ↳ of which 51–100 used cars | 1,989 | `mm_single` |
| ↳ of which ≤50 used cars | 3,382 | `mm_single` |
| Franchise single, no used-car count | **683** | `unsized` (stays — no size signal) |
| Independent single, ≤100 used cars | **33,823** | `smb` |

After the re-tag: among singles, **SMB is independent-only**. All 5,371 sized franchise singles
become `mm_single` (plus franchise singles with >100 used cars, already Mid Market); the 683
unsized franchise singles stay `unsized`. 1-rooftop "groups" (≈140 in the current data) are
re-tagged as singles and sized by §3.

The full per-segment totals are printed by the sync summary (`scripts/sync.ts`) and the
write-back's own distribution log (run with `MARKET_SEGMENT_WRITEBACK=dry-run`), which are the
end-to-end source of truth after a re-sync.

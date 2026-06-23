# HubSpot `Market_segment` Property — Implementation Spec

This is the authoritative segmentation logic for tagging every HubSpot **Company** (one
company record = one dealership rooftop) with a `Market_segment` value. It mirrors the
dashboard's sync-time tagging in `lib/aggregation/segment.ts` (`tagSegments`) exactly — the
dashboard is the reference implementation, this property is the HubSpot mirror.

Validated against live HubSpot on 2026-06-24 (relevant US base). See **Validation** below.

---

## 1. The segment values

Property: `market_segment` — single-select **enumeration** on the Company object.

| Value (enum) | Meaning |
|---|---|
| `SMB` | Single dealer within the SMB cap (Franchise ≤50, Independent ≤100 used cars) |
| `Mid Market - Single` | Single dealer above the SMB cap (Franchise >50, Independent >100 used cars) — 1 rooftop |
| `Mid Market - Group (2-5)` | Dealer group with 2–5 rooftops |
| `Mid Market - Group (6-10)` | Dealer group with 6–10 rooftops |
| `Enterprise A` | Dealer group with 11–15 rooftops |
| `Enterprise B` | Dealer group with 16+ rooftops (not Top 150) |
| `Enterprise C` | Top 150 dealer group (`dealership_rank = "Top 150"`) |
| `Unsized` | Single dealer with no used-car count — enrich to classify |

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

STEP 2 — GROUP, by canonical rooftop count:
  IF group_is_top_150 = true        → Enterprise C      # overrides all
  ELSE IF group_rooftop_count > 15  → Enterprise B
  ELSE IF group_rooftop_count >= 11 → Enterprise A       # 11–15
  ELSE IF group_rooftop_count >= 6  → Mid Market - Group (6-10)
  ELSE                              → Mid Market - Group (2-5)   # 2–5

STEP 3 — SINGLE, by used cars + dealership type:
  IF number_of_used_cars is empty   → Unsized
  ELSE IF type_of_dealership = "Franchise":
        IF number_of_used_cars <= 50  → SMB
        ELSE                          → Mid Market - Single
  ELSE:   # Independent or untyped
        IF number_of_used_cars <= 100 → SMB
        ELSE                          → Mid Market - Single
```

Thresholds (from `lib/constants.ts`): `SMB_USED_CAR_MAX_FRANCHISE = 50`,
`SMB_USED_CAR_MAX = 100`, `MID_MARKET_ROOFTOP_MIN = 2`, `MID_MARKET_ROOFTOP_MAX = 10`,
`ENTERPRISE_A_ROOFTOP_MAX = 15`, `TOP_150_RANK = "Top 150"`.

**The asymmetric SMB ceiling (Franchise 50 vs Independent 100) is deliberate** — franchise
rooftops monetize differently. In HubSpot this is the one branch that reads
`type_of_dealership`; everything else is type-agnostic.

---

## 4. Implementation in HubSpot (native)

If implemented as a **workflow** (company-based, re-enrollment on changes to the input
fields), build the branches in the Step 1→2→3 order above. Order matters: Top 150 and the
group/single split must be evaluated before the used-car bands.

A **calculated property** can express Step 3 (single sizing) alone, but cannot do the
group join in Step 1/2 — so it still needs `group_rooftop_count` / `group_is_top_150`
present on the company. Practically, a workflow is the cleaner native option.

---

## 5. Recommended: tag from the dashboard sync (Approach A)

The sync pipeline (`scripts/sync.ts` → `tagSegments`) already does the group-name join and
computes the exact segment (`sg` tag, plus `ss` for the MM-group band) for every company,
using the canonical Dealership Group Names rollup. The most accurate and lowest-risk way to
populate `market_segment` is to **write the computed value back to HubSpot** rather than
re-implement the group join in a workflow:

1. Create the `market_segment` enum property (UI or Management API — the MCP integration
   cannot create properties).
2. Extend the sync to map each record's `sg`/`ss` → the enum value in §1 and batch-update
   companies via the HubSpot batch API (`POST /crm/v3/objects/companies/batch/update`,
   100 records/call, respect rate limits / backoff like `lib/hubspot/client.ts`).
3. Re-run on the existing sync cadence so the tag stays fresh as used-car counts and group
   rollups change.

`sg`/`ss` → enum mapping:

| `sg` | `ss` | `market_segment` |
|---|---|---|
| `SMB` | — | `SMB` |
| `MM_SINGLE` | — | `Mid Market - Single` |
| `MM_GROUP` | `2-5` | `Mid Market - Group (2-5)` |
| `MM_GROUP` | `6-10` | `Mid Market - Group (6-10)` |
| `ENT_A` | — | `Enterprise A` |
| `ENT_B` | — | `Enterprise B` |
| `ENT_C` | — | `Enterprise C` |
| `UNSIZED` | — | `Unsized` |

> Note: `sg`/`ss` are currently baked only onto the in-memory records during sync and are
> **not** persisted with the HubSpot company id available for write-back at that point — the
> write-back step needs the company object id (`hi`) alongside the computed tag. That id is
> available on each `MinifiedRecord` (`hi`), so the write-back can run in the same pass that
> computes the tags, before they are minified into the blob.

---

## 6. Validation (live HubSpot, relevant US base, 2026-06-24)

Single = `dealership_group_name` empty; relevant base = `country_dropdown = United States`
AND (`website_status = Relevant` OR empty). All reproduced via independent HubSpot counts:

| Slice | Count | Resulting segment |
|---|---|---|
| Franchise single, 51–100 used cars | **1,989** | `Mid Market - Single` (moved out of SMB) |
| Franchise single, ≤50 used cars | **3,382** | `SMB` |
| Independent single, ≤100 used cars | **33,823** | `SMB` |

After the re-tag: **SMB = 3,382 + 33,823 = 37,205** (single dealers; down exactly 1,989 from
the prior 39,194). The 1,989 franchise singles move to `Mid Market - Single`. 1-rooftop
"groups" (≈140 in the current data) are re-tagged as singles and sized by §3.

The exact 1-rooftop-group count and the full per-segment totals are printed by the sync run's
summary (`scripts/sync.ts`), which is the end-to-end source of truth after a re-sync.

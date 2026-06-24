import type {
  MinifiedRecord,
  DealerGroup,
  DealerGroupRow,
  SegmentCode,
  GroupType,
  CountMetric,
  GroupRow,
  SegmentationData,
} from '../../types/dashboard';
import {
  SMB_USED_CAR_MAX,
  MID_MARKET_ROOFTOP_MIN,
  MID_MARKET_ROOFTOP_MAX,
  ENTERPRISE_A_ROOFTOP_MAX,
  ENTERPRISE_B_ROOFTOP_MAX,
  TOP_150_RANK,
} from '../constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalize a group name for joining: trim, collapse internal whitespace, lowercase. */
export function normalizeGroupName(name: string | null | undefined): string {
  if (!name) return '';
  return name.replace(/\s+/g, ' ').trim().toLowerCase();
}

function parseUsedCars(value: string | null): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * A group's segment from its canonical rooftop count + Top-150 rank (v2 bands).
 * Top-150 rank overrides all rooftop bands into its own region-independent segment.
 */
function segmentForGroup(rooftops: number, isTop150: boolean): SegmentCode {
  if (isTop150) return 'TOP_150';
  if (rooftops > ENTERPRISE_B_ROOFTOP_MAX) return 'ENT_C'; // 16+
  if (rooftops > ENTERPRISE_A_ROOFTOP_MAX) return 'ENT_B'; // 11-15
  if (rooftops > MID_MARKET_ROOFTOP_MAX) return 'ENT_A';   // 7-10
  return 'MM_GROUP';                                       // 2-6
}

type GroupVerdict = { sg: SegmentCode; gt: GroupType; rooftops: number };

// ─── Tagging (sync time) ────────────────────────────────────────────────────

/**
 * Mutates each record in place, baking the AOP segment tags `sg`/`gt`.
 *
 * A record is a GROUP only if it has a `gn` AND its group's canonical rooftop count is
 * >= MID_MARKET_ROOFTOP_MIN (2), or the group is Top-150. Groups are sized by canonical
 * rooftops (group-object `rooftops` rollup, falling back to member-record count when
 * missing/zero): 2-6 => MM_GROUP, 7-10 => ENT_A, 11-15 => ENT_B, 16+ => ENT_C. A Top-150
 * ranked group overrides all bands into the TOP_150 segment.
 *
 * Everything else is a SINGLE — no group name, OR a 1-rooftop "group" (functionally a
 * single dealer). Franchise singles are ALWAYS MM_SINGLE (never SMB). Independent/untyped
 * singles are SMB at <=100 used cars, else MM_SINGLE. Any single missing a used-car count
 * is UNSIZED (including unsized franchise).
 */
export function tagSegments(records: MinifiedRecord[], groups: DealerGroup[]): DealerGroupRow[] {
  // 1. Canonical group data keyed by normalized name (merge duplicate records).
  const groupMap = new Map<string, { rooftops: number | null; rank: string | null; name: string }>();
  for (const g of groups) {
    const key = normalizeGroupName(g.name);
    if (!key) continue;
    const existing = groupMap.get(key);
    if (!existing) {
      groupMap.set(key, { rooftops: g.rooftops, rank: g.rank, name: g.name.trim() });
    } else {
      existing.rooftops = Math.max(existing.rooftops ?? 0, g.rooftops ?? 0) || existing.rooftops;
      if (g.rank === TOP_150_RANK) existing.rank = TOP_150_RANK;
    }
  }

  // 2. Per-group member tallies from the company records.
  const tally = new Map<string, { n: number; fr: number; ind: number; name: string }>();
  for (const r of records) {
    const key = normalizeGroupName(r.gn);
    if (!key) continue;
    let t = tally.get(key);
    if (!t) { t = { n: 0, fr: 0, ind: 0, name: (r.gn ?? '').trim() || key }; tally.set(key, t); }
    t.n++;
    if (r.td === 'Franchise') t.fr++;
    else if (r.td === 'Independent') t.ind++;
  }

  // 3. Resolve each group's verdict once (for groups that have member records).
  const verdict = new Map<string, GroupVerdict>();
  for (const [key, t] of tally) {
    const meta = groupMap.get(key);
    const rollup = meta?.rooftops ?? null;
    const rooftops = rollup != null && rollup > 0 ? rollup : t.n;
    const isTop150 = meta?.rank === TOP_150_RANK;
    // A "group" with only 1 rooftop is functionally a single dealer — leave it
    // without a group verdict so step 4 sizes its records as singles (by used cars).
    // Top-150 is a curated list and always stays a group.
    if (rooftops < MID_MARKET_ROOFTOP_MIN && !isTop150) continue;
    const gt: GroupType = t.fr > t.ind ? 'GFD' : 'IGD'; // 50/50 tie -> IGD
    const sg = segmentForGroup(rooftops, isTop150);
    verdict.set(key, { sg, gt, rooftops });
  }

  // 4. Bake tags onto every record.
  for (const r of records) {
    const key = normalizeGroupName(r.gn);
    if (key) {
      const v = verdict.get(key);
      if (v) {
        r.sg = v.sg;
        r.gt = v.gt;
        continue;
      }
    }
    // Single dealer (no group, or a demoted 1-rooftop "group").
    // Franchise singles are ALWAYS Mid Market (never SMB), regardless of used cars.
    // Independent / untyped singles are SMB up to the used-car cap, else Mid Market.
    // A single with no used-car count is UNSIZED (including unsized franchise — it has
    // no size signal and is not "SMB"; enrich to classify).
    const cars = parseUsedCars(r.uc);
    if (cars == null) {
      r.sg = 'UNSIZED';
    } else if (r.td === 'Franchise') {
      r.sg = 'MM_SINGLE';
    } else {
      r.sg = cars <= SMB_USED_CAR_MAX ? 'SMB' : 'MM_SINGLE';
    }
    r.gt = null;
  }

  // 5. Canonical dealer-group target list. Seeded from the group OBJECT so the
  //    count is region-independent ("Top 150" always shows 150, even for groups
  //    with no rooftops in the relevant base). Orphan groups that appear only on
  //    company records (no group-object row) are appended.
  const groupRows: DealerGroupRow[] = [];
  const seen = new Set<string>();
  for (const [key, meta] of groupMap) {
    seen.add(key);
    const t = tally.get(key);
    const isTop150 = meta.rank === TOP_150_RANK;
    const rollup = meta.rooftops ?? null;
    const rooftops = rollup != null && rollup > 0 ? rollup : t ? t.n : 0;
    // A group with fewer than 2 rooftops is a single dealer, not a group account —
    // exclude it from the target list (its records are tagged as singles in step 4).
    // Top-150 groups are always kept regardless of rollup.
    if (rooftops < MID_MARKET_ROOFTOP_MIN && !isTop150) continue;
    const gt: GroupType = t ? (t.fr >= t.ind ? 'GFD' : 'IGD') : 'GFD';
    groupRows.push({
      name: meta.name || (t?.name ?? key),
      segment: segmentForGroup(rooftops, isTop150),
      type: gt,
      rooftops,
      rank: isTop150 ? TOP_150_RANK : '',
      members: t ? t.n : 0,
    });
  }
  // Orphan groups present on company records but missing from the group object.
  for (const [key, v] of verdict) {
    if (seen.has(key)) continue;
    const t = tally.get(key)!;
    groupRows.push({ name: t.name, segment: v.sg, type: v.gt, rooftops: v.rooftops, rank: '', members: t.n });
  }
  groupRows.sort((a, b) => b.rooftops - a.rooftops);
  return groupRows;
}

// ─── Summarizing (sync + filter time) ──────────────────────────────────────────

const SEGMENT_CODES: SegmentCode[] = ['SMB', 'MM_SINGLE', 'MM_GROUP', 'ENT_A', 'ENT_B', 'ENT_C', 'TOP_150', 'UNSIZED'];

class Counter {
  rooftops = 0;
  private ids = new Set<string>();
  private missing = 0;
  add(r: MinifiedRecord) {
    this.rooftops++;
    const key = r.oi || r.gi;
    if (key) this.ids.add(key);
    else this.missing++;
  }
  metric(): CountMetric {
    return { rooftops: this.rooftops, companies: this.ids.size + this.missing };
  }
}

/**
 * Builds the segmentation report over an already-relevant record set. Reads the baked
 * `sg`/`gt` tags, so it works identically at sync time and on every client-side filter.
 * Note: the Top-150 segment here is relevant-base only; the all-regions Top-150 metric is
 * computed at sync and carried separately on `segmentation.top150AllRegions`.
 */
export function buildSegmentation(records: MinifiedRecord[]): SegmentationData {
  const bySegment = new Map<SegmentCode, Counter>();
  for (const code of SEGMENT_CODES) bySegment.set(code, new Counter());
  const mmGroupByType: Record<GroupType, Counter> = { GFD: new Counter(), IGD: new Counter() };

  // Distinct dealer groups per (group) segment for the account-level view.
  const groupSegments: SegmentCode[] = ['MM_GROUP', 'ENT_A', 'ENT_B', 'ENT_C', 'TOP_150'];
  const distinctGroups = new Map<SegmentCode, Set<string>>(
    groupSegments.map((s) => [s, new Set<string>()])
  );

  let available = false;
  for (const r of records) {
    if (!r.sg) continue;
    available = true;
    bySegment.get(r.sg)?.add(r);
    if (r.sg === 'MM_GROUP' && r.gt) mmGroupByType[r.gt].add(r);
    const groupSet = distinctGroups.get(r.sg);
    if (groupSet && r.gn) groupSet.add(normalizeGroupName(r.gn));
  }

  // Account view: a dealer group counts once; singles count individually (rooftops).
  const accounts = Object.fromEntries(
    SEGMENT_CODES.map((code) => {
      const set = distinctGroups.get(code);
      return [code, set ? set.size : bySegment.get(code)!.rooftops];
    })
  ) as Record<SegmentCode, number>;

  const segMetric = (code: SegmentCode) => bySegment.get(code)!.metric();

  const enterpriseTiers: GroupRow[] = (
    [
      ['ENT_A', 'Enterprise-A (7-10 rooftops)'],
      ['ENT_B', 'Enterprise-B (11-15 rooftops)'],
      ['ENT_C', 'Enterprise-C (16+ rooftops)'],
      ['TOP_150', 'Top 150'],
    ] as [SegmentCode, string][]
  ).map(([code, label]) => {
    const m = segMetric(code);
    return { key: code, label, rooftops: m.rooftops, companies: m.companies };
  });

  const bySegmentOut = Object.fromEntries(
    SEGMENT_CODES.map((code) => [code, segMetric(code)])
  ) as Record<SegmentCode, CountMetric>;

  return {
    available,
    bySegment: bySegmentOut,
    accounts,
    mmGroupByType: { GFD: mmGroupByType.GFD.metric(), IGD: mmGroupByType.IGD.metric() },
    enterpriseTiers,
    groups: [], // canonical list is attached at sync time and preserved across filters
  };
}

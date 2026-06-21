import type {
  MinifiedRecord,
  DealerGroup,
  DealerGroupRow,
  SegmentCode,
  GroupType,
  SubSector,
  CountMetric,
  GroupRow,
  SegmentationData,
} from '../../types/dashboard';
import {
  SMB_USED_CAR_MAX,
  MID_MARKET_ROOFTOP_MAX,
  ENTERPRISE_A_ROOFTOP_MAX,
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

function subSectorFor(rooftops: number): SubSector {
  if (rooftops <= 1) return '1';
  if (rooftops <= 3) return '2-3';
  if (rooftops <= 6) return '4-6';
  return '7-10';
}

/** A group's segment from its canonical rooftop count + Top-150 rank (region-independent). */
function segmentForGroup(rooftops: number, isTop150: boolean): SegmentCode {
  if (isTop150) return 'ENT_C';
  if (rooftops > ENTERPRISE_A_ROOFTOP_MAX) return 'ENT_B';
  if (rooftops > MID_MARKET_ROOFTOP_MAX) return 'ENT_A';
  return 'MM_GROUP';
}

type GroupVerdict = { sg: SegmentCode; gt: GroupType; ss: SubSector | null; rooftops: number };

// ─── Tagging (sync time) ────────────────────────────────────────────────────

/**
 * Mutates each record in place, baking the AOP segment tags `sg`/`gt`/`ss`.
 *
 * Singles (no `gn`) are sized by used-car count. Group members are classified by
 * their group's canonical rooftop count (group-object `rooftops` rollup, falling
 * back to the count of member records when the rollup is missing/zero) and the
 * majority dealership type across the group's members. Top-150 groups => Ent-C.
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
    const gt: GroupType = t.fr > t.ind ? 'GFD' : 'IGD'; // 50/50 tie -> IGD
    const sg = segmentForGroup(rooftops, isTop150);
    verdict.set(key, { sg, gt, ss: sg === 'MM_GROUP' ? subSectorFor(rooftops) : null, rooftops });
  }

  // 4. Bake tags onto every record.
  for (const r of records) {
    const key = normalizeGroupName(r.gn);
    if (key) {
      const v = verdict.get(key);
      if (v) {
        r.sg = v.sg;
        r.gt = v.gt;
        r.ss = v.ss;
        continue;
      }
    }
    // Single dealer — size by used cars.
    const cars = parseUsedCars(r.uc);
    r.sg = cars == null ? 'UNSIZED' : cars <= SMB_USED_CAR_MAX ? 'SMB' : 'MM_SINGLE';
    r.gt = null;
    r.ss = null;
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
    // Skip empty shells (no rooftops AND no members) unless they're ranked Top 150.
    if (rooftops <= 0 && !isTop150) continue;
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

const SEGMENT_CODES: SegmentCode[] = ['SMB', 'MM_SINGLE', 'MM_GROUP', 'ENT_A', 'ENT_B', 'ENT_C', 'UNSIZED'];

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

const SUBSECTORS: SubSector[] = ['2-3', '4-6', '7-10', '1'];
const SUBSECTOR_LABEL: Record<SubSector, string> = {
  '1': '1 rooftop',
  '2-3': '2-3 rooftops',
  '4-6': '4-6 rooftops',
  '7-10': '7-10 rooftops',
};

/**
 * Builds the segmentation report over an already-relevant record set. Reads the
 * baked `sg`/`gt`/`ss` tags, so it works identically at sync time and on every
 * client-side filter re-aggregation.
 */
export function buildSegmentation(records: MinifiedRecord[]): SegmentationData {
  const bySegment = new Map<SegmentCode, Counter>();
  for (const code of SEGMENT_CODES) bySegment.set(code, new Counter());
  const mmGroupByType: Record<GroupType, Counter> = { GFD: new Counter(), IGD: new Counter() };
  const mmSub: Record<GroupType, Map<SubSector, Counter>> = {
    GFD: new Map(SUBSECTORS.map((s) => [s, new Counter()])),
    IGD: new Map(SUBSECTORS.map((s) => [s, new Counter()])),
  };

  // Distinct dealer groups per (group) segment for the account-level view.
  const groupSegments: SegmentCode[] = ['MM_GROUP', 'ENT_A', 'ENT_B', 'ENT_C'];
  const distinctGroups = new Map<SegmentCode, Set<string>>(
    groupSegments.map((s) => [s, new Set<string>()])
  );

  let available = false;
  for (const r of records) {
    if (!r.sg) continue;
    available = true;
    bySegment.get(r.sg)?.add(r);
    if (r.sg === 'MM_GROUP' && r.gt) {
      mmGroupByType[r.gt].add(r);
      if (r.ss) mmSub[r.gt].get(r.ss)?.add(r);
    }
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
  const subRows = (gt: GroupType): GroupRow[] =>
    SUBSECTORS.map((s) => {
      const m = mmSub[gt].get(s)!.metric();
      return { key: s, label: SUBSECTOR_LABEL[s], rooftops: m.rooftops, companies: m.companies };
    }).filter((row) => row.rooftops > 0);

  const enterpriseTiers: GroupRow[] = (
    [
      ['ENT_A', 'Enterprise-A (11-15 rooftops)'],
      ['ENT_B', 'Enterprise-B (16+ rooftops)'],
      ['ENT_C', 'Enterprise-C (Top 150)'],
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
    mmSubSectors: { GFD: subRows('GFD'), IGD: subRows('IGD') },
    enterpriseTiers,
    groups: [], // canonical list is attached at sync time and preserved across filters
  };
}

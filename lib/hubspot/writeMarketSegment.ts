/**
 * Writes the computed AOP segment back to each HubSpot company's `market_segment`
 * property. Runs from scripts/sync.ts AFTER tagSegments has baked `sg`/`ss` onto the
 * records (which still carry the HubSpot company id `hi`).
 *
 * This reuses the dashboard's validated group-join + sizing logic rather than
 * re-implementing it as a HubSpot workflow — see docs/market-segment-hubspot-spec.md.
 *
 * Prerequisites (one-time, outside this repo):
 *   1. Create a single-select enumeration property `market_segment` on Company with the
 *      option *internal values* below (labels can be anything readable).
 *   2. The HUBSPOT_PAT must have `crm.objects.companies.write` scope.
 *
 * Gated by env so a normal sync never touches HubSpot unless explicitly asked:
 *   MARKET_SEGMENT_WRITEBACK = off (default) | dry-run | write
 *   MARKET_SEGMENT_SCOPE     = relevant (default) | all
 */

import { hubspotFetch } from './client';
import type { MinifiedRecord } from '../../types/dashboard';

export const MARKET_SEGMENT_PROPERTY = 'market_segment';

export type WriteMode = 'off' | 'dry-run' | 'write';

/** Maps a baked segment tag (`sg`) to the `market_segment` enum internal value (v2). */
export function marketSegmentValue(r: MinifiedRecord): string | null {
  switch (r.sg) {
    case 'SMB': return 'smb';
    case 'MM_SINGLE': return 'mm_single';
    case 'MM_GROUP': return 'mm_group';
    case 'ENT_A': return 'enterprise_a';
    case 'ENT_B': return 'enterprise_b';
    case 'ENT_C': return 'enterprise_c';
    case 'TOP_150': return 'top_150';
    case 'UNSIZED': return 'unsized';
    default: return null;
  }
}

/** Human-readable labels for the enum values (for the property setup + dry-run log). */
export const MARKET_SEGMENT_LABELS: Record<string, string> = {
  smb: 'SMB',
  mm_single: 'Mid Market - Single',
  mm_group: 'Mid Market - Group (2-6)',
  enterprise_a: 'Enterprise A (7-10)',
  enterprise_b: 'Enterprise B (11-15)',
  enterprise_c: 'Enterprise C (16+)',
  top_150: 'Top 150',
  unsized: 'Unsized',
};

const BATCH_SIZE = 100; // HubSpot batch/update max inputs per call

export interface WriteOptions {
  mode: WriteMode;
  /** Predicate for the relevant US base (passed in from sync to match the dashboard). */
  isRelevant: (r: MinifiedRecord) => boolean;
  /** 'relevant' tags only the relevant US base; 'all' tags every fetched company. */
  scope?: 'relevant' | 'all';
}

/**
 * Tags companies with `market_segment`. In dry-run mode it only logs the distribution.
 * Returns the number of companies that would be / were updated.
 */
export async function writeMarketSegments(
  records: MinifiedRecord[],
  opts: WriteOptions
): Promise<number> {
  if (opts.mode === 'off') return 0;
  const scope = opts.scope ?? 'relevant';

  // Top-150 is region-independent: tag every Top-150 group member regardless of country
  // or website status, even when scope is the (US) relevant base.
  const targets = records.filter(
    (r) => r.hi && r.sg && (scope === 'all' || r.sg === 'TOP_150' || opts.isRelevant(r))
  );

  // Distribution (sanity-check before any write).
  const dist: Record<string, number> = {};
  for (const r of targets) {
    const v = marketSegmentValue(r);
    if (v) dist[v] = (dist[v] ?? 0) + 1;
  }
  console.log(
    `\n[MarketSegment] mode=${opts.mode} scope=${scope} — ${targets.length.toLocaleString()} companies`
  );
  for (const [v, n] of Object.entries(dist).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${MARKET_SEGMENT_LABELS[v] ?? v} (${v}): ${n.toLocaleString()}`);
  }

  if (opts.mode === 'dry-run') {
    console.log('[MarketSegment] dry-run — no writes performed.');
    return targets.length;
  }

  // Write mode: batch-update via the HubSpot batch API.
  let done = 0;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const chunk = targets.slice(i, i + BATCH_SIZE);
    const inputs = chunk.map((r) => ({
      id: r.hi as string,
      properties: { [MARKET_SEGMENT_PROPERTY]: marketSegmentValue(r) as string },
    }));
    const res = await hubspotFetch('/crm/v3/objects/companies/batch/update', {
      method: 'POST',
      body: JSON.stringify({ inputs }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `[MarketSegment] batch update failed at ${done}/${targets.length} (HTTP ${res.status}): ${text}`
      );
    }
    done += chunk.length;
    if (i % (BATCH_SIZE * 25) === 0 || done === targets.length) {
      console.log(`[MarketSegment] updated ${done.toLocaleString()}/${targets.length.toLocaleString()}`);
    }
  }
  console.log(`[MarketSegment] done — wrote market_segment to ${done.toLocaleString()} companies.`);
  return done;
}

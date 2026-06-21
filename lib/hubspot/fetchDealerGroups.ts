import { hubspotFetch } from './client';
import { DEALER_GROUP_OBJECT_TYPE, PAGE_SIZE } from '../constants';
import type { DealerGroup } from '../../types/dashboard';

/**
 * Fetches every dealer-group record from the "Dealership Group Names" custom
 * object (see DEALER_GROUP_OBJECT_TYPE) via the List API.
 *
 * The group object is the source of truth for a group's canonical rooftop count
 * (`rooftops` rollup) and its Top-150 rank (`dealership_rank`). It has no gd_id /
 * org_id, so callers join to companies by normalized `dealship_group_name`.
 *
 * ~3,346 records — small and fast (a few pages).
 */
export async function fetchDealerGroups(): Promise<DealerGroup[]> {
  const groups: DealerGroup[] = [];
  let after: string | undefined;

  do {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      properties: 'dealship_group_name,rooftops,dealership_rank',
    });
    if (after) params.set('after', after);

    const res = await hubspotFetch(
      `/crm/v3/objects/${DEALER_GROUP_OBJECT_TYPE}?${params.toString()}`
    );
    const json = await res.json();

    if (!json.results || !Array.isArray(json.results)) {
      throw new Error(
        `Unexpected dealer-group response shape: ${JSON.stringify(json).slice(0, 200)}`
      );
    }

    for (const result of json.results) {
      const p = result.properties as Record<string, string | null>;
      const name = (p.dealship_group_name ?? '').trim();
      if (!name) continue;
      const rooftopsRaw = p.rooftops;
      const rooftops =
        rooftopsRaw != null && rooftopsRaw !== '' ? Number(rooftopsRaw) : null;
      groups.push({
        name,
        rooftops: rooftops != null && Number.isFinite(rooftops) ? rooftops : null,
        rank: p.dealership_rank && p.dealership_rank.trim() !== '' ? p.dealership_rank.trim() : null,
      });
    }

    after = json.paging?.next?.after;
  } while (after);

  console.log(`[Fetch] Done. ${groups.length} dealer-group records.`);
  return groups;
}

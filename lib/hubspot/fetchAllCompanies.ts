import { hubspotFetch } from './client';
import { REQUIRED_PROPERTIES, PAGE_SIZE, FIELD_MAP } from '../constants';
import type { HubSpotFieldKey } from '../constants';
import type { MinifiedRecord } from '../../types/dashboard';

type RawProperties = Record<string, string | null>;

/**
 * Fetches ALL companies from HubSpot using the List API (not Search API).
 *
 * Why List API and not Search API:
 * - The Search API (/crm/v3/objects/companies/search) has an undocumented 10K result cap
 * - The List API (/crm/v3/objects/companies) has no cap — returns all records via cursor pagination
 * - website_status filtering is done client-side after fetch
 *
 * @param onProgress Callback fired after each page with total records fetched so far
 */
export async function fetchAllCompanies(
  onProgress?: (fetched: number) => Promise<void> | void
): Promise<MinifiedRecord[]> {
  const records: MinifiedRecord[] = [];
  let after: string | undefined;
  let pageCount = 0;

  const propertiesParam = REQUIRED_PROPERTIES.join(',');

  do {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      properties: propertiesParam,
    });
    if (after) params.set('after', after);

    const res = await hubspotFetch(`/crm/v3/objects/companies?${params.toString()}`);
    const json = await res.json();

    if (!json.results || !Array.isArray(json.results)) {
      throw new Error(`Unexpected response shape: ${JSON.stringify(json).slice(0, 200)}`);
    }

    for (const result of json.results) {
      records.push(minifyRecord(result.properties as RawProperties));
    }

    after = json.paging?.next?.after;
    pageCount++;

    if (pageCount % 50 === 0) {
      console.log(`[Fetch] Page ${pageCount}: ${records.length} records fetched so far`);
    }

    if (onProgress) {
      await onProgress(records.length);
    }
  } while (after);

  console.log(`[Fetch] Done. ${records.length} total records across ${pageCount} pages.`);
  return records;
}

/**
 * Maps a raw HubSpot properties object to a MinifiedRecord using the FIELD_MAP.
 * Null/empty strings are normalized to null.
 */
function minifyRecord(props: RawProperties): MinifiedRecord {
  const record: Partial<MinifiedRecord> = {};

  for (const [hsKey, minKey] of Object.entries(FIELD_MAP) as [HubSpotFieldKey, string][]) {
    const val = props[hsKey];
    (record as Record<string, string | null>)[minKey] = val && val.trim() !== '' ? val.trim() : null;
  }

  return record as MinifiedRecord;
}

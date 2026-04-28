import { hubspotFetch } from './client';
import type { LabelMap } from '../../types/dashboard';

/**
 * Fetches property definitions + team names to build a LabelMap.
 *
 * - lifecyclestage + type_of_dealership: from property enumeration options
 * - hubspot_team_id: the property has no enum options in this account, so we
 *   build the map from the owners API (GET /crm/v3/owners) which returns each
 *   owner's team membership with name — no extra scopes required.
 */
export async function fetchMetadata(): Promise<LabelMap> {
  console.log('[Metadata] Fetching property label maps...');

  const [lifecyclestage, type_of_dealership, hubspot_team_id] = await Promise.all([
    fetchPropertyOptions('lifecyclestage'),
    fetchPropertyOptions('type_of_dealership'),
    fetchTeamNamesFromOwners(),
  ]);

  console.log(
    `[Metadata] Loaded: ${Object.keys(lifecyclestage).length} lifecycle stages, ` +
    `${Object.keys(type_of_dealership).length} dealership types, ` +
    `${Object.keys(hubspot_team_id).length} teams`
  );

  return { lifecyclestage, type_of_dealership, hubspot_team_id };
}

async function fetchPropertyOptions(propertyName: string): Promise<Record<string, string>> {
  const res = await hubspotFetch(`/crm/v3/properties/companies/${propertyName}`);
  const json = await res.json();

  if (!json.options || !Array.isArray(json.options)) {
    console.warn(`[Metadata] No options found for property: ${propertyName}`);
    return {};
  }

  return Object.fromEntries(
    json.options.map((o: { value: string; label: string }) => [o.value, o.label])
  );
}

/**
 * Builds teamId → teamName map from the owners API.
 * The hubspot_team_id property has no enum options in this account,
 * but owner records contain their team memberships with names.
 */
async function fetchTeamNamesFromOwners(): Promise<Record<string, string>> {
  const teams: Record<string, string> = {};
  let after: string | undefined;

  do {
    const params = new URLSearchParams({ limit: '500', includeDeleted: 'false' });
    if (after) params.set('after', after);

    const res = await hubspotFetch(`/crm/v3/owners?${params.toString()}`);
    const json = await res.json();

    for (const owner of json.results ?? []) {
      for (const team of owner.teams ?? []) {
        if (team.id && team.name && !teams[team.id]) {
          teams[team.id] = team.name;
        }
      }
    }

    after = json.paging?.next?.after;
  } while (after);

  return teams;
}

import type {
  MinifiedRecord,
  AggregatedData,
  GroupRow,
  LabelMap,
} from '../../types/dashboard';
import {
  RELEVANT_WEBSITE_STATUS,
  CONTRACT_CLOSED_STAGE,
  CARSFORSALE_DMS,
  UNITED_STATES_COUNTRY,
} from '../constants';

// ─── Helpers ────────────────────────────────────────────────────────────────

type CompanyAccumulator = {
  gdIds: Set<string>;
  missingGdIdCount: number;
};

/** HubSpot count-distinct behavior: distinct gd_id, but blank gd_id rows count individually. */
function countCompanies(accumulator?: CompanyAccumulator): number {
  if (!accumulator) return 0;
  return accumulator.gdIds.size + accumulator.missingGdIdCount;
}

/**
 * Increment rooftop count and accumulate gd_id into the set for a given key.
 * O(1) per call.
 */
function accumulate(
  rtMap: Map<string, number>,
  gdMap: Map<string, CompanyAccumulator>,
  key: string,
  gdId: string | null
): void {
  rtMap.set(key, (rtMap.get(key) ?? 0) + 1);
  let accumulator = gdMap.get(key);
  if (!accumulator) {
    accumulator = { gdIds: new Set<string>(), missingGdIdCount: 0 };
    gdMap.set(key, accumulator);
  }
  if (gdId) {
    accumulator.gdIds.add(gdId);
  } else {
    accumulator.missingGdIdCount++;
  }
}

/** Convert parallel rt/gd maps into a sorted GroupRow array */
function toGroupRows(
  rtMap: Map<string, number>,
  gdMap: Map<string, CompanyAccumulator>,
  labelResolver?: (key: string) => string
): GroupRow[] {
  return Array.from(rtMap.entries())
    .map(([key, rooftops]) => ({
      label: labelResolver ? labelResolver(key) : key,
      rooftops,
      companies: countCompanies(gdMap.get(key)),
    }))
    .sort((a, b) => b.rooftops - a.rooftops);
}

/** Summarize a filtered set of records */
function summarize(records: MinifiedRecord[]): { rooftops: number; companies: number } {
  const gdIds = new Set<string>();
  let missingGdIdCount = 0;
  for (const r of records) {
    if (r.gi) {
      gdIds.add(r.gi);
    } else {
      missingGdIdCount++;
    }
  }
  return { rooftops: records.length, companies: gdIds.size + missingGdIdCount };
}

function hasKnownDomain(record: MinifiedRecord): boolean {
  return Boolean(record.dm);
}

function hasCountryData(records: MinifiedRecord[]): boolean {
  return records.some((record) => Boolean(record.co));
}

function isRelevantMarketRecord(record: MinifiedRecord, shouldFilterCountry: boolean): boolean {
  const matchesCountry = !shouldFilterCountry || record.co === UNITED_STATES_COUNTRY;
  const matchesWebsiteStatus = record.ws === RELEVANT_WEBSITE_STATUS || record.ws === null;

  return matchesCountry && matchesWebsiteStatus;
}

// ─── Main aggregation ───────────────────────────────────────────────────────

/**
 * Aggregates all company records into the full AggregatedData structure.
 *
 * Complexity: O(n) — single pass over all records builds every report simultaneously.
 * No nested loops over the full record set.
 */
export function aggregate(allRecords: MinifiedRecord[], labels: LabelMap): AggregatedData {
  const shouldFilterCountry = hasCountryData(allRecords);

  // ── Per-dimension maps (relevant records only) ──
  const rtByOrgTier = new Map<string, number>();
  const gdByOrgTier = new Map<string, CompanyAccumulator>();

  const rtByDealerType = new Map<string, number>();
  const gdByDealerType = new Map<string, CompanyAccumulator>();

  const rtByCompetitor = new Map<string, number>();
  const gdByCompetitor = new Map<string, CompanyAccumulator>();

  const rtByState = new Map<string, number>();
  const gdByState = new Map<string, CompanyAccumulator>();

  const rtByCrm = new Map<string, number>();
  const gdByCrm = new Map<string, CompanyAccumulator>();

  const rtByTeam = new Map<string, number>();
  const gdByTeam = new Map<string, CompanyAccumulator>();

  const rtByLifecycle = new Map<string, number>();
  const gdByLifecycle = new Map<string, CompanyAccumulator>();

  const rtByPartner = new Map<string, number>();
  const gdByPartner = new Map<string, CompanyAccumulator>();

  // Franchise sub-breakdowns
  const rtFranchiseByCrm = new Map<string, number>();
  const gdFranchiseByCrm = new Map<string, CompanyAccumulator>();
  const rtFranchiseByLifecycle = new Map<string, number>();
  const gdFranchiseByLifecycle = new Map<string, CompanyAccumulator>();

  // Independent sub-breakdowns
  const rtIndependentByCrm = new Map<string, number>();
  const gdIndependentByCrm = new Map<string, CompanyAccumulator>();
  const rtIndependentByLifecycle = new Map<string, number>();
  const gdIndependentByLifecycle = new Map<string, CompanyAccumulator>();

  // State × Team cross-tab (composite key: "state|||teamId")
  const rtStateTeam = new Map<string, number>();
  const gdStateTeam = new Map<string, CompanyAccumulator>();

  // Summary accumulators
  const relevantRecords: MinifiedRecord[] = [];
  const withoutDomainRecords: MinifiedRecord[] = [];
  const carsforsaleRecords: MinifiedRecord[] = [];
  const contractClosedRecords: MinifiedRecord[] = [];
  const franchiseRecords: MinifiedRecord[] = [];
  const independentRecords: MinifiedRecord[] = [];

  // ── Single pass ──
  for (const r of allRecords) {
    // Carsforsale: no website_status requirement
    if (r.dn === CARSFORSALE_DMS) {
      carsforsaleRecords.push(r);
    }

    // HubSpot TAM reports use: Country = United States AND
    // (Website Status = Relevant OR Website Status is unknown).
    // Existing blobs created before country_dropdown was fetched do not have
    // `co`, so country filtering is enabled only once that field is present.
    if (!isRelevantMarketRecord(r, shouldFilterCountry)) continue;

    relevantRecords.push(r);

    const gi = r.gi; // dealer group ID (may be null)
    const NO_VAL = '(No value)';

    // Summary sub-sets
    if (!hasKnownDomain(r)) {
      withoutDomainRecords.push(r);
      continue;
    }

    if (r.lv === CONTRACT_CLOSED_STAGE) contractClosedRecords.push(r);

    const isFranchise = r.td === 'Franchise';
    const isIndependent = r.td === 'Independent';
    if (isFranchise) franchiseRecords.push(r);
    if (isIndependent) independentRecords.push(r);

    // Breakdown dimensions
    accumulate(rtByOrgTier, gdByOrgTier, r.ot ?? NO_VAL, gi);
    accumulate(rtByDealerType, gdByDealerType, r.td ?? NO_VAL, gi);
    accumulate(rtByCompetitor, gdByCompetitor, r.cn ?? NO_VAL, gi);
    accumulate(rtByState, gdByState, r.st ?? NO_VAL, gi);
    accumulate(rtByCrm, gdByCrm, r.cp ?? NO_VAL, gi);
    accumulate(rtByTeam, gdByTeam, r.tm ?? NO_VAL, gi);
    accumulate(rtByLifecycle, gdByLifecycle, r.ls ?? NO_VAL, gi);
    accumulate(rtByPartner, gdByPartner, r.pn ?? NO_VAL, gi);

    if (isFranchise) {
      accumulate(rtFranchiseByCrm, gdFranchiseByCrm, r.cp ?? NO_VAL, gi);
      accumulate(rtFranchiseByLifecycle, gdFranchiseByLifecycle, r.ls ?? NO_VAL, gi);
    }
    if (isIndependent) {
      accumulate(rtIndependentByCrm, gdIndependentByCrm, r.cp ?? NO_VAL, gi);
      accumulate(rtIndependentByLifecycle, gdIndependentByLifecycle, r.ls ?? NO_VAL, gi);
    }

    // Cross-tab: state × team
    const stateTeamKey = `${r.st ?? NO_VAL}|||${r.tm ?? NO_VAL}`;
    accumulate(rtStateTeam, gdStateTeam, stateTeamKey, gi);
  }

  // ── Label resolvers ──
  const resolveLifecycle = (key: string) => labels.lifecyclestage[key] ?? key;
  const resolveTeam = (key: string) =>
    key === '(No value)' ? '(No Team)' : (labels.hubspot_team_id[key] ?? key);
  const resolveDealerType = (key: string) => labels.type_of_dealership[key] ?? key;

  // ── Build cross-tab matrix ──
  const allStates = [...new Set(relevantRecords.map((r) => r.st ?? '(No value)'))].sort();
  const allTeamIds = [...new Set(relevantRecords.map((r) => r.tm ?? '(No value)'))];
  const allTeamNames = allTeamIds.map(resolveTeam);

  const cells: AggregatedData['stateTeamMatrix']['cells'] = {};
  for (const state of allStates) {
    cells[state] = {};
    for (let i = 0; i < allTeamIds.length; i++) {
      const teamId = allTeamIds[i];
      const teamName = allTeamNames[i];
      const key = `${state}|||${teamId}`;
      cells[state][teamName] = {
        rooftops: rtStateTeam.get(key) ?? 0,
        companies: countCompanies(gdStateTeam.get(key)),
      };
    }
  }

  // ── Filter options (for dropdown population) ──
  const teamIds = [...rtByTeam.keys()].filter((k) => k !== '(No value)');
  const teamNames = teamIds.map(resolveTeam);

  return {
    fetchedAt: Date.now(),
    labels,
    relevantRecords,

    summaries: {
      relevantTAM: summarize(relevantRecords),
      withoutDomains: summarize(withoutDomainRecords),
      carsforsale: summarize(carsforsaleRecords),
      contractClosed: summarize(contractClosedRecords),
      franchiseTAM: summarize(franchiseRecords),
      independentTAM: summarize(independentRecords),
    },

    breakdowns: {
      byOrgTier: toGroupRows(rtByOrgTier, gdByOrgTier),
      byDealershipType: toGroupRows(rtByDealerType, gdByDealerType, resolveDealerType),
      byCompetitor: toGroupRows(rtByCompetitor, gdByCompetitor),
      byState: toGroupRows(rtByState, gdByState),
      byCrmPlatform: toGroupRows(rtByCrm, gdByCrm),
      byTeam: toGroupRows(rtByTeam, gdByTeam, resolveTeam),
      byLifecycleStage: toGroupRows(rtByLifecycle, gdByLifecycle, resolveLifecycle),
      byPartner: toGroupRows(rtByPartner, gdByPartner),
      franchiseByCrm: toGroupRows(rtFranchiseByCrm, gdFranchiseByCrm),
      independentByCrm: toGroupRows(rtIndependentByCrm, gdIndependentByCrm),
      franchiseByLifecycle: toGroupRows(rtFranchiseByLifecycle, gdFranchiseByLifecycle, resolveLifecycle),
      independentByLifecycle: toGroupRows(rtIndependentByLifecycle, gdIndependentByLifecycle, resolveLifecycle),
    },

    stateTeamMatrix: {
      states: allStates,
      teams: allTeamNames,
      cells,
    },

    filterOptions: {
      orgTiers: [...rtByOrgTier.keys()].filter((k) => k !== '(No value)').sort(),
      teamIds,
      teamNames,
      dmsNames: [...new Set(relevantRecords.map((r) => r.dn).filter((v): v is string => v !== null))].sort(),
      dealershipTypes: [...rtByDealerType.keys()].filter((k) => k !== '(No value)').sort(),
      states: [...rtByState.keys()].filter((k) => k !== '(No value)').sort(),
      crmPlatforms: [...rtByCrm.keys()].filter((k) => k !== '(No value)').sort(),
      lifecycleStages: [...rtByLifecycle.keys()].filter((k) => k !== '(No value)'),
      lifecycleStageNames: [...rtByLifecycle.keys()]
        .filter((k) => k !== '(No value)')
        .map(resolveLifecycle),
    },
  };
}

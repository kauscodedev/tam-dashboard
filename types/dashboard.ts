// Minified record — short keys to reduce JSON payload (~7MB → ~1.5MB gzipped)
export interface MinifiedRecord {
  gi: string | null; // gd_id (dealer group ID)
  ot: string | null; // org_tier
  td: string | null; // type_of_dealership
  cn: string | null; // competitor_name
  cp: string | null; // crm_platform
  st: string | null; // overall_state_dropdown
  tm: string | null; // hubspot_team_id
  pn: string | null; // partner_name
  ls: string | null; // lifecyclestage
  lv: string | null; // lifecycle_stage_gd_level (GD-level stage, e.g. "Contract Closed")
  dm: string | null; // domain
  ws: string | null; // website_status
  dn: string | null; // dms_name
}

export interface GroupRow {
  label: string; // human-readable (resolved at aggregate time)
  rooftops: number;
  companies: number; // COUNT DISTINCT gd_id
}

export interface FilterState {
  orgTier: string | null;
  teamId: string | null;
  dmsName: string | null;
}

export interface LabelMap {
  lifecyclestage: Record<string, string>;      // "1816032986" → "Prospect"
  type_of_dealership: Record<string, string>;  // "Franchise" → "Franchise"
  hubspot_team_id: Record<string, string>;     // "362172280" → "Saarthak Team"
}

export interface AggregatedData {
  fetchedAt: number;
  labels: LabelMap;
  relevantRecords: MinifiedRecord[]; // kept for client-side re-filter
  summaries: {
    relevantTAM: { rooftops: number; companies: number };
    withoutDomains: { rooftops: number; companies: number };
    carsforsale: { rooftops: number; companies: number };
    contractClosed: { rooftops: number; companies: number };
    franchiseTAM: { rooftops: number; companies: number };
    independentTAM: { rooftops: number; companies: number };
  };
  breakdowns: {
    byOrgTier: GroupRow[];
    byDealershipType: GroupRow[];
    byCompetitor: GroupRow[];
    byState: GroupRow[];
    byCrmPlatform: GroupRow[];
    byTeam: GroupRow[];
    byLifecycleStage: GroupRow[];
    byPartner: GroupRow[];
    franchiseByCrm: GroupRow[];
    independentByCrm: GroupRow[];
    franchiseByLifecycle: GroupRow[];
    independentByLifecycle: GroupRow[];
  };
  stateTeamMatrix: {
    states: string[];
    teams: string[]; // human-readable team names
    cells: Record<string, Record<string, { rooftops: number; companies: number }>>;
    // cells[state][teamName] = { rooftops, companies }
  };
  filterOptions: {
    orgTiers: string[];
    teamIds: string[];   // raw IDs (used as filter keys)
    teamNames: string[]; // human-readable (parallel array with teamIds)
    dmsNames: string[];
  };
}

export interface SyncStatus {
  status: 'syncing' | 'success' | 'error';
  started_at?: string;
  last_synced_at?: string;
  records_fetched?: number;
  relevant_records?: number;
  estimated?: number;
  error?: string;
}

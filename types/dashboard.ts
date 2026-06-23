// Minified record — short keys to reduce JSON payload (~7MB → ~1.5MB gzipped)
export interface MinifiedRecord {
  hi: string | null; // HubSpot company object ID
  nm: string | null; // company name
  oi: string | null; // org_id (HubSpot "Org Id", preferred company distinct key)
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
  co: string | null; // country_dropdown
  uc: string | null; // number_of_used_cars (single-dealer sizing)
  gn: string | null; // dealership_group_name (blank = single dealer)
  ow: string | null; // hubspot_owner_id (for Pod attribution)
  // ── Baked TAM-segmentation tags (computed at sync via tagSegments) ──
  sg: SegmentCode | null; // top-level AOP segment
  gt: GroupType | null;   // group dealership type (GFD/IGD), groups only
  ss: SubSector | null;   // Mid Market group rooftop sub-sector, groups only
}

// ── TAM Segmentation framework ────────────────────────────────────────────────
export type SegmentCode =
  | 'SMB'        // single dealer, <= 100 used cars
  | 'MM_SINGLE'  // single dealer, > 100 used cars
  | 'MM_GROUP'   // group, <= 10 rooftops
  | 'ENT_A'      // group, 11-15 rooftops
  | 'ENT_B'      // group, 16+ rooftops (excl. Top 150)
  | 'ENT_C'      // Top 150 group
  | 'UNSIZED';   // single dealer with no used-car count
export type GroupType = 'GFD' | 'IGD';
export type SubSector = '2-5' | '6-10';

/** One dealer-group record from the Dealership Group Names custom object. */
export interface DealerGroup {
  name: string;            // raw dealship_group_name
  rooftops: number | null; // #Rooftops rollup
  rank: string | null;     // dealership_rank ("Top 150" or null)
}

export interface CountMetric {
  rooftops: number;
  companies: number;
}

/** One dealer group as an AOP planning/target row (group counted as one account). */
export interface DealerGroupRow {
  name: string;        // display name
  segment: SegmentCode; // MM_GROUP | ENT_A | ENT_B | ENT_C
  type: GroupType;     // GFD / IGD
  rooftops: number;    // canonical group size (group-object rollup, or member fallback)
  rank: string;        // "Top 150" or ""
  members: number;     // member rooftop records in the synced relevant base
}

export interface SegmentationData {
  /** false when the loaded blob predates segmentation fields (records lack `sg`). */
  available: boolean;
  bySegment: Record<SegmentCode, CountMetric>;
  /** Account-level counts: a dealer group counts once. Singles count individually. */
  accounts: Record<SegmentCode, number>;
  /** Mid Market group split by dealership type. */
  mmGroupByType: Record<GroupType, CountMetric>;
  /** Mid Market group rooftop sub-sectors, per group type (rows for a BreakdownTable). */
  mmSubSectors: Record<GroupType, GroupRow[]>;
  /** Enterprise tiers A/B/C as breakdown rows. */
  enterpriseTiers: GroupRow[];
  /** Canonical dealer-group target list (computed at sync; preserved across filters). */
  groups: DealerGroupRow[];
  /** SMB dealers with >50 used cars (aggregate). Computed at sync before uc is dropped. */
  smbGt50?: { franchise: number; independent: number; rooftops: number };
  /** Per-pod SMB breakdown for >50 used cars. Index matches PODS order. */
  smbPodGt50?: Array<{ franchise: number; independent: number }>;
  /** Per-pod SMB breakdown for ≤50 used cars. Index matches PODS order. */
  smbPodLe50?: Array<{ franchise: number; independent: number }>;
  /** SMB >50 used cars by lifecycle stage (GD Level) × Fr/Ind. */
  smbStageGt50?: Record<string, { franchise: number; independent: number }>;
  /** SMB ≤50 used cars by lifecycle stage (GD Level) × Fr/Ind. */
  smbStageLe50?: Record<string, { franchise: number; independent: number }>;
  /**
   * Per-rooftop-count pod breakdown for MM_GROUP records.
   * Key = rooftop count (as string "1".."10"); value = array indexed by pod.
   * Computed at sync before gn is dropped.
   */
  mmRooftopPodSplit?: Record<string, Array<{ franchise: number; independent: number }>>;
}

export interface GroupRow {
  key: string; // raw grouping key used for filtering drilldowns
  label: string; // human-readable (resolved at aggregate time)
  rooftops: number;
  companies: number; // COUNT DISTINCT org_id, falling back to gd_id
}

export type DrilldownMeasure = 'rooftops' | 'companies';

export interface FilterState {
  orgTier: string | null;
  teamId: string | null;
  dmsName: string | null;
  dealershipType: string | null;
  state: string | null;
  crmPlatform: string | null;
  lifecycleStage: string | null;
  segment: string | null; // SegmentCode (AOP segmentation)
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
    teamIds: string[]; // raw team IDs, parallel with teams
    cells: Record<string, Record<string, { rooftops: number; companies: number }>>;
    // cells[state][teamName] = { rooftops, companies }
  };
  segmentation: SegmentationData;
  filterOptions: {
    orgTiers: string[];
    teamIds: string[];   // raw IDs (used as filter keys)
    teamNames: string[]; // human-readable (parallel array with teamIds)
    dmsNames: string[];
    dealershipTypes: string[];
    states: string[];
    crmPlatforms: string[];
    lifecycleStages: string[];
    lifecycleStageNames: string[];
    segments: string[]; // SegmentCode values present in the data
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

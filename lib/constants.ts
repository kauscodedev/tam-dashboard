export const HUBSPOT_API_BASE = 'https://api.hubapi.com';
export const HUBSPOT_PORTAL_ID = '242626590';

// Maps HubSpot property names → minified 2-letter keys in stored JSON
export const FIELD_MAP = {
  name: 'nm',
  org_id: 'oi',
  gd_id: 'gi',
  org_tier: 'ot',
  type_of_dealership: 'td',
  competitor_name: 'cn',
  crm_platform: 'cp',
  overall_state_dropdown: 'st',
  hubspot_team_id: 'tm',
  partner_name: 'pn',
  lifecyclestage: 'ls',
  lifecycle_stage_gd_level: 'lv',
  domain: 'dm',
  website_status: 'ws',
  dms_name: 'dn',
  country_dropdown: 'co',
  number_of_used_cars: 'uc',
  dealership_group_name: 'gn',
  hubspot_owner_id: 'ow',
} as const;

// ── TAM Segmentation framework (RevOps) ──────────────────────────────────────
// Custom object holding one record per dealer group, with the canonical rooftop
// rollup and the curated Top-150 rank. It has no gd_id/org_id, so company→group
// joins are done by normalized `dealship_group_name`.
export const DEALER_GROUP_OBJECT_TYPE = '2-169112502';
// Single-dealer used-car threshold for INDEPENDENT/untyped singles: <= SMB, > Mid Market
// (resolves the framework's open "exactly 100" boundary as SMB-inclusive).
// NOTE: Franchise singles are always Mid Market regardless of used-car count, so this cap
// only applies to independent/untyped singles. SMB is therefore independent-only.
export const SMB_USED_CAR_MAX = 100;
// Rooftop boundaries for group sizing.
// A "group" must have at least this many rooftops to be sized as a group. A group whose
// canonical rooftop count is below this (i.e. 1) is functionally a single dealer and is
// re-tagged as a single (sized by used cars) instead of MM_GROUP.
export const MID_MARKET_ROOFTOP_MIN = 2;
export const MID_MARKET_ROOFTOP_MAX = 10; // 2-10 rooftops => Mid Market group
export const ENTERPRISE_A_ROOFTOP_MAX = 15; // 11-15 => Enterprise-A; 16+ => Enterprise-B
// dealership_rank enum value that marks a Top-150 group => Enterprise-C.
export const TOP_150_RANK = 'Top 150';

export type HubSpotFieldKey = keyof typeof FIELD_MAP;
export const REQUIRED_PROPERTIES = Object.keys(FIELD_MAP) as HubSpotFieldKey[];

// Base TAM filter: company is a relevant dealership
export const RELEVANT_WEBSITE_STATUS = 'Relevant';
export const UNITED_STATES_COUNTRY = 'United States';

// Carsforsale.com DMS name (exact casing from HubSpot)
export const CARSFORSALE_DMS = 'Carsforsale.Com';
// GD-Level values counted as "Contract Closed" (HubSpot filter: GD Level is any of …).
// Add values here if the HubSpot report's filter 5 ever selects more than one.
export const CONTRACT_CLOSED_GD_LEVELS = new Set<string>(['Contract Closed']);

// HubSpot List API page size (max 100)
export const PAGE_SIZE = 100;

// How often to write progress updates to Blob (every N records)
export const PROGRESS_UPDATE_INTERVAL = 5_000;

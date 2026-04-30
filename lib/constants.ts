export const HUBSPOT_API_BASE = 'https://api.hubapi.com';
export const HUBSPOT_PORTAL_ID = '242626590';

// Maps HubSpot property names → minified 2-letter keys in stored JSON
export const FIELD_MAP = {
  name: 'nm',
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
} as const;

export type HubSpotFieldKey = keyof typeof FIELD_MAP;
export const REQUIRED_PROPERTIES = Object.keys(FIELD_MAP) as HubSpotFieldKey[];

// Base TAM filter: company is a relevant dealership
export const RELEVANT_WEBSITE_STATUS = 'Relevant';
export const UNITED_STATES_COUNTRY = 'United States';

// Carsforsale.com DMS name (exact casing from HubSpot)
export const CARSFORSALE_DMS = 'Carsforsale.Com';

// HubSpot List API page size (max 100)
export const PAGE_SIZE = 100;

// How often to write progress updates to Blob (every N records)
export const PROGRESS_UPDATE_INTERVAL = 5_000;

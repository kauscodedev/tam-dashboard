/**
 * scripts/sync.ts
 *
 * The HubSpot → Vercel Blob data sync script.
 * Run by GitHub Actions on schedule or manual workflow_dispatch.
 * Can also be run locally: npx ts-node --project tsconfig.scripts.json scripts/sync.ts
 *
 * Flow:
 *   1. Write sync-status.json = { status: 'syncing', ... } to Blob
 *   2. Fetch property metadata (LabelMap) from HubSpot
 *   3. Fetch ALL company records via paginated List API (~168K records, ~1-2 min)
 *   4. Aggregate records → AggregatedData (O(n) single pass)
 *   5. Write tam-data.json to Blob
 *   6. Write sync-status.json = { status: 'success', ... } to Blob
 *
 * Environment variables required:
 *   HUBSPOT_PAT          — HubSpot private app token
 *   BLOB_READ_WRITE_TOKEN — Vercel Blob token (from Vercel project settings → Storage → Blob)
 */

import { put } from '@vercel/blob';
import { fetchMetadata } from '../lib/hubspot/fetchMetadata';
import { fetchAllCompanies } from '../lib/hubspot/fetchAllCompanies';
import { fetchDealerGroups } from '../lib/hubspot/fetchDealerGroups';
import { tagSegments, normalizeGroupName } from '../lib/aggregation/segment';
import { aggregate } from '../lib/aggregation/aggregate';
import { PODS, OWNER_TO_POD } from '../lib/pods';
import type { SyncStatus, AggregatedData, MinifiedRecord } from '../types/dashboard';
import { PROGRESS_UPDATE_INTERVAL, RELEVANT_WEBSITE_STATUS, UNITED_STATES_COUNTRY, MID_MARKET_ROOFTOP_MIN, MID_MARKET_ROOFTOP_MAX } from '../lib/constants';
import { writeMarketSegments, type WriteMode } from '../lib/hubspot/writeMarketSegment';

// Same relevant-market filter the dashboard aggregation uses: US + (Relevant or unknown website).
const isRelevant = (r: MinifiedRecord) =>
  r.co === UNITED_STATES_COUNTRY && (r.ws === RELEVANT_WEBSITE_STATUS || r.ws == null);

// ─── Blob helpers ─────────────────────────────────────────────────────────────

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

if (!BLOB_TOKEN) {
  throw new Error('BLOB_READ_WRITE_TOKEN is not set');
}
if (!process.env.HUBSPOT_PAT) {
  throw new Error('HUBSPOT_PAT is not set');
}

async function writeStatus(status: SyncStatus): Promise<void> {
  await put('sync-status.json', JSON.stringify(status), {
    access: 'public',
    token: BLOB_TOKEN!,
    addRandomSuffix: false,
  });
}

async function writeData(data: AggregatedData): Promise<void> {
  await put('tam-data.json', JSON.stringify(data), {
    access: 'public',
    token: BLOB_TOKEN!,
    addRandomSuffix: false,
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  console.log(`\n[Sync] Starting TAM data sync at ${startedAt}`);

  // Step 1: Mark sync as in-progress
  await writeStatus({
    status: 'syncing',
    started_at: startedAt,
    records_fetched: 0,
    estimated: 168_000,
  });
  console.log('[Sync] Status: syncing — written to Blob');

  try {
    // Step 2: Fetch property metadata (LabelMap)
    const labels = await fetchMetadata();

    // Step 3: Fetch all company records with progress updates
    let lastProgressUpdate = 0;

    const allRecords = await fetchAllCompanies(async (fetched) => {
      // Update Blob progress every PROGRESS_UPDATE_INTERVAL records
      if (fetched - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL) {
        lastProgressUpdate = fetched;
        await writeStatus({
          status: 'syncing',
          started_at: startedAt,
          records_fetched: fetched,
          estimated: 168_000,
        });
        console.log(`[Sync] Progress update written: ${fetched} records`);
      }
    });

    // Step 3b: Fetch dealer-group records and bake AOP segment tags onto companies.
    const dealerGroups = await fetchDealerGroups();
    console.log(`[Sync] Tagging segments using ${dealerGroups.length} dealer groups...`);
    const dealerGroupRows = tagSegments(allRecords, dealerGroups);
    // ── Pre-drop computations (while uc and gn still exist on records) ─────────

    // 1. SMB >50 / ≤50 aggregate + per-pod breakdown + per-stage breakdown.
    const smbGt50 = { franchise: 0, independent: 0, rooftops: 0 };
    const mkPodSplit = () => PODS.map(() => ({ franchise: 0, independent: 0 }));
    const smbPodGt50 = mkPodSplit();
    const smbPodLe50 = mkPodSplit();
    const smbStageGt50: Record<string, { franchise: number; independent: number }> = {};
    const smbStageLe50: Record<string, { franchise: number; independent: number }> = {};
    const addStage = (map: Record<string, { franchise: number; independent: number }>, stage: string, td: string | null) => {
      if (!map[stage]) map[stage] = { franchise: 0, independent: 0 };
      if (td === 'Franchise') map[stage].franchise++;
      else if (td === 'Independent') map[stage].independent++;
    };

    // 2. MM rooftop-count pod breakdown — counts GROUPS per pod (by plurality of
    //    rooftop ownership) so the numbers reconcile with the group-count rows.
    const MAX_RT = MID_MARKET_ROOFTOP_MAX; // MM groups span 2-6 rooftops (v2)
    // Tally each MM group's rooftop ownership across pods (keyed by normalized name).
    const groupPodTally = new Map<string, number[]>();

    for (const r of allRecords) {
      if (!isRelevant(r)) continue; // match the dashboard's relevant US base
      // SMB used-car band split.
      if (r.sg === 'SMB' && r.uc != null) {
        const cars = Number(r.uc);
        if (Number.isFinite(cars)) {
          const stage = r.lv ?? '(No value)';
          if (cars > 50) {
            smbGt50.rooftops++;
            if (r.td === 'Franchise') smbGt50.franchise++;
            else if (r.td === 'Independent') smbGt50.independent++;
            addStage(smbStageGt50, stage, r.td);
          } else {
            addStage(smbStageLe50, stage, r.td);
          }
          const podIdx = r.ow != null ? OWNER_TO_POD[r.ow] : undefined;
          if (podIdx !== undefined) {
            const target = cars > 50 ? smbPodGt50[podIdx] : smbPodLe50[podIdx];
            if (r.td === 'Franchise') target.franchise++;
            else if (r.td === 'Independent') target.independent++;
          }
        }
      }
      // MM group → tally rooftop ownership per pod.
      if (r.sg === 'MM_GROUP' && r.gn != null) {
        const podIdx = r.ow != null ? OWNER_TO_POD[r.ow] : undefined;
        if (podIdx !== undefined) {
          const key = normalizeGroupName(r.gn);
          let arr = groupPodTally.get(key);
          if (!arr) { arr = PODS.map(() => 0); groupPodTally.set(key, arr); }
          arr[podIdx]++;
        }
      }
    }

    // Assign each canonical MM group to its plurality pod, bucket by exact rooftop
    // count + type (GFD→franchise, IGD→independent). Sums reconcile with row totals.
    const mmRooftopPodSplit: Record<string, Array<{ franchise: number; independent: number }>> = {};
    for (let n = MID_MARKET_ROOFTOP_MIN; n <= MAX_RT; n++) mmRooftopPodSplit[String(n)] = mkPodSplit();
    for (const g of dealerGroupRows) {
      if (g.segment !== 'MM_GROUP' || g.rooftops == null || g.rooftops < MID_MARKET_ROOFTOP_MIN || g.rooftops > MAX_RT) continue;
      const tally = groupPodTally.get(normalizeGroupName(g.name));
      if (!tally) continue; // no pod owns any rooftop → unattributed (UI derives it)
      let pluralityPod = -1, max = 0;
      for (let i = 0; i < tally.length; i++) { if (tally[i] > max) { max = tally[i]; pluralityPod = i; } }
      if (pluralityPod < 0) continue;
      const bucket = mmRooftopPodSplit[String(g.rooftops)][pluralityPod];
      if (g.type === 'GFD') bucket.franchise++;
      else bucket.independent++;
    }

    // `uc` and `gn` only needed during tagging + pre-drop computation — drop now.
    for (const r of allRecords) {
      delete (r as Partial<typeof r>).uc;
      delete (r as Partial<typeof r>).gn;
    }

    // Step 4: Aggregate
    console.log(`\n[Sync] Aggregating ${allRecords.length} records...`);
    const aggregated = aggregate(allRecords, labels);
    // Attach the canonical group target list (computed once; not record-derived).
    aggregated.segmentation.groups = dealerGroupRows;

    // Top-150 spans ALL regions (not just the US relevant base). Computed over every
    // fetched record so the dashboard can show the full strategic footprint.
    const top150 = { rooftops: 0, companies: 0, franchise: 0, independent: 0 };
    const top150Ids = new Set<string>();
    let top150Missing = 0;
    for (const r of allRecords) {
      if (r.sg !== 'TOP_150') continue;
      top150.rooftops++;
      if (r.td === 'Franchise') top150.franchise++;
      else if (r.td === 'Independent') top150.independent++;
      const key = r.oi || r.gi;
      if (key) top150Ids.add(key);
      else top150Missing++;
    }
    top150.companies = top150Ids.size + top150Missing;
    aggregated.segmentation.top150AllRegions = top150;

    aggregated.segmentation.smbGt50 = smbGt50;
    aggregated.segmentation.smbPodGt50 = smbPodGt50;
    aggregated.segmentation.smbPodLe50 = smbPodLe50;
    aggregated.segmentation.smbStageGt50 = smbStageGt50;
    aggregated.segmentation.smbStageLe50 = smbStageLe50;
    aggregated.segmentation.mmRooftopPodSplit = mmRooftopPodSplit;

    const { summaries } = aggregated;
    console.log('\n[Sync] ── Aggregation summary ──────────────────────────');
    console.log(`  Total fetched:     ${allRecords.length.toLocaleString()} records`);
    console.log(`  Relevant TAM:      ${summaries.relevantTAM.rooftops.toLocaleString()} rooftops / ${summaries.relevantTAM.companies.toLocaleString()} companies`);
    console.log(`  Without Domains:   ${summaries.withoutDomains.rooftops.toLocaleString()} rooftops`);
    console.log(`  Carsforsale.com:   ${summaries.carsforsale.rooftops.toLocaleString()} rooftops`);
    console.log(`  Contract Closed:   ${summaries.contractClosed.rooftops.toLocaleString()} rooftops`);
    console.log(`  Franchise TAM:     ${summaries.franchiseTAM.rooftops.toLocaleString()} rooftops`);
    console.log(`  Independent TAM:   ${summaries.independentTAM.rooftops.toLocaleString()} rooftops`);
    const seg = aggregated.segmentation.bySegment;
    console.log('  ── AOP Segmentation (rooftops) ──');
    console.log(`  SMB ${seg.SMB.rooftops.toLocaleString()} | MM-single ${seg.MM_SINGLE.rooftops.toLocaleString()} | MM-group(2-6) ${seg.MM_GROUP.rooftops.toLocaleString()} | EntA(7-10) ${seg.ENT_A.rooftops.toLocaleString()} | EntB(11-15) ${seg.ENT_B.rooftops.toLocaleString()} | EntC(16+) ${seg.ENT_C.rooftops.toLocaleString()} | Top150(US) ${seg.TOP_150.rooftops.toLocaleString()} | Top150(all) ${top150.rooftops.toLocaleString()} | Unsized ${seg.UNSIZED.rooftops.toLocaleString()}`);
    console.log('─────────────────────────────────────────────────────────\n');

    // Sanity check: warn if numbers are way off from expected
    const relevantRooftops = summaries.relevantTAM.rooftops;
    if (relevantRooftops < 50_000 || relevantRooftops > 150_000) {
      console.warn(
        `[Sync] WARNING: Relevant TAM count (${relevantRooftops}) is outside expected range 50K-150K. ` +
        'Verify filters or check for HubSpot data changes.'
      );
    }

    // Step 5: Upload aggregated data.
    // @vercel/blob 0.27 only supports public blob access; /api/data still
    // enforces the dashboard secret before returning the blob contents.
    console.log('[Sync] Uploading tam-data.json to Vercel Blob...');
    await writeData(aggregated);

    // Step 6: Mark success
    const completedAt = new Date().toISOString();
    await writeStatus({
      status: 'success',
      started_at: startedAt,
      last_synced_at: completedAt,
      records_fetched: allRecords.length,
      relevant_records: summaries.relevantTAM.rooftops,
    });

    console.log(`[Sync] ✅ Complete at ${completedAt}`);

    // Step 7 (optional, gated): write the computed market_segment back to HubSpot
    // companies. Off by default so a normal sync never mutates the CRM. Runs after the
    // dashboard data + success status are written, in its own try/catch, so a write-back
    // failure cannot mark the dashboard sync as failed.
    const writebackMode = (process.env.MARKET_SEGMENT_WRITEBACK as WriteMode | undefined) ?? 'off';
    if (writebackMode !== 'off') {
      try {
        const scope = process.env.MARKET_SEGMENT_SCOPE === 'all' ? 'all' : 'relevant';
        await writeMarketSegments(allRecords, { mode: writebackMode, isRelevant, scope });
      } catch (wbErr) {
        const m = wbErr instanceof Error ? wbErr.message : String(wbErr);
        console.error(`[Sync] market_segment write-back failed (dashboard data already synced OK): ${m}`);
        process.exit(1);
      }
    }

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[Sync] ❌ Failed: ${errorMessage}`);

    await writeStatus({
      status: 'error',
      started_at: startedAt,
      error: errorMessage,
    });

    process.exit(1);
  }
}

main();

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
import { aggregate } from '../lib/aggregation/aggregate';
import type { SyncStatus, AggregatedData } from '../types/dashboard';
import { PROGRESS_UPDATE_INTERVAL } from '../lib/constants';

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

    // Step 4: Aggregate
    console.log(`\n[Sync] Aggregating ${allRecords.length} records...`);
    const aggregated = aggregate(allRecords, labels);

    const { summaries } = aggregated;
    console.log('\n[Sync] ── Aggregation summary ──────────────────────────');
    console.log(`  Total fetched:     ${allRecords.length.toLocaleString()} records`);
    console.log(`  Relevant TAM:      ${summaries.relevantTAM.rooftops.toLocaleString()} rooftops / ${summaries.relevantTAM.companies.toLocaleString()} companies`);
    console.log(`  Without Domains:   ${summaries.withoutDomains.rooftops.toLocaleString()} rooftops`);
    console.log(`  Carsforsale.com:   ${summaries.carsforsale.rooftops.toLocaleString()} rooftops`);
    console.log(`  Contract Closed:   ${summaries.contractClosed.rooftops.toLocaleString()} rooftops`);
    console.log(`  Franchise TAM:     ${summaries.franchiseTAM.rooftops.toLocaleString()} rooftops`);
    console.log(`  Independent TAM:   ${summaries.independentTAM.rooftops.toLocaleString()} rooftops`);
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

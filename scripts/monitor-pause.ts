import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function monitorAndFinalizeGracefulPause() {
  console.log('👀 Monitoring background sync task to catch graceful batch completion...');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const stateFilePath = path.resolve(process.cwd(), 'sync-state.json');
  const pauseFlagPath = path.resolve(process.cwd(), 'pause-sync.flag');

  let batch4Finished = false;

  while (!batch4Finished) {
    const res = await client.query(`
      SELECT id, status, started_at, completed_at, records_processed, records_failed
      FROM tmbill_sync_logs
      WHERE id = '75e05432-a500-493a-b851-6c4d215cb3df'
    `);

    const batch4Log = res.rows[0];
    if (batch4Log && batch4Log.status === 'SUCCESS') {
      console.log('🎉 Batch 4 sync log marked SUCCESS! Waiting for pushToSalesInvoices to conclude...');
      
      // Check unsynced orders
      let remainingUnsynced = 999999;
      for (let i = 0; i < 30; i++) {
        const unsyncedRes = await client.query(`
          SELECT COUNT(*) as cnt FROM tmbill_orders 
          WHERE location_id = '0aaf0100-391c-4517-adfb-6e162134287b' AND is_synced_to_finance = false
        `);
        const count = parseInt(unsyncedRes.rows[0].cnt, 10);
        console.log(`Unsynced orders remaining: ${count}`);
        if (count === 0) {
          remainingUnsynced = 0;
          break;
        }
        await sleep(3000);
      }

      const invoiceRes = await client.query(`
        SELECT COUNT(*) as total_invoices, MIN(invoice_date) as min_dt, MAX(invoice_date) as max_dt
        FROM b2b_sales_invoices
        WHERE location_id = '0aaf0100-391c-4517-adfb-6e162134287b'
      `);

      const nextEndDate = '2025-11-28'; // Batch 4 covered 2025-11-29 to 2025-12-29, so next window begins at 2025-11-28
      const finalState = {
        locationId: '0aaf0100-391c-4517-adfb-6e162134287b',
        locationName: 'Avalpoondurai Restaurant',
        lastProcessedBatch: 4,
        lastCompletedWindow: {
          fromDate: '2025-11-29',
          toDate: '2025-12-29'
        },
        nextEndDate: nextEndDate,
        batch4RecordsProcessed: batch4Log.records_processed,
        totalInvoicesRecorded: invoiceRes.rows[0].total_invoices,
        invoiceDateRange: {
          earliest: invoiceRes.rows[0].min_dt,
          latest: invoiceRes.rows[0].max_dt
        },
        status: 'PAUSED',
        pausedAt: new Date().toISOString()
      };

      fs.writeFileSync(stateFilePath, JSON.stringify(finalState, null, 2), 'utf8');
      try {
        if (fs.existsSync(pauseFlagPath)) fs.unlinkSync(pauseFlagPath);
      } catch {}

      console.log('✅ Graceful pause state finalized in sync-state.json:');
      console.log(JSON.stringify(finalState, null, 2));
      batch4Finished = true;
      break;
    } else {
      console.log(`[${new Date().toISOString()}] Batch 4 status: ${batch4Log?.status || 'UNKNOWN'}. Still fetching/inserting...`);
      await sleep(5000);
    }
  }

  await client.end();
}

monitorAndFinalizeGracefulPause().catch(console.error);

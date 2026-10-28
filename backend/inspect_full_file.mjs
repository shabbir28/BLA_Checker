import 'dotenv/config';
if (!process.env.BLA_API_KEY) throw new Error('Set BLA_API_KEY before running this maintenance script.');
import fs from 'fs';
import csvParser from 'csv-parser';
import { BlacklistAlliance } from 'blacklist-alliance-client';

const filePath = 'C:/Users/Admin-BT/Downloads/leads_download_1791580198405.csv';
const rows = [];

fs.createReadStream(filePath)
  .pipe(csvParser())
  .on('data', (d) => rows.push(d))
  .on('end', async () => {
    const phoneCol = Object.keys(rows[0]).find(k => k.toLowerCase().includes('phone')) || Object.keys(rows[0])[0];
    const phones = rows.map(r => String(r[phoneCol]).replace(/\D/g, '')).filter(p => p.length === 10);
    
    console.log(`Total valid phones: ${phones.length}`);
    const client = new BlacklistAlliance(process.env.BLA_API_KEY, { timeout: 60000, retries: 2, defaultVersion: 'v5' });
    
    console.log('Calling client.bulkLookupSimple on all 7755 numbers...');
    const res = await client.bulkLookupSimple(phones, { responseFormat: 'json', autoBatch: true });
    
    console.log('status:', res.status);
    console.log('numbers count:', res.numbers, res.count);
    console.log('supression length:', res.supression ? res.supression.length : 0);
    console.log('supression items:', res.supression);
    console.log('reasons keys count:', Object.keys(res.reasons || {}).length);
    console.log('reasons object:', JSON.stringify(res.reasons, null, 2));
    
    const target = ['2109355764', '2169739690', '2244349356', '2488783070'];
    for (const t of target) {
      console.log(`Target ${t} in phones?`, res.phones?.includes(t));
      console.log(`Target ${t} in supression?`, res.supression?.includes(t));
      console.log(`Target ${t} in reasons?`, res.reasons?.[t]);
    }
  });

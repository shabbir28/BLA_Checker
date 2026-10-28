import 'dotenv/config';
if (!process.env.BLA_API_KEY) throw new Error('Set BLA_API_KEY before running this maintenance script.');
import axios from 'axios';

const key = process.env.BLA_API_KEY;
const phones = ['2109355764', '2169739690', '2244349356', '2488783070'];

console.log('--- RAW API CALL TO BLA /bulklookup (ver=v5) ---');
const res5 = await axios.post(
  `https://api.blacklistalliance.net/bulklookup?key=${key}&ver=v5&resp=json`,
  { phones },
  { headers: { 'Content-Type': 'application/json' } }
);
console.log('Full v5 response:', JSON.stringify(res5.data, null, 2));

console.log('\n--- RAW API CALL TO BLA /bulklookup (ver=v2) ---');
const res2 = await axios.post(
  `https://api.blacklistalliance.net/bulklookup?key=${key}&ver=v2&resp=json`,
  { phones },
  { headers: { 'Content-Type': 'application/json' } }
);
console.log('Full v2 response:', JSON.stringify(res2.data, null, 2));

import test from 'node:test';
import assert from 'node:assert/strict';
import { BlaService } from '../src/services/blaService.js';
import { validateBulkResponse, requireVerifiedResult } from '../src/utils/blaValidation.js';

const A = '4696523219';
const B = '6013240048';
function response(phones, suppressed = []) {
  return {
    status: 'success', numbers: phones.length, count: phones.length,
    phones: phones.filter((p) => !suppressed.includes(p)), supression: suppressed,
    wireless: [A].filter((p) => phones.includes(p)),
    reasons: Object.fromEntries(suppressed.map((p) => [p, 'federal-dnc'])),
  };
}
function service(replies, batchSize = 5000) {
  const calls = [];
  const instance = new BlaService(() => ({ bulkLookupSimple: async (phones, options) => {
    calls.push({ phones, options });
    const next = replies.shift();
    if (next instanceof Error) throw next;
    return next;
  } }));
  instance.getConfig = async () => ({ api_key: 'test', batch_size: batchSize, rate_limit_per_sec: 100000 });
  return { instance, calls };
}

test('two explicit clean responses preserve types and input aliases', async () => {
  const { instance, calls } = service([response([A, B]), response([A, B])]);
  const progress = [];
  const results = await instance.verifyBulk([A, `1${A}`, B], (n, total) => progress.push([n, total]));
  assert.equal(requireVerifiedResult(results.get(A)).reason, 'Good - Wireless');
  assert.equal(results.get(B).reason, 'Good - Landline');
  assert.equal(results.get(`1${A}`), results.get(A));
  assert.equal(calls.length, 2);
  assert.ok(calls.every((c) => c.options.autoBatch === false));
  assert.deepEqual(progress, [[2, 4], [4, 4]]);
});

for (const order of ['dnc-first', 'dnc-second']) {
  test(`conflicting DNC/clean responses block the entire result: ${order}`, async () => {
    const replies = [response([A], [A]), response([A])];
    if (order === 'dnc-second') replies.reverse();
    const { instance } = service(replies);
    await assert.rejects(instance.verifyBulk([A]), /conflicting DNC and clean/);
  });
}

test('consistent DNC remains excluded with evidence', async () => {
  const { instance } = service([response([A], [A]), response([A], [A])]);
  const result = (await instance.verifyBulk([A])).get(A);
  assert.equal(requireVerifiedResult(result).status, 'BLA_DNC');
  assert.equal(result.reason, 'Federal DNC');
  assert.equal(result.raw.observations.length, 2);
});

test('each batch is validated before moving to the next', async () => {
  const { instance, calls } = service([response([A]), response([A]), response([B]), { status: 'error' }], 1);
  await assert.rejects(instance.verifyBulk([A, B]), /incomplete/);
  assert.deepEqual(calls.map((c) => c.phones), [[A], [A], [B], [B]]);
});

test('missing phones cannot default to clean even when counts claim success', () => {
  const partial = response([A, B]); partial.phones = [A];
  assert.throws(() => validateBulkResponse(partial, [A, B]), /incomplete/);
});

test('reject failed, malformed, incorrect counts and unrelated responses', () => {
  for (const data of [null, {}, 'success', { ...response([A]), status: 'error' },
    { ...response([A]), count: 0 }, { ...response([A]), wireless: null },
    { ...response([A]), supression: null }, response([B]),
    { ...response([A]), reasons: { [A]: 'federal-dnc' } }]) {
    assert.throws(() => validateBulkResponse(data, [A]));
  }
});

test('accept array envelope, country codes and alternate suppression spelling', () => {
  const data = response([A], [A]);
  data.suppression = [`1${A}`]; delete data.supression;
  data.reasons = { [`1${A}`]: 'federal-dnc' };
  const parsed = validateBulkResponse([data], [A]);
  assert.ok(parsed.suppressed.has(A));
  assert.equal(parsed.reasons[A], 'federal-dnc');
});

test('network failures never return clean or leak SDK URLs', async () => {
  const { instance } = service([response([A]), new Error('https://example.test/?key=secret')]);
  await assert.rejects(instance.verifyBulk([A]), (e) => /request failed/.test(e.message) && !e.message.includes('secret'));
});

test('invalid input never becomes clean', async () => {
  const { instance, calls } = service([]);
  await assert.rejects(instance.verifyBulk([A, 'invalid']), /invalid phone/);
  assert.equal(calls.length, 0);
});

test('conflicting line types are unknown, not guessed', async () => {
  const second = response([A]); second.wireless = [];
  const { instance } = service([response([A]), second]);
  const result = (await instance.verifyBulk([A])).get(A);
  assert.equal(result.status, 'CLEAN');
  assert.equal(result.raw.line, 'Unknown');
});

test('engine rejects missing, legacy and inconsistent results', () => {
  for (const result of [undefined, {}, { isDnc: false, status: 'CLEAN', raw: { suppressed: false } },
    { isDnc: true, status: 'CLEAN', raw: { suppressed: true, verification: 'bulk-double-check-v1' } }]) {
    assert.throws(() => requireVerifiedResult(result), /unverified/);
  }
});

import assert from 'node:assert/strict';
import { ensureClientsForRecords, normalizeClient, normalizeWeekMatrix } from '../assets/js/core.js';

const normalized = normalizeClient({
  displayName: '  A児  ',
  kana: 123,
  supportLevel: null,
});
assert.equal(normalized.displayName, 'A児');
assert.equal(normalized.kana, '123');
assert.equal(normalized.supportLevel, '');
assert.ok(normalized.id);

const records = [{ clientName: 'A児' }, { clientName: 'B児' }, { clientName: 'A児' }];
const clients = [{ id: '1', displayName: 'A児' }];
const merged = ensureClientsForRecords(records, clients);
assert.equal(merged.length, 2);
assert.deepEqual(merged.map(c => c.displayName), ['A児', 'B児']);

const matrix = normalizeWeekMatrix([[9, 2], ['3']]);
assert.equal(matrix.length, 48);
assert.equal(matrix[0].length, 7);
assert.equal(matrix[0][0], 0);
assert.equal(matrix[0][1], 2);
assert.equal(matrix[1][0], 3);
assert.equal(matrix[10][6], 0);

console.log('core smoke tests passed');

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatSol, summarize } = require('../src/summary');

test('formatSol trims trailing zeros', () => {
  assert.equal(formatSol(0), '0');
  assert.equal(formatSol(2039280), '0.00203928');
  assert.equal(formatSol(1_000_000_000), '1');
  assert.equal(formatSol(1_500_000_000), '1.5');
  assert.equal(formatSol(1), '0.000000001');
  assert.equal(formatSol(12_345_678_901), '12.345678901');
});

test('summarize splits reclaimable from locked rent', () => {
  const summary = summarize({
    address: 'W',
    total: 5,
    empty: [
      { lamports: 2039280, closable: true },
      { lamports: 2039280, closable: true },
      { lamports: 1000000, closable: false },
    ],
  });
  assert.equal(summary.emptyCount, 3);
  assert.equal(summary.closableCount, 2);
  assert.equal(summary.reclaimableLamports, 4078560);
  assert.equal(summary.lockedLamports, 1000000);
  assert.equal(summary.total, 5);
});

test('summarize handles a wallet with nothing empty', () => {
  const summary = summarize({ address: 'W', total: 0, empty: [] });
  assert.equal(summary.emptyCount, 0);
  assert.equal(summary.reclaimableLamports, 0);
  assert.equal(summary.lockedLamports, 0);
});
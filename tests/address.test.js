'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidAddress } = require('../src/address');

test('accepts well-known valid addresses', () => {
  assert.equal(isValidAddress('11111111111111111111111111111111'), true);
  assert.equal(isValidAddress('So11111111111111111111111111111111111111112'), true);
  assert.equal(isValidAddress('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), true);
});

test('rejects wrong length', () => {
  assert.equal(isValidAddress('abc'), false);
  assert.equal(isValidAddress('1'.repeat(45)), false);
});

test('rejects characters outside the base58 alphabet', () => {
  assert.equal(isValidAddress('0okenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), false);
  assert.equal(isValidAddress('Ookenkeg QfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), false);
});

test('rejects non-strings', () => {
  assert.equal(isValidAddress(undefined), false);
  assert.equal(isValidAddress(42), false);
});
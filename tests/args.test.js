'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs, UsageError } = require('../src/args');

const ADDR = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

test('parses a bare address with defaults', () => {
  const opts = parseArgs([ADDR]);
  assert.equal(opts.address, ADDR);
  assert.equal(opts.json, false);
  assert.equal(opts.rpc, null);
  assert.equal(opts.program, 'all');
  assert.equal(opts.limit, null);
});

test('parses --json and both --rpc forms', () => {
  assert.equal(parseArgs([ADDR, '--json']).json, true);
  assert.equal(parseArgs([ADDR, '--rpc', 'https://rpc.example.com']).rpc, 'https://rpc.example.com');
  assert.equal(parseArgs(['--rpc=https://rpc.example.com', ADDR]).rpc, 'https://rpc.example.com');
});

test('parses --program in both forms', () => {
  assert.equal(parseArgs([ADDR, '--program', 'token']).program, 'token');
  assert.equal(parseArgs([ADDR, '--program=token-2022']).program, 'token-2022');
  assert.equal(parseArgs([ADDR, '--program', 'all']).program, 'all');
});

test('rejects an unknown --program', () => {
  assert.throws(() => parseArgs([ADDR, '--program', 'nft']), /--program must be one of/);
  assert.throws(() => parseArgs([ADDR, '--program']), /--program needs a value/);
});

test('parses --limit in both forms', () => {
  assert.equal(parseArgs([ADDR, '--limit', '5']).limit, 5);
  assert.equal(parseArgs([ADDR, '--limit=12']).limit, 12);
});

test('rejects a bad --limit', () => {
  assert.throws(() => parseArgs([ADDR, '--limit', '0']), /positive whole number/);
  assert.throws(() => parseArgs([ADDR, '--limit', 'abc']), /positive whole number/);
  assert.throws(() => parseArgs([ADDR, '--limit', '2.5']), /positive whole number/);
  assert.throws(() => parseArgs([ADDR, '--limit']), /--limit needs a number/);
});

test('--json does not take a value', () => {
  assert.throws(() => parseArgs([ADDR, '--json=yes']), /does not take a value/);
});

test('--help and --version work without an address', () => {
  assert.equal(parseArgs(['--help']).help, true);
  assert.equal(parseArgs(['-v']).version, true);
});

test('missing address is a usage error', () => {
  assert.throws(() => parseArgs([]), UsageError);
});

test('invalid address is a usage error', () => {
  assert.throws(() => parseArgs(['not-an-address']), /valid Solana address/);
});

test('unknown option and extra argument are usage errors', () => {
  assert.throws(() => parseArgs([ADDR, '--nope']), /Unknown option/);
  assert.throws(() => parseArgs([ADDR, ADDR]), /Only one wallet address/);
});

test('--rpc needs a valid http(s) URL and never echoes it', () => {
  assert.throws(() => parseArgs([ADDR, '--rpc']), /needs a URL/);
  assert.throws(() => parseArgs([ADDR, '--rpc', 'ftp://example.com/?key=secret']), (err) => {
    assert.ok(err instanceof UsageError);
    assert.ok(!err.message.includes('secret'));
    return true;
  });
  assert.throws(() => parseArgs([ADDR, '--rpc', 'garbage']), /valid http\(s\) URL/);
});
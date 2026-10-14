'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { run } = require('../src/cli');
const { version } = require('../package.json');
const { createMockRpc, httpError } = require('./helpers/mock-rpc');
const { tokenAccount, tokenAccountsHandler } = require('./helpers/fixtures');

const ADDR = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

function sink() {
  return {
    data: '',
    write(chunk) {
      this.data += chunk;
    },
  };
}

test('--help prints usage and exits 0', async () => {
  const stdout = sink();
  const code = await run(['--help'], { stdout, stderr: sink() });
  assert.equal(code, 0);
  assert.match(stdout.data, /Usage:/);
});

test('--version prints the package version', async () => {
  const stdout = sink();
  const code = await run(['--version'], { stdout, stderr: sink() });
  assert.equal(code, 0);
  assert.equal(stdout.data.trim(), version);
});

test('usage errors exit 2 and print to stderr', async () => {
  const stderr = sink();
  const code = await run([], { stdout: sink(), stderr });
  assert.equal(code, 2);
  assert.match(stderr.data, /Missing wallet address/);
});

test('lists empty token accounts', async () => {
  const mock = createMockRpc({
    getTokenAccountsByOwner: tokenAccountsHandler({
      token: [
        tokenAccount({ pubkey: 'EmptyOne', mint: 'MintOne' }),
        tokenAccount({ pubkey: 'Funded', amount: '10' }),
      ],
      token2022: [tokenAccount({ pubkey: 'FrozenOne', mint: 'MintTwo', state: 'frozen' })],
    }),
  });
  const stdout = sink();
  const code = await run([ADDR], { stdout, stderr: sink(), env: {}, fetch: mock.fetch });

  assert.equal(code, 0);
  assert.match(stdout.data, /Token accounts: 3 \(2 empty\)/);
  assert.match(stdout.data, /EmptyOne {2}token {2}mint MintOne {2}2039280 lamports/);
  assert.match(stdout.data, /FrozenOne.*\[cannot close: frozen\]/);
  assert.ok(!stdout.data.includes('Funded'));
});

test('reports when there is nothing to reclaim', async () => {
  const mock = createMockRpc({ getTokenAccountsByOwner: tokenAccountsHandler() });
  const stdout = sink();
  const code = await run([ADDR], { stdout, stderr: sink(), env: {}, fetch: mock.fetch });
  assert.equal(code, 0);
  assert.match(stdout.data, /No empty token accounts found\./);
});

test('--rpc overrides the env var', async () => {
  const mock = createMockRpc({ getTokenAccountsByOwner: tokenAccountsHandler() });
  await run([ADDR, '--rpc', 'https://flag.example.com'], {
    stdout: sink(),
    stderr: sink(),
    env: { SOL_RENT_RECLAIM_RPC: 'https://env.example.com' },
    fetch: mock.fetch,
  });
  assert.equal(mock.calls[0].url, 'https://flag.example.com');
});

test('RPC failures exit 1 without leaking the URL', async () => {
  const mock = createMockRpc({ getTokenAccountsByOwner: httpError(500) });
  const stderr = sink();
  const code = await run([ADDR], {
    stdout: sink(),
    stderr,
    env: { SOL_RENT_RECLAIM_RPC: 'https://rpc.example.com/?key=secret' },
    fetch: mock.fetch,
  });
  assert.equal(code, 1);
  assert.match(stderr.data, /Error: rpc\.example\.com returned HTTP 500/);
  assert.ok(!stderr.data.includes('secret'));
});
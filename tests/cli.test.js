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

function mixedWallet() {
  return createMockRpc({
    getTokenAccountsByOwner: tokenAccountsHandler({
      token: [
        tokenAccount({ pubkey: 'EmptyOne', mint: 'MintOne' }),
        tokenAccount({ pubkey: 'Funded', amount: '10' }),
      ],
      token2022: [tokenAccount({ pubkey: 'FrozenOne', mint: 'MintTwo', state: 'frozen' })],
    }),
  });
}

test('--help prints usage and exits 0', async () => {
  const stdout = sink();
  const code = await run(['--help'], { stdout, stderr: sink() });
  assert.equal(code, 0);
  assert.match(stdout.data, /Usage:/);
  assert.match(stdout.data, /--program/);
  assert.match(stdout.data, /--limit/);
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

test('a bad --program exits 2', async () => {
  const stderr = sink();
  const code = await run([ADDR, '--program', 'nft'], { stdout: sink(), stderr });
  assert.equal(code, 2);
  assert.match(stderr.data, /--program must be one of/);
});

test('prints an aligned table with totals', async () => {
  const mock = mixedWallet();
  const stdout = sink();
  const code = await run([ADDR], { stdout, stderr: sink(), env: {}, fetch: mock.fetch });

  assert.equal(code, 0);
  assert.match(stdout.data, /Token accounts: 3 \(2 empty\)/);
  assert.match(stdout.data, /ACCOUNT +PROGRAM +MINT +RENT \(SOL\)/);
  assert.match(stdout.data, /EmptyOne +token +MintOne +0\.00203928\n/);
  assert.match(stdout.data, /FrozenOne +token-2022 +MintTwo +0\.00203928 +\[cannot close: frozen\]/);
  assert.match(stdout.data, /Reclaimable: 0\.00203928 SOL from 1 account\n/);
  assert.match(stdout.data, /Locked \(cannot close\): 0\.00203928 SOL in 1 account\n/);
  assert.ok(!stdout.data.includes('Funded'));
});

test('reports when there is nothing to reclaim', async () => {
  const mock = createMockRpc({ getTokenAccountsByOwner: tokenAccountsHandler() });
  const stdout = sink();
  const code = await run([ADDR], { stdout, stderr: sink(), env: {}, fetch: mock.fetch });
  assert.equal(code, 0);
  assert.match(stdout.data, /No empty token accounts found\./);
  assert.ok(!stdout.data.includes('Reclaimable'));
});

test('--limit trims the list but not the totals', async () => {
  const mock = createMockRpc({
    getTokenAccountsByOwner: tokenAccountsHandler({
      token: [
        tokenAccount({ pubkey: 'First' }),
        tokenAccount({ pubkey: 'Second' }),
        tokenAccount({ pubkey: 'Third' }),
      ],
    }),
  });
  const stdout = sink();
  await run([ADDR, '--limit', '2'], { stdout, stderr: sink(), env: {}, fetch: mock.fetch });

  assert.match(stdout.data, /Token accounts: 3 \(3 empty\)/);
  assert.ok(stdout.data.includes('First'));
  assert.ok(stdout.data.includes('Second'));
  assert.ok(!stdout.data.includes('Third'));
  assert.match(stdout.data, /\.\.\. and 1 more/);
  assert.match(stdout.data, /Reclaimable: 0\.00611784 SOL from 3 accounts/);
});

test('--program limits the scan to one token program', async () => {
  const mock = mixedWallet();
  const stdout = sink();
  const code = await run([ADDR, '--program', 'token-2022'], {
    stdout,
    stderr: sink(),
    env: {},
    fetch: mock.fetch,
  });

  assert.equal(code, 0);
  assert.equal(mock.calls.length, 1);
  assert.ok(stdout.data.includes('FrozenOne'));
  assert.ok(!stdout.data.includes('EmptyOne'));
});

test('--json prints a parseable summary and ignores --limit', async () => {
  const mock = mixedWallet();
  const stdout = sink();
  const code = await run([ADDR, '--json', '--limit', '1'], {
    stdout,
    stderr: sink(),
    env: {},
    fetch: mock.fetch,
  });

  assert.equal(code, 0);
  const data = JSON.parse(stdout.data);
  assert.equal(data.address, ADDR);
  assert.equal(data.totalTokenAccounts, 3);
  assert.equal(data.emptyCount, 2);
  assert.equal(data.closableCount, 1);
  assert.equal(data.reclaimableLamports, 2039280);
  assert.equal(data.reclaimableSol, '0.00203928');
  assert.equal(data.lockedLamports, 2039280);
  assert.deepEqual(data.emptyAccounts.map((a) => a.pubkey), ['EmptyOne', 'FrozenOne']);
  assert.deepEqual(data.emptyAccounts.map((a) => a.blockedReason), [null, 'frozen']);
});

test('--json for a clean wallet has empty results', async () => {
  const mock = createMockRpc({ getTokenAccountsByOwner: tokenAccountsHandler() });
  const stdout = sink();
  await run([ADDR, '--json'], { stdout, stderr: sink(), env: {}, fetch: mock.fetch });
  const data = JSON.parse(stdout.data);
  assert.equal(data.emptyCount, 0);
  assert.equal(data.reclaimableSol, '0');
  assert.deepEqual(data.emptyAccounts, []);
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
  const stdout = sink();
  const stderr = sink();
  const code = await run([ADDR, '--json'], {
    stdout,
    stderr,
    env: { SOL_RENT_RECLAIM_RPC: 'https://rpc.example.com/?key=secret' },
    fetch: mock.fetch,
  });
  assert.equal(code, 1);
  assert.equal(stdout.data, '');
  assert.match(stderr.data, /Error: rpc\.example\.com returned HTTP 500/);
  assert.ok(!stderr.data.includes('secret'));
});
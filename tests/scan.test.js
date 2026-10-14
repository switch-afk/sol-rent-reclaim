'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { TOKEN_PROGRAMS, scanWallet } = require('../src/scan');
const { isValidAddress } = require('../src/address');
const { createRpcClient, RpcError } = require('../src/rpc');
const { createMockRpc, httpError } = require('./helpers/mock-rpc');
const { tokenAccount, tokenAccountsHandler } = require('./helpers/fixtures');

const WALLET = 'So11111111111111111111111111111111111111112';

function setup(handlers) {
  const mock = createMockRpc(handlers);
  const client = createRpcClient({
    url: 'https://rpc.example.com',
    fetch: mock.fetch,
    sleep: async () => {},
  });
  return { client, mock };
}

test('program ids are valid addresses', () => {
  assert.equal(TOKEN_PROGRAMS[0].name, 'token');
  assert.equal(TOKEN_PROGRAMS[1].name, 'token-2022');
  for (const program of TOKEN_PROGRAMS) {
    assert.equal(isValidAddress(program.id), true);
  }
});

test('finds only zero-balance accounts across both programs', async () => {
  const { client } = setup({
    getTokenAccountsByOwner: tokenAccountsHandler({
      token: [
        tokenAccount({ pubkey: 'A1', amount: '0' }),
        tokenAccount({ pubkey: 'A2', amount: '500' }),
      ],
      token2022: [tokenAccount({ pubkey: 'B1', amount: '0', lamports: 2100000 })],
    }),
  });

  const result = await scanWallet(client, WALLET);
  assert.equal(result.address, WALLET);
  assert.equal(result.total, 3);
  assert.deepEqual(result.empty.map((a) => a.pubkey), ['A1', 'B1']);
  assert.deepEqual(result.empty.map((a) => a.program), ['token', 'token-2022']);
  assert.deepEqual(result.empty.map((a) => a.lamports), [2039280, 2100000]);
  assert.deepEqual(result.empty.map((a) => a.closable), [true, true]);
});

test('queries both programs with jsonParsed encoding', async () => {
  const { client, mock } = setup({ getTokenAccountsByOwner: tokenAccountsHandler() });
  await scanWallet(client, WALLET);

  assert.equal(mock.calls.length, 2);
  for (const call of mock.calls) {
    assert.equal(call.method, 'getTokenAccountsByOwner');
    assert.equal(call.params[0], WALLET);
    assert.deepEqual(call.params[2], { encoding: 'jsonParsed' });
  }
  assert.equal(mock.calls[0].params[1].programId, TOKEN_PROGRAMS[0].id);
  assert.equal(mock.calls[1].params[1].programId, TOKEN_PROGRAMS[1].id);
});

test('frozen accounts are not closable', async () => {
  const { client } = setup({
    getTokenAccountsByOwner: tokenAccountsHandler({
      token: [tokenAccount({ pubkey: 'F1', state: 'frozen' })],
    }),
  });
  const result = await scanWallet(client, WALLET);
  assert.equal(result.empty[0].state, 'frozen');
  assert.equal(result.empty[0].closable, false);
});

test('a close authority other than the wallet blocks closing', async () => {
  const { client } = setup({
    getTokenAccountsByOwner: tokenAccountsHandler({
      token: [
        tokenAccount({ pubkey: 'C1', closeAuthority: 'SomeoneElse' }),
        tokenAccount({ pubkey: 'C2', closeAuthority: WALLET }),
      ],
    }),
  });
  const result = await scanWallet(client, WALLET);
  assert.equal(result.empty[0].closable, false);
  assert.equal(result.empty[1].closable, true);
});

test('entries without parsed data are counted but skipped', async () => {
  const { client } = setup({
    getTokenAccountsByOwner: tokenAccountsHandler({
      token: [{ pubkey: 'X', account: { lamports: 1, data: ['abc', 'base64'] } }],
    }),
  });
  const result = await scanWallet(client, WALLET);
  assert.equal(result.total, 1);
  assert.equal(result.empty.length, 0);
});

test('a wallet with no token accounts returns zeros', async () => {
  const { client } = setup({ getTokenAccountsByOwner: tokenAccountsHandler() });
  const result = await scanWallet(client, WALLET);
  assert.equal(result.total, 0);
  assert.deepEqual(result.empty, []);
});

test('RPC failures propagate as RpcError', async () => {
  const { client } = setup({ getTokenAccountsByOwner: httpError(500) });
  await assert.rejects(scanWallet(client, WALLET), RpcError);
});
'use strict';

const TOKEN_PROGRAMS = [
  { name: 'token', id: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
  { name: 'token-2022', id: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' },
];

async function fetchTokenAccounts(client, address, program) {
  const result = await client.call('getTokenAccountsByOwner', [
    address,
    { programId: program.id },
    { encoding: 'jsonParsed' },
  ]);
  return (result && result.value) || [];
}

function parseEntry(entry, program, wallet) {
  const info = entry?.account?.data?.parsed?.info;
  if (!info || !info.tokenAmount) return null;

  const state = info.state || 'initialized';
  const closeAuthority = info.closeAuthority || null;
  const closable =
    state !== 'frozen' && (closeAuthority === null || closeAuthority === wallet);

  return {
    isEmpty: info.tokenAmount.amount === '0',
    pubkey: entry.pubkey,
    mint: info.mint,
    program: program.name,
    lamports: Number(entry.account.lamports) || 0,
    state,
    closeAuthority,
    closable,
  };
}

async function scanWallet(client, address) {
  let total = 0;
  const empty = [];

  for (const program of TOKEN_PROGRAMS) {
    const entries = await fetchTokenAccounts(client, address, program);
    total += entries.length;

    for (const entry of entries) {
      const parsed = parseEntry(entry, program, address);
      if (parsed && parsed.isEmpty) {
        const { isEmpty, ...account } = parsed;
        empty.push(account);
      }
    }
  }

  return { address, total, empty };
}

module.exports = { TOKEN_PROGRAMS, scanWallet };
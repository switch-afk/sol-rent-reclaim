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

function hasWithheldFees(info) {
  if (!Array.isArray(info.extensions)) return false;
  return info.extensions.some(
    (ext) => ext?.extension === 'transferFeeAmount' && Number(ext.state?.withheldAmount) > 0
  );
}

function blockedReasonFor(info, state, closeAuthority, wallet) {
  if (state === 'frozen') return 'frozen';
  if (closeAuthority !== null && closeAuthority !== wallet) return 'close-authority';
  if (hasWithheldFees(info)) return 'withheld-fees';
  return null;
}

function parseEntry(entry, program, wallet) {
  const info = entry?.account?.data?.parsed?.info;
  if (!info || !info.tokenAmount) return null;

  const state = info.state || 'initialized';
  const closeAuthority = info.closeAuthority || null;
  const blockedReason = blockedReasonFor(info, state, closeAuthority, wallet);

  return {
    isEmpty: info.tokenAmount.amount === '0',
    pubkey: entry.pubkey,
    mint: info.mint,
    program: program.name,
    lamports: Number(entry.account.lamports) || 0,
    state,
    closeAuthority,
    closable: blockedReason === null,
    blockedReason,
  };
}

async function scanWallet(client, address, options = {}) {
  const selected = options.program || 'all';
  const programs = TOKEN_PROGRAMS.filter((p) => selected === 'all' || p.name === selected);

  let total = 0;
  const empty = [];

  for (const program of programs) {
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
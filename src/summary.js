'use strict';

const LAMPORTS_PER_SOL = 1_000_000_000;

function formatSol(lamports) {
  const whole = Math.floor(lamports / LAMPORTS_PER_SOL);
  const fraction = String(lamports % LAMPORTS_PER_SOL)
    .padStart(9, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}

function summarize(result) {
  let closableCount = 0;
  let reclaimableLamports = 0;
  let lockedLamports = 0;

  for (const account of result.empty) {
    if (account.closable) {
      closableCount += 1;
      reclaimableLamports += account.lamports;
    } else {
      lockedLamports += account.lamports;
    }
  }

  return {
    ...result,
    emptyCount: result.empty.length,
    closableCount,
    reclaimableLamports,
    lockedLamports,
  };
}

module.exports = { LAMPORTS_PER_SOL, formatSol, summarize };
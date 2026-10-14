'use strict';

const { summarize, formatSol } = require('./summary');

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function closeNote(account) {
  if (account.closable) return '';
  const reason =
    account.state === 'frozen' ? 'frozen' : 'close authority is another address';
  return `  [cannot close: ${reason}]`;
}

function renderText(result) {
  const summary = summarize(result);
  const lines = [
    `Wallet: ${summary.address}`,
    `Token accounts: ${summary.total} (${summary.emptyCount} empty)`,
    '',
  ];

  if (summary.emptyCount === 0) {
    lines.push('No empty token accounts found.');
    return lines.join('\n') + '\n';
  }

  for (const account of summary.empty) {
    lines.push(
      `${account.pubkey}  ${account.program}  mint ${account.mint}  ` +
        `${account.lamports} lamports${closeNote(account)}`
    );
  }

  lines.push('');
  lines.push(
    `Reclaimable: ${formatSol(summary.reclaimableLamports)} SOL from ` +
      plural(summary.closableCount, 'account')
  );

  const lockedCount = summary.emptyCount - summary.closableCount;
  if (lockedCount > 0) {
    lines.push(
      `Locked (cannot close): ${formatSol(summary.lockedLamports)} SOL in ` +
        plural(lockedCount, 'account')
    );
  }

  return lines.join('\n') + '\n';
}

function renderJson(result) {
  const summary = summarize(result);
  return (
    JSON.stringify(
      {
        address: summary.address,
        totalTokenAccounts: summary.total,
        emptyCount: summary.emptyCount,
        closableCount: summary.closableCount,
        reclaimableLamports: summary.reclaimableLamports,
        reclaimableSol: formatSol(summary.reclaimableLamports),
        lockedLamports: summary.lockedLamports,
        emptyAccounts: summary.empty,
      },
      null,
      2
    ) + '\n'
  );
}

module.exports = { renderText, renderJson };
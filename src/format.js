'use strict';

const { summarize, formatSol } = require('./summary');

const REASONS = {
  frozen: 'frozen',
  'close-authority': 'close authority is another address',
  'withheld-fees': 'withheld transfer fees must be harvested first',
};

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function closeNote(account) {
  if (account.closable) return '';
  return `  [cannot close: ${REASONS[account.blockedReason] || 'blocked'}]`;
}

function renderTable(accounts) {
  const header = ['ACCOUNT', 'PROGRAM', 'MINT', 'RENT (SOL)'];
  const rows = accounts.map((a) => [a.pubkey, a.program, a.mint, formatSol(a.lamports)]);
  const widths = header.map((label, col) =>
    Math.max(label.length, ...rows.map((row) => row[col].length))
  );
  const fmt = (row) =>
    `${row[0].padEnd(widths[0])}  ${row[1].padEnd(widths[1])}  ` +
    `${row[2].padEnd(widths[2])}  ${row[3].padStart(widths[3])}`;

  const lines = [fmt(header)];
  rows.forEach((row, i) => lines.push(fmt(row) + closeNote(accounts[i])));
  return lines;
}

function renderText(result, options = {}) {
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

  const shown = options.limit ? summary.empty.slice(0, options.limit) : summary.empty;
  lines.push(...renderTable(shown));

  const hidden = summary.emptyCount - shown.length;
  if (hidden > 0) {
    lines.push(`... and ${hidden} more (raise --limit or use --json to see all)`);
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
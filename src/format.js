'use strict';

function closeNote(account) {
  if (account.closable) return '';
  const reason =
    account.state === 'frozen' ? 'frozen' : 'close authority is another address';
  return `  [cannot close: ${reason}]`;
}

function renderText(result) {
  const lines = [
    `Wallet: ${result.address}`,
    `Token accounts: ${result.total} (${result.empty.length} empty)`,
    '',
  ];

  if (result.empty.length === 0) {
    lines.push('No empty token accounts found.');
  } else {
    for (const account of result.empty) {
      lines.push(
        `${account.pubkey}  ${account.program}  mint ${account.mint}  ` +
          `${account.lamports} lamports${closeNote(account)}`
      );
    }
  }

  return lines.join('\n') + '\n';
}

module.exports = { renderText };
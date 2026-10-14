'use strict';

const { TOKEN_PROGRAMS } = require('../../src/scan');

function tokenAccount({
  pubkey,
  mint = 'So11111111111111111111111111111111111111112',
  amount = '0',
  lamports = 2039280,
  state = 'initialized',
  closeAuthority,
} = {}) {
  const info = {
    mint,
    owner: 'owner',
    state,
    tokenAmount: { amount, decimals: 6, uiAmount: Number(amount), uiAmountString: amount },
  };
  if (closeAuthority) info.closeAuthority = closeAuthority;

  return {
    pubkey,
    account: {
      lamports,
      owner: 'program',
      executable: false,
      rentEpoch: 0,
      space: 165,
      data: { program: 'spl-token', parsed: { type: 'account', info }, space: 165 },
    },
  };
}

// Handler for createMockRpc: returns different accounts per token program.
function tokenAccountsHandler({ token = [], token2022 = [] } = {}) {
  return (params) => {
    const programId = params[1].programId;
    let value = [];
    if (programId === TOKEN_PROGRAMS[0].id) value = token;
    else if (programId === TOKEN_PROGRAMS[1].id) value = token2022;
    return { context: { slot: 1 }, value };
  };
}

module.exports = { tokenAccount, tokenAccountsHandler };
'use strict';

const { parseArgs, UsageError } = require('./args');
const { version } = require('../package.json');

const HELP = `sol-rent-reclaim v${version}

Find empty token accounts on a Solana wallet and see how much rent
you could reclaim by closing them. Read-only: never signs anything.

Usage:
  sol-rent-reclaim <wallet-address> [options]

Options:
  --rpc <url>   RPC endpoint (or set SOL_RENT_RECLAIM_RPC)
  --json        Print machine-readable JSON
  -h, --help    Show this help
  -v, --version Show the version
`;

function run(argv, io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;

  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    if (err instanceof UsageError) {
      stderr.write(`Error: ${err.message}\n\n${HELP}`);
      return 2;
    }
    throw err;
  }

  if (opts.help) {
    stdout.write(HELP);
    return 0;
  }
  if (opts.version) {
    stdout.write(`${version}\n`);
    return 0;
  }

  stderr.write('Scanning is not implemented yet.\n');
  return 1;
}

module.exports = { run, HELP };
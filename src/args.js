'use strict';

const { isValidAddress } = require('./address');

class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
  }
}

function checkRpcUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new UsageError('--rpc must be a valid http(s) URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UsageError('--rpc must be a valid http(s) URL');
  }
  return value;
}

function parseArgs(argv) {
  const opts = {
    address: null,
    rpc: null,
    json: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--version' || arg === '-v') {
      opts.version = true;
    } else if (arg === '--json') {
      opts.json = true;
    } else if (arg === '--rpc') {
      const value = argv[++i];
      if (!value || value.startsWith('-')) {
        throw new UsageError('--rpc needs a URL');
      }
      opts.rpc = checkRpcUrl(value);
    } else if (arg.startsWith('--rpc=')) {
      const value = arg.slice('--rpc='.length);
      if (!value) throw new UsageError('--rpc needs a URL');
      opts.rpc = checkRpcUrl(value);
    } else if (arg.startsWith('-')) {
      throw new UsageError(`Unknown option: ${arg}`);
    } else if (opts.address === null) {
      opts.address = arg;
    } else {
      throw new UsageError('Only one wallet address can be given');
    }
  }

  if (!opts.help && !opts.version) {
    if (!opts.address) {
      throw new UsageError('Missing wallet address');
    }
    if (!isValidAddress(opts.address)) {
      throw new UsageError('Not a valid Solana address');
    }
  }

  return opts;
}

module.exports = { parseArgs, UsageError };
# sol-rent-reclaim

[![CI](https://github.com/switch-afk/sol-rent-reclaim/actions/workflows/ci.yml/badge.svg)](https://github.com/switch-afk/sol-rent-reclaim/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/sol-rent-reclaim)](https://www.npmjs.com/package/sol-rent-reclaim)
[![license](https://img.shields.io/npm/l/sol-rent-reclaim)](LICENSE)

Find empty token accounts on a Solana wallet and see how much rent (SOL) you could get back by closing them.

Every token account on Solana holds a small SOL deposit, around 0.0015 SOL each. When a token balance hits zero the account stays open and the deposit stays locked. Wallets that traded a lot of tokens can have dozens of these. This tool lists them and adds up what is reclaimable.

- Read-only: it never signs anything and never asks for a key
- Covers both the Token and Token-2022 programs
- Reads the real rent per account from the chain, no hardcoded numbers
- Flags accounts that cannot be closed, and why
- Zero dependencies, Node 18+

## Install

```bash
npx sol-rent-reclaim <wallet-address>
```

Or install it globally:

```bash
npm install -g sol-rent-reclaim
```

## Usage

```bash
sol-rent-reclaim <wallet-address> [options]
```

| Option | Description |
| --- | --- |
| `--rpc <url>` | RPC endpoint (or set `SOL_RENT_RECLAIM_RPC`) |
| `--program <name>` | `token`, `token-2022` or `all` (default: `all`) |
| `--limit <n>` | Show at most `n` accounts in the text list. Totals still cover every empty account |
| `--json` | Print machine-readable JSON (ignores `--limit`) |
| `-h`, `--help` | Show help |
| `-v`, `--version` | Show the version |

## RPC endpoint

The endpoint is picked in this order: `--rpc`, then the `SOL_RENT_RECLAIM_RPC` environment variable, then the public mainnet endpoint. The public endpoint is rate limited and can struggle with wallets that hold many token accounts, so use your own RPC for anything serious.

```bash
export SOL_RENT_RECLAIM_RPC="https://your-rpc.example.com/?api-key=..."
```

```powershell
$env:SOL_RENT_RECLAIM_RPC = "https://your-rpc.example.com/?api-key=..."
```

Errors only ever print the RPC hostname, so API keys in the URL are not leaked. Requests that get an HTTP 429 are retried with backoff.

## Example output

Addresses are shortened here. The real output prints them in full.

```
Wallet: <wallet-address>
Token accounts: 242 (5 empty)

ACCOUNT     PROGRAM     MINT        RENT (SOL)
AbCd…WxYz   token       EfGh…StUv   0.00148844
IjKl…QrSt   token       So11…1112   0.00148844
MnOp…UvWx   token-2022  YzAb…pump   0.00151384

Reclaimable: 0.0045 SOL from 3 accounts
```

## JSON output

`--json` prints one object:

| Field | Meaning |
| --- | --- |
| `address` | The wallet that was scanned |
| `totalTokenAccounts` | All token accounts found (empty or not) |
| `emptyCount` | Accounts with a zero balance |
| `closableCount` | Empty accounts the owner can close |
| `reclaimableLamports` / `reclaimableSol` | Rent in the closable accounts (`reclaimableSol` is a string) |
| `lockedLamports` | Rent in empty accounts that cannot be closed |
| `emptyAccounts` | One entry per empty account: `pubkey`, `mint`, `program`, `lamports`, `state`, `closeAuthority`, `closable`, `blockedReason` |

## What counts as reclaimable

An account is empty when its token amount is zero. An empty account is flagged as locked, with a `blockedReason`, when the owner cannot close it:

| `blockedReason` | Why |
| --- | --- |
| `frozen` | The mint's freeze authority froze the account |
| `close-authority` | A close authority other than the wallet is set |
| `withheld-fees` | A Token-2022 account still holds withheld transfer fees that must be harvested first |

## Closing the accounts

This tool only reports. To close the accounts, use your wallet's cleanup feature, or the `spl-token` CLI (see `spl-token close --help`):

```bash
spl-token close --address <token-account>
```

For Token-2022 accounts add `--program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | RPC or runtime error |
| `2` | Usage error (bad arguments) |

## Development

```bash
npm test
```

No dependencies to install. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
# Changelog

## [0.1.0] - 2026-10-14

First release.

### Added
- Scan a wallet for empty token accounts across the Token and Token-2022 programs
- Reclaimable and locked rent totals, in lamports and SOL
- `--json` output
- `--program` filter (`token`, `token-2022`, `all`) and `--limit` for the text list
- Aligned text table with a header row
- `blockedReason` for accounts that cannot be closed: frozen, another close authority, or withheld Token-2022 transfer fees
- RPC client with 429 retry and backoff, `--rpc` and `SOL_RENT_RECLAIM_RPC`, hostname-only error messages
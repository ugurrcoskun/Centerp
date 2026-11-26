# Escrow TTL maintenance and recovery

Prepared 26 November 2026 for Testnet escrow v2. This is an operator runbook, not evidence that a live recovery has been performed. See the [security review](../security/soroban-checklist.md).

## Routine maintenance

- Keep an inventory of contract ID, WASM hash, merchant address and 32-byte invoice ID for every active invoice, including invoices created outside Centerp. The current keeper discovers invoices from the application database only.
- Monitor successful on-chain heartbeat transactions, current code/instance/invoice `liveUntilLedger`, backlog and spendable keeper XLM. A simulated `get` does not persist TTL renewal.
- The contract renews instance/code and the requested persistent invoice entry when below 30 × 17,280 ledgers, targeting 120 × 17,280 ledgers. These are ledger counts; time estimates depend on ledger cadence and current network limits.
- The keeper schedules weekly signed `get` calls for known active invoices and processes at most 25 candidates per run. Check actual deployed scheduling and alert delivery separately, especially after hosting changes. A successful local test is not a cron receipt.

## If an invoice cannot be read or settled

1. Identify the actual invoice contract from its stored record, not just the latest configured contract. Distinguish archived state from wrong network/ID, RPC outage, token refusal and Testnet reset. Do not recreate an invoice as a substitute for restoration.
2. Consult the [deployment record](../../artifacts/deployment.json) and [v1 migration policy](../architecture/escrow-v2.md). This runbook's example targets v2; v1 has different timeout behavior.
3. Simulate the intended `get`/settlement with the current RPC and SDK, inspect required restorations and fees, then prepare the transaction with those resources. Protocol 23+ supports automatic restoration when archived entries are included in the restore list. If simulation requests separate restoration or exceeds resource limits, restore the affected entries separately. See [Stellar state archival](https://developers.stellar.org/docs/learn/fundamentals/contract-development/storage/state-archival).
4. Restore the instance/code and affected persistent invoice as needed. The CLI 28.1.0 options below were checked with `--help`; the commands were **not executed on-chain** during this review. Use a locally configured fee-paying identity, never paste a secret into commands, reports or support messages.

```sh
# Replace placeholders after verifying Testnet and the deployment record.
stellar contract restore --network testnet --source-account <fee-payer-alias> \
  --contract-id <invoice-contract-id>
stellar contract restore --network testnet --source-account <fee-payer-alias> \
  --wasm-hash <recorded-wasm-sha256>
stellar contract restore --network testnet --source-account <fee-payer-alias> \
  --contract-id <invoice-contract-id> --durability persistent \
  --key-xdr <base64-scval-for-Key-Invoice-merchant-id>
```

The invoice key is the contract enum `Key::Invoice(Address, BytesN<32>)`, encoded as an ScVal vector containing symbol `Invoice`, merchant Address and 32-byte ID. It is **not** a simple symbol key: do not use `--key Invoice` or encode the ID as a hex text string. Obtain and verify the exact key XDR from the simulated footprint or SDK encoding; match its merchant/ID against the inventory before submission.

5. Re-simulate and submit `get` to extend the restored state. Read all stored terms, status and token balances before attempting settlement. Finalize according to the original ledger deadlines; restoring data does not reset commercial deadlines. Any required buyer/merchant/resolver authorization still applies.
6. Save confirmed restoration/heartbeat/settlement hashes, ledger, before/after TTL, status and balances. Reconcile the actual settlement hash into the ERP exactly once; a read/restore hash is not payment evidence. The current keeper flags external settlement for reconciliation rather than automatically assigning a read hash to it.
7. If the network was reset, restoration cannot recover the old Testnet ledger. Preserve dated evidence separately and set up a fresh Testnet environment with explicitly new records. Do not present a new deployment as recovery of historical balances.

## Still to demonstrate

- Live Testnet restoration with recorded before/after state and balances.
- Current hosting cron execution, alert delivery and adequate fee balance.
- Discovery and maintenance of invoices created outside the application.
- Recovery under frozen/deauthorized token accounts and issuer clawback assumptions.

These are open operational checks, not completed user acceptance tests.

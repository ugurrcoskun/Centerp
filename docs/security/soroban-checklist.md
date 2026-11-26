# Soroban security checklist and internal review

Review date: **26 November 2026**. Scope: **invoice-escrow v2, Testnet**.

## Result and limits

The reviewed contract and 19 deterministic contract tests did not demonstrate an unauthorized payout, repeat settlement, or cross-invoice withdrawal. Seven security regression tests were added. Runtime contract code was not changed. The locally rebuilt WASM SHA-256 matches the historical Testnet deployment record:

`83ef135ba7680cec7677fa742dfbb7f81d8aff8de5fe3fdf4460fa5d297cad58`

This is an **internal code review and checklist application**, not an independent security audit, certification, or approval for Mainnet. Passing tests do not establish the absence of vulnerabilities. No new deployment, live wallet transaction, issuer-permission query, live archive recovery, fuzz campaign, or dependency vulnerability scan was performed. Existing Testnet proofs are historical evidence, not transactions executed during this review. Production operations were not revalidated.

Machine-readable results, reviewed file hashes, tool versions and exclusions: [review evidence](../../artifacts/soroban-security-review.json). Deployment identity: [deployment record](../../artifacts/deployment.json); historical source attestation: [verification record](../operations/contract-verification.md).

## Scope and method

- Primary code: [contract](../../contracts/invoice-escrow/src/lib.rs), [contract tests](../../contracts/invoice-escrow/src/test.rs), Cargo manifest/lockfile and Rust toolchain.
- Supporting integration: [keeper](../../lib/keeper.ts), [keeper tests](../../tests/keeper.test.ts), [application security tests](../../tests/security.test.ts), [escrow policy](../architecture/escrow-v2.md).
- Method: manual review of all contract entry points, role/state/deadline matrix, negative authorization tests, balance assertions, rollback checks, TTL renewal checks and local release build. Application tests supplement the review; they are not an exhaustive web security audit.
- Checklist references: [Stellar authorization](https://developers.stellar.org/docs/learn/fundamentals/contract-development/authorization), [Stellar state archival](https://developers.stellar.org/docs/learn/fundamentals/contract-development/storage/state-archival), [Veridise Soroban checklist](https://veridise.com/blog/audit-insights/building-on-stellar-soroban-grab-this-security-checklist-to-avoid-vulnerabilities/). The controls below adapt these references to Centerp; no single checklist is claimed to be a mandatory Instawards standard.

## Trust assumptions and invariants

1. The configured token is the intended Stellar Asset Contract (SAC). Constructor configuration is trusted; arbitrary token implementations are outside this review's guarantees. Issuer controls and network availability can prevent transfers independently of escrow logic.
2. Merchant and buyer control their keys and inspect the amount, counterparties, deadlines, commitment and resolver before signing. On-chain authorization uses `require_auth`; ERP roles do not replace a wallet signature.
3. Resolver address inequality does **not** establish independent ownership. The merchant chooses the resolver at creation; participants must agree to its identity outside the contract.
4. Funding debits exactly the invoice amount. Successful settlement sends that amount only to the stored buyer or merchant, once. Failed token calls must roll back the state change.
5. `(merchant, id)` identifies an invoice. Terms and terminal states cannot be overwritten through a public method. Archival is not cancellation, deletion or permission to reuse an ID.
6. Delivery is a merchant assertion, not cryptographic proof of physical delivery. The buyer monitors the dispute window. Resolver silence causes buyer refund, an explicit commercial tradeoff.
7. Deadline transitions require a submitted transaction. A fee-paying keeper or another actor maintains liveness; no automatic payout occurs merely because time passes.

## Applied checklist

**PASS** means evidence supports the specific check in the reviewed scope. **PARTIAL** means a control exists with an unverified operational dependency. **OPEN** means the activity was not performed. **N/A** means the relevant mechanism is absent, with the reason stated.

| ID | Control | Status | Evidence / qualification |
| --- | --- | --- | --- |
| AUTH-01 | Merchant authorizes creation and cancellation; buyer authorizes funding/release/dispute; merchant authorizes refund/delivery | PASS | `wrong_signers_cannot_use_privileged_actions`, `buyer_and_merchant_roles_cannot_be_swapped`, `rejects_unsigned_calls`, existing missing-auth tests. Role-swap tests reject the opposite party and accept the required party with exact authorization for release/refund/deliver/dispute/cancel. Unauthorized attempts retain state and escrow balance. |
| AUTH-02 | Only the fixed resolver decides a disputed invoice | PASS | `resolver_can_only_pay_the_fixed_parties_and_cannot_replay`; wrong-signers test rejects buyer, merchant and stranger resolver approvals, then accepts exact resolver authorization. |
| AUTH-03 | Funding binds authorization to this invoice and the nested token debit | PASS | `funding_requires_the_exact_buyer_authorization_tree`: wrong invoice and missing token sub-invocation fail; exact buyer authorization tree succeeds without blanket auth mocking. SDK mocks exercise authorization context, not real signature cryptography. |
| AUTH-04 | Public finalize/expire/read cannot redirect funds | PASS | Deadline tests execute finalize/expire with no user authorization; payout recipients come from stored state, not caller input. `get` renews TTL without changing terms. |
| STATE-01 | Terminal states reject every lifecycle action and ID reuse | PASS | `all_terminal_states_reject_every_lifecycle_action_and_id_reuse` covers Released, Refunded, Cancelled and Expired. |
| FUNDS-01 | Exact amounts, fixed recipients and token conservation | PASS | Settlement/refund/resolver tests; balance assertions before/after transfer. No payout method accepts a replacement recipient or token. |
| FUNDS-02 | Failed token transfer is atomic | PASS | `insufficient_token_balance_rolls_back_invoice_state`, `failed_timeout_transfer_rolls_back_and_other_invoices_keep_their_funds`. The latter injects liquidity loss only in the test host. |
| ISOLATION-01 | Identical invoice IDs under different merchants do not share records or liabilities | PASS | `merchant_namespaces_isolate_identical_invoice_ids_and_balances`: distinct merchants and buyers; one release leaves the other escrow intact; subsequent refund pays the second buyer. |
| TIME-01 | Funding, delivery, dispute and resolution cutoffs have defined equality behavior | PASS | Existing delivery/dispute/resolution boundary tests; `creation_enforces_amount_and_deadline_boundaries`. Chain timestamp governs transitions. Voluntary buyer release and merchant refund intentionally remain possible in active funded states. |
| INPUT-01 | Positive bounded i128 amount; ordered bounded deadlines; distinct role addresses | PASS | Validation tests reject zero/negative/excessive amounts, invalid deadlines and resolver/party equality. Added lower/upper boundary checks. Release profile enables overflow checks; inputs bound practical timestamp arithmetic. |
| STORAGE-01 | Per-invoice bounded data; no growing global Vec/Map | PASS | Static review: fixed-size `Invoice` values in separate persistent keys; instance storage holds only the configured token. Public methods do not accept Vec/Map inputs. |
| STORAGE-02 | Instance and invoice TTL extensions work | PASS | `get_renews_invoice_and_instance_ttl_without_changing_terms` advances 91 × 17,280 ledgers, enters renewal threshold and verifies both TTLs return to 120 × 17,280. Ledger counts are not a wall-clock guarantee. |
| STORAGE-03 | Long invoices stay discoverable and recoverable operationally | PARTIAL | Delivery may be up to 730 days away, exceeding one TTL extension. Keeper submits weekly `get` for known active invoices, at most 25 candidates per run. Out-of-app invoices, backlog and outages require monitoring/inventory/recovery. See R-01 below. |
| CALL-01 | State updates precede external transfers; failed calls roll back | PASS | `fund`, `release`, `refund`, `payout` save state before token invocation. Trusted fixed SAC assumption applies; arbitrary malicious tokens/reentrancy were not tested. |
| CONFIG-01 | Fixed token; no admin withdrawal, fee extraction or upgrade entry point | PASS | Static review and 15 exported functions in the release build. Configuration is constructor-only. Constructor authenticity/lifecycle relies on Soroban host semantics, not a new constructor attack test. |
| BUILD-01 | Locked dependency versions and build identity | PASS | Locked contract tests/build, Rust 1.93.0, SDK 28.0.0, Stellar CLI 28.1.0. Local WASM matches recorded deployment hash. Live explorer status was not queried today. |
| BUILD-02 | Imported contract binaries cannot silently become stale | N/A | Runtime contract uses SDK TokenClient; no `createimport!`/`contractimport!` of a local WASM binary. Cargo.lock is retained. |
| ERR-01 | Expected business failures use typed errors | PASS | `Error::{Invalid, Exists, NotFound, WrongState, Deadline}`. Token lookup `unwrap()` assumes successful constructor initialization; host/token traps are not suppressed. |
| EVENTS-01 | Successful saves emit invoice status and amount | PASS (code review) | `save` publishes `Changed` with merchant/id topics; no raw ERP invoice document is stored. Event payload completeness has not been independently tested in this review. |
| PRIVACY-01 | Commercial data is minimized on-chain | PARTIAL | Contract stores counterparties, amount, deadlines, resolver and a commitment, not raw invoice content. Those fields remain public; a hash alone does not guarantee confidentiality against guessing. |
| OPS-01 | Keeper credentials cannot choose arbitrary payout recipients | PASS | Contract recipients are immutable; keeper submits expire/finalize/get. Application tests cover bearer-secret gating, durable pending hashes and heartbeat/payment distinction. |
| OPS-02 | Current deployment cron, alert delivery and archive recovery are proven | OPEN | Local tests do not prove deployed scheduling. Recent hosting changes require a separate operational check; no current production health claim is made. |
| ANALYSIS-01 | Fuzz/property campaigns and dependency vulnerability scanning | OPEN | Deterministic regression tests were run. No fuzz campaign, exhaustive state exploration, formal verification or current advisory scan. This checklist does not mark them complete. |
| AUDIT-01 | Independent Soroban specialist audit | OPEN | Internal review only. External review remains a production prerequisite. |

## Findings and follow-up

| ID | Classification | Finding / action |
| --- | --- | --- |
| F-01 | Test coverage gap — closed | Original tests mainly used all-auth or no-auth mocks. Added wrong-identity and exact invocation-tree controls, plus boundary/terminal/isolation/TTL regressions. Suite increased from 12 to 19 tests. |
| R-01 | Operational availability — open | Contract lifetime and long invoice lifetime differ. Monitor instance/code/invoice TTL, keeper fee balance, oldest unprocessed invoice and out-of-app creations; maintain recovery inventory. [Recovery runbook](../operations/escrow-recovery.md) prepared; live recovery drill and deployed cron/alert evidence remain open. |
| R-02 | Commercial trust — disclosed | False delivery assertions, resolver collusion or silence remain business risks. Address separation cannot prove organizational independence. Require agreed resolver identity, notifications and evidence handling before production. |
| R-03 | Token dependency — open verification | Issuer authorization/freeze/clawback controls may affect escrow balances or payment availability. Current issuer flags, admin powers and affected-account behavior were not queried/tested; verify explicitly before production. No alternate recipient/sweep was added to bypass them. |
| R-04 | Recovery design tradeoff — disclosed | No pause or upgrade function exists. This limits administrator authority but also prevents patching the existing instance. A replacement needs a new deployment and a plan for old outstanding invoices; redeployment does not move old funds. |

No confirmed critical/high contract exploit was found within this bounded review. This statement is not a security guarantee; unresolved operational and trust risks remain visible above.

## Verification executed

| Command | Result |
| --- | --- |
| `npm run contract:test` | 19 passed, 0 failed |
| `npm run contract:build` | Successful; 10,295-byte optimized WASM; hash matches deployment record |
| `npm test` | 32 passed, 0 failed |
| `npm run typecheck` | Exit 0 |

UI/API code did not change, so no application production build was required for this change. Contract runtime did not change, so no new Testnet flow or deployment was required. Prior [escrow proof](../../artifacts/escrow-v2-proof.json), [ERP proof](../../artifacts/erp-testnet-v2-proof.json) and [full workflow proof](../../artifacts/testnet-v2-proof.json) remain dated historical evidence.

For a jury submission, describe this as: **“Applied Soroban security checklist, internal review, 19 passing contract regression tests, and documented residual risks.”** Do not describe it as an independent audit or mark OPEN/PARTIAL items complete.

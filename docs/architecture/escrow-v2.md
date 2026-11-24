# Escrow v2: delivery, disputes and deadlines

Status: initial Testnet policy; an independent contract review and resolver service are required before production.

## Design decision

The existing contract was extended while preserving the ERP record and evidence model. [Trustless Work](https://docs.trustlesswork.com/trustless-work) offers ready-made APIs/SDKs for milestones, approvals and disputes; its [role design](https://docs.trustlesswork.com/trustless-work/introduction/technology-overview) includes separate release signer and dispute resolver roles. Since that migration would also change identity, state and accounting integration, no new external service dependency was introduced in the current remediation. Costs and service terms should be reassessed when making a production choice; no fee advantage is assumed.

## Fixed contract rules

`due` is the funding deadline; `delivery_due` is the delivery-report deadline. Funding and delivery reporting are allowed only **before** their respective deadlines. The dispute window after the delivery deadline is **3 days**, and the resolver response window after a dispute is opened is **7 days**. Durations are calculated in seconds using the chain's ledger time. At the deadline, the previous right ends and the right to finalize begins.

| State / action | Authority | Outcome |
| --- | --- | --- |
| Open → fund; `now < due` | Buyer | Funded |
| Funded → deliver; `now < delivery_due` | Merchant | Delivered |
| Funded → finalize; `now >= delivery_due` | Anyone | Full amount to buyer; Refunded |
| Delivered → dispute; `now < delivery_due + 3 days` | Buyer | Disputed; dispute time recorded once |
| Funded → dispute; `now < delivery_due` | Buyer | Disputed; early dispute report |
| Delivered → finalize; `now >= delivery_due + 3 days` | Anyone | Full amount to merchant; Released |
| Disputed → resolve_release / resolve_refund; `now < disputed_at + 7 days` | Independent resolver fixed in the invoice | Full payment or full refund |
| Disputed → finalize; `now >= disputed_at + 7 days` | Anyone | Full amount to buyer; Refunded |
| Funded / Delivered / Disputed → release | Buyer | Voluntary full payment |
| Funded / Delivered / Disputed → refund | Merchant | Voluntary full refund |
| Open → cancel / expire | Merchant / anyone after the due date | Closes without moving funds |

The buyer and merchant can voluntarily act in the other party's favor. The resolver cannot be the buyer or merchant and cannot designate another recipient address. The contract has no upgrade/sweep path or platform fee deduction. The resolver address and v2 commitment are fixed per invoice. Funds that have reached a terminal state cannot be transferred again.

**A delivery report is not proof of physical delivery.** It is the merchant's claim; the buyer must monitor notifications and dispute a false delivery claim within the window. Refunding the buyer when the resolver remains silent is an explicit buyer-favoring policy to prevent an indefinite lock; it carries a malicious-buyer risk. Evidence collection, notifications, resolver agreements and dispute services must be designed separately for production. There is no oracle in the code that verifies real-world delivery.

## Operation

`npm run setup:local` generates persistent local authentication, resolver and keeper keys; rerunning it does not change existing values. The resolver private key must not be stored in the production web application; local `ESCROW_RESOLVER_SECRET` is only for test tools. An independent resolver public key must be selected for production.

`npm run escrow:keeper` uses a dedicated key to submit only `expire`, `finalize` and TTL-maintenance `get` calls. The key needs a Testnet XLM balance. The contract does not submit a transaction by itself when a deadline passes. `vercel.json` defines a daily call at 03:00 UTC (06:00 Istanbul); `CRON_SECRET` and the keeper key must also be configured in the actual deployment environment. With a daily schedule, payment may wait until the next run after the deadline. The interface also provides a manual finalization path for the parties.

The worker persists the signed hash before network submission; if the result is uncertain, it checks the hash first instead of sending the same payment as a new transaction. Failed responses and insufficient balances produce HTTP/CLI errors; the operator must monitor these results. Operational automation is not complete until the alert recipient and actual deployment are configured. Pilot capacity is 25 invoices per run; larger volumes require a separate queue/worker. A weekly on-chain `get` extends instance and invoice TTL; simulation alone does not.

## Migration from the old contract

v1 cannot be upgraded. If old invoices have no `contract` field, the historical address `CCDPQPUS5SIBJF6YK2FZZV65P45U5FK7A3TMUE25T62VS3GQ22OG76IL` must be used. New invoices store the v2 address in their own record. Old open/funded invoices remain under the old approval/refund rules; they cannot be moved without users' signatures. Before a new deployment, old local records are pinned to their addresses; the inventory covers only invoices known to the application. A full on-chain inventory must be checked separately.

Existing historical test evidence is dated. Evidence verifying the new contract is kept in separate files; source verification and a security audit are distinct checks.

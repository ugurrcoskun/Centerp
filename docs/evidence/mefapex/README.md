# Mefapex evaluation and technical evidence

Date: 26 November 2026. Network: Stellar Testnet.

## Documents

- [Technical evaluation report](technical-evaluation.pdf): Centerp-team-operated ERP and escrow test results, transaction links, limitations and follow-up priorities.
- [Completed company feedback](company-feedback-filled.pdf): original PDF supplied by the project owner as Mefapex's response, preserved without modification.
- [Structured feedback summary](company-feedback-summary.json): review basis, strengths, requested improvements, future-review conditions and sharing selections. The source PDF SHA-256 is recorded here.
- [Technical test evidence](technical-test-evidence.json): public transaction hashes, assertions and local verification results.
- [Blank feedback template](feedback-template.pdf): reusable English form, separate from the completed response.

The repository contains the source documents directly; the local distribution ZIP is not duplicated here. Private keys, wallet credentials, session cookies, databases, server logs and internal project notes are excluded.

## What was completed

The Centerp team ran the scenario with its own merchant and buyer wallets in an isolated local ERP workspace. Direct Testnet USDC funding, escrow, delivery reporting, buyer-authorized release, sample supplier/employee liability payments and ERP reconciliation passed. Evidence records **9 successful Testnet transactions** including USDC acquisition, and **7 journal entries**. Local checks passed: 32 application tests, 19 contract tests and TypeScript validation.

The supplied company form is dated 26 November 2026 and selects **report/demo review**, not hands-on testing. It recognizes duplicate-action guards and invoice-to-escrow reconciliation, while requesting improvements to the TRY route, company-controlled wallet approvals, ERP mapping and synchronization, and independent security review.

Company feedback is a separate source from technical verification. This is **not evidence of independent company wallet activation or a completed hands-on company pilot**. It does not demonstrate 2–3 pilot companies or production adoption.

## Open items and proposed next iteration

1. Restore and validate the external TRY Mock Anchor deposit/conversion route. The test encountered `ENOTFOUND tr-mock-anchor.fly.dev`; the successful direct-USDC route does not validate TRY conversion.
2. Provide company-controlled wallet access with role-based multisignature approval for a hands-on follow-up.
3. Improve ERP-to-chain event synchronization and staging ERP field mapping, including tax IDs, cost centers and partial shipments.
4. Arrange independent Soroban review and archive recovery validation. The existing [Soroban checklist](../../security/soroban-checklist.md) is an internal review; [recovery procedures](../../operations/escrow-recovery.md) are documented separately.

These are recorded requests, not features implemented by this documentation change. The company response expresses willingness to review again after the TRY route, company-controlled RBAC testing and staging field mapping are available.

## Attribution and source handling

The original form selects anonymous use of feedback; its company-name sharing checkbox is not selected. Direct quotations require separate confirmation. Preserve these selections when reusing the evidence; including this document is not a claim of company endorsement or broad named-publicity permission.

The template sentence “This form is blank” remains in the submitted PDF; visible completed responses appear below it. The original was preserved rather than edited to remove that template text. Company reviewer identity and authorship have not been independently authenticated beyond the project owner's attribution.

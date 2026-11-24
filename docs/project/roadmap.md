# Centerp roadmap

Updated: November 5, 2026. The timeframes below are development estimates, not commitments to external approval or a Mainnet launch date.

| Phase | Target timeframe | Owner | Deliverable / acceptance criteria |
| --- | --- | --- | --- |
| Secure Testnet release | Current remediation work | Development team | Time-bounded escrow and disputes, persistent authentication key, company membership/roles, test CI, license; documented outstanding external dependencies |
| Release evidence | Within 1 week after the source release is published | Repository owner + development team | Passing CI, WASM/source verification evidence, correct contract address, new end-to-end tests; inventory of funds in the old contract |
| User pilot | 2–4 weeks after the secure Testnet release | Product owner | Task-based testing with at least two business representatives; test disputes, non-delivery and role revocation; resolve findings |
| Evaluation of the Türkiye production model | In parallel with the pilot; timing depends on external parties | Product owner + legal/accounting advisers + provider | Written assessment of the TL off-ramp/reconciliation fund flow, provider authorizations/agreements and integration design for a real TL off-ramp |
| Production readiness | Estimated 4–8 weeks after the preceding gates are passed | Development/operations team and independent reviewer | Security review; key recovery/rotation, worker monitoring/alerts, KYC/data responsibilities, support and dispute services; capacity tests |
| Conditional Mainnet pilot | No date set | Product owner | All gates above passed, limited pilot budget and rollback plan accepted; production keys and real provider configured separately |

## Next concrete milestone

Prepare the source-verified Testnet release, test results and user pilot scenarios as a single release package. Check GitHub CI results and [explorer source verification](../operations/contract-verification.md) for the release.

## Instaward / SCF step

The proposed first application is a bounded **Instaward sprint** to complete resolver/worker operations and pilot evidence. The official rules describe evaluation through the local Ambassador Chapter and concrete deliverables within a maximum of 30 days. Eligibility for work that continues previous efforts will be confirmed separately. No application has been submitted and no funding decision has been made. Source: [Instawards official rules](https://stellar.gitbook.io/scf-handbook/scf-awards/instawards/official-rules).

The package to prepare includes the demo link, open-source repository/license, contract verification and test evidence, user findings, measurable sprint outcomes, an itemized budget and team information. The product owner will complete the actual team and budget information; the development team will prepare the technical evidence. The next step is to use this package to confirm Chapter eligibility and the application channel; no messages will be sent to anyone as part of this work.

Once pilot validation and the security/operations scope are clear, a broader delivery plan for SCF Build can be considered. Use the [official SCF website](https://communityfund.stellar.org/) for current program options; round dates and funding assumptions must be checked again before applying.

## Mainnet transition gates

- Deadline finalization and final resolution of open disputes have passed independent review.
- The parties know who provides the resolver service, under which rules and with what response time.
- The worker key/funding balance, scheduler, TTL maintenance, delay alerts and failure alerts have been verified in the operational environment.
- Separate storage, recovery and rotation procedures exist for the authentication key and company wallet; the role system does not replace a wallet signature.
- Funds in the old contract and the transition to the new contract address are documented; historical evidence is not presented as evidence for the new release.
- The external assessments and real Anchor/bank relationship described in the [legal scope](legal-scope.md) document are complete.
- Evidence of real TL off-ramp transactions, accounting scope, support, monitoring and data protection responsibilities have been verified.

Mainnet funds will not be used as part of this development work.

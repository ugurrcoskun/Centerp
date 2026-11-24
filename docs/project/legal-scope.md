# Product scope and production boundaries for Türkiye

Last reviewed: November 5, 2026. Status: Testnet prototype; not a production service approved for legal compliance.

Centerp's core product is ERP records and reconciliation. The product positioning to be evaluated for Türkiye is **TL Anchor off-ramp and ERP reconciliation**. This is neither a production commitment nor a regulatory exemption obtained simply by changing the currency.

## Current demo

ERP business record → wallet signature → Testnet USDC/escrow → verified transaction → management ledger.

The external TR Mock Anchor simulates TRY bank movements. No real TL, bank transfers or Mainnet assets are used. The supplier and employee payment screens are also Testnet demonstrations; they do not offer payment for goods/services or wages in crypto in Türkiye. The management ledger does not replace statutory accounting, payroll or e-invoicing.

## Production flow to be evaluated

Business requests asset conversion → conversion by an appropriately authorized external service provider → TL off-ramp to the business's bank account → reconciliation of bank/provider evidence with the ERP.

This flow has not yet been integrated. A specialist will assess the economic relationship between invoice payment and asset conversion, the parties' countries, the purpose of the transfers and the providers' authorizations. Routing the same invoice payment through USDC and converting it to TL at the end is not automatically considered compliant.

| Party | Current role / matters to clarify for production |
| --- | --- |
| Centerp | Links ERP records to verified evidence; does not receive users' private keys. Its scope of activities and responsibilities in production will be assessed separately. |
| Business and user | Responsible for business records, signed authorization and recipient information. Multi-user access and on-chain signing are distinct permissions. |
| Escrow contract | Holds Testnet token balances under the contract rules. The application not holding wallet keys does not mean the escrow holds no funds. |
| External Anchor / service provider | The demo provider does not offer real banking services. In production, licensing/activity scope, KYC/AML, custody, conversion, bank off-ramp and dispute responsibilities must be clarified by contract. |
| Bank / payment service party | Evidence of the TL movement and a permitted fund flow must be provided; which institution may perform each transfer must be reviewed. |

## Open work before production

- Written legal assessment of the actual fund flow and intended use in Türkiye. Owner: project owner and an appointed specialist in Turkish regulations.
- Verification of the current authorizations of the Anchor and bank/payment party; fees, custody, KYC/AML and responsibilities for failed transfers/refunds. Owner: project owner and selected provider.
- Assessment of data protection, commercial records, tax/accounting and contractual obligations. Owner: relevant legal/accounting specialists.
- Implementation of a real TL off-ramp and evidence reconciliation; demo data must not be presented as production data. Owner: development team, subject to the preceding assessments.

Until this work is complete, this prototype will not be launched as a real-money payment service in Türkiye. Technical changes do not complete the legal assessment requirement.

## Primary sources

Articles 3–4 of the Central Bank of the Republic of Türkiye's (CBRT) [Regulation on the Disuse of Crypto Assets in Payments](https://www.resmigazete.gov.tr/eskiler/2021/04/20210416-4.htm) cover direct/indirect use and service models. Use the [CBRT Payment Services](https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB%20TR/Main%20Menu/Temel%20Faaliyetler/Odeme%20Hizmetleri) page for the current list of regulations. The production boundary above is a cautious product decision inferred from these sources; it does not replace a legal opinion on the specific model.

<div align="center">
  <img src="app/icon.svg" alt="Centerp logo" width="82" />
  <h1>Centerp</h1>
  <p><strong>The operating center for a business. The proof behind every payment.</strong></p>
  <p>
    Centerp connects day-to-day ERP operations with fast, low-cost and verifiable settlement on Stellar.<br/>
    Orders become invoices, invoices become protected payments, and confirmed transactions return to the accounting record automatically.
  </p>

  [![Live Demo](https://img.shields.io/badge/Live_Demo-centerp.vercel.app-C53D55?style=for-the-badge)](https://centerp.vercel.app)
  [![Watch Demo](https://img.shields.io/badge/Watch_Demo-1m_48s-20352D?style=for-the-badge)](https://centerp.vercel.app/demo)
  [![Project Presentation](https://img.shields.io/badge/Project_Presentation-Google_Docs-C53D55?style=for-the-badge)](https://docs.google.com/document/d/181gDA3zyJkbDmM3zG8s0Eg8ZCkskBm8swwbMOdkRyYc/edit?usp=sharing)
  [![Stellar Testnet](https://img.shields.io/badge/Stellar-Testnet-111318?style=for-the-badge)](https://stellar.expert/explorer/testnet)

  <br/>

  [![Soroban Escrow](https://img.shields.io/badge/Soroban-Escrow-20352D?style=flat-square)](artifacts/deployment.json)
  [![Anchor Standards](https://img.shields.io/badge/Anchor-SEP--1_%7C_SEP--6_%7C_SEP--10_%7C_SEP--38-C53D55?style=flat-square)](lib/anchor.ts)
  [![CI](https://github.com/ugurrcoskun/Centerp/actions/workflows/ci.yml/badge.svg)](https://github.com/ugurrcoskun/Centerp/actions/workflows/ci.yml)
  [![Stack](https://img.shields.io/badge/Next.js_15-TypeScript_%7C_Rust-111318?style=flat-square)](package.json)
</div>

---

## The problem

For many businesses, the operational record and the payment live in different worlds.

An order is created in an ERP. An invoice is shared as a document. Payment moves through a bank. Someone later matches a statement, a reference number and a spreadsheet row by hand. Meanwhile, buyers do not want to pay before delivery, and sellers do not want to ship without payment assurance.

This creates three recurring problems:

| Business friction | What it causes |
|---|---|
| **Disconnected records** | Orders, invoices, bank movements and accounting entries must be reconciled manually. |
| **Counterparty risk** | Buyers and sellers must trust each other before either delivery or payment is secured. |
| **Slow, expensive settlement** | Legacy payment rails add waiting time, banking steps, fees and paperwork. |

---

## Product scope in Türkiye

Centerp currently runs exclusively on Testnet. TRY bank movements are simulated; direct USDC invoice, supplier and employee flows demonstrate the technology with test assets. The proposed Türkiye production scope is **TL anchor off-ramp and ERP reconciliation**, subject to review of the actual fund flow and provider permissions. Conversion to TL alone does not establish legal compliance. See [legal scope and production dependencies](docs/project/legal-scope.md).

## The Centerp solution

Centerp is a working ERP prototype where **the business event and its financial settlement share the same source record**.

- Sales, purchasing, inventory, production, employees and accounting operate in one company workspace.
- A sales order can become a Stellar invoice without re-entering its customer, amount or terms.
- USDC can be locked in a Soroban escrow until the buyer approves delivery.
- Businesses can use direct USDC or enter through a TRY ↔ USDC Anchor flow.
- Confirmed Stellar transactions update the related ERP record and management ledger with a verifiable hash.
- Sensitive commercial data stays off-chain; only the minimum settlement data and cryptographic commitment reach Stellar.

> **Centerp does not add blockchain as a separate dashboard. It makes settlement part of the ERP workflow.**

### Traditional ERP vs. Centerp

| | Typical standalone ERP | Centerp |
|---|---|---|
| **Payment execution** | The ERP records what should be paid; payment is completed in a separate bank interface. | The payment is prepared from the ERP source record and authorized with the company wallet. |
| **Invoice protection** | Delivery and payment assurance depend on external contracts, banking products or manual trust. | USDC can remain in Soroban escrow until the buyer confirms delivery. |
| **Reconciliation** | Teams import statements and match references back to invoices and payables. | A verified transaction hash updates the related invoice, liability and management ledger. |
| **Settlement route** | Local and cross-border rails require separate banking or payment integrations. | Businesses can use direct USDC or a standards-based TRY ↔ USDC Anchor route. |
| **Audit evidence** | Evidence primarily lives in internal records and exported bank documents. | Settlement can be independently checked on Stellar while the ERP retains its business context. |
| **Commercial privacy** | Operational and financial details stay inside the central application database. | Sensitive ERP data stays off-chain; only settlement data and an invoice commitment reach Stellar. |

```mermaid
flowchart LR
    A["ERP operation<br/>Invoice or payable"] --> B{"Payment route"}
    B -->|"TRY"| C["Stellar Anchor<br/>TRY → USDC"]
    B -->|"Direct"| D["USDC"]
    C --> D
    D --> E["Soroban escrow<br/>or direct payment"]
    E --> F["Verified settlement<br/>ERP reconciliation"]
```

---

## See it working

| Experience | Link |
|---|---|
| **Live application** | [centerp.vercel.app](https://centerp.vercel.app) |
| **108-second product walkthrough** | [Watch the full product demo](https://centerp.vercel.app/demo) |
| **Project presentation** | [Open the Centerp presentation on Google Docs](https://docs.google.com/document/d/181gDA3zyJkbDmM3zG8s0Eg8ZCkskBm8swwbMOdkRyYc/edit?usp=sharing) |
| **Current v2 escrow contract** | [Open on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDJKNS4FOHGESEKME27CQ4E4Z3CQ2JOF5W6ZEML63E47WFVNTZCANABZ) |
| **Testnet execution evidence** | [v2 Testnet proof](artifacts/testnet-v2-proof.json) |
| **ERP-to-Stellar evidence** | [v2 ERP workflow proof](artifacts/erp-testnet-v2-proof.json) |

<br/>

<p align="center">
  <a href="https://centerp.vercel.app/demo">
    <img src="docs/demo/demo-preview.gif" alt="Centerp product walkthrough showing the ERP and Stellar finance workflow" width="100%" />
  </a>
  <br/>
  <em>Click the preview to watch the full walkthrough in fullscreen with narration.</em>
</p>

<br/>

### Walkthrough timeline

| Time | What the video shows |
|---|---|
| **0:00–0:18** | The problem, the product idea and the Centerp landing experience. |
| **0:18–0:50** | Overview, customers and vendors, sales, purchasing, inventory, production, HR, accounting and company settings. |
| **0:50–1:24** | Payments and reconciliation, including the TRY route and direct USDC option. |
| **1:24–1:48** | Invoice details and independent transaction proof on Stellar Expert. |

> The TRY and bank-transfer experience uses an external Mock Anchor sandbox. Direct USDC, Soroban escrow and the linked transaction evidence run on Stellar Testnet.

---

## Current v2 Testnet evidence

The v2 contract is [CDJK…NABZ](https://stellar.expert/explorer/testnet/contract/CDJKNS4FOHGESEKME27CQ4E4Z3CQ2JOF5W6ZEML63E47WFVNTZCANABZ). See the [deployment record](artifacts/deployment.json), [ERP workflow proof](artifacts/erp-testnet-v2-proof.json) and [source verification](docs/operations/contract-verification.md).

## From order to verifiable settlement

### 01 — Record the operation

The company creates customers, products and a multi-line sales order. The amount is calculated on the server with decimal-safe arithmetic, and the customer wallet is taken from the business record.

### 02 — Create the invoice

Centerp carries the order into the finance module. The merchant signs the invoice registration with Freighter, and the invoice terms are committed to the Soroban contract.

### 03 — Fund protected escrow

The buyer can pay from an existing USDC balance or acquire Testnet USDC through the TRY Anchor route. The exact invoice amount is deposited into the escrow contract—not sent directly to the seller.

### 04 — Deliver and release

Shipping changes ERP stock separately. The merchant reports delivery on-chain before the delivery deadline. Buyer approval releases USDC immediately. Otherwise, reported delivery has a three-day dispute window after the delivery deadline. No delivery report enables a buyer refund; no dispute enables merchant release. Disputes have an independent resolver and a seven-day buyer-refund fallback. A fee-paying keeper or a manual transaction triggers deadline outcomes. See [escrow v2 rules and tradeoffs](docs/architecture/escrow-v2.md).

### 05 — Reconcile with proof

The verified transaction hash returns to the invoice and the management accounting ledger. Anyone can independently inspect the transaction on Stellar Expert.

```mermaid
stateDiagram-v2
    [*] --> Draft: ERP order created
    Draft --> Open: Merchant registers invoice
    Open --> Funded: Buyer funds exact USDC amount
    Open --> Cancelled: Merchant cancels before funding
    Open --> Expired: Due date passes
    Funded --> Delivered: Merchant reports delivery before deadline
    Funded --> Refunded: No delivery report at deadline
    Delivered --> Released: No dispute after delivery deadline + 3 days
    Delivered --> Disputed: Buyer disputes before cutoff
    Funded --> Disputed: Buyer raises early dispute
    Disputed --> Released: Resolver rules for merchant
    Disputed --> Refunded: Resolver refunds or 7-day timeout
    Funded --> Released: Buyer approves delivery
    Delivered --> Released: Buyer approves delivery
    Disputed --> Released: Buyer voluntarily releases
    Funded --> Refunded: Merchant refunds buyer
```

---

## Product surface

Centerp is more than a payment demo. Its ERP modules create connected, stateful business records:

| Module | Working behavior | Financial connection |
|---|---|---|
| **Overview** | Company activity, open work and operational summaries | Displays verified balances and collection state |
| **Customers & vendors** | Counterparty records with contact and wallet details | Supplies invoice buyer and payment recipient identities |
| **Sales management** | Multi-line sales orders with server-calculated totals | Converts an order into an escrow-backed invoice |
| **Purchasing** | Purchase orders and one-time goods receipt | Creates stock entries and supplier liabilities |
| **Inventory & warehouse** | Raw material and finished-product quantities with movement history | Keeps physical movement separate from payment release |
| **Production** | Multi-input work orders with atomic consumption and output | Feeds sellable stock without exposing recipes on-chain |
| **Human resources** | Employee records and period-based payment obligations | Links salary obligations to individual USDC transfers |
| **Accounting & finance** | Balanced management entries tied to source records | Records verified invoice and payable settlement hashes |
| **Company profile** | Isolated company workspace and wallet binding | Requires a signed wallet session for financial authority |
| **Payments & reconciliation** | Invoices, balances, Anchor transfers, escrow and transaction ledger | Connects ERP records to Stellar settlement |

---

## Why Stellar

Stellar gives Centerp the payment properties that conventional ERP records cannot provide on their own:

| Stellar capability | How Centerp uses it |
|---|---|
| **Fast, low-cost settlement** | USDC invoice and payable transactions settle without the operational overhead of traditional bank reconciliation. |
| **Soroban smart contracts** | Invoice funds remain in escrow until an authorized release or refund action occurs. |
| **Freighter signatures** | Users authorize transactions without sharing secret keys with the application server. |
| **Stellar Asset Contract** | The escrow is bound to the configured Testnet USDC asset. |
| **Horizon and Soroban RPC** | Centerp verifies transaction and contract outcomes before changing ERP financial state. |
| **Stellar Anchors** | Standard SEP flows provide a path between local currency and a usable on-chain USDC balance. |
| **Public transaction proofs** | Every confirmed payment can be independently verified by its hash. |

### Anchor standards

- **SEP-1 — Discovery:** validates the Anchor domain, endpoints, signing key and supported asset.
- **SEP-10 — Authentication:** proves wallet control through a signed challenge.
- **SEP-38 — Quotes:** requests a firm TRY ↔ USDC conversion quote.
- **SEP-6 — Transfers:** creates deposit or withdrawal instructions and tracks their status.

The Anchor is non-custodial from Centerp's perspective: wallet keys remain in Freighter, while the application stores only the server-side Anchor session needed for the sandbox flow.

---

## Architecture and privacy boundary

```mermaid
flowchart LR
    UI["Web app<br/>Next.js + React"] <-->|"Sign XDR"| Wallet["Freighter<br/>Wallets Kit"]
    UI --> API["Centerp API<br/>Node.js routes"]

    API --> ERP["ERP rules &<br/>reconciliation"] --> Store[("SQLite / Neon")]
    API <-->|"SEP-1 / 6 / 10 / 38"| Anchor["TR Mock Anchor"]
    API --> Horizon["Stellar Horizon"]
    API --> RPC["Soroban RPC"] --> Escrow["Rust escrow<br/>contract"] --> USDC["USDC SAC"]
```

### What stays off-chain

Customer contact details, employee information, product recipes, unit-price breakdowns, stock movements and internal accounting context remain in the ERP data store.

### What goes on-chain

The escrow receives the merchant and buyer addresses, exact USDC amount, lifecycle timestamps and a `SHA-256` commitment to the invoice snapshot. Transaction hashes and verified contract state are then linked back to the ERP record.

This hybrid design gives the business an auditable settlement proof without publishing its full commercial data.

---

## Escrow safety model

The Rust contract has a deliberately small authorization surface:

| Action | Required authority | Result |
|---|---|---|
| `create` | Merchant | Registers the invoice commitment and commercial terms |
| `fund` | Buyer | Transfers the exact USDC amount into contract custody |
| `release` | Buyer | Voluntary full release in an active funded/delivered/disputed invoice |
| `deliver` | Merchant | Records a delivery claim before the delivery deadline |
| `dispute` | Buyer | Stops timeout merchant release and opens a bounded dispute |
| `resolve_release` / `resolve_refund` | Fixed independent resolver | Selects merchant payment or buyer refund during the seven-day dispute period |
| `finalize` | Anyone after the state deadline | Merchant release for undisputed delivery; buyer refund for absent delivery or silent resolver |
| `refund` | Merchant | Returns the full escrow balance to the buyer |
| `cancel` | Merchant | Closes an unfunded invoice |
| `expire` | Permissionless after due date | Closes an overdue, unfunded invoice |

The contract has a fixed USDC asset and no fee extraction, upgrade or sweep path. Its explicitly disclosed per-invoice resolver can only choose the fixed buyer or merchant, within the dispute deadline. Delivery claims are not proof of physical delivery; the buyer must monitor the dispute window. The keeper requires deployment secrets, a funded fee account and operational monitoring.

---

## Historical v1 Testnet evidence

The repository includes machine-readable artifacts from completed end-to-end runs.

| Proof | Reference |
|---|---|
| **Contract** | [`CCDP…76IL`](https://stellar.expert/explorer/testnet/contract/CCDPQPUS5SIBJF6YK2FZZV65P45U5FK7A3TMUE25T62VS3GQ22OG76IL) |
| **Contract deployment** | [`7a6bc8…8d99`](https://stellar.expert/explorer/testnet/tx/7a6bc9fe8e942c63aa99a0ead77aaeff631d40fc411410a7447c4c7bf08f8d99) |
| **Invoice creation** | [`94ccb2…908f`](https://stellar.expert/explorer/testnet/tx/94ccb21fb713c45f09d4042c0778891077351817965a4e8de89f8221fa63908f) |
| **Escrow funding** | [`46f02d…a522`](https://stellar.expert/explorer/testnet/tx/46f02da2907bfdfebf78f0fdedf90292f6c570dcf39ba0d94c2591b28746a522) |
| **Escrow release** | [`45e7e1…e97e`](https://stellar.expert/explorer/testnet/tx/45e7e17304743a56a6734553e287085f38ccacafad571661dabbc1004470e97e) |
| **Supplier payment** | [`c408a3…fa4c`](https://stellar.expert/explorer/testnet/tx/c408a39840fbd4ade79b47ce80bf27c6d1cb8ab6d7e9766173f8b468de7ffa4c) |
| **Employee payment** | [`10e83a…6928`](https://stellar.expert/explorer/testnet/tx/10e83ab31d8c745609c62963f30fd46cb7b48a7bb3e99f07caf237a9f65a6928) |

The verified workflow covers signed sessions, trustlines, Anchor authentication and quotes, a simulated TRY bank deposit, escrow funding and release, direct supplier and employee payments, duplicate-action rejection, and ERP journal reconciliation.

---

## Roadmap and release checks

See the [roadmap](docs/project/roadmap.md) and [documentation index](docs/README.md).

## Run locally

### Requirements

- Node.js 22.5 or newer
- npm
- Freighter configured for Testnet when exercising signed flows
- Rust and Stellar CLI only when rebuilding or testing the contract

### Application

```bash
git clone https://github.com/ugurrcoskun/Centerp.git
cd Centerp
npm ci
cp .env.example .env.local
npm run setup:local
npm run dev
```

Open `http://127.0.0.1:3000`.

### Verification

```bash
npm run typecheck        # TypeScript verification
npm test                 # Application, access and worker tests
npm run build            # Production build
npm run contract:test    # Rust escrow tests
npm run test:integration # Full Testnet flow; requires external services
npm run test:erp         # ERP-to-Stellar Testnet flow
npm run test:escrow:v2   # Real Testnet timeout and resolver checks
```

---

## Repository map

```text
app/
├── page.tsx                 Landing page
├── workspace/               Connected ERP workspace
├── finance/                 Payments, Anchor, escrow and reconciliation
├── demo/                    Product walkthrough
└── api/                     Server-side ERP and bridge endpoints

components/                  Shared application UI
lib/                         ERP rules, persistence and Stellar integration
contracts/invoice-escrow/    Soroban escrow contract in Rust
scripts/                     Setup, deployment and Testnet verification
tests/                       Application tests
artifacts/                   Deployment metadata and verification evidence
docs/                        Project, architecture and operations guides
public/                      Assets served by the application
```

---

## Prototype scope

Centerp is a hackathon MVP running on **Stellar Testnet**. The TRY bank-transfer experience is simulated by the external TR Mock Anchor; no real TRY or Mainnet assets are used.

The accounting view is a management ledger for demonstrating source-linked reconciliation. It is not a statutory Turkish accounting, tax, payroll or e-invoicing system. The revised prototype adds organization membership and roles, application audit records and an escrow keeper. Production still requires recovery flows, independent security review, reviewed regulatory/provider integrations, a real Anchor and operational monitoring. The keeper cron and persistent auth secrets must also be configured in the actual deployment environment.

These boundaries are intentional: the prototype focuses on proving that real ERP events can safely drive verifiable Stellar settlement end to end.

---

<div align="center">
  <p><strong>Built for the Rise In × Stellar Pro Hackathon 2026 — Genesis Track</strong></p>
  <p>Operations recorded. Payments protected. Settlement verified.</p>
</div>

## Contributors

- [Uğur Coşkun](https://github.com/ugurrcoskun)
- [Zeynep Gül Özataş](https://github.com/zeynepozatass)
  
## License

Project source is available under the [MIT License](LICENSE), copyright Centerp contributors. Third-party dependencies and assets retain their own licenses.

# Authentication, membership and payment approval

## Local setup

`npm run setup:local` writes only missing values to `.env.local`. `SEP10_SIGNING_SECRET` is the persistent server key; `APP_ORIGIN` is the trusted external origin. Local HTTP is supported only for localhost/127.0.0.1. Production requires HTTPS and the actual application domain. Do not generate a new key on every cold start; all instances of the same service must use the same secret.

`/.well-known/stellar.toml` publishes only the public key and network/endpoint information. `/api/auth` provides a challenge via GET, accepts a signed `transaction` via POST and returns an EdDSA JWT. The application's existing `/api/bridge` challenge/session flow uses the same key. Only single Ed25519 `G…` accounts are supported; multisig, muxed/memo accounts and client_domain support have not been added. A server-side session record is required alongside the JWT, allowing logout to revoke the token. Application APIs use sessions through an HttpOnly cookie.

Challenges are verified against the server signature, network, domain, time window and stored transaction hash. A challenge cannot be reused. Challenges issued before a server key/domain change are rejected. Sessions last 12 hours. If existing sessions must also be revoked during a key change, `auth_session` records must be cleared in a controlled manner; the discovery file must be checked again with the new public key. The external Anchor's signing key is not used in place of this key.

## Company and roles

An anonymous workspace is for isolated demo data. The first wallet binding creates the company owner; a claimed company can no longer be read or modified using an anonymous cookie. The owner of a legacy company with a bound wallet can explicitly migrate to the membership model by calling `linkWallet` with their signed session. A wallet is never silently detached from another company.

| Role | Read records | Operational records | Invoice drafts | Payment approval | Member/company management |
| --- | --- | --- | --- | --- | --- |
| owner | Yes | Yes | Yes | Yes | Yes; cannot remove the owner |
| admin | Yes | Yes | Yes | Yes | Yes; cannot grant/remove owner status |
| operator | Yes | Yes | No | No | No |
| billing | Yes | No | Yes | No | No |
| approver | Yes | No | No | Yes | No |
| viewer | Yes | No | No | No | No |

The API can assign multiple roles to a user. The interface selects a primary role. An administrator adds the member's public key; after connecting their own wallet, the user switches using the company ID. A company ID alone does not grant access. Revoked members cannot access the company even with the same cookie. Self-service ownership recovery/transfer is not available in this release if the owner loses their wallet.

A billing member can create an invoice draft; the merchant address is the company wallet, and the company wallet holder signs the on-chain registration. Assigning a role does not share a private key or on-chain authority. This release does not implement multisig delegation for the company wallet.

An outgoing ERP payment is first approved by an approver/owner/admin. Approval is bound to the amount and recipient wallet and remains valid for 24 hours. If the recipient changes, the approving member's authority is revoked or approval is renewed, the previously prepared transaction can no longer be submitted. The final transfer is signed by the company wallet. The company owner has both preparation and approval permissions; this release does not enforce a two-person rule. Application roles cannot prevent a person holding the actual on-chain key from transacting outside Centerp.

Authorization and financial activity records are stored under `erp_audit` and are visible in the owner/admin interface. This is an application-level log; an external immutable audit archive is not yet available.

## Deployment checks

Persistent secrets must be transferred securely to the deployment provider; secret values must not be shared in issues/PRs or chat. The public `SIGNING_KEY` must remain the same before/after restart, and signed wallet connection must work. Multi-server session testing is not complete until a persistent database is configured. Creating a local `.env.local` file does not constitute production secret setup.

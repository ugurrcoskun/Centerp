# Testnet contract source verification

Centerp's [v2 escrow contract](https://stellar.expert/explorer/testnet/contract/CDJKNS4FOHGESEKME27CQ4E4Z3CQ2JOF5W6ZEML63E47WFVNTZCANABZ) has been matched to its source code on Stellar Expert. The [deployment record](../../artifacts/deployment.json) includes the contract address, deployment transaction, WASM hash and verified source commit.

The [contract release workflow](../../.github/workflows/contract-release.yml) runs contract tests with pinned Rust and Stellar CLI versions. The build produces a GitHub tag tied to the source commit and a build attestation. Stellar Expert matches the published WASM file to the on-chain contract.

- [Verified release run](https://github.com/ugurrcoskun/Centerp/actions/runs/42036329788)
- [Verified source commit](https://github.com/ugurrcoskun/Centerp/tree/465c0a49c185707e49c3ab5c8dfda7f61e24b0a3/contracts/invoice-escrow)

This record documents source and build verification. Independent security review is tracked in the [roadmap](../project/roadmap.md).

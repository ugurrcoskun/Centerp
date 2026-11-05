# Testnet kontratının kaynak doğrulaması

Centerp'in [v2 escrow kontratı](https://stellar.expert/explorer/testnet/contract/CDJKNS4FOHGESEKME27CQ4E4Z3CQ2JOF5W6ZEML63E47WFVNTZCANABZ) Stellar Expert üzerinde kaynak koduyla eşleştirildi. [Dağıtım kaydı](../../artifacts/deployment.json) kontrat adresini, dağıtım işlemini, WASM özetini ve doğrulanan kaynak commit'ini içerir.

[Kontrat yayın akışı](../../.github/workflows/contract-release.yml), sabit Rust ve Stellar CLI sürümleriyle kontrat testlerini çalıştırır. Derleme, kaynak commit'ine bağlı bir GitHub etiketi ve build attestation üretir. Stellar Expert, yayımlanan WASM dosyasını ağdaki kontratla eşleştirir.

- [Doğrulanan yayın çalışması](https://github.com/ugurrcoskun/Centerp/actions/runs/42036329788)
- [Doğrulanan kaynak commit'i](https://github.com/ugurrcoskun/Centerp/tree/465c0a49c185707e49c3ab5c8dfda7f61e24b0a3/contracts/invoice-escrow)

Bu kayıt kaynak ve derleme doğrulamasını belgeler. Bağımsız güvenlik incelemesi [yol haritasında](../project/roadmap.md) izlenir.

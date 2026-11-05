# Testnet dağıtımı ve kaynak doğrulama

5 Kasım 2026 kontrolü: [v2 kontratının](https://stellar.expert/explorer/testnet/contract/CDJKNS4FOHGESEKME27CQ4E4Z3CQ2JOF5W6ZEML63E47WFVNTZCANABZ) İlk kontrolde Stellar Expert API kaydı `unverified` idi; resmi release sonrasındaki son kontrolde `validation.status = verified` oldu. [Dağıtım kaydı](../artifacts/deployment.json) WASM ve kaynak dosyaları özetini içerir; yerel kaynak henüz yayınlanmadığı için `sourceDirty: true` işaretlidir.

## Hazırlanan akış

`.github/workflows/contract-release.yml` ayrı bir `codex/feedback-hardening` dalına push veya workflow_dispatch ile çalışır. Rust 1.93.0 ve Stellar CLI 28.1.0 ile kilitli bağımlılıklar test edilir; WASM'a repo/domain metadata'sı eklenir, artifact yüklenir, GitHub build attestation oluşturulur ve Stellar Expert eşleştirme servisine istek yapılır.

Kaynaklar: [SEP-55 taslağı](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0055.md), [Stellar Expert'in build workflow'u](https://github.com/stellar-expert/soroban-build-workflow/blob/main/.github/workflows/release.yml). Attestation kaynak/derleme izlenebilirliği sağlar; bağımsız güvenlik denetimi yerine geçmez.

## GitHub doğrulama ilerlemesi

Kullanıcı 5 Kasım'daki devam talimatıyla gönderimi onayladı. `codex/feedback-hardening` dalı yayınlandı. [İlk attestation](https://github.com/ugurrcoskun/Centerp/actions/runs/42034448720) başarılı; indirilen WASM SHA-256 değeri `83ef135ba7680cec7677fa742dfbb7f81d8aff8de5fe3fdf4460fa5d297cad58` ve dağıtımla birebir aynı. [Uygulama/kontrat CI](https://github.com/ugurrcoskun/Centerp/actions/runs/42036328717) `465c0a4` için başarılı.

Explorer'ın yayın biçimini de üretmek için workflow, Stellar Expert'in resmi reusable workflow'unun `6b16426dd3a61715ddddf83a2df322a6371fe071` sürümüne bağlandı. Release etiketi test edilen branch commit'ine önceden sabitleniyor; default main commit'ine yanlışlıkla bağlanmıyor. [Release/verification çalışması](https://github.com/ugurrcoskun/Centerp/actions/runs/42036329788) başarıyla tamamlandı. Explorer API son kontrolde **verified**, repo `ugurrcoskun/Centerp`, commit `465c0a49c185707e49c3ab5c8dfda7f61e24b0a3`, path `contracts/invoice-escrow`, package `invoice-escrow` döndürdü. Resmi release binary'si indirildi ve dağıtılmış WASM ile birebir eşleşti.

## Sonuç

Kaynak doğrulama tamamlandı. Kontrat adresi değişmedi; yeniden deployment gerekmedi. [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDJKNS4FOHGESEKME27CQ4E4Z3CQ2JOF5W6ZEML63E47WFVNTZCANABZ) doğrulanan kaynak bağlantısını gösteriyor. Bu kaynak/derleme doğrulamasıdır; bağımsız güvenlik denetimi değildir.

Gerçek Vercel ortamındaki secret/cron kurulumu ayrı adım olarak [dağıtım listesinde](DEPLOYMENT_CHECKLIST.md) izlenir.

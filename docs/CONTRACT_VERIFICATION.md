# Testnet dağıtımı ve kaynak doğrulama

5 Kasım 2026 kontrolü: [v2 kontratının](https://stellar.expert/explorer/testnet/contract/CDJKNS4FOHGESEKME27CQ4E4Z3CQ2JOF5W6ZEML63E47WFVNTZCANABZ) Stellar Expert API kaydı `validation.status = unverified` döndürüyor. Doğrulanmış olarak sunulmaz. [Dağıtım kaydı](../artifacts/deployment.json) WASM ve kaynak dosyaları özetini içerir; yerel kaynak henüz yayınlanmadığı için `sourceDirty: true` işaretlidir.

## Hazırlanan akış

`.github/workflows/contract-release.yml` ayrı bir `codex/feedback-hardening` dalına push veya workflow_dispatch ile çalışır. Rust 1.93.0 ve Stellar CLI 28.1.0 ile kilitli bağımlılıklar test edilir; WASM'a repo/domain metadata'sı eklenir, artifact yüklenir, GitHub build attestation oluşturulur ve Stellar Expert eşleştirme servisine istek yapılır.

Kaynaklar: [SEP-55 taslağı](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0055.md), [Stellar Expert'in build workflow'u](https://github.com/stellar-expert/soroban-build-workflow/blob/main/.github/workflows/release.yml). Attestation kaynak/derleme izlenebilirliği sağlar; bağımsız güvenlik denetimi yerine geçmez.

## Tamamlanması gereken dış adım

Otomatik onay denetimi GitHub'a commit/push işlemini durdurdu: dış depoya kaynak ve artifact gönderiminin tam kapsamı için açık kullanıcı onayı gerekiyor. Salt okunur dry-run erişimi başarılıydı; gerçek gönderim yapılmadı. Kullanıcı onayından sonra yalnızca incelenen değişiklikler `ugurrcoskun/Centerp` deposunun `codex/feedback-hardening` dalına gönderilecek. `.env.local`, secret değerleri, özel `output/` dosyaları ve kullanıcının önceden değiştirdiği `.gitignore` gönderilmeyecek. `main` birleştirmesi ve üretim yayını bu adıma dahil değildir.

Onaydan sonra:

1. CI testlerini ve attestation işini tamamla; run/commit bağlantılarını kaydet.
2. CI WASM artifact'ını indir ve SHA-256 özetini dağıtım kaydıyla karşılaştır. Eşleşmiyorsa yerel binary doğrulanmış sayılmaz; attested artifact ile yeni Testnet dağıtımı ve tekrar test gerekir.
3. Stellar Expert kaynak eşleştirme sonucunu tekrar oku; `verified` sonucu ve doğru WASM/kontrat adresi eşleşmeden takip kutusunu kapatma.
4. Son adres değişirse yeni faturalarda kullan; eski v1/v2 faturaların kendi adreslerini koru ve önceki test kanıtlarını yeniden etiketleme.

Üretim ortamındaki auth/keeper secret kurulumu ve cron izlemesi ayrı dağıtım işleridir. Bu doküman yerel hazırlığı production kurulumu gibi göstermemelidir.

# Kimlik, üyelik ve ödeme onayı

## Yerel kurulum

`npm run setup:local` yalnızca eksik değerleri `.env.local` içine yazar. `SEP10_SIGNING_SECRET` kalıcı sunucu anahtarıdır; `APP_ORIGIN` güvenilen dış origin'dir. Lokal HTTP yalnızca localhost/127.0.0.1 için desteklenir. Üretimde HTTPS ve gerçek uygulama domain'i gerekir. Anahtarı her cold start'ta üretmeyin; aynı servisin bütün örnekleri aynı secret'ı kullanmalıdır.

`/.well-known/stellar.toml` sadece public key ve ağ/endpoint bilgilerini yayınlar. `/api/auth` GET challenge, POST imzalı `transaction` alır ve EdDSA JWT döndürür. Uygulamanın mevcut `/api/bridge` challenge/session akışı aynı anahtarı kullanır. Desteklenen hesaplar tek Ed25519 `G…` hesaplarıdır; multisig, muxed/memo hesapları ve client_domain desteği eklenmemiştir. JWT yanında sunucudaki oturum kaydı da gerekir; böylece logout token'ı iptal eder. Uygulama API'ları HttpOnly cookie ile oturum kullanır.

Challenge sunucu imzası, ağ, domain, zaman aralığı ve kaydedilmiş işlem hash'i ile doğrulanır. Challenge tekrar kullanılamaz. Sunucu anahtarı/domain değişiminden önceki challenge'lar reddedilir. Oturum ömrü 12 saattir. Anahtar değişiminde mevcut oturumları da iptal etmek isteniyorsa `auth_session` kayıtları kontrollü biçimde temizlenmelidir; yeni public key ile keşif dosyası yeniden kontrol edilir. Harici anchor'ın imza anahtarı bunun yerine kullanılmaz.

## Şirket ve roller

Anonim çalışma alanı izole demo verisi içindir. İlk cüzdan eşleştirmesi şirket sahibini oluşturur; sahiplenilen şirket artık anonim cookie ile okunamaz veya değiştirilemez. Eski cüzdanı bağlı şirketin sahibi, kendi imzalı oturumuyla `linkWallet` işlemini yaparak açıkça üyelik modeline geçebilir. Bir cüzdan başka şirketten sessizce sökülmez.

| Rol | Kayıt okuma | Operasyon kaydı | Fatura taslağı | Ödeme onayı | Üye/şirket yönetimi |
| --- | --- | --- | --- | --- | --- |
| owner | Evet | Evet | Evet | Evet | Evet; sahibi kaldıramaz |
| admin | Evet | Evet | Evet | Evet | Evet; owner veremez/kaldıramaz |
| operator | Evet | Evet | Hayır | Hayır | Hayır |
| billing | Evet | Hayır | Evet | Hayır | Hayır |
| approver | Evet | Hayır | Hayır | Evet | Hayır |
| viewer | Evet | Hayır | Hayır | Hayır | Hayır |

API bir kullanıcıya birden fazla rol tanımlayabilir. Arayüz temel bir rol seçer. Yönetici üyenin public key'ini ekler; kullanıcı kendi cüzdanını bağladıktan sonra şirket kimliğiyle geçiş yapar. Şirket kimliği tek başına giriş hakkı vermez. İptal edilmiş üyelik aynı cookie ile de erişemez. Sahip cüzdanını kaybederse self-service sahiplik kurtarma/devri bu sürümde yoktur.

Fatura taslağı billing tarafından oluşturulabilir; merchant adresi şirket cüzdanıdır ve zincir kaydını şirket cüzdanı sahibi imzalar. Rol eklemek özel anahtar veya zincir yetkisi paylaşmaz. Bu sürüm şirket cüzdanı için çoklu imza delegasyonu uygulamaz.

Giden ERP ödemesi önce approver/owner/admin tarafından onaylanır. Onay tutara ve alıcı cüzdanına bağlıdır; 24 saat geçerlidir. Alıcı değişirse, onaylayan üyenin yetkisi iptal edilirse veya onay yenilenirse eski hazırlanan işlem gönderilemez. Son transfer şirket cüzdanı tarafından imzalanır. Şirket sahibi hem hazırlama hem onay yetkisine sahiptir; zorunlu iki ayrı kişi kuralı bu sürümde yoktur. Gerçek zincir anahtarını elinde bulunduran kişinin Centerp dışından yaptığı işlemler uygulama rolleriyle engellenemez.

Yetki ve finansal işlem kayıtları `erp_audit` altında tutulur ve owner/admin ekranında görünür. Bu kayıt uygulama düzeyindedir; harici değişmez audit arşivi henüz yoktur.

## Dağıtımda yapılacak kontrol

Kalıcı secret değerleri deployment sağlayıcısına güvenli şekilde aktarılmalı; secret değerleri issue/PR veya sohbette paylaşılmamalıdır. Public `SIGNING_KEY` yeniden başlatma öncesi/sonrası aynı kalmalı ve imzalı cüzdan bağlantısı çalışmalıdır. Kalıcı veritabanı yapılandırılmadan çok sunuculu oturum testi tamamlanmış sayılmaz. Yerel `.env.local` dosyasını oluşturmak production secret kurulumu anlamına gelmez.

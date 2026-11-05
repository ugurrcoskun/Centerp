# Testnet web uygulaması — canlı ortam kurulum kaydı

Hedef: mevcut Vercel **centerp / Production** projesi; `https://centerp.vercel.app`.
Proje: `prj_K4TPbJajKxIt3lh30XabGRPce5hp`, ekip: `team_TWKtQqWLtyqYgnakQf94qtJW`.
Bu işlem web uygulamasını yayınlar; Stellar ağı **Testnet** olarak kalır.

## Hazır ve doğrulananlar

- Vercel CLI mevcut yetkili oturumla projeye erişebiliyor.
- Production/Preview veritabanı değişkenleri zaten mevcut; bunlar değiştirilmeyecek.
- Yerel anahtarlar kalıcı olarak üretildi; yeniden başlatmada auth public key değişmedi.
- Keeper için ayrı Testnet ücret hesabı fonlandı.
- Eski şirket sahibi, aynı cüzdanın imzalı oturumuyla üyeliğini arayüzden etkinleştirebilir; farklı cüzdan bu seçeneği görmez.
- Cron tanımı `/api/cron/escrow`, günlük `0 3 * * *` (İstanbul 06:00). Takvim canlı proje metadatasından kontrol edilir.

## Production'a aktarılacak tam ayar listesi

| Değişken | Kaynak / değer | Tür / etkisi |
| --- | --- | --- |
| `SEP10_SIGNING_SECRET` | Mevcut yerel kalıcı anahtar; public karşılığı `GA55GHJKK2H7PWVQF4AJDZIBBVCYPPZDANPWMQL4HDH5XYDGG3KK4IMR` | Sensitive; uygulamanın challenge/JWT imza kimliği |
| `ESCROW_KEEPER_SECRET` | Mevcut ayrı Testnet anahtarı; public karşılığı `GBUUV7FKTCNDPH57PSNUJVYSUM55VZUYXPPTKH74AWTBBLRKKOQ6HHGC` | Sensitive; zaman aşımı/TTL çağrılarının ağ ücretini öder |
| `CRON_SECRET` | Yerelde üretilmiş mevcut rastgele değer | Sensitive; cron uç noktasını koruyan bearer token |
| `ESCROW_RESOLVER_PUBLIC_KEY` | Yerelde seçilmiş hakemin public key'i | Public; faturada sabit hakem adresi; private key yüklenmez |
| `APP_ORIGIN` | `https://centerp.vercel.app` | Public; güvenilen auth domain'i |
| `NEXT_PUBLIC_STELLAR_NETWORK` | `TESTNET` | Public; gerçek para/Mainnet kullanılmaz |
| `NEXT_PUBLIC_ESCROW_CONTRACT_ID` | Dağıtım ve kaynak doğrulama kaydındaki v2 adresi | Public; yeni faturaların kontratı |

Secret değerleri yalnızca `.env.local` içinden belleğe okunup Vercel API'ına stdin ile aktarılacak. Komut argümanlarına, sohbete, Git'e veya bu belgeye yazılmayacak. Mevcut ortam hedefleri korunacak; yeni secret'lar yalnızca Production'a eklenecek. Veritabanı kimlik bilgileri ve hakem private key'i aktarılmayacak/değiştirilmeyecek.

**Onay ve aktarım tamamlandı:** Kullanıcı tam değişken listesini ve Production yayınını açıkça onayladı. Yedi ayar Vercel API'ıyla tek tek yüklendi; üç secret `sensitive`, yeni değerler Production hedefinde. Mevcut public ayarların Production/Preview kapsamı ve DB kimlik bilgileri korundu. Secret değerleri çıktıya veya Git'e yazılmadı.

Mevcut entegrasyon `ugurrcoskun/Centerp`, üretim dalı `main`. Çift yayın yerine bu otomatik akış kullanılacak. Kontrat kaynak doğrulaması ve uygulama/Rust CI başarılı; canlı yayın sonrası kontroller aşağıda izlenir.

## Canlı kontrol

- [x] Yedi ortam değişkeni Vercel Production'da doğrulandı.
- [x] `ca51004` GitHub `main` üzerinden otomatik yayınlandı. Canlı `stellar.toml`, yapılandırılan public key'i, domain'i ve Testnet ağını gösterdi.
- [x] Canlı auth testi CORS, imza, JWT, replay ve domain kontrollerini geçti. Ayrı bir proses aynı Neon veritabanı üzerinden canlı challenge'ı oturuma çevirdi. Canlı uygulama oturumu kabul etti ve replay'i reddetti. [Test kanıtı](../artifacts/production-auth-proof.json)
- [x] `4a04fb6` canlı. Vercel takvimi `/api/cron/escrow` için `0 3 * * *` olarak kayıtlı. 5 Kasım 16:55’te kimliksiz istek `401`, yetkili çağrı `200`, kalıcı sağlık kaydı `ok` döndü. Bu çağrıda işlenecek fatura yoktu. İki canlı deployment arasında `stellar.toml` aynı kaldı.
- [x] Saatlik GitHub Actions sağlık kontrolü tanımlandı ve canlı uç noktaya karşı elle çalıştırılan ilk kontrol geçti. [Keeper izleme çalışması](https://github.com/ugurrcoskun/Centerp/actions/runs/42040101414)
- [ ] İlk otomatik Vercel çalışmasını gözle. Takvim İstanbul saatiyle 06:00 ve son sağlık kaydı elle tetiklenen çalışmaya ait.
- [ ] GitHub bildirim teslimini proje sahibiyle doğrula.
- [ ] Kullanıcıyla son ekran ve iş akışı kontrolünü yap.

## Üretim işletmesi için ayrıca açık kapılar

Bu yayın Testnet prototipidir. [Hukuki kapsam](LEGAL_SCOPE.md) içindeki gerçek fon akışı değerlendirmesi, gerçek anchor/sağlayıcı anlaşması ve bağımsız kontrat güvenlik incelemesi henüz alınmış değildir. Gerçek işletme unvanı, yetkili temsilci ve sağlayıcı seçimi olmadan bu dış onaylar veya sözleşmeler tamamlandı diye işaretlenemez. Hazır kapsam belgesi uzman/sağlayıcı değerlendirmesine temel oluşturur; bu çalışma kapsamında üçüncü kişilere mesaj veya sözleşme gönderilmez.

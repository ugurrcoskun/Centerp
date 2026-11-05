# Centerp — Geri bildirim ve uygulama takip planı

Oluşturulma: 5 Kasım 2026  
Durum: Uygulama sürüyor. Hukuki kapsam, CI, escrow v2, auth, roller, lisans ve yol haritası kod/doküman değişiklikleri hazır; Testnet ve yayın doğrulamaları sürüyor.

Bu dosya sekiz geri bildirimin ortak takip kaydıdır. Her aşamada önce uygulama, sonra teknik doğrulama, ardından kullanıcı kontrolü yapılır. Kodun yazılması tek başına işin tamamlandığı anlamına gelmez.

## Takip kuralları

- `[x]` yalnızca gerçekten tamamlanan alt adımlarda kullanılır.
- **Uygulandı:** Değişiklikler ve gerekli dokümantasyon hazır.
- **Teknik kontrol:** İlgili testler/incelemeler tamamlandı; komut ve sonuç aşağıdaki kontrol günlüğüne yazıldı.
- **Kullanıcı kontrolü:** Kullanıcı sonucu kontrol edip kabul etti. Bu kutuyu yalnızca açık kullanıcı geri bildirimi üzerine işaretleyeceğiz.
- Dış servis, erişim veya ürün kararı bekleyen adım, nedeni yazılarak açık bırakılır.
- Her aşamanın sonunda bu dosya güncellenir ve kullanıcıya kontrol edebileceği somut sonuç sunulur.

## İlk incelemede görülenler

| Geri bildirim | Depoda görülen durum | İlgili yer |
| --- | --- | --- |
| Escrow parası kilitli kalabilir | Doğrulandı. `delivery_due` oluşturma sırasında doğrulanıp saklanıyor; fonlanmış faturayı süre sonunda sonuçlandırmıyor. `release` alıcı, `refund` satıcı imzası istiyor. `expire` yalnızca fonlanmamış faturaları kapatıyor. | [Kontrat](../contracts/invoice-escrow/src/lib.rs), [testler](../contracts/invoice-escrow/src/test.rs) |
| Yol haritası yok | README'de prototip sınırları var; Mainnet/SCF/Instaward için aşamalı, kabul kriterli bir yol haritası bulunamadı. | [README](../README.md) |
| Kontrat kaynağı doğrulanmamış | Dağıtım adresi ve WASM özeti var. Depoda kaynak doğrulama kanıtı bulunamadı; Stellar Expert üzerindeki güncel durum ayrıca kontrol edilecek. | [Dağıtım kaydı](../artifacts/deployment.json) |
| CI Rust testlerini çalıştırmıyor | Doğrulandı. CI yalnızca uygulama tür kontrolü, Node testleri ve build çalıştırıyor. Yerelde `contract:test` komutu mevcut; altı Rust testi var. | [CI](../.github/workflows/ci.yml), [package.json](../package.json) |
| Lisans dosyası yok | Kök dizinde lisans dosyası bulunamadı. | [package.json](../package.json), [Cargo.toml](../contracts/invoice-escrow/Cargo.toml) |
| SEP-10 sunucu anahtarı rastgele | Doğrulandı. Uygulama oturum challenge anahtarı süreç belleğinde `Keypair.random()` ile oluşuyor. Bu, harici anchor'ın `STELLAR.anchorSigner` anahtarından farklı. Uygulamanın kendi `stellar.toml` yayını bulunamadı. | [auth.ts](../lib/auth.ts), [config.ts](../lib/config.ts) |
| Rol/yetki sistemi yok | Şirket izolasyonu, imzalı cüzdan oturumu ve bazı finansal yetki kontrolleri var. Çok kullanıcılı şirket üyeliği ve işlem bazlı rol modeli bulunamadı. Çalışan kaydındaki `role` alanı uygulama yetkisi değil. | [ERP](../lib/erp.ts), [ERP API](../app/api/erp/route.ts), [auth.ts](../lib/auth.ts) |
| Hukuki çerçeve eksik | Testnet/mock anchor sınırı README'de var; Türkiye'deki üretim kullanımı için değerlendirilmiş bir fon akışı ve hukuki kapsam belgesi bulunamadı. | [README](../README.md), [ürün kapsamı](project/product-scope.md) |

## Uygulama sırası

Öncelik ile uygulama sırası farklıdır: P0 kritik risk, P1 güvenlik/doğrulama gereği, P2 ürün ve yayın hazırlığıdır. CI, kritik kontrat değişikliğini güvenle kontrol edebilmek için erkene alınmıştır. Kaynak doğrulama, son kontrat sürümünden sonra yapılacaktır.

| Sıra | İş | Öncelik | Bağımlılık | Uygulandı | Teknik kontrol | Kullanıcı kontrolü |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Hukuki kapsam ve Türkiye ürün konumlandırması | P0 | Yok; dış hukuki değerlendirme üretim öncesi gerekir | [x] | [x] | [ ] |
| 2 | Rust kontrat testlerini CI'a ekleme | P1 | Yok | [x] | [ ] | [ ] |
| 3 | Escrow zaman aşımı, itiraz ve kesin sonuçlandırma | P0 | 1'in ürün sınırı, 2; itiraz politikası kararı | [x] | [ ] | [ ] |
| 4 | Sabit SEP-10 sunucu anahtarı ve stellar.toml | P1 | Yok; dağıtımda kalıcı secret gerekir | [x] | [ ] | [ ] |
| 5 | Şirket üyeliği, roller ve işlem yetkileri | P1 | 4; şirket cüzdanı/imzacı modeli kararı | [x] | [x] | [ ] |
| 6 | Açık kaynak lisansı | P2 | Hak sahipliği ve lisans seçiminin netleştirilmesi | [x] | [x] | [ ] |
| 7 | Son kontratı Testnet'e dağıtma ve kaynak doğrulama | P1 | 3, 6; son kaynak sürümü ve toolchain | [ ] | [ ] | [ ] |
| 8 | Mainnet / SCF / Instaward yol haritası | P2 | Önceki aşamaların sonuçları ve açık dış bağımlılıklar | [x] | [x] | [ ] |

## 0. Hazırlık ve mevcut durum kaydı

- [x] Sekiz geri bildirimi depo yapısı ile karşılaştır.
- [x] Öncelikleri, bağımlılıkları ve kabul kriterlerini bu dosyada yaz.
- [x] Kullanıcının mevcut `.gitignore` değişikliğini tespit et; bu çalışma kapsamında değiştirme.
- [x] İlk uygulama aşamasında mevcut uygulama ve kontrat testlerini çalıştır; başlangıç hatalarını kaydet.

Başlangıç doğrulaması: 19 uygulama testi ve TypeScript kontrolü geçti. Rust başlangıçta kurulu değildi; proje içine Rust 1.93.0 kurulduktan sonra mevcut 6 kontrat testi geçti.

## 1. Hukuki kapsam ve ürün konumlandırması

Amaç: Teknik demo ile Türkiye'de gerçek para ile kullanılabilecek ürün iddiasını açıkça ayırmak.

- [x] `docs/LEGAL_SCOPE.md` oluştur; tarafları, saklama sorumluluğunu, hedef kullanım alanını ve fon akışını yaz.
- [x] Türkiye senaryosunda önerilen “TL anchor üzerinden çıkış ve ERP mutabakatı” konumlandırmasını değerlendir; README, ürün kapsamı ve uygulama metinlerini bu kapsamla tutarlı hale getir.
- [x] Doğrudan USDC fatura, tedarikçi ve maaş ödeme anlatımlarını Türkiye üretim kullanımı bakımından gözden geçir; Testnet gösterimi sınırını görünür kıl.
- [x] Gerçek anchor/ödeme hizmeti sağlayıcısı seçimi ve gerekli hukuki değerlendirmenin üretime geçiş bağımlılığı olduğunu kaydet.
- [x] Hukuki değerlendirme bekleyen hususları açık bırak; doküman güncellemesini hukuki uygunluk onayı olarak işaretleme.

**Kabul:** Ürün metinleri, demo ve gerçek para akışları konusunda çelişmiyor. Üretim için henüz doğrulanmamış iddialar yapılmıyor; açık sorular ve değerlendirme sorumlusu kayıtlı.

**Birlikte kontrol:** README ve ekran metinlerini okuyup “Bu ürün Türkiye'de ne sunmayı hedefliyor; şu anda neyi gösteriyor?” sorusuna aynı cevabı verebiliyor muyuz?

Hukuki dayanak: TCMB düzenlemesi kripto varlıkların ödemelerde doğrudan veya dolaylı kullanımını ve buna yönelik hizmetleri sınırlar. Bu nedenle yalnızca TL çıkışı eklemek veya ürün adını değiştirmek uygunluk sonucu doğurmaz; somut akış ayrıca değerlendirilmelidir. Kaynaklar: [Resmî Gazete, 16 Nisan 2021, özellikle madde 3–4](https://www.resmigazete.gov.tr/eskiler/2021/04/20210416-4.htm), [TCMB ödeme hizmetleri ve ilgili düzenlemeler](https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB%20TR/Main%20Menu/Temel%20Faaliyetler/Odeme%20Hizmetleri). Bunlar kapsam planlaması için dayanaklardır; bu dosya üretim kullanımına ilişkin hukuki onay değildir.

## 2. Kontrat testlerini CI'a ekleme

- [x] Başlangıç uygulama testlerini ve `npm run contract:test` sonucunu kaydet.
- [x] CI'a ayrı Rust doğrulama işi ekle; SDK ile uyumlu Rust sürümünü sabitle ve `Cargo.lock` kullan.
- [x] CI işinde Rust test hatasının sonraki adımları durdurduğunu ve testin isteğe bağlı olmadığını workflow incelemesiyle doğrula.
- [ ] Gerçek GitHub Actions çalışmasını doğrula; dış gönderim için kullanıcı onayı gerekiyor.
- [x] Kontrat WASM build kontrolünü ekle; gerekli hedef ve toolchain kurulumunu belgeleyip doğrula.
- [ ] Yerel sonuç ile GitHub Actions sonucunu ayrı kaydet. Actions çalışmadıysa uzaktaki kontrolü açık bırak.

**Kabul:** Yeni bir PR/push uygulama kontrolleri yanında Rust testlerini de zorunlu çalıştırıyor; başarısız kontrat testi yeşil CI üretmiyor.

**Birlikte kontrol:** Actions ekranında uygulama ve kontrat işleri ile test sonuçları görülebiliyor mu?

## 3. Escrow kilitlenmesini giderme

Bu aşama önce davranış tasarımı, ardından kodlama olarak ilerler. Yalnızca zaman aşımında satıcıya ödeme eklemek, teslim edilmeyen ürün ve açık itiraz durumlarını tek başına çözmez.

- [x] Mevcut kontratı genişletme ve Trustless Work kullanma seçeneklerini güncel birincil kaynaklarla değerlendir; yetkiler, itiraz çözümü, maliyet ve entegrasyon etkisini kaydet.
- [x] Seçilen yaklaşım için durum geçiş tablosunu yaz: fonlama, teslim bildirimi, alıcı onayı, teslim edilmemesi, itiraz, çözüm ve süre sonu.
- [x] İtiraz süresini, sürenin başlangıcını, son saniyedeki işlemlerin kurallarını ve tarafların yetkilerini belirle.
- [x] Teslim bildiriminin kanıt değerini ve satıcının gerçeğe aykırı bildirim yapması durumunda alıcının korumasını tanımla.
- [x] İtiraz gelmezse süre sonunda satıcıya ödeme; satıcı kaybolur/teslim gerçekleşmezse alıcının iade yolu oluştur.
- [x] Açık itirazın sonsuza kadar fon kilitlememesi için çözüm yetkilisini, çözüm süresini ve yetkili de yanıt vermezse nihai sonucu belirle. Yeni hakem/admin yetkilerini açıkça belgele.
- [x] Kontrat ve uygulamadaki durumları, işlem hazırlamayı, sonuç doğrulamayı ve muhasebe mutabakatını birlikte güncelle.
- [x] Süre sonu çağrısını kimin yapacağını uygula: izin gerektirmeyen sonuçlandırma çağrısı ve worker/keeper; işlem ücretini, tekrar denemeyi ve izlemeyi tanımla. Yerel gerçek keeper iadesi test edildi.
- [ ] Gerçek deployment ortamında cron/secret kurulumu ve uyarı alıcısını doğrula.
- [x] Testler: son tarihten hemen önce/tam sınırda/sonra, onay vermeyen alıcı, kaybolan satıcı, açık itiraz, yanıt vermeyen çözüm yetkilisi, yetkisiz işlem, tekrar ödeme/iade, token bakiyesi ve hata halinde geri alma.
- [x] Eski kontratın upgrade fonksiyonu olmadığını dikkate al; yeni dağıtım ve eski kontratta kalan faturalar/fonlar için geçiş planı yaz. Eski fonlar yeni kodla otomatik düzelmiş sayılmayacak.

**Kabul:** Tanımlanan her fonlanmış senaryonun gerekçeli ve test edilmiş nihai ödeme/iade yolu var. Aynı tutar iki kez çıkmıyor. İtiraz varken otomatik satıcı ödemesi yapılamıyor. Otomatik akışın tetikleyicisi ve arıza halinde elle çağrı yolu doğrulanmış.

**Birlikte kontrol:** Alıcı onayı, alıcı sessizliği, teslim etmeyen satıcı ve itiraz senaryolarını ayrı ayrı çalıştırıp tarafların ve escrow'un bakiyelerini karşılaştıracağız.

**Teknik ayrım:** Kontrat zaman geçtiğinde kendi kendine işlem göndermez. Süre kontrolü kontratta, otomatik işlem gönderimi worker/keeper tarafında olmalıdır. Worker olmadan yalnızca çağrılabilir bir hak sağlanır; “otomatik ödeme tamamlandı” denmez.

## 4. SEP-10 anahtarı ve keşif dosyası

- [x] Uygulamanın challenge imzasını kalıcı, sunucuya özel ortam değişkeninden yükle; secret'ı repoya, loglara veya istemciye koyma.
- [x] Eksik/geçersiz anahtarda açıklayıcı hata ver; dağıtımda rastgele anahtara sessizce geri dönme.
- [x] `/.well-known/stellar.toml` sun; public `SIGNING_KEY`, doğru domain/ağ ve gerçek kimlik doğrulama uçlarını yayınla.
- [x] Harici anchor anahtarı ile uygulama anahtarının farklı görevlerini belgeleyip ayrı tut.
- [x] Challenge'ın sunucu imzası, domain/ağ, geçerlilik süresi ve tek kullanımlılık kontrollerini doğrula.
- [x] Gerçek yerel production-server restart öncesi/sonrası public key aynı kaldı; auth smoke tekrar geçti. Anahtar rotasyon politikası yazıldı.
- [ ] Gerçek çok sunuculu deployment ve kalıcı DB üzerinde challenge/session davranışını doğrula.
- [ ] `.env.example`, yerel test yapılandırması ve dağıtım talimatlarını güncelle; gerçek ortam secret kurulumunu ayrıca doğrula.

**Kabul:** Yeniden başlatma anahtarı değiştirmiyor; yayınlanan public key challenge imzasıyla eşleşiyor. Yanlış imza/domain/ağ, süresi geçmiş challenge ve replay reddediliyor.

**Birlikte kontrol:** Public key'i kaydet, uygulamayı yeniden başlat, tekrar karşılaştır; aynı anahtar üzerinden cüzdan bağlantısını dene.

## 5. Rol ve yetki sistemi

- [x] Şirket üyeliğini imzalı kullanıcı kimliğiyle ilişkilendir; anonim demo çalışma alanı ile gerçek yetkili işlemleri ayır.
- [x] Başlangıç yetki matrisi yaz: şirket sahibi/yönetici, fatura hazırlayan, ödeme onaylayan, salt okunur kullanıcı. Gerekirse aynı kişiye birden fazla yetki tanımla.
- [x] İlk sahip atama, üye ekleme/davet, yetki değiştirme ve üyelik iptalini tanımla; kullanıcının kendi kendine yetki yükseltmesini engelle.
- [x] Fatura hazırlama ile şirket adına zincirde imza atma farkını çöz: şirket cüzdanı, delegasyon veya çoklu imza modelini belirle. Uygulama rolünü tek başına kontrat imza yetkisi sayma.
- [x] ERP ve bridge API'larında işlem bazlı sunucu kontrolleri uygula; şirketler arası erişim engelini koru.
- [x] Arayüzü aynı yetki matrisiyle eşleştir; kimin hangi finansal işlemi yaptığına ilişkin denetim kaydı ekle.
- [x] Mevcut demo verisi ve oturumların geçişini planla; yanlışlıkla yönetici yetkisi kazandırma.
- [x] Yetkisiz doğrudan API isteği, başka şirket kaydı, kendi yetkisini yükseltme, iptal edilmiş üyelik, fatura oluşturma ve ödeme onayı testlerini çalıştır.

**Kabul:** Yetkisiz kullanıcı, arayüzü atlayarak da fatura oluşturamıyor veya ödeme onaylayamıyor. Yetki iptali sunucuda etkili oluyor. Şirket izolasyonu ve cüzdan imzası korunuyor.

**Birlikte kontrol:** Farklı rollerdeki iki kullanıcıyla aynı işlemleri deneyip izin verilen/reddedilen sonuçları karşılaştıracağız.

## 6. Lisans

- [x] MIT veya Apache-2.0 seçimini ve doğru hak sahibi bilgisini netleştir. Başlangıç önerisi: basit kullanım için MIT; hak sahipliği bilgisi doğrulanmalı.
- [x] Kök `LICENSE` dosyasını ekle; npm/Cargo metadata ve README ile tutarlı hale getir.
- [x] Mevcut üçüncü taraf kod/asset bildirimlerini koru; üçüncü taraf içeriklerin otomatik olarak proje lisansına girdiğini varsayma.

**Kabul:** Lisansın tam metni, hak sahibi bilgisi ve paket metadata'sı tutarlı; dokümandan lisansa erişilebiliyor.

**Birlikte kontrol:** Seçilen lisans ve hak sahibi bilgisi kullanıcı tarafından okunup teyit edilecek.

## 7. Kontrat kaynak doğrulama ve Testnet yayını

- [x] Stellar Expert API üzerinde 5 Kasım 2026 v2 kontrat kontrolü: `validation.status = unverified`. Sonuç doğrulanmış gibi sunulmuyor.
- [x] Son kontrat kaynağını, `Cargo.lock`, toolchain ve derleme seçeneklerini tekrarlanabilir derleme için sabitle.
- [x] Eski kontrat geçiş planını uygulayarak yeni Testnet dağıtımını hazırla; kontrat adresi ve WASM özetini kaydet.
- [ ] Güncel resmi doğrulama akışıyla kaynak kodu doğrulat; explorer'daki sonucu bağımsız kontrol et.
- [x] Uygulama kontrat ayarlarını ve dağıtım kanıtlarını güncelle; eski kanıtları yeni sürümün testi gibi sunma.
- [x] Yeni sürümün ERP, tam anchor ve escrow Testnet senaryolarını adres ve işlem hash'leriyle kaydet. Kaynak henüz yayınlanmadığından dağıtım `sourceDirty: true`; yayın/attestation eşleştirmesi açık.

**Kabul:** Uygulamanın kullandığı adres, test edilen adres ve doğrulanan adres aynı. Explorer kaynak doğrulamasını gösteriyor; sadece işlem bağlantısının bulunması yeterli değil.

**Birlikte kontrol:** Explorer üzerinden adresi, kaynağı ve yeni senaryoların işlem kanıtlarını açıp karşılaştıracağız.

## 8. Yol haritası

- [x] `docs/ROADMAP.md` oluştur ve README'den bağla.
- [x] Aşamaları yaz: güvenli Testnet sürümü → kullanıcı pilotu → gerçek anchor ve hukuki değerlendirme → bağımsız güvenlik incelemesi → koşullu Mainnet.
- [x] Her aşamaya teslim çıktısı, sorumlu, hedef aralık, bağımlılık ve geçiş kriteri ekle; kesinleşmemiş tarihleri taahhüt gibi yazma.
- [x] SCF ve Instaward için güncel resmi başvuru koşullarını kontrol et; uygun seçenek, demo/kanıt paketi ve bir sonraki somut başvuru adımını kaydet.
- [x] Mainnet için operasyonel kapıları yaz: itiraz hizmeti, worker izleme, anahtar yönetimi, yetkiler, denetim, üretim anchor anlaşması ve hukuki değerlendirme.

**Kabul:** Projeye yeni bakan biri bir sonraki teslimi, sorumlusunu ve Mainnet'e geçmek için hangi koşulların eksik olduğunu görebiliyor. Başvuru/dış onay gerektiren işler tamamlanmış gibi görünmüyor.

**Birlikte kontrol:** Bir sonraki hedefi ve onu tamamlamak için gereken somut çıktıları birlikte değerlendireceğiz.

## Son kontrol ve kapatma

- [x] `npm run typecheck`, `npm test`, `npm run build` sonuçlarını son sürüm için kaydet.
- [x] Yerel `npm run contract:test` ve `npm run contract:build` sonuçlarını kaydet.
- [ ] Uzaktaki CI sonucunu kaydet; GitHub gönderim onayı bekliyor.
- [x] `npm run test:integration` ve `npm run test:erp` geçti. Ayrıca `npm run test:escrow:v2`, auth ve gerçek HTTP yetki testleri geçti.
- [ ] Yeniden başlatma, yetkisiz erişim, teslim zamanı/itiraz ve mutabakat senaryolarını kullanıcıyla kontrol et.
- [x] README, ürün kapsamı, hukuki kapsam, yol haritası, deploy bilgisi ve test kanıtlarını çapraz kontrol et. Eski v1 kanıtları ayrı tutuldu.
- [ ] Sekiz geri bildirimin her birinin teknik ve kullanıcı kontrolünü tamamla; kalan dış bağımlılıkları nedenleriyle açık yaz.

## Kontrol günlüğü

| Tarih | Aşama | Yapılan işlem / kanıt | Sonuç | Kullanıcı kontrolü |
| --- | --- | --- | --- | --- |
| 2026-11-05 | 0 | Kontrat, auth, ERP, CI, paket metadata ve dağıtım kayıtları okundu; bu takip dosyası oluşturuldu. | Planlama tamamlandı. Ürün kodu değişmedi; testler henüz çalıştırılmadı. | Bekliyor |

Yeni satır biçimi: tarih, aşama, değişen dosya/commit, çalıştırılan komut ve sonuç, varsa manuel kontrol kanıtı. Kullanıcı kontrolü teknik test sonucundan bağımsız tutulur.

## Uygulama sırasında doğrulanan sonuçlar

- 5 Kasım: `npm test` 29 test; `npm run contract:test` 12 test; `npm run typecheck` geçti. İnceleme düzeltmelerinden sonraki son üretim build'i de geçti.
- Yerel public key ve `stellar.toml` HTTP 200 doğrulandı; gerçek yerel production restart sonrasında key değişmedi. `npm run test:auth`: CORS, imzalı challenge, JWT, replay ve domain reddi geçti. Gerçek çok sunuculu ortam ve production secret kurulumu açık.
- Yeni Testnet kontratı: `CDJKNS4FOHGESEKME27CQ4E4Z3CQ2JOF5W6ZEML63E47WFVNTZCANABZ`. Yerel WASM SHA-256, dağıtım kaydıyla aynı. Explorer halen unverified; GitHub attestation için dış gönderim onayı gerekiyor.
- ERP ve tam anchor yatırma/çekme testleri geçti: [ERP kanıtı](../artifacts/erp-testnet-v2-proof.json), [tam akış kanıtı](../artifacts/testnet-v2-proof.json).
- Gerçek Testnet keeper süre sonu iadesi, bağımsız hakem iadesi ve tekrar kararın reddi geçti; alıcı bakiyesi tam geri döndü: [escrow v2 kanıtı](../artifacts/escrow-v2-proof.json).
- Gerçek HTTP rol/üyelik testleri geçti: [yetki kanıtı](../artifacts/access-proof.json). Kodda roller arayüzden bağımsız denetleniyor.
- Odaklı Reviewer, geç gelen işlem makbuzunun ERP durumunu yanlış ilerletebilmesi ve belirsiz klasik ödemelerin yeniden hazırlanamayabilmesi sorunlarını bildirdi. Makbuz event'i + ledger/sıra ile mutabakat ve Horizon indeks zamanı ile kontrollü süre aşımı eklendi. Regresyon testleri geçti; takip incelemesinde açık somut hata bildirilmedi. Altı gerçek işlem makbuzu atılabilir DB kopyasında yeniden uzlaştırıldı: [makbuz kanıtı](../artifacts/receipt-proof.json).
- Yerel eski fatura geçişi: 3 kayıt adresine sabitlendi; 1 aktif kayıt var. Özel yedek `output/legacy-invoices-backup.json` altında; repoya eklenmez. Tam zincir envanteri ve eski taraf imzaları bu otomatik geçişin kapsamı dışındadır.
- Masaüstü ve 390 px mobil üyelik/finans ekranları kontrol edildi; mobil yatay taşma yok. Ekran kanıtları `output/feedback-ui/` altında.
- Hukuki değerlendirme, gerçek anchor sözleşmesi, bağımsız güvenlik incelemesi ve Mainnet kapıları açık. Kullanıcı kontrol kutuları kullanıcı incelemesine bırakıldı.

## Dış gönderim için bekleyen tek yayın onayı

Otomatik onay denetimi GitHub commit/push girişimini, kaynak ve artifact kapsamının dış depoya gönderilmesi için açık kullanıcı onayı gerektirdiğinden işlem başlamadan reddetti. GitHub'a gönderim/commit yapılmadı. Hazır dosyalar incelendikten sonra `ugurrcoskun/Centerp` deposunun `codex/feedback-hardening` dalına yalnızca kod, belge, proje agent yapılandırması ve üretilmiş test kanıtları gönderilebilir. Secret'lar, `.env.local`, `output/` ve kullanıcının mevcut `.gitignore` değişikliği hariç tutulacak. `main` birleştirmesi ve üretim yayını bu onaya dahil değildir. Ayrıntılar: [kaynak doğrulama](CONTRACT_VERIFICATION.md).

## Agent mimarisi ek işi

Kullanıcının köke eklediği mimari belgesi [docs/development/AGENT_ARCHITECTURE.md](development/AGENT_ARCHITECTURE.md) konumuna taşındı. Kökte 1.421 byte kısa `AGENTS.md`, proje içinde dört rol TOML dosyası ve `.codex/config.toml` var. Varsayılan tek agent; yararlı ise dar görev devri, ana agent dahil en fazla üç eşzamanlı agent. Luna / low canlı yapılandırma kontrolü ve Sol / medium finansal Reviewer çalıştı. Mevcut sohbetin modeli kendiliğinden değiştirilmedi; gelecekteki proje varsayılanları ayrı.

Son kontrol günlüğü: 5 Kasım 2026 — 29 uygulama testi, 12 Rust testi, typecheck, WASM ve son production build başarılı. Yeni auth smoke restart sonrasında tekrar geçti. Hazır diff inceleme paketi `output/feedback-review.patch` altında; dış gönderim yapılmadı.

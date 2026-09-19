# Centerp · 2–3 Dakikalık Jüri Sunumu

Bu akışın ana fikri: Centerp, ERP’deki operasyon kaydını Stellar üzerindeki ödeme kanıtına bağlar.

## Sunum öncesi 2 dakika

- Chrome veya Edge’de Freighter’ı **Test Net** ağına al.
- Kullanacağın şirket cüzdanında işlem ücreti için XLM ve USDC trustline bulunduğunu kontrol et.
- `/workspace` sayfasını aç. Örnek veriler görünmüyorsa sayfayı yenile.
- `/finance` sayfasını ikinci sekmede aç.
- Jüriye canlı imza göstereceksen önce şirket cüzdanını ERP ayarlarından bağla. İki cüzdan gerekiyorsa satıcı ve müşteri rollerini önceden hazırla.
- Ağ bekleme riskine karşı `/finance` içindeki işlem defteri ve Ağ & bağlantılar ekranını açık bırak. Bunlar canlı işlemin kanıtını göstermek için yedektir.

> Codex gömülü tarayıcısında Freighter çalışmaz. Canlı imza için Chrome veya Edge kullan.

## Zaman planı

| Süre | Sayfa | Gösterilecek şey | Tek cümlelik anlatım |
|---:|---|---|---|
| 0:00–0:15 | `/` | Landing page ve ürün akışı | “Centerp, işletme operasyonlarını ödeme kanıtından ayırmıyor.” |
| 0:15–0:45 | `/workspace` | Örnek sipariş, stok, çalışan ve borç kayıtları | “Bir satın alma kaydı stoğu ve ödeme yükümlülüğünü aynı iş kaydından üretir.” |
| 0:45–1:15 | `/finance` | TRY / USDC tahsilat seçimi ve ERP borçları | “Kullanıcı tahsilata TRY ile ya da doğrudan USDC ile girebilir.” |
| 1:15–1:45 | `/finance` → TRY ↔ USDC | SEP-10, SEP-38 ve SEP-6 akışı | “TRY tarafı Anchor’da simüle edilir; kur teklifini ve transfer durumunu standart SEP uçları taşır.” |
| 1:45–2:30 | `/finance` → Faturalar / Ödemeler | Soroban escrow durumu ve işlem hash’i | “USDC, teslim onayına kadar Soroban escrow’da kalır; doğrulanan hash ERP kaydına döner.” |
| 2:30–2:50 | `/finance` → Ağ & bağlantılar | Testnet, Anchor ve contract bilgileri | “Bankacılık simülasyon, Stellar Testnet tarafı ise imzalı ve doğrulanabilir.” |

## Canlı demo adımları

### 1. İşletme kaydı · `/workspace`

1. Sol menüden **Satın alma** veya **İnsan kaynakları** sayfasını aç.
2. Örnek tedarikçi borcu ya da çalışan ödeme kaydını göster.
3. Tutarların 50–3.000 TRY aralığında olduğunu belirt.
4. İstersen **Muhasebe & finans** sayfasında aynı kaydın deftere yansımasını göster.

Söylenecek cümle:

> “Ödeme ekranı tek başına çalışan bir cüzdan ekranı değil. Borç, tedarik veya çalışan kaydından geliyor.”

### 2. Tahsilat yolu · `/finance`

1. Üstteki **Default collection route** alanında önce **TRY** seçili kalsın.
2. **ERP liabilities & employee payments** tablosundaki uygun satırda **Start with TRY** düğmesine tıkla.
3. Açılan Anchor ekranında ERP ödeme kaydını ve otomatik gelen TRY tutarını göster.
4. İstersen USDC seçeneğine bir kez tıkla ve doğrudan Stellar ödeme yolunu göster; ardından TRY’ye geri dön.

Söylenecek cümle:

> “TRY, kullanıcı deneyimindeki giriş para birimi. Stellar tarafındaki yerleşim ise USDC ile yapılıyor.”

### 3. Anchor akışı · `/finance` → `TRY ↔ USDC`

1. **Connect wallet** ile Freighter’ı bağla.
2. Gerekirse **Create USDC trustline** adımını göster.
3. **Connect to Anchor** ile SEP-10 imzalı oturumu başlat.
4. **Get firm quote** düğmesine bas ve TRY karşılığı USDC tutarını göster.
5. **Create bank instructions** ile SEP-6 talimatını oluştur.
6. Jüri zaman kazanmak için bankayı canlı simüle etmek zorunda değil. Oluşan transfer kaydındaki durum ve teklif kimliği yeterli kanıttır.

Söylenecek cümle:

> “SEP-38 teklifi kuru kilitliyor, SEP-6 banka talimatını ve durum takibini taşıyor.”

### 4. Escrow ve kanıt · `/finance` → `Invoices` / `Payments & escrow`

1. Bir faturayı aç.
2. Fatura detayındaki müşteri, tutar, vade ve teslim tarihini göster.
3. Mümkünse müşteri cüzdanıyla **Pay into escrow** imzasını göster.
4. Sonra müşteri rolünde **Approve delivery & release** işlemini göster.
5. **Payments & escrow** sayfasında transaction hash’i ve durumunu göster.

Söylenecek cümle:

> “Fon, satıcıya anında gitmiyor. Müşteri teslimatı onayladığında sözleşme serbest bırakıyor.”

## Jürinin özellikle görmek isteyeceği noktalar

| Konu | Ekranda kanıt | Net açıklama |
|---|---|---|
| Gerçek iş problemi | Workspace içindeki sipariş, stok ve borç kayıtları | ERP olayı ile ödeme birbirinden kopmuyor. |
| Stellar kullanımı | Cüzdan bağlantısı, XLM/USDC trustline, işlem hash’i | İmza kullanıcı cüzdanında kalıyor; uygulama secret key istemiyor. |
| Anchor entegrasyonu | Anchor sayfasındaki SEP-10, SEP-38, SEP-6 adımları | TRY girişini standart Anchor uçlarıyla USDC’ye bağlıyor. |
| Soroban değeri | Escrow fatura durumları | Sözleşme ödeme yaşam döngüsünü ve teslim onayını uygular. |
| Denetlenebilirlik | Ödemeler defteri ve ERP muhasebe kaydı | Doğrulanan işlem hash’i kaynak kayda geri bağlanır. |
| Demo dürüstlüğü | Ağ & bağlantılar ekranı | Banka ve KYC simüle edilir; USDC ve escrow işlemleri Testnet’tedir. |

## Canlı imza çalışmazsa

Şunu açıkça söyle:

> “Freighter imzası yalnızca tarayıcı eklentisinin olduğu Chrome veya Edge profilinde çalışır. Bu yüzden burada işlem defterindeki hash, Anchor transfer kaydı ve contract kimliği üzerinden doğrulanabilir sonucu gösteriyorum.”

Ardından sırasıyla **Ağ & bağlantılar**, **Ödemeler & escrow** ve ilgili **fatura detayını** aç. İmza penceresiyle uğraşma; sunum ritmini koru.

## Kapanış cümlesi

> “Centerp, işletmenin günlük kaydını Stellar ödeme kanıtıyla aynı akışta tutuyor: TRY ile başlayabiliyor, USDC ile yerleşiyor ve teslim onayıyla kontrollü tahsilat sağlıyor.”

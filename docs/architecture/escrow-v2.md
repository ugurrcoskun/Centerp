# Escrow v2: teslim, itiraz ve süre sonu

Durum: Testnet başlangıç politikası; üretimden önce bağımsız kontrat incelemesi ve hakem hizmeti gerekir.

## Seçim

Mevcut kontratın ERP kayıt ve kanıt modeli korunarak genişletilmesi seçildi. [Trustless Work](https://docs.trustlesswork.com/trustless-work) milestone, onay ve itiraz için hazır API/SDK sunuyor; [rol tasarımında](https://docs.trustlesswork.com/trustless-work/introduction/technology-overview) ayrı release signer ve dispute resolver bulunuyor. Bu geçiş ayrıca kimlik, durum ve muhasebe entegrasyonunu değiştireceğinden mevcut düzeltmede yeni dış servis bağımlılığı alınmadı. Maliyet ve hizmet şartları bir üretim seçimi yapılırken yeniden değerlendirilmeli; ücret avantajı varsayılmıyor.

## Kontratta sabit kurallar

`due` fonlama sonu, `delivery_due` teslim bildirimi sonudur. Fonlama ve teslim bildirimi yalnızca ilgili tarihten **önce** yapılabilir. Son teslim tarihinden sonraki itiraz süresi **3 gün**, itirazın açılmasından sonraki hakem yanıt süresi **7 gün**dür. Süreler saniye ve zincirin ledger zamanı ile hesaplanır. Süre bitiş anında eski hak sona erer, sonuçlandırma hakkı başlar.

| Durum / işlem | Yetki | Sonuç |
| --- | --- | --- |
| Open → fund; `now < due` | Alıcı | Funded |
| Funded → deliver; `now < delivery_due` | Satıcı | Delivered |
| Funded → finalize; `now >= delivery_due` | Herkes | Tam tutar alıcıya; Refunded |
| Delivered → dispute; `now < delivery_due + 3 gün` | Alıcı | Disputed; itiraz zamanı bir kez kaydedilir |
| Funded → dispute; `now < delivery_due` | Alıcı | Disputed; erken uyuşmazlık bildirimi |
| Delivered → finalize; `now >= delivery_due + 3 gün` | Herkes | Tam tutar satıcıya; Released |
| Disputed → resolve_release / resolve_refund; `now < disputed_at + 7 gün` | Faturada sabit bağımsız hakem | Tam ödeme veya tam iade |
| Disputed → finalize; `now >= disputed_at + 7 gün` | Herkes | Tam tutar alıcıya; Refunded |
| Funded / Delivered / Disputed → release | Alıcı | Gönüllü tam ödeme |
| Funded / Delivered / Disputed → refund | Satıcı | Gönüllü tam iade |
| Open → cancel / expire | Satıcı / vade sonrası herkes | Fon hareketi olmadan kapanır |

Alıcı ve satıcı, diğerinin lehine gönüllü işlem yapabilir. Hakem alıcı veya satıcı olamaz; başka bir alıcı adresi belirleyemez. Kontratta upgrade/sweep ve platform ücret kesintisi yoktur. Fatura başına hakem adresi ve v2 taahhüdü sabittir. Nihai duruma geçilmiş tutar tekrar aktarılamaz.

**Teslim bildirimi fiziksel teslim kanıtı değildir.** Satıcının iddiasıdır; alıcının bildirimleri takip etmesi ve yanlış teslim iddiasına süre içinde itiraz etmesi gerekir. Sessiz hakem halinde alıcıya iade, sonsuz kilidi önleyen alıcı lehine açık bir politikadır; kötü niyetli alıcı riski taşır. Üretim için delil toplama, bildirim, hakem sözleşmesi ve uyuşmazlık hizmeti ayrıca tasarlanmalıdır. Kodda gerçek dünyadaki teslimi doğrulayan oracle yoktur.

## Çalıştırma

`npm run setup:local` yerel kalıcı auth, hakem ve keeper anahtarlarını üretir; tekrar çalıştırmak mevcut değerleri değiştirmez. Hakem private key'i üretimde web uygulamasında tutulmamalı; yerel `ESCROW_RESOLVER_SECRET` yalnızca test araçları içindir. Üretim için bağımsız hakem public key'i seçilmelidir.

`npm run escrow:keeper` dedicated anahtarla sadece `expire`, `finalize` ve TTL bakımını yapan `get` çağrılarını gönderir. Anahtarın Testnet XLM bakiyesi gerekir. Sözleşme sürenin dolmasını tek başına işlem olarak göndermez. `vercel.json` günlük 03:00 UTC (İstanbul 06:00) çağrısını tanımlar; `CRON_SECRET` ve keeper anahtarı gerçek dağıtım ortamında da kurulmalıdır. Günlük takvim nedeniyle ödeme süre sonundan sonra bir sonraki çalıştırmaya kadar bekleyebilir. Panelde tarafların elle sonuçlandırma yolu da vardır.

Worker imzalı hash'i ağ gönderiminden önce kalıcı depoya yazar; belirsiz sonuçta aynı ödemeyi yeni bir işlem gibi göndermez, önce hash'i kontrol eder. Başarısız yanıt ve bakiye eksikliği HTTP/CLI hata sonucu üretir; operatörün bu sonucu izlemesi gerekir. Uyarı alıcısı ve gerçek dağıtım henüz kurulmadan operasyonel otomasyon tamamlanmış sayılmaz. Pilot kapasitesi çalıştırma başına 25 faturadır; daha büyük hacimde ayrı kuyruk/worker gerekir. Haftalık on-chain `get` instance ve fatura TTL'ini uzatır; yalnızca simülasyon bunu yapmaz.

## Eski kontrattan geçiş

v1 yükseltilemez. Eski faturaların `contract` alanı yoksa tarihi adres `CCDPQPUS5SIBJF6YK2FZZV65P45U5FK7A3TMUE25T62VS3GQ22OG76IL` kullanılmalıdır. Yeni faturalar v2 adresini kendi kaydında saklar. Eski açık/fonlanmış faturalar eski onay/iade kurallarında kalır; kullanıcıların imzaları olmadan taşınamaz. Yeni dağıtımdan önce eski yerel kayıtlar adresleriyle sabitlenir; envanter yalnızca uygulamanın bildiği faturaları kapsar. Tam zincir envanteri ayrıca kontrol edilmelidir.

Mevcut eski test kanıtları tarihlidir. Yeni kontratı doğrulayan kanıtlar ayrı dosyada tutulur; kaynak doğrulaması ile güvenlik denetimi aynı şey değildir.

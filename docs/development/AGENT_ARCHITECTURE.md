# Centerp için ekonomik agent kullanımı

5 Kasım 2026. Kullanıcının köke eklediği `agent-mimarisi.md` incelenerek bu konuma taşındı ve uygulanabilir proje kurallarına dönüştürüldü. Sürekli yüklenen kısa talimat [AGENTS.md](../../AGENTS.md); bu belge yalnızca ihtiyaç halinde okunur.

## Hedef ve düzeltmeler

Hedef aynı işi daha az toplam bağlam, araç çıktısı, tekrar ve gereksiz agent çalıştırmasıyla tamamlamaktır. Daha ucuz model kullanmak ile daha az token tüketmek aynı şey değildir. Plus kullanım limitlerinde belirli bir tasarruf yüzdesi garanti edilemez; bu yapı API ücretlendirmesi açmaz veya bir API anahtarı oluşturmaz.

İlk taslaktaki her küçük/orta işi Developer'a gönderme kuralı kaldırıldı. Küçük iş ana agent'ta kalır; devretme ancak açık bir kapsam veya bağımsız çalışma avantajı varsa yapılır. Ana agent için sürekli High yerine Medium seçildi; High karmaşık mimari/güvenlik rolüne ayrıldı. Doğrulanmamış 50.000+ satır varsayımı kaldırıldı.

## Roller

| Rol | Model / reasoning | Ne zaman |
| --- | --- | --- |
| Ana agent / Orchestrator | `gpt-6.1-sol` / `medium` | Planlama, küçük işler, entegrasyon ve son kontrol; ayrı bir orchestrator alt agent açılmaz |
| Developer | `gpt-6-luna` / `medium` | Kapsamı belirli uygulama işi; karmaşık auth/escrow değişikliği verilmez |
| Explorer | `gpt-6-luna` / `low` | Dar bir soruya dosya/satır referanslı cevap; yazma yapmaz |
| Architect | `gpt-6.1-sol` / `high` | Veritabanı, yetki, güvenlik ve para hareketi tasarımı; gerektiğinde |
| Reviewer | `gpt-6.1-sol` / `medium` | Riskli değişikliğin odaklı incelemesi; yalnızca bulgu ve eksik kanıt |

En fazla iki alt agent + ana agent = üç eşzamanlı agent. Ayardaki `agents.max_concurrent_threads_per_session = 2` ana agent'ı saymaz. Agent'lar kalıcı çalışan süreçler değildir; rol dosyaları ihtiyaç halinde seçilecek yapılandırmadır.

## Bağlam ve görev aktarımı

Ana agent önce yakın dosyaları kendisi bulur. Devredilen görevde yalnızca amaç, ilgili dosyalar, mevcut bulgu, kısıt ve beklenen kontrol verilir. Destekleniyorsa tam sohbet geçmişi yerine bağımsız kısa görev kullanılır. Alt agent sonucu en fazla yaklaşık 200 kelimede değişen dosyalar, test sonucu ve açık risk olarak döndürür. Sonuç yetersizse aynı agent'a dar bir takip görevi verilir.

Rol tanımları birbirinden ayrıdır; ayrı bir Explorer → Architect → Developer → Reviewer zinciri her işte otomatik çalıştırılmaz. Ana agent küçük bir düzeltmeyi doğrudan bitirebilir. Güvenlik/para hareketi için kaliteyi koruyan odaklı inceleme tercih edilir.

## Yerel doğrulama ve etkinlik

- Kurulu CLI: `codex-cli 0.149.0`; `multi_agent` özelliği etkin görüldü.
- Yerel model kataloğu hem `gpt-6.1-sol` hem `gpt-6-luna` kimliklerini ve seçilen reasoning seviyelerini listeliyor.
- Beş TOML dosyası parse edildi; CLI feature list proje ayarlarıyla hatasız çalıştı. Proje mevcut kullanıcı ayarında trusted olarak görünüyor. Canlı, kısa bağlamlı GPT-6 Luna / low görevi tamamlandı; GPT-6.1 Sol / medium Reviewer da finansal değişiklik incelemesini yaptı. Developer/Architect henüz çalıştırılmadı.
- CLI prompt export kontrolü ortamın OS izni nedeniyle çalışmadı; bunu başarılı saymıyoruz. Aktif sohbetin modelinin değiştiği iddia edilmiyor. Yeni oturumun etkin model/rol seçimi ayrıca doğrulanmalıdır.
- Bu dosyaların yazılması mevcut sohbetin modelini veya çalışan uygulamanın global ayarını değiştirmez. Yeni oturumdaki açık UI/model seçimi ve yönetilen politikalar proje varsayılanına üstün gelebilir. Gerçek seçim çalışma sırasında doğrulanmalı.
- Explorer/Reviewer'ın yazmama kuralı talimattır; ayrı bir güvenlik sandbox'ı oluşturulduğu iddia edilmez. Alt agent'lar mevcut oturum izinlerini devralır.

Değişiklikler yalnızca proje kökündeki `AGENTS.md`, `.codex/` ve bu belge içindedir. Global Codex ayarları değiştirilmez. Bu mimari alt görevi uygulama kaynak kodunu değiştirmez; devam eden feedback düzeltmeleri ayrı bir çalışmadır.

## Kaynaklar

[Resmî subagent belgesi](https://developers.openai.com/codex/multi-agent) model/rol dosyalarını, izin devralmayı ve ek token maliyetini açıklar. [Yapılandırma referansı](https://developers.openai.com/codex/config-reference) proje ve agent ayarlarını listeler. Model erişimi hesap/çalışma alanına bağlıdır; burada yerel katalog da kontrol edildi.

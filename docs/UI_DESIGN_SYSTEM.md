# Centerp arayüz sistemi

## Tasarım yönü

Centerp, bir tanıtım sayfası değil; gün boyunca açık sipariş, borç, stok riski ve Stellar mutabakatı arasında çalışan bir operasyon ekranıdır. Ana yüzey bu yüzden iş kuyruğu ile açılır. Kullanıcı önce bekleyen işi görür, sonra ilgili modüle gider.

Tek güçlü görsel unsur, Stellar mutabakatı için kullanılan düz kırmızı dikey yüzeydir. Kırmızı; seçim, açık aksiyon ve ödeme hattını işaretler. Bilgi geri kalanı beyaz çalışma alanı, çizgisel ayırıcılar ve tablolarda yaşar.

## Tokenlar

| Rol | Açık tema | Koyu tema | Kullanım |
|---|---:|---:|---|
| Çalışma zemini | `#F2F3F1` | `#121315` | Uygulama arka planı |
| Yüzey | `#FFFFFF` | `#191A1D` | Defter, iş kuyruğu, form |
| Ana metin | `#111214` | `#F2F2F0` | Başlıklar ve sayısal değerler |
| İkincil metin | `#666A70` | `#9A9DA3` | Açıklama ve yardımcı bilgi |
| Ayırıcı | `#D8DADD` | `#37393E` | Satır, sütun ve yüzey sınırı |
| Stellar kırmızısı | `#D51F3C` | `#FF4964` | Birincil eylem, seçili durum, mutabakat |
| Kırmızı yumuşak | `#FFF0F2` | `#351820` | Hover ve seçili arka plan |
| Zincir mavisi | `#2554C7` | `#83A7FF` | Bilgi ve takip durumu |

Kırmızı ile uyum için sıcak krem yerine nötr, hafif soğuk gri kullanılır. Bu sayede ödeme yüzeyi güçlü görünürken tablo yoğunluğu okunabilir kalır. Gradyan kullanılmaz.

## Tipografi

- `Helvetica Neue`, sonra Arial: tüm ürün arayüzü.
- Başlıklar 700–720 ağırlıkta; kısa ve eyleme yakın.
- Sayısal tutarlar `tabular-nums` ile hizalanır.
- Etiketler cümle düzenindedir; gereksiz büyük harf, üst başlık ve dekoratif meta satırı yoktur.

## Yerleşim

```text
Sol navigasyon          Üst araç çubuğu
                       Operasyon merkezi + doğrudan eylem
                       [ Açık işler çizgisi ]
                       [ İş kuyruğu              ][ Stellar mutabakatı ]
                       [ Operasyon hattı                                      ]
                       [ Son satış / fatura defteri                            ]
```

- Masaüstünde iş kuyruğu ana alanı, mutabakat alanı sağdaki işlem özetidir.
- Dar ekranlarda navigasyon çekmeceye geçer; iş kuyruğu ve mutabakat dikey akışa girer.
- Tekrarlanan metrik kartları yerine bitişik, bölmeli bilgi çizgisi kullanılır.
- Tablo, durum ve aksiyonlar aynı hizada kalır; dekoratif süreç illüstrasyonları kullanılmaz.

## Kullanım ilkeleri

1. İlk ekranda kullanıcının sonraki işi görünür olmalı.
2. Bir sınır veya numara yalnızca veri hiyerarşisini açıklıyorsa kullanılmalı.
3. Butonlar sonucu adlandırmalı: “Satış siparişi”, “Finans işlemlerini aç”, “Cüzdan bağla”.
4. Yükleme, hata ve boş durumlar işlem yapmaya yönlendirmeli; pazarlama dili kullanmamalı.
5. Koyu temada bilgi hiyerarşisi ve durum renklerinin anlamı değişmemeli.

## Araştırma ve uygulanan rehberler

- [Anthropic frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): tekrarlanan SaaS kart kalıpları, dekoratif etiketler ve varsayılan hero yaklaşımından kaçınma.
- [frontend-design-codex](https://github.com/dachent/skills/blob/main/frontend-design-codex/SKILL.md): ilk ekranı ana iş akışına göre kurma ve masaüstü/mobil ekran görüntüsüyle doğrulama.
- [Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette): marka, nötr ve semantik renk rollerini ayırma.
- [Atlassian Design color](https://atlassian.design/foundations/color-new/): bilgi, başarı, uyarı ve tehlike renklerini marka renginden bağımsız tutma.

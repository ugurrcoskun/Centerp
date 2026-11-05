# Ürün kapsamı ve Türkiye için üretime geçiş sınırı

Son inceleme: 5 Kasım 2026. Durum: Testnet prototipi; hukuki uygunluk onayı verilmiş bir üretim hizmeti değildir.

Centerp'in ana ürünü ERP kayıtları ve mutabakattır. Türkiye için değerlendirilecek ürün konumlandırması **TL anchor çıkışı ve ERP mutabakatı**dır. Bu bir üretim taahhüdü veya yalnızca para birimini değiştirerek sağlanan bir mevzuat istisnası değildir.

## Mevcut demo

ERP iş kaydı → cüzdan imzası → Testnet USDC/escrow → doğrulanmış işlem → yönetim defteri.

Harici TR Mock Anchor, TRY banka hareketlerini simüle eder. Gerçek TL, banka havalesi ve Mainnet varlıkları kullanılmaz. Tedarikçi ve çalışan ödeme ekranları da Testnet gösterimleridir; Türkiye'de kripto ile mal/hizmet veya ücret ödeme teklifi değildir. Yönetim defteri yasal muhasebe, bordro veya e-fatura yerine geçmez.

## Değerlendirilecek üretim akışı

İşletmenin varlık dönüşümü talebi → uygun yetkilere sahip dış hizmet sağlayıcısında dönüşüm → işletmenin banka hesabına TL çıkışı → banka/sağlayıcı kanıtının ERP ile mutabakatı.

Bu akış henüz entegre edilmiş değildir. Fatura ödemesi ile varlık dönüşümü arasındaki ekonomik ilişki, tarafların ülkeleri, transferlerin amacı ve sağlayıcıların yetkileri uzman tarafından değerlendirilecektir. Aynı fatura ödemesini USDC üzerinden dolaştırıp sonunda TL'ye çevirmek kendiliğinden uygun kabul edilmez.

| Taraf | Mevcut görev / üretimde açıklığa kavuşacak konu |
| --- | --- |
| Centerp | ERP kayıtlarını ve doğrulanan kanıtları ilişkilendirir; kullanıcı özel anahtarını almaz. Üretimde faaliyet ve sorumluluk kapsamı ayrıca değerlendirilecek. |
| İşletme ve kullanıcı | İş kayıtları, imzalı yetkilendirme ve alıcı bilgilerinden sorumlu. Çok kullanıcılı erişim ile zincir imzası farklı yetkilerdir. |
| Escrow kontratı | Testnet token bakiyesini kontrat kurallarına göre tutar. Cüzdan anahtarının uygulamada olmaması, escrow'da fon tutulmadığı anlamına gelmez. |
| Dış anchor / hizmet sağlayıcısı | Demo sağlayıcısı gerçek banka hizmeti sunmaz. Üretimde lisans/faaliyet kapsamı, KYC/AML, saklama, dönüşüm, banka çıkışı ve itiraz sorumlulukları sözleşmeyle netleşmeli. |
| Banka / ödeme hizmeti tarafı | TL hareketinin gerçekleştiğine ilişkin kanıt ve izin verilen fon akışı sağlanmalı; hangi kuruluşun hangi aktarımı yapabileceği incelenmeli. |

## Üretime geçişte açık işler

- Gerçek fon akışının ve Türkiye'deki kullanım amacının yazılı hukuki değerlendirmesi. Sorumlu: proje sahibi ve görevlendireceği Türkiye mevzuatı uzmanı.
- Anchor ve banka/ödeme tarafının güncel yetki durumunun doğrulanması; ücretler, saklama, KYC/AML ve başarısız transfer/iade sorumlulukları. Sorumlu: proje sahibi ve seçilen sağlayıcı.
- Veri koruma, ticari kayıt, vergi/muhasebe ve sözleşme yükümlülüklerinin değerlendirilmesi. Sorumlu: ilgili hukuk/mali müşavirlik uzmanları.
- Gerçek TL çıkışı ve kanıt mutabakatının uygulanması; demo verisinin üretim verisi gibi sunulmaması. Sorumlu: geliştirme ekibi; önceki değerlendirmelere bağlı.

Bu işler tamamlanmadan bu prototip Türkiye'de gerçek para ile ödeme hizmeti olarak açılmayacaktır. Teknik değişiklikler hukuki değerlendirme kutusunu kapatmaz.

## Birincil kaynaklar

TCMB'nin [Ödemelerde Kripto Varlıkların Kullanılmamasına Dair Yönetmelik](https://www.resmigazete.gov.tr/eskiler/2021/04/20210416-4.htm) madde 3–4 hükümleri doğrudan/dolaylı kullanım ve hizmet modellerini kapsar. Güncel düzenleme listesi için [TCMB Ödeme Hizmetleri](https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB%20TR/Main%20Menu/Temel%20Faaliyetler/Odeme%20Hizmetleri) sayfası kullanılmalıdır. Yukarıdaki üretim sınırı bu kaynaklardan çıkarılan ihtiyatlı ürün kararıdır; somut model için hukuki görüş yerine geçmez.

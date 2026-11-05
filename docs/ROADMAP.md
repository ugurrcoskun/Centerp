# Centerp yol haritası

Güncelleme: 5 Kasım 2026. Takip: [geri bildirim planı](FEEDBACK_ACTION_PLAN.md). Aşağıdaki süreler geliştirme tahminidir; dış onay ve Mainnet tarihi taahhüdü değildir.

| Aşama | Hedef aralık | Sorumlu | Teslim / geçiş kriteri |
| --- | --- | --- | --- |
| Güvenli Testnet sürümü | Mevcut düzeltme çalışması | Geliştirme ekibi | Süreli escrow ve itiraz, kalıcı auth anahtarı, şirket üyeliği/roller, test CI, lisans; açık dış bağımlılıkların kaydı |
| Sürüm kanıtı | Kaynak sürümü yayınlandıktan sonra 1 hafta | Repo sahibi + geliştirme ekibi | CI yeşil, WASM/kaynak doğrulama kanıtı, doğru kontrat adresi, yeni uçtan uca testler; eski fonların envanteri |
| Kullanıcı pilotu | Güvenli Testnet sonrası 2–4 hafta | Ürün sahibi | En az iki işletme temsilcisiyle görev bazlı test; itiraz, teslim etmeme ve rol iptalinin denenmesi; bulguların kapanması |
| Türkiye üretim modelinin değerlendirilmesi | Pilotla paralel; süre dış taraflara bağlı | Ürün sahibi + hukuk/mali müşavirlik + sağlayıcı | TL çıkışı/mutabakat fon akışı için yazılı değerlendirme, sağlayıcı yetki/sözleşmeleri ve gerçek TL çıkışının entegrasyon tasarımı |
| Üretim hazırlığı | Önceki kapılar geçildikten sonra 4–8 hafta tahmini | Geliştirme/operasyon ve bağımsız incelemeci | Güvenlik incelemesi; anahtar kurtarma/rotasyon, worker izleme/uyarı, KYC/veri sorumlulukları, destek ve itiraz hizmeti; kapasite testleri |
| Koşullu Mainnet pilotu | Tarih belirlenmedi | Ürün sahibi | Yukarıdaki kapılar, limitli pilot bütçesi ve geri dönüş planı kabul edilmiş; üretim anahtarları ve gerçek sağlayıcı ayrı yapılandırılmış |

## Bir sonraki somut hedef

Kaynak doğrulanmış Testnet sürümünü, test sonuçlarını ve kullanıcı pilotu senaryolarını tek sürüm paketi olarak hazırlamak. Kodun yerelde geçmesi, GitHub CI veya explorer doğrulaması tamamlandı demek değildir. Canlı durum [takip dosyasında](FEEDBACK_ACTION_PLAN.md) tutulur.

## Instaward / SCF adımı

İlk başvuru önerisi, hakem/worker operasyonu ve pilot kanıtlarını tamamlayan sınırları belirli bir **Instaward sprinti**dir. Resmi kurallar yerel Ambassador Chapter üzerinden değerlendirmeyi ve en fazla 30 günlük somut teslim kapsamını tarif ediyor. Önceki çalışmaların devamına ilişkin uygunluk ayrıca teyit edilecek. Başvuru gönderimi ve fon kararı henüz yoktur. Kaynak: [Instawards resmi kuralları](https://stellar.gitbook.io/scf-handbook/scf-awards/instawards/official-rules).

Hazırlanacak paket: demo bağlantısı, açık kaynak repo/lisans, kontrat doğrulama ve test kanıtları, kullanıcı bulguları, ölçülebilir sprint çıktıları, iş kalemi bazlı bütçe ve ekip bilgisi. Ürün sahibi gerçek ekip ve bütçe bilgilerini tamamlayacak; geliştirme ekibi teknik kanıtları hazırlayacak. Sonraki adım bu paketle Chapter uygunluğunu ve başvuru kanalını doğrulamaktır; bu çalışma kapsamında kimseye mesaj gönderilmez.

Pilot doğrulaması ve güvenlik/operasyon kapsamı netleştiğinde SCF Build için daha geniş teslim planı değerlendirilebilir. Programın güncel seçenekleri için [resmi SCF sitesi](https://communityfund.stellar.org/) kullanılmalı; tur tarihleri ve finansman varsayımları başvurudan önce yeniden kontrol edilmelidir.

## Mainnet'e geçiş kapıları

- Süre sonu sonuçlandırma ve açık itirazın nihai çözümü bağımsız incelemeden geçti.
- Hakem hizmetinin kim tarafından, hangi kurallarla ve hangi yanıt süresiyle verileceği taraflara açık.
- Worker anahtarı/fon bakiyesi, zamanlayıcı, TTL bakımı, gecikme ve başarısızlık uyarıları operasyon ortamında doğrulandı.
- Auth anahtarı ve şirket cüzdanı için ayrı saklama, kurtarma ve rotasyon süreçleri var; rol sistemi bir cüzdan imzasının yerini tutmuyor.
- Eski kontrat fonları ve yeni kontrat adresine geçiş kayıtlı; eski kanıtlar yeni sürüme aitmiş gibi sunulmuyor.
- [Hukuki kapsam](LEGAL_SCOPE.md) belgesindeki dış değerlendirmeler ve gerçek anchor/banka ilişkisi tamamlandı.
- Gerçek TL çıkışının kanıtları, muhasebe kapsamı, destek, izleme ve veri koruma sorumlulukları doğrulandı.

Mainnet fonları bu geliştirme çalışmasının kapsamında kullanılmaz.

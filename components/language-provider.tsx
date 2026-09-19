'use client';

import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {usePathname} from 'next/navigation';

type Language = 'en' | 'tr';
const storageKey = 'centerp_language';

// Turkish is the canonical product copy. Longest-first phrase replacement also
// handles dynamic labels while code, wallet addresses and transaction hashes are skipped.
const pairs: [string, string][] = [
  ['Ana içeriğe geç', 'Skip to content'], ['Centerp ana sayfa', 'Centerp home'],
  ['Stellar ile çalışan ERP', 'ERP powered by Stellar'], ['İşletmenin merkezi.', 'The centre of your business.'], ['Ödemenin kanıtı.', 'Proof of every payment.'],
  ['Centerp, günlük operasyon kayıtlarını fatura, USDC ödeme ve zincir üstü mutabakatla aynı iş akışında birleştirir.', 'Centerp brings daily operations, invoices, USDC payments and on-chain reconciliation into one workflow.'],
  ['Çalışma alanını aç', 'Open workspace'], ['ERP’yi deneyimle', 'Explore ERP'], ['Akışı incele', 'Explore the flow'],
  ['Nasıl çalışır?', 'How it works'], ['Stellar altyapısı', 'Stellar infrastructure'], ['Ürün özellikleri', 'Product features'],
  ['Tek kayıt,', 'One record,'], ['baştan sona izlenebilir.', 'traceable end to end.'],
  ['ERP operasyonu ile ödeme altyapısı ayrı ekranlar olsa da aynı kaynağı paylaşır. Böylece sipariş, fatura ve tahsilat arasında kopukluk oluşmaz.', 'ERP operations and payment infrastructure share one source of truth, even across separate screens. Orders, invoices and collections stay connected.'],
  ['Satış, satın alma, stok, üretim ve çalışan kayıtları aynı iş zincirinde ilerler.', 'Sales, purchasing, inventory, production and employee records move through one workflow.'],
  ['Siparişten oluşan fatura; alıcı, tutar, vade ve teslim koşulunu birlikte taşır.', 'An invoice created from an order carries the buyer, amount, due date and delivery terms together.'],
  ['Freighter imzası ve USDC escrow ile ödeme, teslim onayına kadar güvenle bekler.', 'A Freighter signature and USDC escrow keep funds secure until delivery approval.'],
  ['Doğrulanmış zincir işlemi ilgili ERP kaydına ve yönetim muhasebesi defterine bağlanır.', 'The verified on-chain transaction is linked to its ERP record and management ledger.'],
  ['Bir satışın', 'A sale’s'], ['Centerp yolculuğu.', 'Centerp journey.'],
  ['Operasyon tamamlanmadan para serbest kalmaz; ödeme tamamlanınca kanıt ilgili kayda döner.', 'Funds are not released before operations are complete; once paid, the proof returns to the related record.'],
  ['İş kaydını oluştur', 'Create the business record'], ['Faturayı Stellar’a taşı', 'Move the invoice to Stellar'], ['USDC’yi escrow’da koru', 'Protect USDC in escrow'], ['Teslim et ve mutabık kal', 'Deliver and reconcile'],
  ['Müşteri, ürün ve satış siparişi tek çalışma alanında oluşur.', 'Customer, product and sales order are created in one workspace.'],
  ['Tutar ve cüzdan bilgisi yeniden yazılmadan finans modülüne geçer.', 'Amount and wallet details move to finance without re-entry.'],
  ['Ödeme Soroban sözleşmesine aktarılır; teslim gerçekleşene kadar bekler.', 'Payment moves to the Soroban contract and waits until delivery.'],
  ['Alıcı onayı parayı serbest bırakır, işlem kanıtı ERP defterine işlenir.', 'Buyer approval releases funds and records the proof in the ERP ledger.'],
  ['Ödeme, ERP’nin dışında kalan bir ayrıntı değil.', 'Payment is not an afterthought outside your ERP.'],
  ['Centerp, Türkiye’ye özel Anchor akışını, USDC bakiyesini ve Soroban escrow durumunu işletmenin gerçek kayıtlarıyla ilişkilendirir.', 'Centerp connects the Türkiye-specific Anchor flow, USDC balances and Soroban escrow status to real business records.'],
  ['Finans modülünü incele', 'Explore finance'], ['Koşullu ödeme', 'Conditional payment'], ['İşlem kanıtı', 'Transaction proof'], ['Kurulum gerektirmez', 'No setup required'], ['Testnet prototipi', 'Testnet prototype'],
  ['Operasyonu kaydet.', 'Record operations.'], ['Ödemeyi doğrula.', 'Verify payments.'], ['Centerp’i aç', 'Open Centerp'],
  ['Operasyon', 'Operations'], ['Fatura', 'Invoice'], ['Stellar ödeme', 'Stellar payment'], ['Mutabakat', 'Reconciliation'],
  ['Atlas Tasarım', 'Atlas Design'], ['Atlas Makine', 'Atlas Machinery'], ['Kuzey Tedarik', 'North Supply'], ['Akıllı sensör', 'Smart sensor'], ['Sensör modülü', 'Sensor module'], ['Alüminyum gövde', 'Aluminium housing'], ['Demo Çalışan', 'Demo Employee'],
  ['Ana navigasyon', 'Main navigation'], ['Centerp operasyon ve ödeme akışı illüstrasyonu', 'Centerp operations and payment flow illustration'],
  ['Kullanılan Stellar standartları', 'Stellar standards used'], ['Operasyon modülünü aç', 'Open Operations module'], ['Fatura modülünü aç', 'Open Invoice module'], ['Stellar ödeme modülünü aç', 'Open Stellar payment module'], ['Mutabakat modülünü aç', 'Open Reconciliation module'], ['Modülü aç', 'Open module'],
  ['Satış siparişi', 'Sales order'], ['FATURALANDI', 'INVOICED'], ['ESCROW BAKİYESİ', 'ESCROW BALANCE'],
  ['Zincir üzerinde doğrulandı', 'Verified on-chain'], ['STELLAR KATMANI', 'STELLAR LAYER'],
  ['Mock Anchor ile yatırma ve çekme akışı', 'Deposit and withdrawal flow via Mock Anchor'],
  ['Teslim onayına bağlı Soroban escrow', 'Soroban escrow tied to delivery approval'],
  ['Hash, fatura ve defter kaydı aynı yerde', 'Hash, invoice and ledger record in one place'],
  ['Finans hareketi operasyon kaydına geri döner', 'Finance activity returns to the operations record'],
  ['Centerp çalışma alanında örnek şirket verileriyle uçtan uca akışı deneyimle.', 'Experience the end-to-end flow with sample company data in the Centerp workspace.'],
  ['36 SAATLİK MVP · STELLAR TESTNET', '36-HOUR MVP · STELLAR TESTNET'],
  ['Kurumsal kaynak planlama ile doğrulanabilir ödemeyi bir araya getirir.', 'Brings enterprise resource planning and verifiable payments together.'],
  ['Örnek verileri tamamla', 'Complete sample data'], ['Örnek işletme kayıtlarını yükle', 'Load sample business records'], ['Örnek veriyi yükle', 'Load sample data'],
  ['kaydını sil', 'delete record'],
  ['Müşteri, tedarikçi, çalışan, ürün, sipariş, satın alma ve üretim örnekleri eklenir. Gerçek ödeme verisi eklenmez.', 'Adds sample customers, vendors, employees, products, orders, purchases and production records. No real payment data is added.'],
  ['Nova Perakende', 'Nova Retail'], ['Marmara Teknoloji', 'Marmara Technology'], ['Eksen Elektronik', 'Eksen Electronics'], ['Anadolu Ambalaj', 'Anatolia Packaging'],
  ['Bağlantı kiti', 'Connectivity kit'], ['Ambalaj seti', 'Packaging set'], ['Endüstriyel ağ geçidi', 'Industrial gateway'], ['İzleme başlangıç paketi', 'Monitoring starter kit'],
  ['Operasyon yöneticisi', 'Operations manager'], ['Üretim sorumlusu', 'Production supervisor'], ['Kurumsal satış uzmanı', 'Enterprise sales specialist'], ['Finans uzmanı', 'Finance specialist'], ['Depo ve sevkiyat uzmanı', 'Warehouse and shipping specialist'],

  ['Kurumsal kaynak planlama', 'Enterprise resource planning'], ['Şirket çalışma alanı', 'Company workspace'], ['Testnet çalışma alanı', 'Testnet workspace'], ['Çalışma alanı', 'Workspace'], ['çalışma alanı', 'workspace'],
  ['İşletme', 'Business'], ['Ödemeler & mutabakat', 'Payments & reconciliation'], ['İşletme süreçleri & Stellar finansı', 'Business operations & Stellar finance'],
  ['Müşteri & tedarikçi', 'Customers & vendors'], ['Satış yönetimi', 'Sales management'], ['Satın alma', 'Purchasing'], ['Stok & depo', 'Inventory & warehouse'], ['Üretim', 'Production'], ['İnsan kaynakları', 'Human resources'], ['Muhasebe & finans', 'Accounting & finance'], ['Şirket profili', 'Company profile'],
  ['Operasyon merkezi', 'Operations centre'], ['İlişkilerin, bir arada', 'Relationships, connected'], ['Siparişten tahsilata', 'From order to collection'], ['Tedarikten ödemeye', 'From procurement to payment'], ['Stoktan sevkiyata', 'From inventory to shipment'], ['Üretimin, kontrol altında', 'Production, under control'], ['Ekibin ve ödeme planı', 'Your team and payment plan'], ['Her kayıt birbirine bağlı', 'Every record is connected'], ['Şirketinin çalışma alanı', 'Your company workspace'],
  ['Bugünün açık işlerini, stok risklerini ve ödeme durumunu tek çalışma ekranından yönet.', 'Manage today’s open work, inventory risks and payment status from one workspace.'],
  ['Müşteri ve tedarikçi bilgilerini siparişlerine ve Stellar ödemelerine bağla.', 'Connect customer and vendor details to orders and Stellar payments.'],
  ['Ürün kalemlerinden sipariş oluştur, faturala, sevk et ve tahsilatı izle.', 'Create orders from product lines, invoice, ship and track collections.'],
  ['Mal kabulü stoğu artırır ve aynı kayıttan tedarikçi borcu oluşturur.', 'Receiving increases inventory and creates a vendor liability from the same record.'],
  ['Depodaki her giriş, üretim tüketimi ve sevkiyatın bir kaynağı var.', 'Every receipt, production consumption and shipment has a traceable source.'],
  ['İş emrindeki girdileri tüket, ürettiğin ürünleri stoğa ekle.', 'Consume work-order inputs and add finished products to inventory.'],
  ['Çalışan kayıtlarından dönemlik USDC ödeme yükümlülükleri oluştur.', 'Create periodic USDC payment liabilities from employee records.'],
  ['Operasyon kayıtları ile doğrulanmış Stellar işlemleri aynı defterde.', 'Operational records and verified Stellar transactions share one ledger.'],
  ['İşletme bilgilerini ve finans için kullanacağın Stellar cüzdanını yönet.', 'Manage business details and the Stellar wallet used for finance.'],
  ['ERP kayıtlarından hesaplanır', 'Calculated from ERP records'], ['ERP · YENİ İŞ KAYDI', 'ERP · NEW BUSINESS RECORD'],
  ['İş ortağı kaydı', 'Business partner record'], ['Ürün ve açılış stoku', 'Product and opening inventory'], ['Yeni satış siparişi', 'New sales order'], ['Yeni satın alma siparişi', 'New purchase order'], ['Çalışan kaydı', 'Employee record'], ['Yeni üretim iş emri', 'New production work order'],
  ['İş ortağı', 'Business partner'], ['müşteri', 'customer'], ['tedarikçi', 'vendor'], ['ürünü', 'product'], ['miktarı', 'quantity'], ['birim fiyatı', 'unit price'],
  ['İş ortağı adı', 'Business partner name'], ['E-posta', 'Email'], ['Stellar faturası veya USDC ödeme için gerekli. Secret key girilmez.', 'Required for a Stellar invoice or USDC payment. Never enter a secret key.'],
  ['Ürün türü', 'Product type'], ['Mamul / satış ürünü', 'Finished / sales product'], ['Ürün adı', 'Product name'], ['Açılış stok miktarı', 'Opening inventory quantity'], ['Yeniden sipariş seviyesi', 'Reorder level'], ['Birim referans fiyatı (USDC)', 'Reference unit price (USDC)'],
  ['Önce müşteri ve ürün kayıtlarını ekle.', 'Add customer and product records first.'], ['Önce tedarikçi ve ürün kayıtlarını ekle.', 'Add vendor and product records first.'],
  ['İş ortağı seç', 'Select business partner'], ['Sipariş kalemleri', 'Order items'], ['Birim tutarlar USDC', 'Unit amounts in USDC'], ['Ürün seç', 'Select product'], ['Adet', 'Units'], ['Birim USDC', 'Unit price (USDC)'], ['Kalem ekle', 'Add line item'], ['Sipariş toplamı', 'Order total'], ['Kaydı oluştur', 'Create record'],
  ['Çalışanın adı', 'Employee name'], ['Aylık ödeme planı (USDC)', 'Monthly payment plan (USDC)'], ['Dönemlik ödeme referansıdır; bordro, vergi veya yan hak hesabı yapılmaz.', 'This is a periodic payment reference; payroll, tax and benefits are not calculated.'],
  ['Çalışan Stellar public key’i', 'Employee Stellar public key'], ['Ödeme planı için isteğe bağlı; USDC transferi için gerekli.', 'Optional for the payment plan; required for a USDC transfer.'],
  ['En az bir girdi ve farklı bir çıktı ürünü ekle.', 'Add at least one input and a different output product.'], ['Çıktı ürünü', 'Output product'], ['Mamul seç', 'Select finished product'], ['Üretilecek adet', 'Units to produce'],
  ['Bir ürün için girdi reçetesi', 'Input recipe per unit'], ['Toplam tüketim = miktar × üretim adedi', 'Total consumption = quantity × production units'], ['Girdi ürünü', 'Input product'], ['Girdi seç', 'Select input'], ['Bir ürün için adet', 'Units per product'], ['Girdi ekle', 'Add input'],
  ['İş emri planlanırken stok değişmez. Tamamlanırken bütün girdiler kontrol edilir; stok yetersizse hiçbir hareket yapılmaz.', 'Inventory does not change when a work order is planned. All inputs are checked on completion; if inventory is insufficient, no movement is recorded.'],
  ['Örnek operasyon kayıtları eklendi. Stellar ödeme veya tahsilat verisi üretilmedi.', 'Sample operations records were added. No Stellar payment or collection data was created.'],
  ['İş kaydı güncellendi; bağlı modüller aynı veriyi kullanıyor.', 'Business record updated; connected modules use the same data.'],
  ['Kayıt tamamlanamadı.', 'The record could not be completed.'],
  ['USDC cüzdanı', 'USDC wallet'], ['Stellar tahsilatı', 'Stellar collection'], ['İş ortağı ekle', 'Add business partner'],
  ['Satın alma siparişi', 'Purchase order'], ['Ürün ekle', 'Add product'], ['İş emri oluştur', 'Create work order'], ['Çalışan ekle', 'Add employee'],
  ['ERP modülleri', 'ERP modules'], ['Stellar finansı aç', 'Open Stellar finance'], ['Kayıtları yenile', 'Refresh records'],
  ['İş kayıtları ve modüller güncelleniyor.', 'Updating business records and modules.'], ['Şirket çalışma alanı açılıyor…', 'Opening company workspace…'], ['Yeniden dene', 'Try again'],
  ['Örnek operasyon çalışma alanı · Örnek kayıtlar gerçek şirket veya ödeme verisi değildir.', 'Sample operations workspace · Sample records are not real company or payment data.'],
  ['Açık satış', 'Open sales'], ['Ödenecek', 'Payables'], ['Kritik stok', 'Critical inventory'], ['Testnet tahsilatı', 'Testnet collections'],
  ['İş kuyruğu', 'Work queue'], ['Bugün müdahale gerektiren kayıtlar.', 'Records requiring attention today.'], ['Satış ve sevkiyat', 'Sales and shipping'], ['Tedarik ve borçlar', 'Procurement and liabilities'], ['Üretim planı', 'Production plan'], ['Stok kontrolü', 'Inventory control'],
  ['mal kabulü', 'goods receipts'], ['iş emri üretime alınmayı bekliyor', 'work orders waiting to start'], ['açık sipariş', 'open orders'], ['örnek', 'sample'],
  ['Stellar mutabakatı', 'Stellar reconciliation'], ['Doğrulanmış tahsilat', 'Verified collections'], ['Şirket cüzdanı', 'Company wallet'], ['Açık ödeme yükü', 'Open payment liability'], ['Finans işlemlerini aç', 'Open finance operations'],
  ['Operasyon hattı', 'Operations pipeline'], ['Satın almadan tahsilata kadar aynı kayıt zinciri.', 'One record chain from purchasing to collection.'], ['Muhasebe defteri', 'Accounting ledger'], ['Son satış kayıtları', 'Recent sales records'], ['Sipariş, sevkiyat ve tahsilat durumu.', 'Order, shipping and collection status.'], ['Tüm satışlar', 'All sales'],
  ['Örnek işletme kayıtlarını yükle', 'Load sample business records'], ['Müşteri, tedarikçi, ürün ve çalışan örnekleri eklenir. Ödeme verisi eklenmez.', 'Adds sample customers, vendors, products and employees. No payment data is added.'], ['Örnek veriyi yükle', 'Load sample data'],
  ['İş ortakları', 'Business partners'], ['Ad veya e-posta ara', 'Search name or email'], ['İş ortağı ara', 'Search business partners'], ['İŞ ORTAĞI', 'BUSINESS PARTNER'], ['İLETİŞİM', 'CONTACT'], ['STELLAR CÜZDANI', 'STELLAR WALLET'], ['Düzenle', 'Edit'], ['Henüz eklenmedi', 'Not added yet'],
  ['Müşteri ve tedarikçini ekle.', 'Add customers and vendors.'], ['Tek iş ortağı kaydı siparişlerde, faturalarda ve Stellar ödemelerinde kullanılır.', 'One business partner record is used across orders, invoices and Stellar payments.'],
  ['İlk satış kaydını oluştur.', 'Create your first sales record.'], ['Müşteriyi ve ürünleri seç; siparişi aynı kayıttan faturaya bağla.', 'Select the customer and products; link the order to an invoice from the same record.'],
  ['Satış siparişi oluştur', 'Create sales order'], ['Satışın ortak kayıttan başlasın.', 'Start the sale from a shared record.'],
  ['Müşteri, ürün ve miktarları seç. Sipariş toplamı otomatik hesaplansın.', 'Select the customer, products and quantities. The order total is calculated automatically.'],
  ['Tedarik sürecini kayda al.', 'Record the procurement process.'], ['Tedarikçini ve ürünleri seç. Mal geldiğinde stoğa kabul ederek ödeme yükümlülüğü oluştur.', 'Select the vendor and products. Receive goods into inventory and create a payment liability when they arrive.'],
  ['Depodaki her ürünün bir kimliği olsun.', 'Give every warehouse product an identity.'], ['SKU, ürün türü, açılış stoğu ve birim referans fiyatını kaydet.', 'Record the SKU, product type, opening inventory and reference unit price.'],
  ['Stok hareketi henüz yok.', 'No inventory movements yet.'], ['Açılış, mal kabulü, üretim ve sevkiyat burada izlenir.', 'Opening inventory, receiving, production and shipping are tracked here.'],
  ['Üretim stoğunla birlikte çalışsın.', 'Make production work with your inventory.'], ['Çıktı ürününü, üretim miktarını ve bir ürün için gereken girdileri tanımla.', 'Define the output product, production quantity and inputs needed per unit.'],
  ['Ekibinin ortak kaydını oluştur.', 'Create a shared record for your team.'], ['Çalışan kayıtları dönemlik ödeme planını ve Stellar alıcı cüzdanını besler.', 'Employee records feed the periodic payment plan and Stellar recipient wallet.'],
  ['Çalışan ödeme dönemi', 'Employee payment period'], ['Dönemlik ödeme kaydı henüz yok.', 'No periodic payment record yet.'], ['Çalışanlarını ekleyip ödeme dönemi için plan oluştur.', 'Add employees and create a plan for the payment period.'],
  ['Mal kabulünden oluşan yükümlülükler', 'Liabilities created from goods receipts'], ['Dönemlik ödeme planından oluşur', 'Created from the periodic payment plan'],
  ['Escrow’dan şirkete geçen USDC', 'USDC released from escrow to the company'], ['Operasyon ve finans aynı defterde.', 'Operations and finance in the same ledger.'],
  ['Mal kabulü, çalışan ödeme planı ve doğrulanmış Stellar fatura işlemleri kayıt oluşturur.', 'Goods receipts, employee payment plans and verified Stellar invoice transactions create ledger entries.'],
  ['Bildirimi kapat', 'Dismiss notification'], ['Şirket veya kişi adı', 'Company or person name'], ['Ürün veya malzeme adı', 'Product or material name'],
  ['Bu toplam ve müşteri cüzdanı Stellar faturası oluşturulurken kontrol edilir. Sipariş oluşturmak ödeme yapmaz.', 'This total and customer wallet are checked when creating the Stellar invoice. Creating an order does not make a payment.'],
  ['Mal kabulü yapıldığında stok artar, tedarikçi borcu oluşur. Para transferi ayrıca Stellar finans modülünden imzalanır.', 'Receiving goods increases inventory and creates a vendor liability. The transfer is signed separately in the Stellar finance module.'],
  ['Üretim sorumlusu', 'Production owner'], ['birim miktarı', 'quantity per unit'], ['güncelle', 'update'],
  ['Satış siparişleri', 'Sales orders'], ['Faturalanan tutar sipariş kalemlerinden gelir. Sevkiyat ile tahsilat ayrı izlenir.', 'The invoiced amount comes from order lines. Shipping and collection are tracked separately.'], ['FİNANS / SEVKİYAT', 'FINANCE / SHIPPING'], ['Sevk edildi', 'Shipped'], ['Sevkiyat bekliyor', 'Awaiting shipment'], ['Stellar ile faturala', 'Invoice with Stellar'], ['Faturayı aç', 'Open invoice'], ['Sevk et', 'Ship'],
  ['SİPARİŞ / MÜŞTERİ', 'ORDER / CUSTOMER'], ['ÜRÜNLER', 'PRODUCTS'],
  ['Satın alma & mal kabulü', 'Purchasing & receiving'], ['Mal kabulü stok girişini ve tedarikçi borcunu birlikte kaydeder.', 'Receiving records inventory and vendor liability together.'], ['SİPARİŞ / TEDARİKÇİ', 'ORDER / VENDOR'], ['Mal kabulü yap', 'Receive goods'], ['Ödeme kaydını aç', 'Open payment record'],
  ['Ürünler & mevcut stok', 'Products & current inventory'], ['Satın alma, üretim ve satış aynı ürün kaydını günceller.', 'Purchasing, production and sales update the same product record.'], ['kritik stok', 'critical inventory'], ['MEVCUT STOK', 'CURRENT INVENTORY'], ['SİPARİŞ SEVİYESİ', 'REORDER LEVEL'], ['BİRİM FİYAT', 'UNIT PRICE'], ['Girdi / hammadde', 'Input / raw material'], ['Mamul', 'Finished good'], ['Stok hareketleri', 'Inventory movements'], ['İşlem kaynağı ile birlikte giriş ve çıkışlar.', 'Receipts and issues with their source record.'],
  ['ÜRÜN / SKU', 'PRODUCT / SKU'], ['ÜRÜN', 'PRODUCT'], ['MİKTAR', 'QUANTITY'], ['TARİH', 'DATE'],
  ['Üretim çıktısı', 'Production output'], ['Üretim tüketimi', 'Production consumption'], ['Satın alma kabulü', 'Purchasing receipt'], ['Örnek açılış stoku', 'Sample opening inventory'], ['Açılış stoku', 'Opening inventory'],
  ['Üretim iş emirleri', 'Production work orders'], ['Reçete girdileri ile mamul çıktısı tek stok işlemi olarak kaydedilir.', 'Recipe inputs and finished output are recorded as one inventory operation.'], ['İŞ EMRİ / ÇIKTI', 'WORK ORDER / OUTPUT'], ['GİRDİ REÇETESİ', 'INPUT RECIPE'], ['Üretimi tamamla', 'Complete production'],
  ['planlanan iş', 'planned work'],
  ['Çalışanlar', 'Employees'], ['Departman, görev ve USDC ödeme planı. Bu prototipte bordro/vergi hesabı yoktur.', 'Department, role and USDC payment plan. Payroll and tax calculations are outside this prototype.'], ['AYLIK ÖDEME PLANI', 'MONTHLY PAYMENT PLAN'], ['Dönemlik çalışan ödemeleri', 'Periodic employee payments'], ['Ödeme planını oluştur', 'Create payment plan'], ['Çalışan ödeme kayıtları', 'Employee payment records'],
  ['ÇALIŞAN', 'EMPLOYEE'], ['DEPARTMAN / GÖREV', 'DEPARTMENT / ROLE'], ['ÇALIŞAN / DÖNEM', 'EMPLOYEE / PERIOD'],
  ['Aynı çalışan için aynı ay ikinci kez ödeme yükümlülüğü oluşturulmaz.', 'A second payment liability cannot be created for the same employee in the same month.'], ['Ödemeyi aç', 'Open payment'],
  ['Açık tedarikçi borçları', 'Open vendor liabilities'], ['Çalışan ödeme borçları', 'Employee payment liabilities'], ['Yönetim muhasebesi defteri', 'Management accounting ledger'], ['Her kayıt eşit tutarda borç/alacak hesabı içerir. Tüm referans tutarlar USDC’dir.', 'Each entry has equal debit and credit amounts. All reference amounts are in USDC.'], ['BORÇ HESABI', 'DEBIT ACCOUNT'], ['ALACAK HESABI', 'CREDIT ACCOUNT'], ['KANIT', 'PROOF'], ['Dengeli', 'Balanced'],
  ['Stellar işlemleri', 'Stellar transactions'], ['KAYNAK / AÇIKLAMA', 'SOURCE / DESCRIPTION'], ['AÇIKLAMA', 'DESCRIPTION'],
  ['Personel giderleri', 'Personnel expenses'], ['Çalışan borçları', 'Employee liabilities'], ['Tedarikçi borçları', 'Vendor liabilities'], ['ERP iş kaydı', 'ERP business record'], ['Toplam borç', 'Total debit'], ['Toplam alacak', 'Total credit'], ['ücret', 'salary'],
  ['Bu defter hackathon için basit yönetim muhasebesi kaydıdır. GİB e-Fatura, vergi, kur farkı, stok maliyetlendirme veya yasal muhasebe entegrasyonu içermez.', 'This is a simple management accounting ledger for the hackathon. It does not include Turkish Revenue Administration e-Invoice, tax, exchange differences, inventory costing or statutory accounting integration.'], ['Stok', 'Inventory'], ['stok', 'inventory'],
  ['Şirket bilgileri', 'Company details'], ['Tüm ERP modülleri bu çalışma alanını paylaşır.', 'All ERP modules share this workspace.'], ['Şirket adı', 'Company name'], ['Şirket bilgilerini kaydet', 'Save company details'], ['Şirketin Stellar cüzdanı', 'Company Stellar wallet'], ['Ödeme yetkisi Freighter imzasıyla doğrulanır.', 'Payment authority is verified with a Freighter signature.'], ['Henüz cüzdan eşleştirilmedi.', 'No wallet linked yet.'], ['Finans hesabını aç', 'Open finance account'],
  ['Bu yerel prototipte şirket çalışma alanı tarayıcının güvenli oturumuyla saklanır. Çok kullanıcılı yetki yönetimi sonraki aşamadır.', 'In this local prototype, the company workspace is stored with the browser’s secure session. Multi-user permissions are a later-stage feature.'],
  ['Bağlı · Testnet', 'Connected · Testnet'], ['Satış faturaları, tedarikçi ve çalışan ödemeleri bu cüzdana bağlıdır.', 'Sales invoices and vendor and employee payments are linked to this wallet.'],
  ['Finans modülünde cüzdanını bağla ve şirket cüzdanı olarak eşleştir.', 'Connect your wallet in the finance module and link it as the company wallet.'], ['Bağlı cüzdanı şirketle eşleştir', 'Link connected wallet to company'],

  ['Finans ve mutabakat', 'Finance and reconciliation'], ['ERP çalışma alanına dön', 'Return to ERP workspace'], ['Genel bakış', 'Overview'], ['Faturalar', 'Invoices'], ['Ödemeler & escrow', 'Payments & escrow'], ['Ağ & bağlantılar', 'Network & connections'], ['Başlangıç rehberi', 'Getting started'],
  ['Finans', 'Finance'], ['Ana menü', 'Main navigation'], ['Tahsilat para birimi', 'Collection currency'],
  ['Finans operasyonları', 'Finance operations'], ['Fatura, escrow ve Anchor hareketlerini aynı kayıttan yönet.', 'Manage invoices, escrow and Anchor activity from one record.'], ['Yeni fatura', 'New invoice'], ['Varsayılan tahsilat yolu', 'Default collection route'],
  ['Yeni fatura oluştur', 'Create a new invoice'], ['YENİ BİR ÖDEME AKIŞI', 'A NEW PAYMENT FLOW'], ['Faturayı oluştur', 'Create invoice'],
  ['Satıcı sensin. Müşterinin cüzdanını ve fatura bilgilerini ekle; tutar USDC olarak sabitlensin.', 'You are the merchant. Add the customer wallet and invoice details; the amount will be fixed in USDC.'],
  ['Müşteri adı', 'Customer name'], ['Müşteri Stellar public key’i', 'Customer Stellar public key'], ['Ödemeyi yapacak ve teslimatı onaylayacak cüzdan.', 'The wallet that will pay and approve delivery.'], ['Fatura tutarı', 'Invoice amount'],
  ['Fatura kaydı satıcı cüzdanınla imzalanır. Müşteri ödedikten sonra tutar teslim onayına kadar escrow’da kalır.', 'The invoice record is signed with your merchant wallet. After the customer pays, funds remain in escrow until delivery approval.'],
  ['Önce cüzdan bağla', 'Connect wallet first'],
  ['Fatura taslak olarak kaydedildi. Escrow deployment’ından sonra zincire kaydedebilirsiniz.', 'Invoice saved as a draft. You can record it on-chain after escrow deployment.'],
  ['Örn. Atlas Tasarım', 'e.g. Atlas Design'], ['Sunulan hizmet veya teslim edilecek ürün', 'Service provided or product to be delivered'],
  ['Oluştur & zincire kaydet', 'Create & record on-chain'], ['Taslak oluştur', 'Create draft'], ['FATURA & MUTABAKAT', 'INVOICE & RECONCILIATION'],
  ['İlk faturadan tahsilata', 'From first invoice to collection'], ['TESTNET DEMO REHBERİ', 'TESTNET DEMO GUIDE'],
  ['Satıcı olarak Freighter’ı Testnet’e alıp cüzdanı bağla. Ağ ekranından XLM ve USDC trustline’ı hazırla.', 'As the merchant, switch Freighter to Testnet and connect your wallet. Prepare XLM and the USDC trustline from the Network screen.'],
  ['İkinci cüzdanın public key’iyle bir fatura oluştur. Oluşturma işlemini imzalayıp zincir kaydını bekle.', 'Create an invoice with the second wallet’s public key. Sign the creation transaction and wait for the on-chain record.'],
  ['Müşteri cüzdanına geç. TRY ↔ USDC ekranında Anchor’a bağlan, kur al ve TRY yatırma işlemi başlat.', 'Switch to the customer wallet. Connect to the Anchor on the TRY ↔ USDC screen, get a quote and start a TRY deposit.'],
  ['Banka transferini simüle et. Anchor tamamlandığında müşteri cüzdanına Testnet USDC gelir.', 'Simulate the bank transfer. When the Anchor completes, Testnet USDC arrives in the customer wallet.'],
  ['Müşteri olarak faturayı açıp escrow’a öde. Teslimatı onaylayınca USDC satıcıya geçer.', 'As the customer, open the invoice and pay into escrow. USDC is released to the merchant when you approve delivery.'],
  ['Satıcı olarak USDC → TRY çekimi başlat. Anchor’ın memo’lu USDC ödeme talimatını imzala ve sonucu takip et.', 'As the merchant, start a USDC → TRY withdrawal. Sign the Anchor’s memo-based USDC payment instruction and track the result.'],
  ['Gerçek TL veya Mainnet token’ı kullanılmaz. Aynı tarayıcıda hesap değiştirirken panelden bağlantıyı kesip yeniden bağlan.', 'No real TRY or Mainnet tokens are used. When switching accounts in the same browser, disconnect from the panel and reconnect.'],
  ['Müşteri TRY ile başlar; TR Mock Anchor bakiyeyi USDC’ye çevirir ve escrow ödemesi Stellar üzerinde tamamlanır.', 'The customer starts with TRY; TR Mock Anchor converts it to USDC and escrow settles on Stellar.'], ['Müşteri mevcut USDC bakiyesiyle doğrudan Stellar escrow’a ödeme yapar. TRY köprüsü yalnızca ihtiyaç halinde kullanılır.', 'The customer pays Stellar escrow directly from an existing USDC balance. The TRY bridge is used only when needed.'], ['Stellar escrow · önerilen', 'Stellar escrow · recommended'], ['Anchor ile USDC’ye dönüştür', 'Convert to USDC via Anchor'],
  ['Açık fatura', 'Open invoices'], ['Tahsilat', 'Collections'], ['Cüzdan', 'Wallet'], ['Fatura defteri', 'Invoice ledger'], ['Son hareketler ve bekleyen aksiyonlar.', 'Recent activity and pending actions.'], ['Tüm faturalar', 'All invoices'], ['İlk faturana bir köprü kur.', 'Create your first payment bridge.'], ['Faturanı oluştur, müşterinle paylaş ve ödeme yolculuğunu buradan takip et.', 'Create and share an invoice, then track its payment journey here.'], ['İlk faturayı oluştur', 'Create first invoice'],
  ['Cüzdan bekleniyor', 'Wallet required'], ['TRY / USDC hattı', 'TRY / USDC rail'], ['Anchor oturumu, kur teklifi ve banka simülasyonu tek işlem kaydında tutulur.', 'Anchor session, quote and bank simulation stay in one transaction record.'], ['Mutabakat sırası', 'Reconciliation sequence'], ['Faturadan tahsilata dört doğrulama noktası.', 'Four verification points from invoice to collection.'], ['Son ağ hareketleri', 'Recent network activity'], ['İmzalanan ve doğrulanan işlemler.', 'Signed and verified transactions.'], ['İşlem defteri', 'Transaction ledger'], ['İlk Stellar işlemi doğrulandığında burada görünecek.', 'Your first verified Stellar transaction will appear here.'],
  ['İmzadan zincir doğrulamasına, tüm Stellar hareketleri.', 'All Stellar activity from signature to chain verification.'],
  ['Escrow’daki para müşterinin teslim onayıyla satıcıya geçer. Satıcı tam iade yapabilir. Teslim tarihinin geçmesi parayı otomatik serbest bırakmaz.', 'Funds in escrow are released to the merchant with customer delivery approval. The merchant can issue a full refund. Passing the delivery date does not release funds automatically.'],
  ['ERP borçları & çalışan ödemeleri', 'ERP liabilities & employee payments'], ['Satın alma kabulü ve personel kayıtlarından oluşan ödeme yükümlülükleri.', 'Payment liabilities created from purchasing receipts and employee records.'], ['ERP kayıtlarını aç', 'Open ERP records'], ['Ödeme için ERP’de kayıtlı şirket cüzdanını bağla.', 'Connect the company wallet registered in ERP to make payments.'],
  ['Her faturanın arkasında izlenebilir bir ödeme akışı.', 'A traceable payment flow behind every invoice.'], ['Paranın nerede olduğunu, zincirin doğruladığı verilerle gör.', 'See where funds are using chain-verified data.'], ['Türk lirasından USDC’ye. USDC’den banka hesabına.', 'From Turkish lira to USDC. From USDC to a bank account.'], ['Testnet altyapısı ve entegrasyonlarının bağlantı durumu.', 'Connection status for Testnet infrastructure and integrations.'],
  ['TRY ödeme yolu', 'TRY payment route'], ['USDC ödeme yolu', 'USDC payment route'], ['TRY ile başlat', 'Start with TRY'],
  ['ERP ÖDEME KAYDI', 'ERP PAYMENT RECORD'], ['TRY tutarı ödeme satırından otomatik getirildi.', 'The TRY amount was brought over from the payment row.'],
  ['Anchor tek seferde en fazla 3.000 TRY kabul eder. İlk dilim hazırlandı; kalan tutar için işlemi yeniden başlatın.', 'Anchor accepts up to 3,000 TRY per transfer. The first instalment is ready; start the next transfer for the remainder.'],
  ['Ödeme kaydı bulunamadı.', 'Payment record was not found.'], [' tutarı Anchor formuna aktarıldı. TRY yatırma sonrası aynı kayda dönüp Stellar ödemesini imzalayın.', ' was added to the Anchor form. After the TRY deposit, return to this record and sign the Stellar payment.'],
  ['Önce TRY yatırma işlemini Anchor üzerinden USDC’ye dönüştürün. Dönüşüm tamamlanınca ödeme kaydına dönerek Stellar ödemesini imzalayın.', 'First convert the TRY deposit to USDC through the Anchor. When conversion is complete, return to the payment record and sign the Stellar payment.'],
  ['Fatura veya müşteri ara', 'Search invoice or customer'], ['Fatura ara', 'Search invoices'], ['Ödeme bekleyen', 'Awaiting payment'], ['Escrow’da', 'In escrow'], ['Tahsil edilen', 'Collected'], ['Aradığın fatura bulunamadı.', 'No matching invoice found.'], ['Arama metnini veya durum filtresini değiştir.', 'Change the search text or status filter.'],
  ['Önce satıcı cüzdanını bağla.', 'Connect the merchant wallet first.'], ['Şirketin cüzdanını bağla veya aşağıdan şirkete eşleştir.', 'Connect the company wallet or link it to the company below.'],
  ['Müşterinin Stellar public key’ini iş ortağı kaydına ekle. Sonra bu siparişi yeniden aç.', 'Add the customer’s Stellar public key to the business partner record, then reopen this order.'],
  ['Sipariş tutarı ve müşteri cüzdanı faturaya otomatik aktarılır.', 'The order amount and customer wallet are copied to the invoice automatically.'],
  ['Çalışan ödemesi', 'Employee payment'], ['Tedarikçi ödemesi', 'Vendor payment'], ['Cüzdan bağlı', 'Wallet connected'], ['TRY / USDC işlemi', 'TRY / USDC transaction'],
  ['Teslim onayı bekliyor', 'Awaiting delivery approval'], ['Başarılı zincir işlemleri', 'Successful on-chain transactions'], ['Testnet tarafından doğrulandı', 'Verified by Testnet'],
  ['Hash üzerinden kontrol edilebilir', 'Verifiable by hash'], ['Doğrulama bekleyen', 'Awaiting verification'], ['Gönderildi, sonuç henüz kesinleşmedi', 'Submitted; the result is not final yet'],
  ['Başarılı sayılmadan önce kontrol edilir', 'Checked before being marked successful'], ['Cüzdan işlemi', 'Wallet transaction'], ['İşlemi doğrula', 'Verify transaction'],
  ['İşlemlerin burada buluşacak.', 'Your transactions will appear here.'], ['Bir faturayı escrow’a ödediğinde zincir üzerindeki hareketleri burada izleyebilirsin.', 'Once you pay an invoice into escrow, you can track its on-chain activity here.'],
  ['Faturaları aç', 'Open invoices'], ['Ağ ve varlık', 'Network and asset'], ['TRY ↔ USDC banka simülasyonu', 'TRY ↔ USDC bank simulation'],
  ['Bağlanılmadı', 'Not connected'], ['Simülasyon / test verisi', 'Simulation / test data'], ['Soroban akıllı sözleşmesi', 'Soroban smart contract'],
  ['Deployment bekliyor', 'Awaiting deployment'], ['Müşteri teslim onayı', 'Customer delivery approval'], ['Satıcının tam iadesi', 'Full merchant refund'],
  ['Cüzdan & kayıtlar', 'Wallet & records'], ['Cüzdan bağlanmadı', 'Wallet not connected'], ['Cüzdan imzası + HttpOnly cookie', 'Wallet signature + HttpOnly cookie'],
  ['Kayıtlar', 'Records'], ['Neon + yerel SQLite', 'Neon + local SQLite'], ['Kalıcı yerel SQLite', 'Persistent local SQLite'], ['Kurulum bekliyor', 'Setup pending'],
  ['Cüzdanına bakiye ekle.', 'Add funds to your wallet.'], ['Tahsilatını TRY’ye çevir.', 'Convert collections to TRY.'], ['Banka transferi simülasyonu ile Testnet USDC al.', 'Receive Testnet USDC through a bank-transfer simulation.'], ['USDC’yi Anchor’a gönder, TRY çıkışını simüle et.', 'Send USDC to the Anchor and simulate a TRY payout.'], ['Yatırılacak tutar', 'Deposit amount'], ['Çekilecek tutar', 'Withdrawal amount'], ['Transfer tutarı', 'Transfer amount'], ['Faturaya bağla', 'Link to invoice'], ['isteğe bağlı', 'optional'], ['Bağımsız cüzdan işlemi', 'Standalone wallet transaction'], ['Alınacak tutar', 'Amount received'], ['Kur geçerlilik süresi', 'Quote expiry'], ['Kilitli kur al', 'Get firm quote'], ['Kuru yenile', 'Refresh quote'], ['Banka talimatı oluştur', 'Create bank instructions'], ['Çekim talimatı oluştur', 'Create withdrawal instructions'],
  ['USDC trustline oluştur', 'Create USDC trustline'],
  ['Simülasyon limiti', 'Simulation limit'], ['Kullanılabilir', 'Available'], ['Testnet hesabın Friendbot ile fonlandı.', 'Your Testnet account was funded with Friendbot.'],
  ['Testnet hesabına işlem ücretleri için XLM eklendi.', 'XLM was added to the Testnet account for transaction fees.'], ['Testnet XLM al', 'Get Testnet XLM'],
  ['Stellar işlem ücreti için yeterli XLM yok. TRY ↔ USDC ekranından Testnet XLM alın ve işlemi tekrar deneyin.', 'There is not enough XLM for the Stellar transaction fee. Get Testnet XLM from the TRY ↔ USDC screen, then try again.'],
  ['Anchor talimatı oluşturuldu. Aşağıdan transferi tamamlayın.', 'Anchor instructions created. Complete the transfer below.'],
  ['Anchor durumlarını yenile', 'Refresh Anchor statuses'], ['Banka transferi simüle edildi. Anchor sonucu kontrol ediliyor.', 'Bank transfer simulated. Checking the Anchor result.'],
  ['Başlattığın TRY yatırma ve USDC çekme işlemleri, banka talimatlarıyla birlikte burada listelenir.', 'Your TRY deposits and USDC withdrawals are listed here with bank instructions.'],
  ['TRY → USDC yatırma', 'TRY → USDC deposit'], ['USDC → TRY çekim', 'USDC → TRY withdrawal'], ['SEP-38 teklifine bağlı', 'Linked to SEP-38 quote'], ['Anchor durum takibi', 'Anchor status tracking'],
  ['YEREL PARA, AÇIK BİR AĞ', 'LOCAL MONEY, AN OPEN NETWORK'], ['Bankayla blokzincir', 'Banking and blockchain'], ['aynı akışta.', 'in one flow.'], ['Cüzdanını doğrula', 'Verify your wallet'], ['Kuru sabitle, talimatı al', 'Lock the rate and get instructions'], ['Transferi tamamla & izle', 'Complete and track the transfer'], ['Anchor işlemleri', 'Anchor transactions'], ['Banka talimatları, kur teklifleri ve transfer durumları.', 'Bank instructions, quotes and transfer statuses.'], ['İlk transferinle köprüyü kur.', 'Create the bridge with your first transfer.'], ['BANKA TALİMATI', 'BANK INSTRUCTIONS'], ['Hedef', 'Destination'], ['Kontrol et', 'Check status'], ['USDC gönder & imzala', 'Send USDC & sign'], ['ERP ödemesini tamamla', 'Complete ERP payment'], ['Banka transferini simüle et', 'Simulate bank transfer'],
  ['Secret key’in cüzdanında kalır. Yalnızca Testnet.', 'Your secret key stays in your wallet. Testnet only.'],
  ['TR Mock Anchor, demo banka sistemini Stellar Testnet’e bağlar. Her adımın durumu ayrı izlenir.', 'TR Mock Anchor connects the demo banking system to Stellar Testnet. Each step is tracked separately.'],
  ['SEP-10 challenge’ını Freighter ile imzala.', 'Sign the SEP-10 challenge with Freighter.'], ['SEP-38 teklifi ve SEP-6 banka akışını başlat.', 'Start the SEP-38 quote and SEP-6 bank flow.'],
  ['Yatırmada banka simülasyonu, çekimde memo’lu Stellar ödemesi.', 'A bank simulation for deposits and a memo-based Stellar payment for withdrawals.'],
  ['Banka ve KYC adımları mock’tur. USDC transferleri Stellar Testnet üzerinde gerçekten gerçekleşir.', 'Bank and KYC steps are mocked. USDC transfers actually settle on Stellar Testnet.'],
  ['Cüzdan bağla', 'Connect wallet'], ['Bağlantıyı kes', 'Disconnect'], ['Adresi kopyala', 'Copy address'], ['BAĞLI CÜZDAN', 'CONNECTED WALLET'], ['Koyu tema', 'Dark theme'], ['Açık tema', 'Light theme'], ['Menüyü aç', 'Open menu'], ['Verileri yenile', 'Refresh data'], ['Kapat', 'Close'], ['Vazgeç', 'Cancel'], ['Yenile', 'Refresh'],
  ['Cüzdan bağlantısı', 'Wallet connection'], ['Cüzdan seçim penceresi açılıyor. Freighter kurulu değilse “Install” seçeneğini kullanabilirsiniz.', 'Opening wallet selection. If Freighter is not installed, use the “Install” option.'],
  ['Güvenli oturum isteği hazırlanıyor. Freighter’daki imza talebini onaylayın.', 'Preparing a secure session request. Approve the signature request in Freighter.'],
  ['Doğrulanan hesap Freighter’daki hesapla eşleşmedi.', 'The verified account does not match the account in Freighter.'],
  ['Cüzdan bağlandı. İmza ile oturumunuz doğrulandı.', 'Wallet connected. Your session was verified by signature.'], ['Cüzdan bağlantısı tamamlanamadı.', 'Wallet connection could not be completed.'],
  ['Cüzdan bağlandı: ', 'Wallet connected: '], ['Testnet oturumu doğrulandı.', 'Testnet session verified.'], ['İşlem tamamlanamadı.', 'The transaction could not be completed.'],
  ['TRY → USDC Anchor yolu seçildi.', 'TRY → USDC Anchor route selected.'], ['Stellar USDC doğrudan tahsilat için varsayılan yapıldı.', 'Stellar USDC is now the default direct collection route.'],
  ['Önce cüzdanınızı bağlayın.', 'Connect your wallet first.'], ['Stellar işlemi başarısız.', 'Stellar transaction failed.'], ['İşlem gönderildi. Zincir doğrulaması panelde takip ediliyor.', 'Transaction submitted. Chain verification is tracked in the panel.'],
  ['Public key kopyalandı.', 'Public key copied.'], ['Freighter onayı bekleniyor.', 'Awaiting Freighter approval.'], ['Ağ sonucu bekleniyor.', 'Awaiting network result.'], ['Cüzdan bildirimini kapat', 'Dismiss wallet notification'],
  ['Seçilen cüzdan hesap adresi paylaşmadı.', 'The selected wallet did not provide an account address.'],
  ['Freighter şu anda Main Net’te. Freighter’ı açın, üst bölümdeki ağ menüsünden Test Net’i seçin ve ardından yeniden bağlanın. Centerp yalnızca Testnet kullanır.', 'Freighter is currently on Main Net. Open Freighter, select Test Net from the network menu at the top, then reconnect. Centerp only uses Testnet.'],
  ['Cüzdan seçim penceresi kapatıldı. Bağlanmak için yeniden deneyin.', 'The wallet selection window was closed. Try again to connect.'],
  ['Freighter ağı değişmiş. Freighter’ın üst bölümündeki ağ menüsünden Test Net’i seçip yeniden deneyin.', 'The Freighter network has changed. Select Test Net from the network menu at the top of Freighter and try again.'],
  ['Cüzdandaki hesap değişmiş. Panelden bağlantıyı kesip yeniden bağlanın.', 'The account in the wallet has changed. Disconnect from the panel and reconnect.'],
  ['İmza alınamadı veya farklı bir hesaba ait.', 'The signature could not be obtained or belongs to a different account.'],
  ['Taslak', 'Draft'], ['Ödeme bekliyor', 'Awaiting payment'], ['Doğrulanıyor', 'Verifying'], ['Doğrulandı', 'Verified'], ['Başarısız', 'Failed'], ['Tamamlandı', 'Completed'], ['İade edildi', 'Refunded'], ['İptal edildi', 'Cancelled'], ['Vadesi doldu', 'Expired'], ['İmza bekliyor', 'Awaiting signature'], ['Hazır', 'Ready'], ['Bekliyor', 'Pending'], ['Bağlı değil', 'Not connected'],
  ['Tahsil edildi', 'Collected'], ['Kalem', 'Line item'], ['sil', 'remove'], ['Girdi', 'Input'],
  ['Faturalandı', 'Invoiced'], ['Sipariş verildi', 'Ordered'], ['Teslim alındı', 'Received'], ['Planlandı', 'Planned'], ['Ödendi', 'Paid'],
  ['Transfer bekliyor', 'Awaiting transfer'], ['Anchor işliyor', 'Anchor processing'], ['Trustline bekliyor', 'Awaiting trustline'], ['Stellar bekliyor', 'Awaiting Stellar'],
  ['Fatura kaydı', 'Invoice record'], ['Escrow ödemesi', 'Escrow payment'], ['Teslim onayı', 'Delivery approval'], ['İade', 'Refund'], ['İptal', 'Cancel'], ['ERP borç ödemesi', 'ERP liability payment'],
  ['Anchor’a USDC gönderimi', 'Send USDC to Anchor'], ['Anchor TRY → USDC', 'Anchor TRY → USDC'], ['Anchor çevrimiçi', 'Anchor online'], ['Bağlantı kontrol ediliyor', 'Checking connection'], ['Anchor işlemi', 'Anchor transaction'], ['Banka transferi simülasyonu', 'Bank transfer simulation'], ['Anchor’a USDC gönder', 'Send USDC to Anchor'],
  ['Sabit USDC Stellar Asset Contract', 'Fixed USDC Stellar Asset Contract'], ['Anchor oturumu', 'Anchor session'], ['Kur teklifi', 'Quote'], ['Transfer durumu', 'Transfer status'],
  ['Standartlar', 'Standards'], ['Oturum', 'Session'], ['Onay', 'Approval'], ['Token', 'Token'],
  ['Bu workspace yalnızca Testnet kullanır. Banka transferleri ve TRY tutarları simülasyondur; USDC ve escrow işlemleri gerçek Stellar Testnet işlemleridir.', 'This workspace only uses Testnet. Bank transfers and TRY amounts are simulated; USDC and escrow transactions are real Stellar Testnet transactions.'],
  ['TRY yatırma', 'TRY deposit'], ['TRY çekim', 'TRY withdrawal'], ['Banka', 'Bank'], ['fatura', 'invoice'],
  ['Müşteri', 'Customer'], ['Tedarikçi', 'Vendor'], ['Satış', 'Sale'], ['Alış', 'Purchase'], ['Sipariş', 'Order'], ['Tutar', 'Amount'], ['Durum', 'Status'], ['Tarih', 'Date'], ['Vade', 'Due date'], ['Ağ', 'Network'], ['Ürün', 'Product'], ['Ürünler', 'Products'], ['Tür', 'Type'], ['Miktar', 'Quantity'], ['Kaynak', 'Source'], ['Çalışan', 'Employee'], ['Departman', 'Department'], ['Görev', 'Role'], ['Açıklama', 'Description'], ['Ödeme vadesi', 'Payment due'], ['Teslim tarihi', 'Delivery date'], ['Satıcı cüzdanı', 'Merchant wallet'], ['Müşteri cüzdanı', 'Customer wallet'],
  ['KAYNAK', 'SOURCE'], ['ALICI', 'RECIPIENT'], ['USDC ile öde', 'Pay with USDC'],
  ['TÜR', 'TYPE'],
  ['FATURA / MÜŞTERİ', 'INVOICE / CUSTOMER'], ['VADE', 'DUE DATE'], ['TUTAR', 'AMOUNT'], ['DURUM', 'STATUS'],
  ['Zincir kanıtı', 'Chain proof'], ['bekliyor', 'pending'], ['tamamlandı', 'completed'], ['doğrulandı', 'verified'], ['Finans & mutabakat', 'Finance & reconciliation'],
  ['Eyl', 'Sep'], ['Eki', 'Oct'], ['Kas', 'Nov'], ['Ara', 'Dec'], ['Oca', 'Jan'], ['Şub', 'Feb'], ['Nis', 'Apr'], ['Haz', 'Jun'], ['Tem', 'Jul'], ['Ağu', 'Aug'],
  ['sipariş sevkiyat bekliyor', 'orders awaiting shipment'], ['mal kabulü bekliyor', 'receipts pending'], ['planlanan iş emri', 'planned work orders'], ['ürün yeniden sipariş seviyesinde', 'products at reorder level'], ['USDC doğrulandı', 'USDC verified'], ['açık ödeme', 'open payments'], ['kayıt', 'records'], ['kalem', 'items'], ['adet', 'units'],
];

const dictionaries = {
  en: [...pairs].sort((a, b) => b[0].length - a[0].length),
  tr: pairs.map(([tr, en]) => [en, tr] as [string, string]).sort((a, b) => b[0].length - a[0].length),
};

const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function translate(value: string, language: Language) {
  let result = value;
  for (const [source, target] of dictionaries[language]) {
    if (!result.includes(source)) continue;
    if (/^[\p{L}\p{N}]+$/u.test(source)) result = result.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escapePattern(source)}(?![\\p{L}\\p{N}])`, 'gu'), target);
    else result = result.split(source).join(target);
  }
  if (language === 'en') {
    result = result.replace(/\b(\d{1,3}(?:\.\d{3})+),(\d{2})\b/g, (_, integer: string, decimals: string) => `${integer.replaceAll('.', ',')}.${decimals}`);
    result = result.replace(/\b(\d+),(\d{2})\b/g, '$1.$2');
    result = result.replace(/\b\d{1,3}(?:\.\d{3})+\b/g, value => value.replaceAll('.', ','));
  } else {
    result = result.replace(/\b(\d{1,3}(?:,\d{3})+)\.(\d{2})\b/g, (_, integer: string, decimals: string) => `${integer.replaceAll(',', '.')},${decimals}`);
    result = result.replace(/\b(\d+)\.(\d{2})\b/g, '$1,$2');
    result = result.replace(/\b\d{1,3}(?:,\d{3})+\b/g, value => value.replaceAll(',', '.'));
  }
  return result;
}

const LanguageContext = createContext<{language: Language; setLanguage: (value: Language) => void}>({language: 'en', setLanguage: () => {}});
export const useLanguage = () => useContext(LanguageContext);

function LanguageToggle() {
  const {language, setLanguage} = useLanguage();
  const pathname = usePathname();
  const [host, setHost] = useState<Element | null>(null);
  useEffect(() => {setHost(document.querySelector('[data-language-nav]'));}, [pathname]);
  if (!host) return null;
  return createPortal(<div className="language-switcher" role="group" aria-label="Language / Dil" data-i18n-skip>
    <button className={language === 'en' ? 'selected' : ''} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button>
    <span>/</span>
    <button className={language === 'tr' ? 'selected' : ''} aria-pressed={language === 'tr'} onClick={() => setLanguage('tr')}>TR</button>
  </div>, host);
}

export default function LanguageProvider({children}: {children: ReactNode}) {
  const [language, setLanguageState] = useState<Language>('en');
  const setLanguage = (value: Language) => {localStorage.setItem(storageKey, value); setLanguageState(value);};

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'tr' || saved === 'en') setLanguageState(saved);
    else localStorage.setItem(storageKey, 'en');
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
    const pageTitle = language === 'en' ? 'Centerp — Your business, connected' : 'Centerp — İşletmen, bir arada';
    const applyTitle = () => {if (document.title !== pageTitle) document.title = pageTitle;};
    applyTitle();
    const titleObserver = new MutationObserver(applyTitle);
    titleObserver.observe(document.head, {childList: true, characterData: true, subtree: true});
    let applying = false;
    const apply = (root: Node) => {
      if (applying) return;
      applying = true;
      const nodes: Node[] = [root];
      while (nodes.length) {
        const node = nodes.pop()!;
        if (node.nodeType === Node.TEXT_NODE && node.parentElement && !node.parentElement.closest('pre, [data-i18n-skip]')) {
          const next = translate(node.nodeValue || '', language);
          if (next !== node.nodeValue) node.nodeValue = next;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          if (!element.matches('pre, [data-i18n-skip]')) {
            for (const attribute of ['aria-label', 'placeholder', 'title']) {
              const current = element.getAttribute(attribute);
              if (current) element.setAttribute(attribute, translate(current, language));
            }
            nodes.push(...Array.from(node.childNodes));
          }
        }
      }
      applying = false;
    };
    apply(document.body);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') apply(record.target);
        else record.addedNodes.forEach(apply);
      }
    });
    observer.observe(document.body, {childList: true, characterData: true, subtree: true});
    const hydrationPass = window.setTimeout(() => apply(document.body), 100);
    return () => {observer.disconnect(); titleObserver.disconnect(); window.clearTimeout(hydrationPass);};
  }, [language]);

  return <LanguageContext.Provider value={{language, setLanguage}}>{children}<LanguageToggle/></LanguageContext.Provider>;
}

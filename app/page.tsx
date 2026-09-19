import Link from 'next/link';
import {redirect} from 'next/navigation';
import {ArrowRight, BadgeCheck, Boxes, Building2, Check, FileCheck2, Landmark, Link2, LockKeyhole, PackageCheck, ReceiptText, ShieldCheck, Sparkles, Users, WalletCards} from 'lucide-react';

const capabilities = [
  {className:'landing-card-light',number:'01',title:'Operasyon',text:'Satış, satın alma, stok, üretim ve çalışan kayıtları aynı iş zincirinde ilerler.',icon:Boxes},
  {className:'landing-card-red',number:'02',title:'Fatura',text:'Siparişten oluşan fatura; alıcı, tutar, vade ve teslim koşulunu birlikte taşır.',icon:ReceiptText},
  {className:'landing-card-dark',number:'03',title:'Stellar ödeme',text:'Freighter imzası ve USDC escrow ile ödeme, teslim onayına kadar güvenle bekler.',icon:ShieldCheck},
  {className:'landing-card-paper',number:'04',title:'Mutabakat',text:'Doğrulanmış zincir işlemi ilgili ERP kaydına ve yönetim muhasebesi defterine bağlanır.',icon:BadgeCheck},
];

const flow = [
  ['01','İş kaydını oluştur','Müşteri, ürün ve satış siparişi tek çalışma alanında oluşur.'],
  ['02','Faturayı Stellar’a taşı','Tutar ve cüzdan bilgisi yeniden yazılmadan finans modülüne geçer.'],
  ['03','USDC’yi escrow’da koru','Ödeme Soroban sözleşmesine aktarılır; teslim gerçekleşene kadar bekler.'],
  ['04','Teslim et ve mutabık kal','Alıcı onayı parayı serbest bırakır, işlem kanıtı ERP defterine işlenir.'],
];

export default async function LandingPage({searchParams}:{searchParams:Promise<{module?:string}>}) {
  const params = await searchParams;
  if (params.module) redirect(`/workspace?module=${encodeURIComponent(params.module)}`);
  return <main className="landing-shell" id="main-content">
    <a className="skip-link" href="#landing-intro">Ana içeriğe geç</a>
    <header className="landing-header">
      <Link className="landing-brand" href="/" aria-label="Centerp ana sayfa"><span className="brand-mark" aria-hidden="true"><Link2 size={24}/></span><span>Cent<span className="brand-accent">erp</span></span></Link>
      <nav className="landing-nav" aria-label="Ana navigasyon"><a href="#urun">Ürün</a><a href="#akis">Nasıl çalışır?</a><a href="#stellar">Stellar altyapısı</a></nav>
      <div className="landing-header-actions"><Link className="landing-header-cta" href="/workspace">Çalışma alanını aç <ArrowRight size={17} aria-hidden="true"/></Link><div className="language-nav-slot" data-language-nav/></div>
    </header>

    <section className="landing-hero" id="landing-intro">
      <div className="landing-hero-copy">
        <div className="landing-kicker"><span>Stellar ile çalışan ERP</span><i>TESTNET</i></div>
        <h1>İşletmenin merkezi.<br/><em>Ödemenin kanıtı.</em></h1>
        <p>Centerp, günlük operasyon kayıtlarını fatura, USDC ödeme ve zincir üstü mutabakatla aynı iş akışında birleştirir.</p>
        <div className="landing-actions"><Link className="landing-primary-action" href="/workspace">ERP’yi deneyimle <ArrowRight size={19}/></Link><a className="landing-text-action" href="#akis">Akışı incele <span aria-hidden="true">↓</span></a></div>
        <ul className="landing-proof-list" aria-label="Ürün özellikleri"><li><Check size={15}/> Freighter</li><li><Check size={15}/> Soroban escrow</li><li><Check size={15}/> TRY ↔ USDC</li></ul>
      </div>
      <div className="landing-hero-visual" aria-label="Centerp operasyon ve ödeme akışı illüstrasyonu">
        <div className="landing-orbit" aria-hidden="true"><i/><i/><i/></div>
        <article className="landing-visual-card landing-visual-main"><header><span><i/> Satış siparişi</span><b>CP-1048</b></header><div><strong>₺ 128.400</strong><small>4 kalem · Atlas Makine</small></div><footer><span>FATURALANDI</span><ArrowRight size={18}/></footer></article>
        <article className="landing-visual-card landing-visual-payment"><span className="landing-visual-icon"><LockKeyhole size={21}/></span><div><small>ESCROW BAKİYESİ</small><strong>3,250 USDC</strong></div><BadgeCheck size={21}/></article>
        <div className="landing-visual-note"><Sparkles size={17}/><span>Zincir üzerinde doğrulandı</span></div>
        <div className="landing-asterisk" aria-hidden="true"><span/><span/><span/><span/></div>
      </div>
    </section>

    <section className="landing-tech-strip" aria-label="Kullanılan Stellar standartları"><span>STELLAR TESTNET</span><i/><span>SEP-10</span><i/><span>SEP-6</span><i/><span>SEP-38</span><i/><span>SOROBAN</span></section>

    <section className="landing-section" id="urun">
      <div className="landing-section-heading"><h2><span>Tek kayıt,</span><br/>baştan sona izlenebilir.</h2><p>ERP operasyonu ile ödeme altyapısı ayrı ekranlar olsa da aynı kaynağı paylaşır. Böylece sipariş, fatura ve tahsilat arasında kopukluk oluşmaz.</p></div>
      <div className="landing-capability-grid">{capabilities.map(({className,number,title,text,icon:Icon})=><article className={`landing-capability ${className}`} key={number}><div className="landing-card-top"><span>{number}</span><Icon size={33} strokeWidth={1.7}/></div><div><h3>{title}</h3><p>{text}</p></div><Link href="/workspace" aria-label={`${title} modülünü aç`}><span><ArrowRight size={17}/></span> Modülü aç</Link></article>)}</div>
    </section>

    <section className="landing-section landing-flow-section" id="akis">
      <div className="landing-section-heading landing-section-heading-compact"><h2><span>Bir satışın</span><br/>Centerp yolculuğu.</h2><p>Operasyon tamamlanmadan para serbest kalmaz; ödeme tamamlanınca kanıt ilgili kayda döner.</p></div>
      <div className="landing-flow-list">{flow.map(([number,title,text],index)=><article className={index===0?'active':''} key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p><i aria-hidden="true">{index===0?'−':'+'}</i></article>)}</div>
    </section>

    <section className="landing-stellar" id="stellar">
      <div className="landing-stellar-copy"><span className="landing-label">STELLAR KATMANI</span><h2>Ödeme, ERP’nin dışında kalan bir ayrıntı değil.</h2><p>Centerp, Türkiye’ye özel Anchor akışını, USDC bakiyesini ve Soroban escrow durumunu işletmenin gerçek kayıtlarıyla ilişkilendirir.</p><Link href="/finance">Finans modülünü incele <ArrowRight size={18}/></Link></div>
      <div className="landing-stellar-grid"><div><WalletCards size={25}/><strong>TRY → USDC</strong><span>Mock Anchor ile yatırma ve çekme akışı</span></div><div><ShieldCheck size={25}/><strong>Koşullu ödeme</strong><span>Teslim onayına bağlı Soroban escrow</span></div><div><FileCheck2 size={25}/><strong>İşlem kanıtı</strong><span>Hash, fatura ve defter kaydı aynı yerde</span></div><div><Landmark size={25}/><strong>Mutabakat</strong><span>Finans hareketi operasyon kaydına geri döner</span></div></div>
    </section>

    <section className="landing-cta"><div><span className="landing-label">36 SAATLİK MVP · STELLAR TESTNET</span><h2>Operasyonu kaydet.<br/>Ödemeyi doğrula.</h2><p>Centerp çalışma alanında örnek şirket verileriyle uçtan uca akışı deneyimle.</p></div><div className="landing-cta-action"><Link href="/workspace">Centerp’i aç <ArrowRight size={20}/></Link><span><PackageCheck size={17}/> Kurulum gerektirmez</span></div><div className="landing-cta-figure" aria-hidden="true"><Building2/><Users/><span/></div></section>
    <footer className="landing-footer"><Link className="landing-brand landing-brand-footer" href="/"><span className="brand-mark" aria-hidden="true"><Link2 size={24}/></span><span>Cent<span className="brand-accent">erp</span></span></Link><p>Kurumsal kaynak planlama ile doğrulanabilir ödemeyi bir araya getirir.</p><div><span>Rise In × Stellar Pro Hackathon 2026</span><span>Testnet prototipi</span></div></footer>
  </main>;
}

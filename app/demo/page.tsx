'use client';

import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  Link2,
  Maximize2,
  Minimize2,
  Play,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const TIMELINE_CHAPTERS = [
  {time: '0:00', seconds: 0, number: '01', title: 'Problem & vizyon', desc: 'ERP kayıtları ile ödeme kanıtı arasındaki kopukluğu görün.'},
  {time: '0:18', seconds: 18, number: '02', title: 'ERP çalışma alanı', desc: 'Satış, satın alma, stok, üretim ve ekip süreçlerini keşfedin.'},
  {time: '0:50', seconds: 50, number: '03', title: 'TRY, USDC & escrow', desc: 'Anchor köprüsünden korumalı Stellar ödemesine ilerleyin.'},
  {time: '1:24', seconds: 84, number: '04', title: 'Zincir kanıtı', desc: 'Fatura, işlem hash’i ve mutabakat kaydını doğrulayın.'},
];

type WebkitFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type WebkitFullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

export default function DemoPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const webkitDocument = document as WebkitFullscreenDocument;
      setIsFullscreen(Boolean(document.fullscreenElement || webkitDocument.webkitFullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    const element = containerRef.current as WebkitFullscreenElement | null;
    const webkitDocument = document as WebkitFullscreenDocument;
    if (!element) return;

    try {
      if (!document.fullscreenElement && !webkitDocument.webkitFullscreenElement) {
        if (element.requestFullscreen) await element.requestFullscreen();
        else await element.webkitRequestFullscreen?.();
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else {
        await webkitDocument.webkitExitFullscreen?.();
      }
    } catch {
      // Native video controls remain available if fullscreen is blocked.
    }
  };

  const seekTo = async (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    try {
      await videoRef.current.play();
    } catch {
      // The viewer can still start playback with the native controls.
    }
  };

  return (
    <div className="landing-shell demo-shell">
      <a className="skip-link" href="#demo-player">Videoya geç</a>

      <header className="landing-header demo-header">
        <Link className="landing-brand" href="/" aria-label="Centerp ana sayfa">
          <span className="brand-mark" aria-hidden="true"><Link2 size={24}/></span>
          <span>Cent<span className="brand-accent">erp</span></span>
        </Link>

        <nav className="landing-nav" aria-label="Demo navigasyonu">
          <Link href="/">Ana sayfa</Link>
          <Link href="/workspace">ERP</Link>
          <Link href="/finance">Stellar finansı</Link>
        </nav>

        <div className="landing-header-actions">
          <Link className="landing-header-cta" href="/workspace">
            Çalışma alanını aç <ArrowRight size={17} aria-hidden="true"/>
          </Link>
          <div className="language-nav-slot" data-language-nav/>
        </div>
      </header>

      <main className="demo-main">
        <section className="demo-intro" aria-labelledby="demo-title">
          <div className="demo-intro-copy">
            <Link className="demo-back-link" href="/"><ArrowLeft size={15}/> Ana sayfaya dön</Link>
            <div className="landing-kicker demo-kicker"><span>108 saniyelik ürün turu</span><i>SESLİ DEMO</i></div>
            <h1 id="demo-title">Centerp’i<br/><em>iş başında</em> görün.</h1>
            <p>Siparişten faturaya, TRY’den USDC’ye ve Soroban escrow’dan doğrulanabilir mutabakata uzanan tek iş akışı.</p>
            <ul className="landing-proof-list" aria-label="Demo kapsamı">
              <li><Check size={15}/> ERP operasyonları</li>
              <li><Check size={15}/> Stellar Testnet</li>
              <li><Check size={15}/> Zincir üstü kanıt</li>
            </ul>
          </div>

          <aside className="demo-intro-note" aria-label="Demo özeti">
            <Sparkles size={24}/>
            <span>Bir kaydı takip edin</span>
            <strong>ERP → Invoice → Escrow → Proof</strong>
            <p>Kağıt ve banka operasyonunu azaltan, düşük ücretli ve izlenebilir ödeme yolculuğu.</p>
          </aside>
        </section>

        <section className="demo-stage" id="demo-player" aria-label="Centerp ürün videosu">
          <div className="demo-stage-header">
            <div><i/><i/><i/></div>
            <span>CENTERP / PRODUCT WALKTHROUGH</span>
            <b>01:48</b>
          </div>

          <div className="demo-video-frame" ref={containerRef}>
            <video
              ref={videoRef}
              src="/presentation.mp4"
              playsInline
              controls
              preload="metadata"
              aria-label="Centerp ERP ve Stellar ödeme ürün tanıtımı"
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            />
            <button className="demo-fullscreen" type="button" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 size={17}/> : <Maximize2 size={17}/>}
              {isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran izle'}
            </button>
          </div>
        </section>

        <section className="demo-chapters" aria-labelledby="demo-chapters-title">
          <div className="demo-section-heading">
            <div>
              <span>AKIŞ HARİTASI</span>
              <h2 id="demo-chapters-title">İstediğiniz adımdan başlayın.</h2>
            </div>
            <p>Her bölüm Centerp’in operasyon kaydını ödeme ve zincir kanıtıyla nasıl birleştirdiğini gösterir.</p>
          </div>

          <div className="demo-chapter-grid">
            {TIMELINE_CHAPTERS.map((chapter, index) => {
              const next = TIMELINE_CHAPTERS[index + 1];
              const active = currentTime >= chapter.seconds && (!next || currentTime < next.seconds);
              return (
                <button
                  className={active ? 'demo-chapter active' : 'demo-chapter'}
                  type="button"
                  key={chapter.time}
                  onClick={() => seekTo(chapter.seconds)}
                  aria-current={active ? 'step' : undefined}
                  aria-label={`${chapter.time} — ${chapter.title}`}
                >
                  <span className="demo-chapter-top"><b>{chapter.number}</b><i>{chapter.time}</i></span>
                  <span className="demo-chapter-icon"><Play size={18} fill="currentColor"/></span>
                  <strong>{chapter.title}</strong>
                  <small>{chapter.desc}</small>
                  <span className="demo-chapter-state">{active ? 'Şimdi oynatılıyor' : 'Bu bölümü oynat'} <ArrowRight size={14}/></span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="demo-cta">
          <div>
            <span className="landing-label">CANLI TESTNET DENEYİMİ</span>
            <h2>İzlemekle kalmayın.<br/>Akışı kendiniz tamamlayın.</h2>
            <p>Hazır örnek verilerle sipariş oluşturun, faturayı Stellar’a taşıyın ve işlemin zincir kanıtını görün.</p>
          </div>
          <div className="demo-cta-actions">
            <Link href="/workspace"><Building2 size={19}/> ERP’yi aç <ArrowRight size={19}/></Link>
            <Link href="/finance"><ShieldCheck size={18}/> Finans akışına git</Link>
          </div>
          <div className="demo-cta-seal" aria-hidden="true"><BadgeCheck/><span>TESTNET<br/>VERIFIED</span></div>
        </section>
      </main>

      <footer className="landing-footer demo-footer">
        <Link className="landing-brand landing-brand-footer" href="/"><span className="brand-mark" aria-hidden="true"><Link2 size={24}/></span><span>Cent<span className="brand-accent">erp</span></span></Link>
        <p>Kurumsal kaynak planlama ile doğrulanabilir ödemeyi bir araya getirir.</p>
        <div><span>Rise In × Stellar Pro Hackathon 2026</span><span>108 saniyelik ürün demosu · Testnet</span></div>
      </footer>
    </div>
  );
}

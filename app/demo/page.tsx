'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Link2,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Building2,
  Sparkles
} from 'lucide-react';

const TIMELINE_CHAPTERS = [
  { time: '0:00', seconds: 0, title: 'Giriş & Problem', desc: 'Geleneksel ERP ile bankacılık arasındaki kopukluk ve Centerp vizyonu.' },
  { time: '0:18', seconds: 18, title: 'ERP Modülleri', desc: 'Müşteri, tedarikçi, satış, satın alma, stok, üretim ve İK operasyonları.' },
  { time: '0:50', seconds: 50, title: 'Stellar Ödeme & Anchor', desc: 'TRY ↔ USDC köprüsü, bakiye yönetimi ve emanet (escrow) güvenliği.' },
  { time: '1:24', seconds: 84, title: 'On-chain Kanıt & Mutabakat', desc: 'Stellar Expert üzerinde doğrulanabilir işlem hashleri ve yevmiye kaydı.' },
];

export default function DemoPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(108);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current || videoRef.current;
    if (!el) return;

    try {
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if ((el as any).webkitRequestFullscreen) {
          await (el as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch {
      // Fallback directly to video element if container fails
      if (videoRef.current && videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen().catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 108;
    setCurrentTime(cur);
    setDuration(dur);
    setProgress((cur / dur) * 100);
  };

  const seekTo = (sec: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = sec;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d1311',
      color: '#e7eee9',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Top Header */}
      <header style={{
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: '#121b18'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', textDecoration: 'none' }}>
            <span className="brand-mark" style={{
              background: '#f1f7ed',
              color: '#173b2b',
              width: '32px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px'
            }}>
              <Link2 size={20} />
            </span>
            <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              Cent<span style={{ color: '#60d29e' }}>erp</span>
            </span>
          </Link>
          <span style={{
            fontSize: '11px',
            color: '#82908a',
            padding: '3px 8px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            Video Walkthrough
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/workspace" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#168461',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'background 0.2s'
          }}>
            <Building2 size={16} />
            Çalışma Alanı (ERP)
          </Link>
          <Link href="/finance" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255,255,255,0.07)',
            color: '#e7eee9',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <ShieldCheck size={16} />
            Stellar Finans
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main style={{
        flex: 1,
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        padding: '32px 24px 60px',
        boxSizing: 'border-box'
      }}>
        {/* Title row */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#60d29e',
                background: 'rgba(96, 210, 158, 0.1)',
                padding: '4px 10px',
                borderRadius: '999px',
                letterSpacing: '0.5px'
              }}>
                <Sparkles size={12} />
                108-SANİYELİK SESLİ ANLATIM
              </span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.8px' }}>
              Centerp: Uçtan Uca Ürün Demosu
            </h1>
            <p style={{ margin: '6px 0 0', color: '#8e9d96', fontSize: '14px' }}>
              Siparişten faturaya, Soroban escrow kilidinden nihai banka ve zincir içi mutabakatına kadar canlı akış.
            </p>
          </div>

          <button
            onClick={toggleFullscreen}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#233e31',
              color: '#60d29e',
              border: '1px solid #365b49',
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran İzle'}
          </button>
        </div>

        {/* Video Player Box */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: '100%',
            background: '#000',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
            aspectRatio: '16 / 9'
          }}
        >
          <video
            ref={videoRef}
            src="/presentation.mp4"
            playsInline
            controls
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleTimeUpdate}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              objectFit: 'contain'
            }}
          />

          {/* Quick Fullscreen Overlay badge */}
          {!isFullscreen && (
            <button
              onClick={toggleFullscreen}
              title="Tam Ekran"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(18, 27, 24, 0.85)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                zIndex: 10,
                transition: 'all 0.2s'
              }}
            >
              <Maximize2 size={14} />
              Tam Ekran
            </button>
          )}
        </div>

        {/* Chapter / Timeline navigator */}
        <div style={{ marginTop: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#e7eee9', marginBottom: '14px', letterSpacing: '-0.3px' }}>
            Bölümler ve Akış Zaman Çizelgesi
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '12px'
          }}>
            {TIMELINE_CHAPTERS.map((ch, idx) => {
              const isActive = currentTime >= ch.seconds && (idx === TIMELINE_CHAPTERS.length - 1 || currentTime < TIMELINE_CHAPTERS[idx + 1].seconds);
              return (
                <div
                  key={ch.time}
                  onClick={() => seekTo(ch.seconds)}
                  style={{
                    background: isActive ? '#1c2f26' : '#151e1b',
                    border: `1px solid ${isActive ? '#60d29e' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: isActive ? '#60d29e' : '#8e9d96',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '2px 7px',
                      borderRadius: '5px'
                    }}>
                      {ch.time}
                    </span>
                    {isActive && <span style={{ fontSize: '10px', color: '#60d29e', fontWeight: 600 }}>Oynatılıyor</span>}
                  </div>
                  <strong style={{ display: 'block', fontSize: '14px', color: '#fff', marginBottom: '4px' }}>
                    {ch.title}
                  </strong>
                  <p style={{ fontSize: '12px', color: '#8e9d96', margin: 0, lineHeight: 1.5 }}>
                    {ch.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Callout */}
        <div style={{
          marginTop: '36px',
          padding: '24px',
          background: 'linear-gradient(135deg, rgba(22, 132, 97, 0.15) 0%, rgba(18, 27, 24, 0.6) 100%)',
          borderRadius: '14px',
          border: '1px solid rgba(96, 210, 158, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 6px', color: '#fff' }}>
              Demoyu izlediniz mi? Canlı çalışma alanında kendiniz test edin.
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#a6b8ae' }}>
              Kurulum gerektirmez. Hazır örnek verilerle satış oluşturabilir, faturalandırıp Stellar Testnet üzerinde ödeyebilirsiniz.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link
              href="/workspace"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#60d29e',
                color: '#0c1813',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              Çalışma Alanını Başlat <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

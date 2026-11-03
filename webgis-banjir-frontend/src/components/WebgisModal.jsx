import React, { useEffect, useMemo } from 'react';
import { useWebgis } from '../context/WebgisContext.jsx';

export default function WebgisModal() {
  const { isMapOpen, mapParams, closeMap } = useWebgis();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMapOpen) {
        closeMap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMapOpen, closeMap]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isMapOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMapOpen]);

  const iframeSrc = useMemo(() => {
    if (!isMapOpen) return '';
    const params = new URLSearchParams();
    if (mapParams.kecamatan && mapParams.kecamatan !== 'Semua') {
      params.set('kecamatan', mapParams.kecamatan);
    }
    if (mapParams.lat && mapParams.lng) {
      params.set('lat', mapParams.lat);
      params.set('lng', mapParams.lng);
    }
    const qs = params.toString();
    return `/peta${qs ? `?${qs}` : ''}`;
  }, [isMapOpen, mapParams]);

  if (!isMapOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col bg-slate-950/80 backdrop-blur-md transition-all duration-300"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(7, 31, 48, 0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Top Header Bar */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          background: '#0B3C5D',
          color: '#ffffff',
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px' }}>🗺️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.02em' }}>
              SIRANDU WebGIS Interaktif Kota Jambi
            </div>
            <div style={{ fontSize: '12px', color: '#6EC1E4', display: 'flex', gap: '8px' }}>
              <span>5 Layer Tematik</span>
              <span>•</span>
              <span>Buffer Batanghari 150/400/800m</span>
              <span>•</span>
              <span>Navigasi Jalur Evakuasi</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a
            href={iframeSrc || '/peta'}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
              transition: '0.2s'
            }}
          >
            <span>Buka di Tab Baru</span>
            <span>↗</span>
          </a>

          <button
            onClick={closeMap}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              background: '#E5533D',
              border: 'none',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Tutup</span>
            <span>✕</span>
          </button>
        </div>
      </div>

      {/* Embedded Map Content */}
      <div style={{ flex: 1, width: '100%', height: 'calc(100vh - 65px)', background: '#f1f5f9' }}>
        <iframe
          src={iframeSrc}
          title="SIRANDU WebGIS Kota Jambi"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block'
          }}
        />
      </div>
    </div>
  );
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCuacaKecamatan, syncCuacaSekarang } from '../services/api.js';

const WebgisContext = createContext(null);

export function WebgisProvider({ children }) {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapParams, setMapParams] = useState({ kecamatan: 'Semua', lat: null, lng: null });
  const [cuacaData, setCuacaData] = useState([]);
  const [ringkasan, setRingkasan] = useState({ total_kecamatan: 11, siaga: 0, waspada: 0, normal: 11, data_tertunda_fallback: 0 });
  const [loadingCuaca, setLoadingCuaca] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchCuaca = useCallback(async () => {
    setLoadingCuaca(true);
    const res = await getCuacaKecamatan();
    if (res && res.success) {
      setCuacaData(res.data || []);
      if (res.ringkasan_kota) {
        setRingkasan(res.ringkasan_kota);
      }
    }
    setLoadingCuaca(false);
  }, []);

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    await syncCuacaSekarang();
    await fetchCuaca();
    setSyncing(false);
  }, [fetchCuaca]);

  useEffect(() => {
    fetchCuaca();
    // Auto-refresh weather every 5 minutes
    const interval = setInterval(fetchCuaca, 300000);
    return () => clearInterval(interval);
  }, [fetchCuaca]);

  const openMap = useCallback((opts = {}) => {
    setMapParams({
      kecamatan: opts.kecamatan || 'Semua',
      lat: opts.lat || null,
      lng: opts.lng || null
    });
    setIsMapOpen(true);
  }, []);

  const closeMap = useCallback(() => {
    setIsMapOpen(false);
  }, []);

  return (
    <WebgisContext.Provider
      value={{
        isMapOpen,
        mapParams,
        openMap,
        closeMap,
        cuacaData,
        ringkasan,
        loadingCuaca,
        syncing,
        refreshCuaca: fetchCuaca,
        triggerSync
      }}
    >
      {children}
    </WebgisContext.Provider>
  );
}

export function useWebgis() {
  const ctx = useContext(WebgisContext);
  if (!ctx) {
    throw new Error('useWebgis must be used within a WebgisProvider');
  }
  return ctx;
}

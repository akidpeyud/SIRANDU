import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getCuacaKecamatan, getPoskoPengungsian, getSumberAirBersih, getRuasJalanTergenang } from '../services/api.js'

const Ctx = createContext(null)
const REFRESH_MS = 5 * 60 * 1000

/** Data bersama: cuaca 11 kecamatan (refresh 5 menit), hitungan layer untuk statistik, dan kontrol peta WebGIS. */
export function WebgisProvider({ children }) {
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [mapParams, setMapParams] = useState({ kecamatan: 'Semua', lat: null, lng: null })
  const [cuaca, setCuaca] = useState({ data: [], ringkasan: null, loading: true, error: null })
  const [counts, setCounts] = useState({ posko: null, airBersih: null, jalanTergenang: null })

  const refreshCuaca = useCallback(async () => {
    try {
      const r = await getCuacaKecamatan()
      setCuaca({ data: r.data || [], ringkasan: r.ringkasan_kota || null, loading: false, error: null })
    } catch (e) { setCuaca((s) => ({ ...s, loading: false, error: e })) }
  }, [])

  useEffect(() => { refreshCuaca(); const t = setInterval(refreshCuaca, REFRESH_MS); return () => clearInterval(t) }, [refreshCuaca])

  useEffect(() => {
    const n = (p) => p.then((g) => g?.features?.length ?? 0, () => null)
    const tergenang = getRuasJalanTergenang().then((g) => g?.features?.filter((f) => f.properties?.status_tergenang).length ?? 0, () => null)
    Promise.all([n(getPoskoPengungsian()), n(getSumberAirBersih()), tergenang]).then(([posko, airBersih, jalanTergenang]) => setCounts({ posko, airBersih, jalanTergenang }))
  }, [])

  const openMap = useCallback((o = {}) => { setMapParams({ kecamatan: o.kecamatan || 'Semua', lat: o.lat ?? null, lng: o.lng ?? null, mode: o.mode || null, layers: o.layers || null }); setIsMapOpen(true) }, [])
  const closeMap = useCallback(() => setIsMapOpen(false), [])

  const value = useMemo(() => ({
    isMapOpen, mapParams, openMap, closeMap,
    cuacaData: cuaca.data, ringkasan: cuaca.ringkasan, loadingCuaca: cuaca.loading, errorCuaca: cuaca.error, refreshCuaca, counts,
  }), [isMapOpen, mapParams, openMap, closeMap, cuaca, refreshCuaca, counts])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export function useWebgis() { const c = useContext(Ctx); if (!c) throw new Error('useWebgis harus di dalam WebgisProvider'); return c }

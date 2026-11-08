import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getCuacaKecamatan, getPoskoPengungsian, getSumberAirBersih, getRuasJalanTergenang } from '../services/api.js'

const Ctx = createContext(null)
const REFRESH_MS = 5 * 60 * 1000

/* Halaman peta punya alamat sendiri (#/peta?kec=..&layers=..&lat=..&lng=..) supaya
   tetap terbuka saat di-refresh dan tombol Kembali di browser menutupnya. */
const HASH = '#/peta'
const DEFAULT_PARAMS = { kecamatan: 'Semua', lat: null, lng: null, mode: null, layers: null }
export function readMapUrl() {
  if (typeof window === 'undefined' || !window.location.hash.startsWith(HASH)) return null
  const q = new URLSearchParams(window.location.hash.split('?')[1] || '')
  const num = (k) => (q.get(k) != null && Number.isFinite(+q.get(k)) ? +q.get(k) : null)
  return { ...DEFAULT_PARAMS, kecamatan: q.get('kec') || 'Semua', lat: num('lat'), lng: num('lng'), layers: q.get('layers') ? q.get('layers').split(',').filter(Boolean) : null, fromUrl: true }
}
function mapUrl({ kecamatan, lat, lng, layers } = {}) {
  const q = new URLSearchParams()
  if (kecamatan && kecamatan !== 'Semua') q.set('kec', kecamatan)
  if (layers?.length) q.set('layers', layers.join(','))
  if (lat != null && lng != null) { q.set('lat', lat); q.set('lng', lng) }
  const s = q.toString()
  return `${window.location.pathname}${window.location.search}${HASH}${s ? `?${s}` : ''}`
}

/** Data bersama: cuaca 11 kecamatan (refresh 5 menit), hitungan layer untuk statistik, dan kontrol peta WebGIS. */
export function WebgisProvider({ children }) {
  const [isMapOpen, setIsMapOpen] = useState(() => !!readMapUrl())
  const [mapParams, setMapParams] = useState(() => readMapUrl() || DEFAULT_PARAMS)
  const [cuaca, setCuaca] = useState({ data: [], ringkasan: null, loading: true, error: null })
  const [counts, setCounts] = useState({ posko: null, airBersih: null, jalanTergenang: null, ready: false })

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
    Promise.all([n(getPoskoPengungsian()), n(getSumberAirBersih()), tergenang]).then(([posko, airBersih, jalanTergenang]) => setCounts({ posko, airBersih, jalanTergenang, ready: true }))
  }, [])

  const openMap = useCallback((o = {}) => {
    const p = { kecamatan: o.kecamatan || 'Semua', lat: o.lat ?? null, lng: o.lng ?? null, mode: o.mode || null, layers: o.layers || null }
    setMapParams(p); setIsMapOpen(true)
    if (!window.location.hash.startsWith(HASH)) window.history.pushState({ sirandu: 'peta' }, '', mapUrl(p))
  }, [])
  const closeMap = useCallback(() => {
    setIsMapOpen(false)
    if (!window.location.hash.startsWith(HASH)) return
    // dibuka dari halaman ini → mundur satu langkah; dibuka langsung dari URL → ganti alamat saja
    if (window.history.state?.sirandu === 'peta') window.history.back()
    else window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  }, [])
  /** Simpan keadaan peta (kecamatan, layer, titik) ke URL tanpa menambah riwayat. */
  const syncMapUrl = useCallback((p) => {
    if (window.location.hash.startsWith(HASH)) window.history.replaceState(window.history.state, '', mapUrl(p))
  }, [])
  useEffect(() => {
    const onPop = () => { const p = readMapUrl(); setIsMapOpen(!!p); if (p) setMapParams(p) }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const value = useMemo(() => ({
    isMapOpen, mapParams, openMap, closeMap, syncMapUrl,
    cuacaData: cuaca.data, ringkasan: cuaca.ringkasan, loadingCuaca: cuaca.loading, errorCuaca: cuaca.error, refreshCuaca, counts,
  }), [isMapOpen, mapParams, openMap, closeMap, syncMapUrl, cuaca, refreshCuaca, counts])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export function useWebgis() { const c = useContext(Ctx); if (!c) throw new Error('useWebgis harus di dalam WebgisProvider'); return c }

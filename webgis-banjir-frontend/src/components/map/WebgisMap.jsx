import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './map.css'
import { MapContainer, TileLayer, GeoJSON, Marker, Polyline, Popup, Tooltip, ZoomControl, Pane, useMap } from 'react-leaflet'
import { useWebgis } from '../../context/WebgisContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useGeolocation } from '../../hooks/useGeolocation.js'
import * as api from '../../services/api.js'
import { gsap, prefersReducedMotion } from '../../lib/motion.jsx'
import { KECAMATAN, KOTA, findKec, kecamatanAt, boundsOf, maskFor, norm } from './kecamatan.js'
import WeatherHistory from './WeatherHistory.jsx'
import RainLayer from './RainLayer.jsx'
import logo from '../../assets/logo.png'

/* ---------- konfigurasi layer ---------- */
const LAYERS = [
  { id: 'zona', group: 'Risiko', label: 'Zona rawan banjir', desc: 'Kelas kerawanan hasil analisis AHP', c: '#f97316', fetch: (k) => api.getZonaRawan(k), on: true, byKec: true },
  { id: 'elevasi', group: 'Risiko', label: 'Ketinggian tanah', desc: 'Kelas elevasi DEMNAS', c: '#14b8a6', fetch: () => api.getElevasi() },
  { id: 'banjir', group: 'Risiko', label: 'Titik banjir historis', desc: 'Lokasi kejadian banjir sebelumnya', c: '#ef4444', fetch: () => api.getTitikBanjirHistoris() },
  { id: 'sungai', group: 'Wilayah & air', label: 'Sungai & buffer', desc: 'Batanghari dan zona penyangganya', c: '#0ea5e9', fetch: () => api.getSungaiBuffer() },
  { id: 'batas', group: 'Wilayah & air', label: 'Batas kelurahan', desc: 'Garis batas kelurahan dari server', c: '#94a3b8', fetch: (k) => api.getBatasAdministrasi(k), byKec: true },
  { id: 'posko', group: 'Evakuasi & bantuan', label: 'Posko pengungsian', desc: 'Kapasitas, fasilitas, kontak', c: '#1D6FA3', fetch: (k) => api.getPoskoPengungsian(k), on: true, byKec: true },
  { id: 'air', group: 'Evakuasi & bantuan', label: 'Sumber air bersih', desc: 'Sumur, hidran, tangki', c: '#06b6d4', fetch: (k) => api.getSumberAirBersih(k), byKec: true },
  { id: 'jalan', group: 'Evakuasi & bantuan', label: 'Jalan tergenang', desc: 'Dihindari rute evakuasi', c: '#e11d48', fetch: () => api.getRuasJalanTergenang() },
]
const GROUPS = ['Risiko', 'Wilayah & air', 'Evakuasi & bantuan']
/* urutan tumpuk tetap (pane), tidak bergantung urutan menyalakan layer */
const PANE_Z = { elevasi: 410, zona: 420, sungai: 430, batas: 440, kec: 450, mask: 455, jalan: 460, route: 470 }

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/'
/* Tiga peta dasar + lapisan nama tempat. Tema panel ikut: "Gelap" → panel gelap. */
const BASEMAPS = {
  satelit: { label: 'Satelit', url: `${ESRI}World_Imagery/MapServer/tile/{z}/{y}/{x}`, ref: `${ESRI}Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, attr: 'Citra &copy; Esri, Maxar, Earthstar Geographics', native: 19 },
  terang: { label: 'Terang', url: `${ESRI}Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, ref: `${ESRI}Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, attr: 'Peta &copy; Esri, HERE, Garmin, OpenStreetMap', native: 16 },
  gelap: { label: 'Gelap', url: `${ESRI}Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, ref: `${ESRI}Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, attr: 'Peta &copy; Esri, HERE, Garmin, OpenStreetMap', native: 16 },
}
const BASE_ICON = {
  satelit: <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>,
  terang: <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  gelap: <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>,
}
/* Mode cepat: kumpulan layer siap pakai supaya warga tidak bingung memilih satu per satu. */
const PRESETS = [
  { id: 'risiko', label: 'Kenali risiko', layers: ['zona', 'sungai', 'banjir'] },
  { id: 'evakuasi', label: 'Saat banjir', layers: ['posko', 'jalan', 'air'] },
  { id: 'lengkap', label: 'Semua', layers: LAYERS.map((l) => l.id) },
]
const STATUS = { normal: '#34a065', waspada: '#e8c13a', siaga: '#e8731f', awas: '#b02a2a' }
const statusColor = (s) => STATUS[String(s || 'normal').split(' ')[0].toLowerCase()] || STATUS.normal

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const pin = (cls, glyph = '') => L.divIcon({ className: '', html: `<span class="mk ${cls}">${glyph}</span>`, iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14] })
const ICONS = {
  posko: pin('posko', '<svg viewBox="0 0 24 24"><path d="M4 20V10l8-6 8 6v10z"/><path d="M10 20v-6h4v6"/></svg>'),
  air: pin('air', '<svg viewBox="0 0 24 24"><path d="M12 3c3 4 6 7 6 10.5a6 6 0 0 1-12 0C6 10 9 7 12 3z"/></svg>'),
  banjir: pin('banjir', '<svg viewBox="0 0 24 24"><path d="M3 15c3-3 6-3 9 0s6 3 9 0"/><path d="M12 3v8"/></svg>'),
  me: L.divIcon({ className: '', html: '<span class="mk-me"><i></i></span>', iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12] }),
}

const style = {
  zona: (f) => ({ pane: 'p-zona', color: '#ffffff', weight: 0.8, opacity: 0.7, fillColor: f.properties.warna_hex || '#f97316', fillOpacity: 0.45 }),
  elevasi: (f) => ({ pane: 'p-elevasi', stroke: false, fillColor: f.properties.warna_hex || '#14b8a6', fillOpacity: 0.42 }),
  batas: () => ({ pane: 'p-batas', color: '#ffffff', weight: 1, opacity: 0.75, dashArray: '3 4', fill: false }),
  sungai: (f) => f.properties.kategori_layer === 'garis_sungai'
    ? { pane: 'p-sungai', color: f.properties.warna || '#0ea5e9', weight: f.properties.weight || 4, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }
    : { pane: 'p-sungai', color: f.properties.warna || '#38bdf8', weight: 1, opacity: 0.6, dashArray: '4 4', fillColor: f.properties.warna || '#38bdf8', fillOpacity: f.properties.fill_opacity ?? 0.16 },
  jalan: (f) => ({ pane: 'p-jalan', color: f.properties.status_tergenang ? '#e11d48' : '#fda4af', weight: f.properties.weight || 5, opacity: 0.95, lineCap: 'round' }),
}
function popupHtml(id, p) {
  const row = (k, v) => (v == null || v === '' ? '' : `<div><b>${k}</b> ${esc(v)}</div>`)
  if (id === 'zona') return `<strong>${esc(p.nama_zona || 'Zona rawan')}</strong>${row('Kelas', p.kelas_kerawanan)}${row('Skor AHP', p.skor_total)}${row('Penyebab', p.faktor_penyebab_utama)}${row('Mitigasi', p.rekomendasi_mitigasi)}`
  if (id === 'batas') return `<strong>${esc(p.nama_kelurahan || p.nama_kecamatan)}</strong>${row('Kecamatan', p.nama_kecamatan)}${row('Status', p.status_siaga)}`
  if (id === 'elevasi') return `<strong>${esc(p.kelas_elevasi)}</strong>${row('Rentang', p.rentang_mdpl)}${row('Topografi', p.deskripsi_topografi)}`
  if (id === 'sungai') return `<strong>${esc(p.nama_sungai || p.zona_buffer)}</strong>${row('Tingkat bahaya', p.tingkat_bahaya)}${row('Jarak', p.jarak_meter && p.jarak_meter + ' m')}`
  if (id === 'jalan') return `<strong>${esc(p.nama_jalan)}</strong>${row('Kedalaman', p.kedalaman_genangan_cm != null && p.kedalaman_genangan_cm + ' cm')}${row('Status', p.status_tergenang ? 'Tergenang' : 'Aman')}${row('Catatan', p.keterangan)}`
  if (id === 'banjir') return `<strong>${esc(p.lokasi || p.nama_lokasi || 'Titik banjir')}</strong>${row('Kejadian', p.tanggal || p.tanggal_kejadian)}${row('Tinggi genangan', p.tinggi_genangan_cm && p.tinggi_genangan_cm + ' cm')}`
  return ''
}

/* ---------- pembantu peta ---------- */
const isWide = () => typeof window !== 'undefined' && window.innerWidth > 900
const fitOpts = (open = true) => (isWide() ? { paddingTopLeft: [open ? 420 : 110, 90], paddingBottomRight: [40, 40] } : { paddingTopLeft: [16, 80], paddingBottomRight: [16, open ? Math.round(window.innerHeight * 0.48) : 90] })

/** Kamera: kota → kecamatan terpilih → titik lokasi. Tidak ada aksi saat peta diklik. */
function Camera({ kec, pt, panelOpen }) {
  const map = useMap()
  const first = useRef(true)
  const openRef = useRef(panelOpen); openRef.current = panelOpen
  // panel dibuka/ditutup → pusatkan ulang supaya peta tidak tertutup
  useEffect(() => {
    if (first.current) return
    const t = setTimeout(() => {
      map.invalidateSize()
      if (pt) return
      const f = kec !== 'Semua' ? findKec(kec) : null
      map.flyToBounds(boundsOf(f || KOTA), { ...fitOpts(panelOpen), duration: 0.7 })
    }, 120)
    return () => clearTimeout(t)
  }, [panelOpen]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const f = kec !== 'Semua' ? findKec(kec) : null
    const b = boundsOf(f || KOTA)
    if (first.current) { map.fitBounds(b, { ...fitOpts(openRef.current), animate: false }); first.current = false; return }
    if (!pt) map.flyToBounds(b, { ...fitOpts(openRef.current), duration: 0.9 })
  }, [kec, map]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pt) return
    const z = Math.max(map.getZoom(), 15)
    // geser pusat agar titik tidak tertutup panel
    const off = isWide() ? L.point(-200, 0) : L.point(0, window.innerHeight * 0.3)
    const target = map.unproject(map.project([pt.lat, pt.lng], z).add(off), z)
    map.flyTo(target, z, { duration: 0.9 })
  }, [pt, map])
  return null
}

function PointsLayer({ id, data, onRoute }) {
  const pts = useMemo(() => (data?.features || []).filter((f) => f.geometry?.type === 'Point'), [data])
  return pts.map((f, i) => {
    const p = f.properties || {}, [lng, lat] = f.geometry.coordinates
    return (
      <Marker key={`${id}${p.id ?? i}`} position={[lat, lng]} icon={ICONS[id]}>
        <Popup>
          {id === 'posko' && (
            <div className="pp">
              <strong>{p.nama_posko}</strong><div>{p.alamat}</div>
              {p.kapasitas_jiwa != null && <div><b>Kapasitas</b> {p.terisi_jiwa ?? 0}/{p.kapasitas_jiwa} jiwa ({p.sisa_kapasitas ?? p.kapasitas_jiwa - (p.terisi_jiwa || 0)} tersisa)</div>}
              {p.fasilitas && <div><b>Fasilitas</b> {Array.isArray(p.fasilitas) ? p.fasilitas.join(', ') : p.fasilitas}</div>}
              {p.kontak_pj && <div><b>Kontak</b> <a href={`tel:${p.kontak_pj}`}>{p.kontak_pj}</a></div>}
              <button type="button" className="pp-btn" onClick={() => onRoute(p.id)}>Rute ke posko ini</button>
            </div>
          )}
          {id === 'air' && (
            <div className="pp">
              <strong>{p.nama_titik}</strong><div>{p.alamat}</div>
              {p.pengelola && <div><b>Pengelola</b> {p.pengelola}</div>}
              {p.jam_operasional && <div><b>Jam</b> {p.jam_operasional}</div>}
              <div><b>Status</b> {p.status_layak ? 'Layak' : 'Perlu pengecekan'}</div>
            </div>
          )}
          {id === 'banjir' && <div className="pp" dangerouslySetInnerHTML={{ __html: popupHtml('banjir', p) }} />}
        </Popup>
      </Marker>
    )
  })
}

const clock = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' })
const Ico = {
  back: <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5" /></svg>,
  pin: <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>,
  layers: <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></svg>,
  rain: <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 15a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 17 15z" /><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2" /></svg>,
  gps: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>,
  x: <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>,
  chev: <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10l4-4 4 4" /></svg>,
}

/** Terima "-1.61" atau tempelan "-1.61, 103.61" (koma desimal juga). */
const parseNum = (s) => { const v = parseFloat(String(s).trim().replace(',', '.')); return Number.isFinite(v) ? v : NaN }

export default function WebgisMap() {
  const { mapParams, closeMap, cuacaData, syncMapUrl } = useWebgis()
  const toast = useToast()
  const { locate, loading: gpsBusy } = useGeolocation()

  const [tab, setTab] = useState(mapParams.layers && mapParams.lat == null ? 'layer' : 'lokasi')
  const [panelOpen, setPanelOpen] = useState(true)
  const [kec, setKec] = useState(() => (mapParams.kecamatan && findKec(mapParams.kecamatan) ? findKec(mapParams.kecamatan).properties.nama_kecamatan : 'Semua'))
  const [on, setOn] = useState(() => Object.fromEntries(LAYERS.map((l) => [l.id, mapParams.layers ? mapParams.layers.includes(l.id) : !!l.on])))
  const [data, setData] = useState({}); const [ver, setVer] = useState({})
  const [busy, setBusy] = useState({}); const [errs, setErrs] = useState({}); const [tick, setTick] = useState(0)
  const [pt, setPt] = useState(mapParams.lat != null ? { lat: mapParams.lat, lng: mapParams.lng } : null)
  const [latIn, setLatIn] = useState(mapParams.lat ?? ''); const [lngIn, setLngIn] = useState(mapParams.lng ?? '')
  const [coordErr, setCoordErr] = useState('')
  const [risk, setRisk] = useState(null); const [route, setRoute] = useState(null); const [work, setWork] = useState(null)
  const [base, setBase] = useState(() => { try { return localStorage.getItem('sirandu-basemap') || 'satelit' } catch { return 'satelit' } })
  useEffect(() => { try { localStorage.setItem('sirandu-basemap', base) } catch { /* abaikan */ } }, [base])
  const [wxKec, setWxKec] = useState(null)
  const [rainFx, setRainFx] = useState(true)
  const [legOpen, setLegOpen] = useState(() => isWide())
  const [time, setTime] = useState(() => clock.format(new Date()))
  const [intro, setIntro] = useState(() => !prefersReducedMotion() && !mapParams.fromUrl)
  const loaded = useRef({}); const root = useRef(null)

  useEffect(() => { const t = setInterval(() => setTime(clock.format(new Date())), 30000); return () => clearInterval(t) }, [])

  // simpan keadaan ke URL → refresh membuka keadaan yang sama
  useEffect(() => {
    syncMapUrl({ kecamatan: kec, layers: LAYERS.filter((l) => on[l.id]).map((l) => l.id), lat: pt?.lat, lng: pt?.lng })
  }, [kec, on, pt, syncMapUrl])

  // Intro singkat: tirai terangkat lalu panel masuk (dilewati saat dibuka dari URL/refresh)
  useEffect(() => {
    if (!intro) return
    const el = root.current; if (!el) return
    const ctx = gsap.context(() => {
      gsap.timeline({ onComplete: () => setIntro(false) })
        .from(el.querySelectorAll('.gm-cv-w'), { yPercent: 110, duration: 0.7, ease: 'power4.out', stagger: 0.08 })
        .from(el.querySelector('.gm-cv-logo'), { scale: 0.6, opacity: 0, duration: 0.5, ease: 'back.out(2)' }, 0)
        .to(el.querySelector('.gm-curtain'), { yPercent: -100, duration: 0.8, ease: 'power4.inOut' }, '+=0.25')
        .from(el.querySelectorAll('.gm-in'), { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06 }, '<0.3')
    }, el)
    return () => ctx.revert()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // muat layer yang aktif (ulang bila filter kecamatan berubah untuk layer per-kecamatan)
  useEffect(() => {
    LAYERS.filter((l) => on[l.id]).forEach(async (l) => {
      const key = `${l.id}|${l.byKec ? kec : ''}`
      if (loaded.current[key]) return
      loaded.current[key] = true
      setBusy((b) => ({ ...b, [l.id]: true }))
      try {
        const g = await l.fetch(kec)
        setData((d) => ({ ...d, [l.id]: g })); setVer((v) => ({ ...v, [l.id]: (v[l.id] || 0) + 1 }))
        setErrs((x) => { const y = { ...x }; delete y[l.id]; return y })
      } catch (e) { loaded.current[key] = false; setErrs((x) => ({ ...x, [l.id]: e.message })) }
      finally { setBusy((b) => ({ ...b, [l.id]: false })) }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, kec, tick])
  const retry = () => { loaded.current = {}; setErrs({}); setTick((t) => t + 1) }
  const errList = Object.keys(errs).filter((id) => on[id])

  /* ---------- lokasi: hanya dari GPS atau koordinat ---------- */
  const placePoint = useCallback((lat, lng, how) => {
    setPt({ lat, lng }); setLatIn(lat); setLngIn(lng); setRisk(null); setRoute(null); setCoordErr(''); setTab('lokasi')
    const k = kecamatanAt(lat, lng)
    if (!k) toast.info('Titik berada di luar Kota Jambi. Analisis risiko hanya mencakup Kota Jambi.')
    else if (how === 'gps') toast.success(`Lokasi terdeteksi di Kec. ${k}.`)
  }, [toast])
  const useGps = async () => {
    try { const p = await locate(); placePoint(p.lat, p.lng, 'gps') } catch (e) { toast.error(e.message) }
  }
  const onLatChange = (v) => {
    // tempel "lat, lng" sekaligus ke kolom latitude
    const m = String(v).match(/^\s*(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)\s*$/)
    if (m && String(v).includes(' ')) { setLatIn(m[1]); setLngIn(m[2]) } else setLatIn(v)
    setCoordErr('')
  }
  const submitCoords = (e) => {
    e.preventDefault()
    const lat = parseNum(latIn), lng = parseNum(lngIn)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return setCoordErr('Isi latitude dan longitude dengan angka, mis. -1.6101 dan 103.6131.')
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return setCoordErr('Latitude harus −90 s.d. 90 dan longitude −180 s.d. 180.')
    if (lat > 0 && lng > 100 && lng < 105) return setCoordErr('Kota Jambi berada di selatan khatulistiwa. Latitude seharusnya negatif (mis. -1.61).')
    placePoint(+lat.toFixed(6), +lng.toFixed(6), 'input')
  }
  const clearPoint = () => { setPt(null); setRisk(null); setRoute(null); setLatIn(''); setLngIn('') }

  const doCek = async () => {
    if (!pt) return
    setWork('cek'); setRoute(null)
    try {
      const r = await api.cekRisikoLokasi(pt.lat, pt.lng)
      if (!r.tercakup_layanan) { setRisk(null); toast.info(r.message || 'Lokasi di luar cakupan layanan.') } else setRisk(r.data)
    } catch (e) { toast.error(e.message) } finally { setWork(null) }
  }
  const doRoute = async (poskoId) => {
    if (!pt) { setTab('lokasi'); setPanelOpen(true); toast.info('Tentukan lokasi Anda dulu: pakai GPS atau isi koordinat.'); return }
    setWork('rute'); setTab('lokasi'); setPanelOpen(true)
    try { const r = await api.hitungRuteEvakuasi(pt.lat, pt.lng, poskoId); setRoute(r.data); toast.success('Rute evakuasi berhasil dihitung.') }
    catch (e) { toast.error(e.message) } finally { setWork(null) }
  }

  /* ---------- turunan ---------- */
  const routeLine = useMemo(() => route?.geojson_rute?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || null, [route])
  const bm = BASEMAPS[base]
  const count = (id) => (data[id]?.features ? data[id].features.length : null)
  const kecFeature = kec !== 'Semua' ? findKec(kec) : null
  const ptKec = pt ? kecamatanAt(pt.lat, pt.lng) : null
  const cuacaBy = useMemo(() => { const m = new Map(); cuacaData.forEach((k) => m.set(norm(k.nama_kecamatan), k)); return m }, [cuacaData])
  const sum = { siaga: 0, waspada: 0, normal: 0 }
  cuacaData.forEach((k) => { const s = String(k.status_peringatan || 'normal').toLowerCase(); if (s.startsWith('siaga') || s.startsWith('awas')) sum.siaga++; else if (s.startsWith('waspada')) sum.waspada++; else sum.normal++ })
  const zonaLegend = useMemo(() => {
    const m = new Map()
    ;(data.zona?.features || []).forEach((f) => { const k = f.properties?.kelas_kerawanan; if (k && !m.has(k)) m.set(k, f.properties.warna_hex || '#f97316') })
    return [...m]
  }, [data.zona])
  const elevLegend = useMemo(() => {
    const m = new Map()
    ;(data.elevasi?.features || []).forEach((f) => { const k = f.properties?.kelas_elevasi; if (k && !m.has(k)) m.set(k, f.properties.warna_hex || '#14b8a6') })
    return [...m]
  }, [data.elevasi])
  const wxName = wxKec || ptKec || (kec !== 'Semua' ? kec : KECAMATAN.features[0].properties.nama_kecamatan)
  const wxF = findKec(wxName)
  const maxRain = Math.max(10, ...cuacaData.map((k) => +k.curah_hujan_terkini || 0))
  const activeIds = LAYERS.filter((l) => on[l.id]).map((l) => l.id)
  const rainingN = cuacaData.filter((k) => +k.curah_hujan_terkini >= 0.3).length

  return (
    <div ref={root} className={`gm gm-${base}${base === 'gelap' ? ' gm-dark' : ''}${panelOpen ? ' panel-on' : ''}`}>
      <div className="gm-mapwrap">
        <MapContainer center={[-1.61, 103.61]} zoom={12} zoomSnap={0.25} zoomDelta={0.5} minZoom={10} maxZoom={19} className="gm-map" zoomControl={false}>
          <ZoomControl position="bottomright" />
          <TileLayer key={base} attribution={bm.attr} url={bm.url} maxNativeZoom={bm.native} maxZoom={19} />
          <Pane name="p-ref" style={{ zIndex: 445, pointerEvents: 'none' }}><TileLayer key={`${base}-ref`} url={bm.ref} maxNativeZoom={bm.native} maxZoom={19} opacity={base === 'satelit' ? 0.85 : 1} /></Pane>
          <Camera kec={kec} pt={pt} panelOpen={panelOpen} />
          {Object.entries(PANE_Z).map(([n, z]) => <Pane key={n} name={`p-${n}`} style={{ zIndex: z }} />)}

          {['elevasi', 'zona', 'sungai', 'batas', 'jalan'].map((id) => on[id] && data[id] && (
            <GeoJSON key={`${id}-${ver[id]}`} pane={`p-${id}`} data={data[id]} style={style[id]}
              onEachFeature={(f, layer) => layer.bindPopup(`<div class="pp">${popupHtml(id, f.properties || {})}</div>`)} />
          ))}

          {/* batas & label kecamatan (data bawaan, selalu rapi) */}
          <GeoJSON key={`kec-case-${base}`} pane="p-kec" data={KECAMATAN} interactive={false} style={() => ({ pane: 'p-kec', color: base === 'terang' ? '#ffffff' : '#04121e', weight: 4, opacity: base === 'terang' ? 0.9 : 0.35, fill: false })} />
          <GeoJSON key={`kec-line-${kec}-${base}`} pane="p-kec" data={KECAMATAN} interactive={false}
            style={(f) => ({ pane: 'p-kec', color: base === 'terang' ? '#0B3C5D' : '#ffffff', weight: kecFeature && norm(f.properties.nama_kecamatan) === norm(kec) ? 3 : 1.6, opacity: 0.95, fill: false })} />
          <GeoJSON key="kota" pane="p-kec" data={KOTA} interactive={false} style={() => ({ pane: 'p-kec', color: '#6EC1E4', weight: 3.5, opacity: 1, fill: false })} />
          {kecFeature && <GeoJSON key={`mask-${kec}`} pane="p-mask" data={maskFor(kecFeature)} interactive={false} style={() => ({ pane: 'p-mask', stroke: false, fillColor: '#03111d', fillOpacity: 0.55 })} />}
          {KECAMATAN.features.map((f) => {
            const [x, y] = f.properties.label, c = cuacaBy.get(norm(f.properties.nama_kecamatan))
            return (
              <Marker key={f.properties.nama_kecamatan} position={[y, x]} icon={L.divIcon({ className: '', html: '', iconSize: [0, 0] })} interactive={false}>
                <Tooltip permanent direction="center" className={`gm-kl${kecFeature && norm(f.properties.nama_kecamatan) !== norm(kec) ? ' dim' : ''}`}>
                  {c && <i style={{ background: statusColor(c.status_peringatan) }} />}{f.properties.nama_kecamatan}{c && +c.curah_hujan_terkini >= 0.3 && <em className="gm-kl-r">{(+c.curah_hujan_terkini).toFixed(1).replace('.', ',')} mm</em>}
                </Tooltip>
              </Marker>
            )
          })}

          {on.banjir && <PointsLayer id="banjir" data={data.banjir} />}
          {on.posko && <PointsLayer id="posko" data={data.posko} onRoute={doRoute} />}
          {on.air && <PointsLayer id="air" data={data.air} />}
          {routeLine && <Polyline pane="p-route" positions={routeLine} pathOptions={{ color: '#ffffff', weight: 10, opacity: 0.95 }} />}
          {routeLine && <Polyline pane="p-route" positions={routeLine} pathOptions={{ color: '#1D6FA3', weight: 5, opacity: 1, className: 'route-line' }} />}
          {pt && <Marker position={[pt.lat, pt.lng]} icon={ICONS.me} zIndexOffset={1000}><Popup><div className="pp"><strong>Lokasi Anda</strong><div>{pt.lat}, {pt.lng}</div>{ptKec && <div>Kec. {ptKec}</div>}</div></Popup></Marker>}
          <RainLayer cuaca={cuacaData} enabled={rainFx} />
        </MapContainer>
      </div>

      {/* ---------- bilah atas ---------- */}
      <header className="gm-top gm-in">
        <button type="button" className="gm-back" onClick={closeMap} aria-label="Kembali ke beranda">{Ico.back}<img src={logo} alt="" width="30" height="30" /><span><b>SIRANDU</b><small>Peta rawan banjir · Kota Jambi</small></span></button>
        <div className="gm-top-r">
          <button type="button" className={`gm-status${sum.siaga ? ' hot' : sum.waspada ? ' warm' : ''}`} onClick={() => { setTab('cuaca'); setPanelOpen(true) }} title="Lihat status cuaca">
            <i className="gm-live" /><span>{cuacaData.length ? (sum.siaga ? `${sum.siaga} kecamatan siaga` : sum.waspada ? `${sum.waspada} kecamatan waspada` : 'Semua kecamatan normal') : 'Status cuaca'}</span><b>{time}</b>
          </button>
          <div className="gm-seg" role="tablist" aria-label="Peta dasar">
            {Object.entries(BASEMAPS).map(([k, v]) => <button key={k} type="button" role="tab" aria-selected={base === k} className={base === k ? 'on' : ''} onClick={() => setBase(k)} title={`Peta ${v.label.toLowerCase()}`}>{BASE_ICON[k]}<span>{v.label}</span></button>)}
          </div>
        </div>
      </header>

      {errList.length > 0 && (
        <div className="gm-off" role="alert">
          <span className="gm-off-i">!</span>
          <div><b>Sebagian layer belum dimuat</b><span>{LAYERS.filter((l) => errList.includes(l.id)).map((l) => l.label).join(', ')} · {errs[errList[0]]}</span></div>
          <button type="button" onClick={retry}>Coba lagi</button>
        </div>
      )}

      {/* ---------- dok saat panel ditutup ---------- */}
      <nav className="gm-dock" aria-label="Buka panel" aria-hidden={panelOpen} inert={panelOpen ? '' : undefined}>
        {[['lokasi', 'Lokasi', Ico.pin], ['layer', 'Layer', Ico.layers], ['cuaca', 'Cuaca', Ico.rain]].map(([k, t, ic]) => (
          <button key={k} type="button" onClick={() => { setTab(k); setPanelOpen(true) }} className={tab === k ? 'on' : ''}>{ic}<span>{t}</span></button>
        ))}
      </nav>

      {/* ---------- panel ---------- */}
      <aside className="gm-panel gm-in" aria-label="Panel peta">
        <button type="button" className="gm-grab" onClick={() => setPanelOpen((o) => !o)} aria-expanded={panelOpen} aria-label={panelOpen ? 'Sembunyikan panel' : 'Tampilkan panel'}><i /></button>
        <button type="button" className="gm-pclose" onClick={() => setPanelOpen(false)} aria-label="Tutup panel" title="Tutup panel">{Ico.x}</button>
        <nav className="gm-tabs" role="tablist" style={{ '--ti': ['lokasi', 'layer', 'cuaca'].indexOf(tab) }}>
          <span className="gm-tab-ind" aria-hidden="true" />
          {[['lokasi', 'Lokasi', Ico.pin], ['layer', 'Layer', Ico.layers], ['cuaca', 'Cuaca', Ico.rain]].map(([k, t, ic]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setPanelOpen(true) }}>
              {ic}<span>{t}</span>{k === 'layer' && <em>{activeIds.length}</em>}{k === 'lokasi' && pt && <i className="dotp" />}
            </button>
          ))}
        </nav>

        <div className="gm-body">
          {tab === 'lokasi' && (
            <div className="gm-sec">
              <h2>Seberapa rawan lokasi Anda?</h2>
              <ol className="gm-steps" aria-label="Langkah">
                <li className={pt ? 'done' : 'now'}><i>1</i>Tentukan titik</li>
                <li className={risk ? 'done' : pt ? 'now' : ''}><i>2</i>Cek risiko</li>
                <li className={route ? 'done' : risk ? 'now' : ''}><i>3</i>Rute ke posko</li>
              </ol>
              <button type="button" className="gm-gps" onClick={useGps} disabled={gpsBusy}>{Ico.gps}{gpsBusy ? 'Mendeteksi lokasi…' : 'Gunakan lokasi saya (GPS)'}</button>
              <div className="gm-or"><span>atau masukkan koordinat</span></div>
              <form className="gm-coord" onSubmit={submitCoords} noValidate>
                <label>Latitude<input inputMode="decimal" autoComplete="off" value={latIn} onChange={(e) => onLatChange(e.target.value)} placeholder="-1.6101" aria-invalid={!!coordErr} /></label>
                <label>Longitude<input inputMode="decimal" autoComplete="off" value={lngIn} onChange={(e) => { setLngIn(e.target.value); setCoordErr('') }} placeholder="103.6131" aria-invalid={!!coordErr} /></label>
                <button type="submit" className="gm-show">Tampilkan titik</button>
                {coordErr ? <p className="gm-err" role="alert">{coordErr}</p> : <p className="gm-hint">Bisa tempel sekaligus, mis. <code>-1.6101, 103.6131</code>. Klik peta tidak menaruh titik, jadi titik tidak tergeser tanpa sengaja. Koordinat tidak disimpan di server.</p>}
              </form>

              {pt && (
                <div className="gm-me">
                  <div className="gm-me-h"><span className="mk-me sm"><i /></span><div><b>{ptKec ? `Kec. ${ptKec}` : 'Di luar Kota Jambi'}</b><small>{pt.lat}, {pt.lng}</small></div><button type="button" onClick={clearPoint} aria-label="Hapus titik">{Ico.x}</button></div>
                  <div className="gm-act">
                    <button type="button" onClick={doCek} disabled={!!work}>{work === 'cek' ? 'Menganalisis…' : 'Cek risiko'}</button>
                    <button type="button" className="alt" onClick={() => doRoute()} disabled={!!work}>{work === 'rute' ? 'Menghitung…' : 'Rute ke posko terdekat'}</button>
                  </div>
                </div>
              )}

              {risk && (
                <section className="gm-card" aria-live="polite" style={{ '--c': risk.risiko_banjir.warna_badge }}>
                  <div className="gm-badge"><i />{risk.risiko_banjir.kelas_kerawanan}<em>skor {risk.risiko_banjir.skor_total}</em></div>
                  <p className="gm-where"><b>{risk.wilayah.kelurahan || '—'}</b>, Kec. {risk.wilayah.kecamatan}</p>
                  <dl>
                    <dt>Ketinggian</dt><dd>{risk.topografi_demnas.kelas_elevasi} ({risk.topografi_demnas.rentang_ketinggian})</dd>
                    <dt>Cuaca</dt><dd><span className="gm-st" style={{ '--c': statusColor(risk.pantauan_cuaca_terkini.status_peringatan) }}>{risk.pantauan_cuaca_terkini.status_peringatan}</span> · {risk.pantauan_cuaca_terkini.curah_hujan_mm_jam} mm/jam</dd>
                    <dt>Penyebab</dt><dd>{risk.risiko_banjir.faktor_penyebab_utama}</dd>
                    <dt>Saran</dt><dd>{risk.rekomendasi_dan_mitigasi}</dd>
                  </dl>
                </section>
              )}
              {route && (
                <section className="gm-card gm-route" aria-live="polite">
                  <h4>Rute ke {route.posko_tujuan.nama_posko}</h4>
                  <div className="gm-stats"><b>{route.ringkasan_rute.total_jarak_meter} m</b><span>{route.ringkasan_rute.estimasi_jalan_kaki_menit} mnt jalan kaki</span><span>{route.ringkasan_rute.estimasi_kendaraan_menit} mnt motor</span></div>
                  <p className="gm-safe">{route.ringkasan_rute.status_keamanan}</p>
                  <p className="gm-cap">Kapasitas tersisa {route.posko_tujuan.kapasitas_tersisa} jiwa{route.posko_tujuan.kontak_darurat ? <> · <a href={`tel:${route.posko_tujuan.kontak_darurat}`}>{route.posko_tujuan.kontak_darurat}</a></> : null}</p>
                  <ol>{route.instruksi_navigasi.map((st) => <li key={st.urutan}><span>{st.nama_jalan}</span><em>{st.jarak_meter} m</em></li>)}</ol>
                </section>
              )}
            </div>
          )}

          {tab === 'layer' && (
            <div className="gm-sec">
              <div className="gm-presets" role="group" aria-label="Mode cepat">
                {PRESETS.map((pr) => {
                  const act = LAYERS.every((l) => !!on[l.id] === pr.layers.includes(l.id))
                  return <button key={pr.id} type="button" className={act ? 'on' : ''} aria-pressed={act} onClick={() => setOn(Object.fromEntries(LAYERS.map((l) => [l.id, pr.layers.includes(l.id)])))}>{pr.label}</button>
                })}
              </div>
              <label className="gm-sel">Wilayah
                <select value={kec} onChange={(e) => setKec(e.target.value)}>
                  <option value="Semua">Seluruh Kota Jambi</option>
                  {KECAMATAN.features.map((f) => <option key={f.properties.nama_kecamatan} value={f.properties.nama_kecamatan}>Kec. {f.properties.nama_kecamatan}</option>)}
                </select>
              </label>
              <label className={`gm-lyr gm-fx${rainFx ? ' on' : ''}`} style={{ '--c': '#6EC1E4' }}>
                <span className="gm-sw sw-fx">{Ico.rain}</span>
                <span className="t"><b>Animasi hujan langsung</b><small>{rainingN ? `${rainingN} kecamatan sedang hujan` : 'Tidak ada hujan saat ini'}</small></span>
                <input type="checkbox" className="gm-tg" checked={rainFx} onChange={() => setRainFx((x) => !x)} />
              </label>
              {GROUPS.map((g) => (
                <div className="gm-grp" key={g}>
                  <h3>{g}</h3>
                  {LAYERS.filter((l) => l.group === g).map((l) => {
                    const n = count(l.id)
                    return (
                      <label key={l.id} className={`gm-lyr${on[l.id] ? ' on' : ''}${errs[l.id] && on[l.id] ? ' err' : ''}`} style={{ '--c': l.c }}>
                        <span className={`gm-sw sw-${l.id}`} />
                        <span className="t"><b>{l.label}</b><small>{errs[l.id] && on[l.id] ? 'Gagal dimuat dari server' : l.desc}</small></span>
                        {busy[l.id] ? <span className="gm-spin" aria-label="memuat" /> : on[l.id] && n != null ? <em>{n}</em> : null}
                        <input type="checkbox" className="gm-tg" checked={!!on[l.id]} onChange={() => setOn((o) => ({ ...o, [l.id]: !o[l.id] }))} />
                      </label>
                    )
                  })}
                </div>
              ))}
              <p className="gm-hint">Garis putih tebal = batas 11 kecamatan (selalu tampil). Klik area berwarna di peta untuk melihat detailnya.</p>
            </div>
          )}

          {tab === 'cuaca' && (
            <div className="gm-sec">
              <div className="gm-sum">
                <span style={{ '--c': STATUS.siaga }}><i /><b>{sum.siaga}</b>siaga</span>
                <span style={{ '--c': STATUS.waspada }}><i /><b>{sum.waspada}</b>waspada</span>
                <span style={{ '--c': STATUS.normal }}><i /><b>{sum.normal}</b>normal</span>
              </div>
              <WeatherHistory key={wxName} kecamatan={wxName} cuacaItem={cuacaBy.get(norm(wxName)) || null}
                lat={wxF?.properties.label[1]} lng={wxF?.properties.label[0]} statusColor={statusColor} />
              <h3 className="gm-h3">Hujan sekarang per kecamatan</h3>
              <ul className="gm-rain">
                {KECAMATAN.features.map((f) => {
                  const nm = f.properties.nama_kecamatan, c = cuacaBy.get(norm(nm)), v = +c?.curah_hujan_terkini || 0
                  return (
                    <li key={nm}><button type="button" className={norm(nm) === norm(wxName) ? 'on' : ''} onClick={() => setWxKec(nm)} style={{ '--c': statusColor(c?.status_peringatan) }}>
                      <span className="n"><i />{nm}</span>
                      <span className="gm-rb"><u style={{ width: c ? `${Math.max(3, (v / maxRain) * 100)}%` : 0 }} /></span>
                      <em>{c ? `${v.toFixed(1)}` : '–'}</em>
                    </button></li>
                  )
                })}
              </ul>
              <p className="gm-hint">mm per jam · klik kecamatan untuk melihat riwayatnya.</p>
            </div>
          )}
        </div>
      </aside>

      <button type="button" className={`gm-fab gm-in${gpsBusy ? ' busy' : ''}`} onClick={useGps} disabled={gpsBusy} aria-label="Gunakan lokasi saya" title="Lokasi saya">{Ico.gps}</button>

      {/* ---------- legenda ---------- */}
      {!legOpen && <button type="button" className="gm-legbtn gm-in" onClick={() => setLegOpen(true)}>{Ico.layers}Legenda</button>}
      {legOpen && (
        <div className="gm-leg gm-in" aria-label="Legenda">
          <button type="button" className="gm-legx" onClick={() => setLegOpen(false)} aria-label="Sembunyikan legenda">{Ico.x}</button>
          {on.zona && zonaLegend.length > 0 && <div><b>Kerawanan</b>{zonaLegend.map(([k, c]) => <span key={k}><i className="sq" style={{ background: c }} />{k}</span>)}</div>}
          {on.elevasi && elevLegend.length > 0 && <div><b>Ketinggian</b>{elevLegend.map(([k, c]) => <span key={k}><i className="sq" style={{ background: c }} />{k}</span>)}</div>}
          <div>
            {on.posko && <span><i className="mk posko xs" />Posko</span>}
            {on.air && <span><i className="mk air xs" />Air bersih</span>}
            {on.banjir && <span><i className="mk banjir xs" />Banjir historis</span>}
            {on.sungai && <span><i className="ln" style={{ background: '#0ea5e9' }} />Sungai</span>}
            {on.jalan && <span><i className="ln" style={{ background: '#e11d48' }} />Jalan tergenang</span>}
            {routeLine && <span><i className="ln" style={{ background: '#1D6FA3' }} />Rute evakuasi</span>}
            {pt && <span><i className="mk-me xs"><i /></i>Lokasi Anda</span>}
            {rainFx && rainingN > 0 && <span><i className="rn" />Sedang hujan</span>}
            <span><i className="ln" style={{ background: '#fff', boxShadow: '0 0 0 1px #04121e' }} />Batas kecamatan</span>
          </div>
        </div>
      )}

      <div className="gm-curtain" aria-hidden="true" style={{ display: intro ? undefined : 'none' }}>
        <img className="gm-cv-logo" src={logo} alt="" width="84" height="84" />
        <div className="gm-cv-t"><span className="gm-cv-m"><span className="gm-cv-w">SIRANDU</span></span><span className="gm-cv-m"><span className="gm-cv-w">WebGIS.</span></span></div>
      </div>
    </div>
  )
}

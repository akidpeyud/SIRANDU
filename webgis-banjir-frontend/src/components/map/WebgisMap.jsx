import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './map.css'
import { MapContainer, TileLayer, GeoJSON, Marker, Polyline, Popup, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import { useWebgis } from '../../context/WebgisContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useGeolocation } from '../../hooks/useGeolocation.js'
import * as api from '../../services/api.js'
import { gsap, prefersReducedMotion } from '../../lib/motion.jsx'
import logo from '../../assets/logo.png'

const CENTER = [-1.61, 103.61]
const LAYERS = [
  { id: 'zona', label: 'Zona rawan banjir', fetch: (k) => api.getZonaRawan(k), on: true },
  { id: 'batas', label: 'Batas kecamatan/kelurahan', fetch: (k) => api.getBatasAdministrasi(k) },
  { id: 'elevasi', label: 'Ketinggian tanah (DEMNAS)', fetch: () => api.getElevasi() },
  { id: 'sungai', label: 'Sungai & buffer Batanghari', fetch: () => api.getSungaiBuffer() },
  { id: 'posko', label: 'Posko pengungsian', fetch: (k) => api.getPoskoPengungsian(k), on: true },
  { id: 'air', label: 'Sumber air bersih', fetch: (k) => api.getSumberAirBersih(k) },
  { id: 'banjir', label: 'Titik banjir historis', fetch: () => api.getTitikBanjirHistoris() },
  { id: 'jalan', label: 'Jalan tergenang', fetch: () => api.getRuasJalanTergenang() },
]
const LAYER_META = {
  zona: ['#f97316', 'Area berwarna menurut kelas kerawanan'], batas: ['#6EC1E4', 'Garis batas wilayah'], elevasi: ['#22d3ee', 'Dataran rendah hingga tinggi'],
  sungai: ['#38bdf8', 'Sungai dan zona penyangga'], posko: ['#3b9be0', 'Tempat pengungsian + kapasitas'], air: ['#06b6d4', 'Titik air layak pakai'],
  banjir: ['#ef4444', 'Kejadian banjir sebelumnya'], jalan: ['#fb7185', 'Ruas jalan yang pernah terendam'],
}
// Semua basemap di bawah tanpa API key. (CARTO kini mewajibkan key; OSM memblokir halaman file://.)
const BASEMAPS = {
  gelap: { label: 'Gelap', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles &copy; Esri', sub: 'abc', native: 16 },
  terang: { label: 'Terang', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles &copy; Esri', sub: 'abc', native: 19 },
  satelit: { label: 'Satelit', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles &copy; Esri', sub: 'abc', native: 19 },
}
const STATUS_COLOR = { Normal: '#10b981', Waspada: '#f59e0b', Siaga: '#ef4444' }
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const dot = (cls) => L.divIcon({ className: '', html: `<span class="mk ${cls}"></span>`, iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -10] })
const ICONS = { posko: dot('posko'), air: dot('air'), banjir: dot('banjir'), me: dot('me') }

function Fit({ geo }) {
  const map = useMap(); const done = useRef(false)
  useEffect(() => { if (geo && !done.current) { try { const b = L.geoJSON(geo).getBounds(); if (b.isValid()) { map.fitBounds(b, window.innerWidth > 900 ? { paddingTopLeft: [470, 96], paddingBottomRight: [350, 150], maxZoom: 14 } : { paddingTopLeft: [16, 250], paddingBottomRight: [16, 280] }); done.current = true } } catch { /* abaikan */ } } }, [geo, map])
  return null
}
function Picker({ onPick }) { useMapEvents({ click: (e) => onPick(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)) }); return null }
function FlyTo({ pt }) { const map = useMap(); useEffect(() => { if (pt) map.flyTo([pt.lat, pt.lng], Math.max(map.getZoom(), 15), { duration: 0.9 }) }, [pt, map]); return null }

const style = {
  zona: (f) => ({ color: f.properties.warna_hex || '#f97316', weight: 1.2, fillColor: f.properties.warna_hex || '#f97316', fillOpacity: 0.42 }),
  batas: () => ({ color: '#9bd8f2', weight: 1.6, fillOpacity: 0, dashArray: '5 5' }),
  elevasi: (f) => ({ color: '#ffffff', weight: 0.5, fillColor: f.properties.warna_hex || '#6EC1E4', fillOpacity: 0.45 }),
  sungai: (f) => f.properties.kategori_layer === 'garis_sungai'
    ? { color: f.properties.warna || '#0284c7', weight: f.properties.weight || 4 }
    : { color: f.properties.warna || '#38bdf8', weight: 1, fillColor: f.properties.warna || '#38bdf8', fillOpacity: f.properties.fill_opacity ?? 0.25 },
  jalan: (f) => ({ color: f.properties.warna_garis || '#ef4444', weight: f.properties.weight || 5 }),
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

function PoskoAirLayer({ id, data, onRoute }) {
  const pts = useMemo(() => (data?.features || []).filter((f) => f.geometry?.type === 'Point'), [data])
  return pts.map((f) => {
    const p = f.properties, [lng, lat] = f.geometry.coordinates
    return (
      <Marker key={`${id}${p.id}`} position={[lat, lng]} icon={ICONS[id]}>
        <Popup>
          {id === 'posko' ? (
            <div className="pp">
              <strong>{p.nama_posko}</strong><div>{p.alamat}</div>
              <div><b>Kapasitas</b> {p.terisi_jiwa}/{p.kapasitas_jiwa} jiwa ({p.sisa_kapasitas} tersisa)</div>
              {p.fasilitas && <div><b>Fasilitas</b> {Array.isArray(p.fasilitas) ? p.fasilitas.join(', ') : p.fasilitas}</div>}
              {p.kontak_pj && <div><b>Kontak</b> <a href={`tel:${p.kontak_pj}`}>{p.kontak_pj}</a></div>}
              <button type="button" className="pp-btn" onClick={() => onRoute(p.id)}>Rute ke posko ini</button>
            </div>
          ) : (
            <div className="pp">
              <strong>{p.nama_titik}</strong><div>{p.alamat}</div>
              <div><b>Pengelola</b> {p.pengelola}</div>
              {p.jam_operasional && <div><b>Jam</b> {p.jam_operasional}</div>}
              <div><b>Status</b> {p.status_layak ? 'Layak' : 'Perlu pengecekan'}</div>
            </div>
          )}
        </Popup>
      </Marker>
    )
  })
}
const SHORT = { zona: 'Zona rawan', batas: 'Batas wilayah', elevasi: 'Ketinggian', sungai: 'Sungai', posko: 'Posko', air: 'Air bersih', banjir: 'Titik banjir', jalan: 'Jalan tergenang' }
const clock = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' })

function Count({ to }) {
  const ref = useRef(null); const last = useRef(0)
  useEffect(() => {
    if (prefersReducedMotion()) { ref.current.textContent = to; last.current = to; return }
    const o = { v: last.current }
    const t = gsap.to(o, { v: to, duration: 1.1, ease: 'power3.out', delay: 0.2, onUpdate: () => { ref.current.textContent = Math.round(o.v) } })
    last.current = to
    return () => t.kill()
  }, [to])
  return <span ref={ref}>0</span>
}

export default function WebgisMap() {
  const { mapParams, closeMap, cuacaData } = useWebgis()
  const toast = useToast()
  const { locate, loading: gpsBusy } = useGeolocation()
  const [kec, setKec] = useState(mapParams.kecamatan || 'Semua')
  const [on, setOn] = useState(() => Object.fromEntries(LAYERS.map((l) => [l.id, mapParams.layers ? mapParams.layers.includes(l.id) : !!l.on])))
  const [data, setData] = useState({})
  const [busy, setBusy] = useState({})
  const [pt, setPt] = useState(mapParams.lat != null ? { lat: mapParams.lat, lng: mapParams.lng } : null)
  const [latIn, setLatIn] = useState(mapParams.lat ?? ''); const [lngIn, setLngIn] = useState(mapParams.lng ?? '')
  const [risk, setRisk] = useState(null); const [route, setRoute] = useState(null)
  const [work, setWork] = useState(null); const [drawer, setDrawer] = useState(mapParams.lat != null)
  const [base, setBase] = useState('gelap')
  const [errs, setErrs] = useState({}); const [tick, setTick] = useState(0)
  const [wxOpen, setWxOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 900)
  const [time, setTime] = useState(() => clock.format(new Date()))
  const [intro, setIntro] = useState(() => !prefersReducedMotion())
  const loaded = useRef({}); const root = useRef(null)

  useEffect(() => { const t = setInterval(() => setTime(clock.format(new Date())), 30000); return () => clearInterval(t) }, [])

  // Intro: tirai biru terangkat, lalu elemen masuk berurutan.
  useEffect(() => {
    if (!intro) return
    const el = root.current; if (!el) return
    // gsap.context + revert: aman untuk React StrictMode (mode dev menjalankan efek dua kali).
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => setIntro(false) })
      tl.from(el.querySelectorAll('.gm-cv-w'), { yPercent: 110, duration: 0.8, ease: 'power4.out', stagger: 0.08 })
        .from(el.querySelector('.gm-cv-logo'), { scale: 0.6, opacity: 0, duration: 0.6, ease: 'back.out(2)' }, 0)
        .to(el.querySelector('.gm-curtain'), { yPercent: -100, duration: 0.9, ease: 'power4.inOut' }, '+=0.35')
        .from(el.querySelector('.gm-mapwrap'), { scale: 1.14, duration: 1.8, ease: 'power3.out' }, '<0.1')
        .from(el.querySelectorAll('.gm-in'), { y: 34, opacity: 0, filter: 'blur(10px)', duration: 0.9, ease: 'power3.out', stagger: 0.07 }, '<0.35')
    }, el)
    return () => ctx.revert()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Muat layer saat diaktifkan (atau filter kecamatan berubah).
  useEffect(() => {
    LAYERS.filter((l) => on[l.id]).forEach(async (l) => {
      const key = `${l.id}|${['zona', 'batas', 'posko', 'air'].includes(l.id) ? kec : ''}`
      if (loaded.current[key]) return
      loaded.current[key] = true
      setBusy((b) => ({ ...b, [l.id]: true }))
      try { const g = await l.fetch(kec); setData((d) => ({ ...d, [l.id]: g })) }
      catch (e) { loaded.current[key] = false; setErrs((x) => ({ ...x, [l.id]: e.message })) }
      finally { setBusy((b) => ({ ...b, [l.id]: false })) }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, kec, tick])

  useEffect(() => { // batas kota dipakai untuk fit bounds walau layer dimatikan
    api.getBatasAdministrasi().then((g) => setData((d) => ({ ...d, _fit: g }))).catch(() => {})
  }, [tick])
  const retry = () => { loaded.current = {}; setErrs({}); setTick((t) => t + 1) }
  const errList = Object.keys(errs)

  const setPoint = useCallback((lat, lng) => { setPt({ lat, lng }); setLatIn(lat); setLngIn(lng); setRisk(null); setRoute(null) }, [])
  const useGps = async () => {
    try { const p = await locate(); setPoint(p.lat, p.lng); toast.success(`Lokasi terdeteksi (akurasi ±${p.akurasi} m).`) }
    catch (e) { toast.error(e.message) }
  }
  const fromInputs = () => {
    const lat = parseFloat(latIn), lng = parseFloat(lngIn)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) { toast.error('Masukkan latitude dan longitude yang valid, atau pakai tombol GPS.'); return null }
    setPt({ lat, lng }); return { lat, lng }
  }
  const doCek = async () => {
    const p = fromInputs(); if (!p) return
    setWork('cek'); setRoute(null)
    try {
      const r = await api.cekRisikoLokasi(p.lat, p.lng)
      if (!r.tercakup_layanan) { setRisk(null); toast.info(r.message) } else { setRisk(r.data); setDrawer(true) }
    } catch (e) { toast.error(e.message) } finally { setWork(null) }
  }
  const doRoute = async (poskoId) => {
    const p = pt || fromInputs(); if (!p) { setDrawer(true); toast.info('Tentukan lokasi Anda dulu: pakai GPS, klik peta, atau isi koordinat.'); return }
    setWork('rute')
    try {
      const r = await api.hitungRuteEvakuasi(p.lat, p.lng, poskoId)
      setRoute(r.data); setDrawer(true); toast.success('Rute evakuasi aman berhasil dihitung.')
    } catch (e) { toast.error(e.message) } finally { setWork(null) }
  }

  const routeLine = useMemo(() => route?.geojson_rute?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || null, [route])
  const bm = BASEMAPS[base]
  const activeCount = LAYERS.filter((l) => on[l.id]).length
  const count = (id) => (data[id]?.features ? data[id].features.length : null)
  const stColor = (st) => STATUS_COLOR[st] || '#10b981'
  const siaga = cuacaData.filter((k) => k.status_peringatan === 'Siaga').length
  const waspada = cuacaData.filter((k) => k.status_peringatan === 'Waspada').length
  const normal = cuacaData.length - siaga - waspada
  const maxRain = Math.max(12, ...cuacaData.map((k) => +k.curah_hujan_terkini || 0))

  return (
    <div ref={root} className={`gm gm-${base}${drawer ? ' drawer-on' : ''}`}>
      <div className="gm-mapwrap">
        <MapContainer center={CENTER} zoom={12} className="gm-map" zoomControl={false}>
          <ZoomControl position="bottomright" />
          <TileLayer key={base} attribution={bm.attr} url={bm.url} subdomains={bm.sub} maxNativeZoom={bm.native} maxZoom={19} />
          <Fit geo={data._fit} />
          <Picker onPick={setPoint} />
          <FlyTo pt={pt} />
          {['elevasi', 'zona', 'batas', 'sungai', 'jalan'].map((id) => on[id] && data[id] && (
            <GeoJSON key={`${id}${kec}${data[id].features?.length}`} data={data[id]} style={style[id]}
              onEachFeature={(f, layer) => layer.bindPopup(`<div class="pp">${popupHtml(id, f.properties || {})}</div>`)} />
          ))}
          {on.banjir && data.banjir && (data.banjir.features || []).map((f, i) => f.geometry?.type === 'Point' && (
            <Marker key={`b${i}`} position={[f.geometry.coordinates[1], f.geometry.coordinates[0]]} icon={ICONS.banjir}><Popup><div className="pp" dangerouslySetInnerHTML={{ __html: popupHtml('banjir', f.properties || {}) }} /></Popup></Marker>
          ))}
          {on.posko && <PoskoAirLayer id="posko" data={data.posko} onRoute={doRoute} />}
          {on.air && <PoskoAirLayer id="air" data={data.air} />}
          {pt && <Marker position={[pt.lat, pt.lng]} icon={ICONS.me}><Popup>Lokasi Anda<br />{pt.lat}, {pt.lng}</Popup></Marker>}
          {routeLine && <Polyline positions={routeLine} pathOptions={{ color: '#6EC1E4', weight: 6, opacity: 0.95, className: 'route-line' }} />}
        </MapContainer>
      </div>
      <div className="gm-vig" aria-hidden="true" />
      <div className="gm-guides" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((i) => <span key={i} />)}</div>

      {/* Navigasi */}
      <header className="gm-nav gm-in">
        <a className="gm-logo" href="#top" onClick={(e) => { e.preventDefault(); closeMap() }} aria-label="Kembali ke beranda">
          <img src={logo} alt="" width="40" height="40" /><b>SIRANDU</b>
        </a>
        <div className="gm-nav-r">
          <span className="gm-time"><i className="gm-live" />Jambi <b>{time}</b></span>
          <div className="gm-seg" role="tablist" aria-label="Gaya peta">
            {Object.entries(BASEMAPS).map(([k, v]) => <button key={k} type="button" role="tab" aria-selected={base === k} className={base === k ? 'on' : ''} onClick={() => setBase(k)}>{v.label}</button>)}
          </div>
          <button type="button" className="gm-x" onClick={closeMap}>Tutup<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg></button>
        </div>
      </header>

      {errList.length > 0 && (
        <div className="gm-off" role="alert">
          <span className="gm-off-i">!</span>
          <div><b>Server SIRANDU belum terhubung</b><span>{errs[errList[0]]}. Layer tertunda: {errList.map((id) => LAYERS.find((l) => l.id === id)?.label).join(', ')}.</span></div>
          <button type="button" onClick={retry}>Coba lagi</button>
        </div>
      )}

      {/* Kolom editorial kiri */}
      <section className="gm-hero" aria-label="Ringkasan">
        <div className="gm-hero-top">
          <p className="gm-eb gm-in">WebGIS · data langsung</p>
          <h1 className="gm-h1 gm-in">Peta rawan<br />banjir<br /><em>Kota Jambi.</em></h1>
        </div>
        <div className="gm-hero-bot gm-in">
          <div className="gm-pill" aria-label="Ringkasan status cuaca">
            <span style={{ '--c': '#ef4444' }}><i /><b><Count to={siaga} /></b> siaga</span>
            <span style={{ '--c': '#f59e0b' }}><i /><b><Count to={waspada} /></b> waspada</span>
            <span style={{ '--c': '#10b981' }}><i /><b><Count to={normal} /></b> normal</span>
          </div>
          <div className="gm-cta-row">
            <button type="button" className="gm-cta" onClick={() => setDrawer(true)}>
              <span className="gm-radar"><i /></span>Cek lokasi &amp; rute evakuasi
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12L12 4M5 4h7v7" /></svg>
            </button>
            <button type="button" className="gm-wxbtn" onClick={() => setWxOpen((x) => !x)} aria-pressed={wxOpen}>Hujan</button>
          </div>
        </div>
      </section>

      {/* Laci cek lokasi */}
      <aside className="gm-drawer" aria-hidden={!drawer} inert={!drawer ? '' : undefined}>
        <div className="gm-dh">
          <div><small>Cek lokasi</small><h2>Seberapa rawan<br />tempat Anda?</h2></div>
          <button type="button" className="gm-dx" onClick={() => setDrawer(false)} aria-label="Tutup panel"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg></button>
        </div>
        <div className="gm-scroll">
          <button type="button" className="gm-gps" onClick={useGps} disabled={gpsBusy}>
            <span className="gm-radar"><i /></span>
            {gpsBusy ? 'Mendeteksi lokasi…' : 'Gunakan lokasi saya (GPS)'}
          </button>
          <div className="gm-or"><span>atau klik peta / isi koordinat</span></div>
          <div className="gm-coord">
            <label>Latitude<input inputMode="decimal" value={latIn} onChange={(e) => setLatIn(e.target.value)} placeholder="-1.6101" /></label>
            <label>Longitude<input inputMode="decimal" value={lngIn} onChange={(e) => setLngIn(e.target.value)} placeholder="103.6131" /></label>
          </div>
          <div className="gm-act">
            <button type="button" onClick={doCek} disabled={!!work}>{work === 'cek' ? 'Menganalisis…' : 'Cek risiko'}</button>
            <button type="button" className="alt" onClick={() => doRoute()} disabled={!!work}>{work === 'rute' ? 'Menghitung…' : 'Rute ke posko'}</button>
          </div>
          <p className="gm-hint">Koordinat tidak disimpan di server.</p>

          {risk && (
            <section className="gm-card" aria-live="polite" style={{ '--c': risk.risiko_banjir.warna_badge }}>
              <div className="gm-badge"><i />{risk.risiko_banjir.kelas_kerawanan}<em>skor {risk.risiko_banjir.skor_total}</em></div>
              <p className="gm-where"><b>{risk.wilayah.kelurahan || '—'}</b>, Kec. {risk.wilayah.kecamatan}</p>
              <dl>
                <dt>Ketinggian</dt><dd>{risk.topografi_demnas.kelas_elevasi} ({risk.topografi_demnas.rentang_ketinggian})</dd>
                <dt>Cuaca</dt><dd><span className="gm-st" style={{ '--c': stColor(risk.pantauan_cuaca_terkini.status_peringatan) }}>{risk.pantauan_cuaca_terkini.status_peringatan}</span> · {risk.pantauan_cuaca_terkini.curah_hujan_mm_jam} mm/jam</dd>
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
              <p>Kapasitas tersisa {route.posko_tujuan.kapasitas_tersisa} jiwa{route.posko_tujuan.kontak_darurat ? <> · <a href={`tel:${route.posko_tujuan.kontak_darurat}`}>{route.posko_tujuan.kontak_darurat}</a></> : null}</p>
              <ol>{route.instruksi_navigasi.map((st) => <li key={st.urutan}>{st.nama_jalan}<em>{st.jarak_meter} m</em></li>)}</ol>
            </section>
          )}
        </div>
      </aside>

      {/* Hujan per kecamatan */}
      <aside className={`gm-wx gm-in${wxOpen ? '' : ' shut'}`} aria-label="Curah hujan per kecamatan">
        <button type="button" className="gm-wx-h" onClick={() => setWxOpen((x) => !x)} aria-expanded={wxOpen}>
          <span><b>Curah hujan</b><small>mm per jam · sekarang</small></span>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 10l5-5 5 5" /></svg>
        </button>
        <ul>
          <li><button type="button" className={kec === 'Semua' ? 'on' : ''} onClick={() => setKec('Semua')}><span className="n">Semua kecamatan</span></button></li>
          {cuacaData.length === 0 && <li className="none">Data cuaca belum tersedia</li>}
          {cuacaData.map((k) => {
            const v = +k.curah_hujan_terkini || 0
            return (
              <li key={k.id}><button type="button" onClick={() => setKec(k.nama_kecamatan)} className={kec === k.nama_kecamatan ? 'on' : ''} style={{ '--c': stColor(k.status_peringatan) }}>
                <span className="n"><i />{k.nama_kecamatan}</span>
                <span className="bar"><u style={{ width: `${Math.max(3, (v / maxRain) * 100)}%` }} /></span>
                <em>{k.curah_hujan_terkini ?? '–'}</em>
              </button></li>
            )
          })}
        </ul>
      </aside>

      {/* Dock layer */}
      <nav className="gm-dock gm-in" aria-label="Layer peta">
        <div className="gm-dock-l"><b>Layer</b><small>{activeCount} aktif</small></div>
        <div className="gm-dock-s">
          {LAYERS.map((l) => {
            const [c, desc] = LAYER_META[l.id]; const n = count(l.id)
            return (
              <button key={l.id} type="button" className={`gm-chip${on[l.id] ? ' on' : ''}${errs[l.id] ? ' err' : ''}`} style={{ '--c': c }} aria-pressed={!!on[l.id]} title={errs[l.id] ? 'Gagal dimuat' : desc}
                onClick={() => setOn((o) => ({ ...o, [l.id]: !o[l.id] }))}>
                <span className={`gm-sw sw-${l.id}`} />
                <span className="t">{SHORT[l.id]}</span>
                {busy[l.id] ? <span className="gm-spin" aria-label="memuat" /> : on[l.id] && n != null ? <em>{n}</em> : null}
              </button>
            )
          })}
        </div>
      </nav>

      <div className="gm-curtain" aria-hidden={!intro} style={{ display: intro ? undefined : 'none' }}>
        <img className="gm-cv-logo" src={logo} alt="" width="84" height="84" />
        <div className="gm-cv-t"><span className="gm-cv-m"><span className="gm-cv-w">SIRANDU</span></span><span className="gm-cv-m"><span className="gm-cv-w">WebGIS.</span></span></div>
      </div>
    </div>
  )
}

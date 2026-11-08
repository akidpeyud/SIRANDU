import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import BlurText from '../lib/BlurText.jsx'
import { useWebgis } from '../context/WebgisContext.jsx'
import { RING_INFO as RING_BASE } from '../data/content.js'
import { prefersReducedMotion } from '../lib/motion.jsx'
import { JAMBI_GEO } from '../data/jambiGeo.js'
import { getPoskoPengungsian, getSumberAirBersih, getRuasJalanTergenang } from '../services/api.js'
import { pointsFrom, linesFrom } from './map3d/geo.js'

// three.js (~600 kB) hanya diunduh saat section peta mendekati layar
const JambiMap3D = lazy(() => import('./map3d/JambiMap3D.jsx'))

/**
 * Warna khusus peta, divalidasi dengan validator palet dataviz (beda warna aman buta warna):
 * status memakai urutan lampu lalu lintas yang umum dipakai peringatan dini (hijau → merah),
 * sedangkan tiap lapis titik punya satu warna yang kontras dengan daratan terang.
 */
export const MAP_STATUS = [
  { key: 'normal', label: 'Normal', color: '#34a065', note: 'aman' },
  { key: 'waspada', label: 'Waspada', color: '#e8c13a', note: 'pantau' },
  { key: 'siaga', label: 'Siaga', color: '#e8731f', note: 'bersiap' },
  { key: 'awas', label: 'Awas', color: '#b02a2a', note: 'evakuasi' },
]
const STATUS_COLOR = Object.fromEntries(MAP_STATUS.map((s) => [s.key, s.color]))
const statusColor = (s) => STATUS_COLOR[String(s || 'normal').split(' ')[0].toLowerCase()] || STATUS_COLOR.normal
const LEGEND = [
  [{ c: '#ffb020', t: 'Posko pengungsian', shape: 'pin' }],
  null,
  [{ c: '#3ad1ff', t: 'Sumber air bersih', shape: 'pin' }],
  [{ c: '#ff4d8d', t: 'Jalan tergenang', shape: 'line' }, { c: '#ffffff', t: 'Jalan lain', shape: 'line', dim: true }],
]
const LAYER_KEYS = ['posko', 'hujan', 'air', 'jalan']
const LAYER_HINT = [
  'Pin kuning = posko pengungsian. Sentuh atau arahkan kursor ke pin untuk melihat namanya.',
  'Tinggi & warna tiap kecamatan = curah hujan terkini dan status peringatannya.',
  'Pin biru muda = sumber air bersih: sumur, hidran, dan tangki darurat.',
  'Garis merah muda putus-putus = ruas jalan yang sedang tergenang dan dihindari rute evakuasi.',
]

const hasWebGL = () => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
}

/** Cadangan 2D (tanpa WebGL): peta datar dari geometri yang sama. */
function FlatMap({ layer, cuacaByName, hover, setHover, onPick }) {
  const xs = JAMBI_GEO.outline.map((p) => p[0]), ys = JAMBI_GEO.outline.map((p) => p[1])
  const pad = 0.6, minX = Math.min(...xs) - pad, maxY = Math.max(...ys) + pad
  const w = Math.max(...xs) - minX + pad, h = maxY - Math.min(...ys) + pad
  const pt = ([x, y]) => `${(x - minX).toFixed(3)},${(maxY - y).toFixed(3)}`
  return (
    <svg className="m3d-flat" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Peta kecamatan Kota Jambi">
      <polygon points={JAMBI_GEO.water.map(pt).join(' ')} fill="#2a78d6" />
      {JAMBI_GEO.kecamatan.map((d) => {
        const c = cuacaByName(d.nama)
        return (
          <polygon key={d.nama} points={d.ring.map(pt).join(' ')} tabIndex={0}
            fill={layer === 1 && c ? statusColor(c.status_peringatan) : hover?.nama === d.nama ? '#ffffff' : '#f4efe3'}
            stroke="#0B3C5D" strokeWidth="0.04" style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHover({ kind: 'kec', nama: d.nama, km2: d.km2, cuaca: c })} onMouseLeave={() => setHover(null)}
            onFocus={() => setHover({ kind: 'kec', nama: d.nama, km2: d.km2, cuaca: c })} onClick={() => onPick(d)} />
        )
      })}
    </svg>
  )
}

export default function PetaOrbit() {
  const secRef = useRef(null), stageRef = useRef(null)
  const [near, setNear] = useState(false)    // mulai unduh 3D
  const [inView, setInView] = useState(false) // render loop hanya saat terlihat
  const [cur, setCur] = useState(1)
  const [hover, setHover] = useState(null)
  const [sat, setSat] = useState('loading')
  const [geo, setGeo] = useState({ posko: null, air: null, jalan: null })
  const webgl = useMemo(() => typeof window !== 'undefined' && hasWebGL(), [])
  const coarse = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches, [])
  const reduce = useMemo(() => prefersReducedMotion(), [])

  useEffect(() => {
    const a = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '600px 0px' })
    const b = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.05 })
    a.observe(secRef.current); b.observe(stageRef.current)
    return () => { a.disconnect(); b.disconnect() }
  }, [])

  // GeoJSON lapis titik/garis dari server (gagal = lapis kosong, bukan data karangan)
  useEffect(() => {
    if (!near) return
    const ctl = new AbortController()
    const take = (k, p) => p.then((g) => setGeo((s) => ({ ...s, [k]: g })), () => setGeo((s) => ({ ...s, [k]: false })))
    take('posko', getPoskoPengungsian(undefined, ctl.signal)); take('air', getSumberAirBersih(undefined, ctl.signal)); take('jalan', getRuasJalanTergenang(ctl.signal))
    return () => ctl.abort()
  }, [near])

  const { openMap, ringkasan, counts, cuacaData } = useWebgis()
  const posko = useMemo(() => pointsFrom(geo.posko), [geo.posko])
  const air = useMemo(() => pointsFrom(geo.air), [geo.air])
  const roads = useMemo(() => linesFrom(geo.jalan), [geo.jalan])
  const cuacaByName = (n) => cuacaData.find((k) => String(k.nama_kecamatan).toLowerCase().replace(/[^a-z]/g, '') === n.toLowerCase().replace(/[^a-z]/g, '')) || null

  const nums = [counts.posko, ringkasan ? 5 : null, counts.airBersih, counts.jalanTergenang]
  const RING_INFO = RING_BASE.map((r, i) => ({ ...r, n: nums[i] == null ? '–' : String(nums[i]) }))
  const info = RING_INFO[cur]
  const layerData = [geo.posko, cuacaData.length ? true : null, geo.air, geo.jalan][cur]
  const layerEmpty = cur === 1 ? !cuacaData.length : layerData === false || (layerData && [posko, null, air, roads][cur]?.length === 0)
  const onPick = (d) => openMap({ kecamatan: d.nama, layers: cur === 1 ? null : [LAYER_KEYS[cur] === 'hujan' ? 'zona' : LAYER_KEYS[cur]] })

  return (
    <section className={`net${near ? ' in' : ''}`} id="peta" ref={secRef}>
      <div className="wrap">
        <div className="net-head">
          <span className="tag rv">Peta Kota Jambi</span>
          <BlurText as="h2">Satu peta, empat lapis perlindungan untuk warga Jambi.</BlurText>
          <p className="lead rv">Sebelas kecamatan, Sungai Batanghari di tengahnya. Putar petanya, pilih lapisan, dan klik kecamatan untuk membukanya di peta interaktif.</p>
          <div className="net-cta"><button type="button" className="btn pri rv" onClick={() => openMap()}>Buka peta interaktif <span className="arr">→</span></button><a className="net-link rv" href="#fitur">Lihat semua fitur ↗</a></div>
        </div>
      </div>

      <div className="m3d" ref={stageRef}>
        <div className="m3d-glow" aria-hidden="true" />
        {near && webgl && (
          <Suspense fallback={<div className="m3d-load"><i />Menyiapkan peta 3D…</div>}>
            <JambiMap3D layer={cur} cuaca={cuacaData} statusColor={statusColor} posko={posko} air={air} roads={roads}
              hover={hover} setHover={setHover} onPick={onPick} active={inView} coarse={coarse} reduce={reduce} onSatStatus={setSat} />
          </Suspense>
        )}
        {near && !webgl && <FlatMap layer={cur} cuacaByName={cuacaByName} hover={hover} setHover={setHover} onPick={onPick} />}

        {/* panel info (kiri atas) */}
        <div className="m3d-panel" aria-live="polite">
          {hover?.kind === 'kec' ? (
            <>
              <small>Kecamatan</small>
              <b>{hover.nama}</b>
              <span>{hover.km2} km²</span>
              {hover.cuaca ? (
                <span className="m3d-st" style={{ '--c': statusColor(hover.cuaca.status_peringatan) }}><i />{hover.cuaca.status_peringatan || 'Normal'} · {Number(hover.cuaca.curah_hujan_terkini || 0).toFixed(1)} mm</span>
              ) : <span className="m3d-mute">Data cuaca belum tersedia</span>}
              <em>Klik untuk membuka di peta</em>
            </>
          ) : hover ? (
            <>
              <small>{hover.kind === 'posko' ? 'Posko pengungsian' : 'Sumber air bersih'}</small>
              <b>{hover.name || 'Tanpa nama'}</b>
            </>
          ) : (
            <>
              <small>{info.kicker}</small>
              <p>{LAYER_HINT[cur]}</p>
              {layerEmpty && <span className="m3d-mute">Data lapisan ini muncul setelah server SIRANDU terhubung.</span>}
            </>
          )}
        </div>

        <ul className="m3d-legend" aria-label="Legenda peta">
          {cur === 1
            ? MAP_STATUS.map((r) => <li key={r.key}><i className="sw" style={{ background: r.color }} /><span><b>{r.label}</b>{r.note}</span></li>)
            : LEGEND[cur].map((l) => <li key={l.t} className={l.dim ? 'dim' : ''}><i className={l.shape} style={{ '--c': l.c }} /><span><b>{l.t}</b></span></li>)}
          <li className="sep"><i className="line" style={{ '--c': '#8fdcff' }} /><span><b>Arus Sungai Batanghari</b></span></li>
          <li><i className="line" style={{ '--c': '#ffffff' }} /><span><b>Batas kecamatan</b>{cur === 1 ? 'tinggi kolom = curah hujan' : 'klik untuk buka'}</span></li>
          <li><i className="line" style={{ '--c': '#6EC1E4' }} /><span><b>Batas Kota Jambi</b></span></li>
        </ul>
        <span className="m3d-attr">{sat === 'err' ? 'Citra satelit tidak dapat dimuat · ' : ''}Citra satelit © Esri, Maxar, Earthstar Geographics</span>
        <div className="m3d-compass" aria-hidden="true"><b>U</b><i /></div>
        {!coarse && <span className="m3d-hint" aria-hidden="true">Seret untuk memutar</span>}
      </div>

      <div className="wrap">
        <div className="rings-info" role="tablist" aria-label="Lapisan peta">
          {RING_INFO.map((r, i) => (
            <button type="button" role="tab" aria-selected={cur === i} key={r.label} className={`rc${cur === i ? ' on' : ''}`}
              onClick={() => { setCur(i); setHover(null) }}
              onPointerMove={(e) => { const b = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mx', e.clientX - b.left + 'px'); e.currentTarget.style.setProperty('--my', e.clientY - b.top + 'px') }}>
              <i className="dt" /><b>{r.n}</b><span>{r.label}</span>
            </button>
          ))}
        </div>
        <div className="ring-desc">
          <div><small>{info.kicker}</small><p>{info.text}</p></div>
          <small>BATAS KECAMATAN: BPS · DATA LAPISAN: SERVER SIRANDU</small>
        </div>
      </div>
    </section>
  )
}

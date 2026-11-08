import { useEffect, useMemo, useState } from 'react'
import * as api from '../../services/api.js'

/**
 * Kartu riwayat cuaca satu kecamatan.
 * - 24 jam: grafik backend (GET /api/cuaca/:id, hasil tarikan Open-Meteo per jam); bila gagal, langsung dari Open-Meteo.
 * - 7 hari: Open-Meteo (past_days=7): curah hujan harian + rentang suhu.
 * Ambang per jam mengikuti backend: Waspada > 5 mm/jam, Siaga > 10 mm/jam.
 */
const DAY = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'Asia/Jakarta' })
const DATE = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })
const HOUR = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' })
const n1 = (v) => (v == null || Number.isNaN(+v) ? '–' : (+v).toFixed(1).replace('.', ','))
const nowJakarta = () => new Date()

function Bars({ data, unit, thresholds = [], height = 132, labelEvery = 1, color = '#1D6FA3' }) {
  const [hi, setHi] = useState(null)
  const W = 320, H = height, pad = { l: 26, r: 6, t: 14, b: 22 }
  const max = Math.max(1, ...data.map((d) => d.v || 0), ...thresholds.map((t) => t.v * 1.15))
  const step = (W - pad.l - pad.r) / data.length
  const bw = Math.max(2, Math.min(18, step - 3))
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max)
  const ticks = max >= 4 ? [0, Math.round(max / 2), Math.round(max)] : [0, +(max / 2).toFixed(1), +max.toFixed(1)]
  return (
    <div className="wh-chart" onMouseLeave={() => setHi(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Grafik ${unit}`}>
        {ticks.map((t) => (
          <g key={t}><line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="wh-grid" /><text x={pad.l - 6} y={y(t) + 3.5} className="wh-ax" textAnchor="end">{t}</text></g>
        ))}
        {thresholds.map((t) => t.v <= max && (
          <g key={t.label}><line x1={pad.l} x2={W - pad.r} y1={y(t.v)} y2={y(t.v)} className="wh-th" style={{ stroke: t.c }} /><text x={W - pad.r} y={y(t.v) - 4} className="wh-thl" textAnchor="end" style={{ fill: t.c }}>{t.label}</text></g>
        ))}
        {data.map((d, i) => {
          const x = pad.l + i * step + (step - bw) / 2, v = d.v || 0
          return (
            <g key={i} onMouseEnter={() => setHi(i)} onFocus={() => setHi(i)} tabIndex={0}>
              <rect x={pad.l + i * step} y={pad.t} width={step} height={H - pad.t - pad.b} fill="transparent" />
              <rect x={x} y={y(v)} width={bw} height={Math.max(v > 0 ? 2 : 0, H - pad.b - y(v))} rx={Math.min(3, bw / 2)} className="wh-bar"
                style={{ fill: d.c || color, opacity: hi == null || hi === i ? 1 : 0.45, '--i': i }} />
              {i % labelEvery === 0 && <text x={x + bw / 2} y={H - 6} className="wh-ax" textAnchor="middle">{d.x}</text>}
            </g>
          )
        })}
      </svg>
      {hi != null && (
        <div className="wh-tip" style={{ left: `${((pad.l + hi * step + step / 2) / W) * 100}%` }}>
          <b>{n1(data[hi].v)} {unit}</b><span>{data[hi].full || data[hi].x}</span>
        </div>
      )}
    </div>
  )
}

function TempRange({ days }) {
  const W = 320, H = 92, pad = { l: 26, r: 6, t: 10, b: 20 }
  const lo = Math.floor(Math.min(...days.map((d) => d.min))) - 1, hi = Math.ceil(Math.max(...days.map((d) => d.max))) + 1
  const step = (W - pad.l - pad.r) / days.length
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - (v - lo) / (hi - lo || 1))
  return (
    <svg className="wh-temp" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Rentang suhu harian">
      {[lo, hi].map((t) => <g key={t}><line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="wh-grid" /><text x={pad.l - 6} y={y(t) + 3.5} className="wh-ax" textAnchor="end">{t}°</text></g>)}
      {days.map((d, i) => {
        const cx = pad.l + i * step + step / 2
        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={y(d.max)} y2={y(d.min)} className="wh-tr" />
            <circle cx={cx} cy={y(d.max)} r="3.2" className="wh-tmax" /><circle cx={cx} cy={y(d.min)} r="3.2" className="wh-tmin" />
            <text x={cx} y={H - 5} className="wh-ax" textAnchor="middle">{d.x}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default function WeatherHistory({ kecamatan, cuacaItem, lat, lng, statusColor }) {
  const [tab, setTab] = useState('24')
  const [om, setOm] = useState({ data: null, err: null, loading: true })
  const [be, setBe] = useState({ data: null, err: null })

  useEffect(() => {
    if (lat == null) return
    const c = new AbortController()
    setOm({ data: null, err: null, loading: true })
    api.getRiwayatOpenMeteo(lat, lng, c.signal).then((d) => setOm({ data: d, err: null, loading: false }), (e) => !c.signal.aborted && setOm({ data: null, err: e.message, loading: false }))
    return () => c.abort()
  }, [lat, lng])
  useEffect(() => {
    setBe({ data: null, err: null })
    if (cuacaItem?.id == null) return
    const c = new AbortController()
    api.getDetailCuacaKecamatan(cuacaItem.id, c.signal).then((d) => setBe({ data: d, err: null }), (e) => !c.signal.aborted && setBe({ data: null, err: e.message }))
    return () => c.abort()
  }, [cuacaItem?.id])

  // 24 jam: utamakan data backend, cadangan Open-Meteo per jam
  const hours = useMemo(() => {
    const g = be.data?.grafik_24_jam || be.data?.data?.grafik_24_jam
    if (Array.isArray(g) && g.length) {
      return g.map((h) => ({ v: +h.curah_hujan || 0, x: String(h.jam_label || '').slice(0, 2), full: h.jam_label, src: 'backend' }))
    }
    const hr = om.data?.hourly
    if (!hr) return null
    const now = nowJakarta().getTime()
    const rows = hr.time.map((t, i) => ({ t: new Date(`${t}:00+07:00`).getTime(), v: hr.precipitation[i] })).filter((r) => r.t <= now).slice(-24)
    return rows.map((r) => ({ v: r.v || 0, x: HOUR.format(r.t).slice(0, 2), full: `pukul ${HOUR.format(r.t)}`, src: 'om' }))
  }, [be.data, om.data])

  const days = useMemo(() => {
    const d = om.data?.daily
    if (!d) return null
    const today = d.time[d.time.length - 1]
    return d.time.map((t, i) => {
      const dt = new Date(`${t}T12:00:00+07:00`)
      return { v: d.precipitation_sum[i] || 0, x: t === today ? 'Kini' : DAY.format(dt).slice(0, 3), full: `${DAY.format(dt)}, ${DATE.format(dt)}${t === today ? ' (hari ini, sementara)' : ''}`, min: d.temperature_2m_min[i], max: d.temperature_2m_max[i], jam: d.precipitation_hours?.[i] }
    })
  }, [om.data])

  const s24 = hours && { total: hours.reduce((a, b) => a + b.v, 0), peak: hours.reduce((a, b) => (b.v > a.v ? b : a), hours[0]) }
  const s7 = days && (() => {
    const past = days.slice(0, -1)
    const wet = past.reduce((a, b) => (b.v > a.v ? b : a), past[0])
    return { total: past.reduce((a, b) => a + b.v, 0), wet, rainy: past.filter((d) => d.v >= 1).length, tmin: Math.min(...past.map((d) => d.min)), tmax: Math.max(...past.map((d) => d.max)) }
  })()
  const nowHum = om.data?.hourly && (() => { const hr = om.data.hourly; const now = Date.now(); let k = 0; hr.time.forEach((t, i) => { if (new Date(`${t}:00+07:00`).getTime() <= now) k = i }); return { t: hr.temperature_2m[k], h: hr.relative_humidity_2m[k] } })()

  return (
    <section className="wh" aria-label={`Riwayat cuaca ${kecamatan}`}>
      <header className="wh-h">
        <div>
          <small>Riwayat cuaca</small>
          <h3>{kecamatan}</h3>
        </div>
        {cuacaItem && <span className="wh-st" style={{ '--c': statusColor(cuacaItem.status_peringatan) }}><i />{cuacaItem.status_peringatan || 'Normal'}</span>}
      </header>

      <div className="wh-now">
        <div><b>{n1(cuacaItem?.curah_hujan_terkini)}</b><span>mm/jam sekarang</span></div>
        <div><b>{nowHum ? `${Math.round(nowHum.t)}°` : '–'}</b><span>suhu udara</span></div>
        <div><b>{nowHum ? `${nowHum.h}%` : '–'}</b><span>kelembapan</span></div>
      </div>

      <div className="wh-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === '24'} className={tab === '24' ? 'on' : ''} onClick={() => setTab('24')}>24 jam terakhir</button>
        <button type="button" role="tab" aria-selected={tab === '7'} className={tab === '7' ? 'on' : ''} onClick={() => setTab('7')}>7 hari terakhir</button>
      </div>

      {tab === '24' && (
        hours ? (
          <>
            <div className="wh-stats">
              <div><span>Total 24 jam</span><b>{n1(s24.total)} mm</b></div>
              <div><span>Puncak</span><b>{n1(s24.peak.v)} mm/jam</b><em>{s24.peak.full}</em></div>
            </div>
            <Bars data={hours} unit="mm/jam" labelEvery={4} thresholds={[{ v: 5, label: 'Waspada', c: '#b98900' }, { v: 10, label: 'Siaga', c: '#c4561a' }]}
              color="#1D6FA3" />
          </>
        ) : <Empty loading={om.loading} err={om.err && be.err ? `${om.err}` : om.err} />
      )}
      {tab === '7' && (
        days ? (
          <>
            <div className="wh-stats">
              <div><span>Total 7 hari</span><b>{n1(s7.total)} mm</b></div>
              <div><span>Hari terbasah</span><b>{n1(s7.wet.v)} mm</b><em>{s7.wet.full}</em></div>
              <div><span>Hari hujan</span><b>{s7.rainy} / 7</b></div>
            </div>
            <Bars data={days} unit="mm" />
            <p className="wh-sub">Suhu harian <span><i className="mx" />tertinggi <i className="mn" />terendah</span></p>
            <TempRange days={days} />
          </>
        ) : <Empty loading={om.loading} err={om.err} />
      )}
      <p className="wh-src">Sumber: Open-Meteo{hours?.[0]?.src === 'backend' && tab === '24' ? ' melalui server SIRANDU' : ''}</p>
    </section>
  )
}

function Empty({ loading, err }) {
  return <div className="wh-empty">{loading ? <><span className="gm-spin" />Mengambil riwayat cuaca…</> : err || 'Data belum tersedia.'}</div>
}

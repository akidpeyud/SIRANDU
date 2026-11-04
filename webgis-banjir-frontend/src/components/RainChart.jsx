import { useEffect, useMemo, useState } from 'react'
import { getDetailCuacaKecamatan } from '../services/api.js'

const W = 640, H = 220, PAD = { l: 38, r: 10, t: 14, b: 28 }
// Ambang status backend (mm/JAM): Waspada > 5, Siaga > 10.
const T_WASPADA = 5, T_SIAGA = 10
const barColor = (v) => (v > T_SIAGA ? '#ef4444' : v > T_WASPADA ? '#f59e0b' : '#6EC1E4')

/** Grafik curah hujan 24 jam terakhir (mm/jam) per kecamatan, data dari GET /api/cuaca/:id. */
export default function RainChart({ kecamatanId, onTotal }) {
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [tip, setTip] = useState(null)

  useEffect(() => {
    if (!kecamatanId) return
    const c = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))
    getDetailCuacaKecamatan(kecamatanId, c.signal).then(
      (d) => !c.signal.aborted && setState({ loading: false, error: null, data: d }),
      (e) => !c.signal.aborted && setState({ loading: false, error: e, data: null }),
    )
    return () => c.abort()
  }, [kecamatanId])

  const rows = useMemo(() => (state.data?.grafik_24_jam || []).map((r) => ({ v: Number(r.curah_hujan) || 0, t: r.jam_label, delayed: r.is_delayed })), [state.data])
  const total = useMemo(() => rows.reduce((a, r) => a + r.v, 0), [rows])
  useEffect(() => { onTotal?.(rows.length ? total : null) }, [total, rows.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const max = Math.max(T_SIAGA + 2, ...rows.map((r) => r.v))
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b
  const bw = rows.length ? iw / rows.length : 0
  const y = (v) => PAD.t + ih - (v / max) * ih
  const kec = state.data?.kecamatan

  return (
    <div className="rc" aria-busy={state.loading}>
      <div className="rc-head">
        <div><b>{kec?.nama_kecamatan || 'Memuat…'}</b><span>Curah hujan 24 jam terakhir (mm/jam)</span></div>
        {kec && <div className="rc-st" style={{ '--c': { Siaga: '#ef4444', Waspada: '#f59e0b' }[kec.status_peringatan] || '#10b981' }}><i />{kec.status_peringatan}<em>{Number(kec.curah_hujan_terkini).toFixed(1)} mm/jam</em></div>}
      </div>
      {state.error && <p className="rc-err">Data grafik belum tersedia: {state.error.message}</p>}
      {!state.error && !state.loading && rows.length === 0 && <p className="rc-err">Belum ada riwayat curah hujan untuk kecamatan ini.</p>}
      {rows.length > 0 && (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Grafik batang curah hujan 24 jam terakhir, total ${total.toFixed(1)} mm`} onPointerLeave={() => setTip(null)}>
          {[0, 5, 10].concat(max > 14 ? [Math.round(max)] : []).map((g) => (
            <g key={g}><line x1={PAD.l} x2={W - PAD.r} y1={y(g)} y2={y(g)} className={g === T_WASPADA ? 'th w' : g === T_SIAGA ? 'th s' : 'gl'} /><text x={PAD.l - 6} y={y(g) + 4} textAnchor="end">{g}</text></g>
          ))}
          {rows.map((r, i) => {
            const h = Math.max(r.v > 0 ? 2 : 0, ih - (y(r.v) - PAD.t))
            return (
              <g key={i} onPointerEnter={() => setTip(i)}>
                <rect x={PAD.l + i * bw + 1} y={PAD.t} width={Math.max(1, bw - 2)} height={ih} fill="transparent" />
                <rect className="rc-bar" style={{ '--i': i }} x={PAD.l + i * bw + 1.5} y={PAD.t + ih - h} width={Math.max(1, bw - 3)} height={h} rx="2" fill={barColor(r.v)} opacity={r.delayed ? 0.55 : 1} />
                {i % 4 === 0 && <text x={PAD.l + i * bw + bw / 2} y={H - 8} textAnchor="middle">{r.t}</text>}
              </g>
            )
          })}
          <text x={W - PAD.r} y={y(T_SIAGA) - 5} textAnchor="end" className="thl s">Siaga &gt; 10</text>
          <text x={W - PAD.r} y={y(T_WASPADA) - 5} textAnchor="end" className="thl w">Waspada &gt; 5</text>
          {tip != null && rows[tip] && (() => { const r = rows[tip], x = Math.min(W - 96, Math.max(PAD.l, PAD.l + tip * bw - 40)); return (
            <g className="tip" pointerEvents="none"><rect x={x} y={PAD.t} width="92" height="36" rx="8" /><text x={x + 8} y={PAD.t + 15}>{r.t} WIB</text><text x={x + 8} y={PAD.t + 29}>{r.v.toFixed(1)} mm/jam</text></g>
          ) })()}
        </svg>
      )}
      {rows.length > 0 && <p className="rc-sum">Total {rows.length} jam terakhir: <b>{total.toFixed(1)} mm</b>{rows.some((r) => r.delayed) && ' · sebagian data tertunda (cadangan)'}</p>}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { api } from './adminApi.js'
import { useToast } from '../context/ToastContext.jsx'
import { Ico } from './icons.jsx'

const STATUS_C = { normal: '#34a065', waspada: '#e8c13a', siaga: '#e8731f', awas: '#b02a2a' }
const stc = (s) => STATUS_C[String(s || 'normal').split(' ')[0].toLowerCase()] || STATUS_C.normal
const ago = (d) => {
  if (!d) return '–'
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000)
  return m < 1 ? 'baru saja' : m < 60 ? `${m} mnt lalu` : m < 1440 ? `${Math.round(m / 60)} jam lalu` : new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}
const settle = (p) => p.then((v) => v, () => null)

/* ---------- Ringkasan ---------- */
export function Dashboard({ go }) {
  const [d, setD] = useState(null)
  useEffect(() => {
    Promise.all([api.list('posko'), api.list('air-bersih'), api.list('titik-banjir'), api.list('jalan-tergenang'), api.kecamatan(), api.statistikBanjir()].map(settle))
      .then(([posko, air, banjir, jalan, kec, stat]) => setD({ posko, air, banjir, jalan, kec, stat }))
  }, [])
  const cards = d && [
    { k: 'posko', t: 'Posko aktif', n: d.posko?.filter((x) => x.status_aktif).length, of: d.posko?.length, i: Ico.posko, sub: d.posko && `${d.posko.reduce((a, x) => a + (+x.terisi_jiwa || 0), 0)} dari ${d.posko.reduce((a, x) => a + (+x.kapasitas || 0), 0)} jiwa terisi` },
    { k: 'air', t: 'Sumber air aktif', n: d.air?.filter((x) => x.status_aktif).length, of: d.air?.length, i: Ico.air },
    { k: 'jalan', t: 'Jalan tergenang', n: d.jalan?.filter((x) => x.status_tergenang).length, of: d.jalan?.length, i: Ico.jalan, warn: d.jalan?.some((x) => x.status_tergenang) },
    { k: 'banjir', t: 'Titik banjir tercatat', n: d.banjir?.length, i: Ico.banjir },
  ]
  const kecSorted = useMemo(() => (d?.kec || []).slice().sort((a, b) => (+b.curah_hujan_terkini || 0) - (+a.curah_hujan_terkini || 0)), [d])
  const maxMm = Math.max(10, ...kecSorted.map((k) => +k.curah_hujan_terkini || 0))
  const counts = kecSorted.reduce((m, k) => { const s = String(k.status_peringatan || 'Normal').split(' ')[0]; m[s] = (m[s] || 0) + 1; return m }, {})

  return (
    <div className="ad-sec">
      <div className="ad-head"><div><h1>Ringkasan</h1><p>Keadaan data SIRANDU saat ini. Klik kartu untuk mengelola datanya.</p></div></div>
      <div className="ad-cards">
        {(cards || [0, 1, 2, 3]).map((c, i) => c ? (
          <button type="button" key={c.k} className={`ad-card${c.warn ? ' warn' : ''}`} onClick={() => go(c.k)}>
            <span className="ad-card-i">{c.i}</span>
            <small>{c.t}</small>
            <b>{c.n ?? '–'}{c.of != null && <em> / {c.of}</em>}</b>
            {c.sub && <span className="ad-mut">{c.sub}</span>}
          </button>
        ) : <div key={i} className="ad-card ad-skel" />)}
      </div>

      <div className="ad-split">
        <section className="ad-panel">
          <header><h3>Curah hujan per kecamatan</h3><button type="button" className="ad-link" onClick={() => go('hujan')}>Input manual →</button></header>
          <div className="ad-legend">{['Normal', 'Waspada', 'Siaga'].map((s) => <span key={s}><i style={{ background: stc(s) }} />{s} <b>{counts[s] || 0}</b></span>)}</div>
          {!d ? <div className="ad-skel" style={{ height: 260 }} /> : kecSorted.length === 0 ? <p className="ad-mut">Data kecamatan belum tersedia.</p> : (
            <ul className="ad-bars">
              {kecSorted.map((k) => (
                <li key={k.id}>
                  <span className="n"><i style={{ background: stc(k.status_peringatan) }} />{k.nama_kecamatan}</span>
                  <span className="b"><u style={{ width: `${Math.max(2, ((+k.curah_hujan_terkini || 0) / maxMm) * 100)}%`, background: stc(k.status_peringatan) }} /></span>
                  <span className="v">{(+k.curah_hujan_terkini || 0).toFixed(1)}<small> mm/j</small></span>
                  <span className={`s${k.is_delayed ? ' late' : ''}`} title={k.sumber_data || ''}>{k.is_delayed ? 'tertunda' : ago(k.terakhir_update)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="ad-panel">
          <header><h3>Validasi model zona rawan</h3><button type="button" className="ad-link" onClick={() => go('banjir')}>Titik banjir →</button></header>
          {!d ? <div className="ad-skel" style={{ height: 200 }} /> : !d.stat ? <p className="ad-mut">Statistik belum tersedia.</p> : (
            <>
              <p className="ad-big"><b>{d.stat.total_kejadian_tercatat}</b> kejadian banjir lapangan dibandingkan dengan zona rawan hasil AHP.</p>
              <ul className="ad-val">
                {(d.stat.validasi_terhadap_zona_rawan || []).map((z) => (
                  <li key={z.zona}><span>{z.zona}</span><span className="b"><u style={{ width: `${+z.persentase || 0}%` }} /></span><b>{z.persentase ?? 0}%</b><small>{z.jumlah_titik} titik</small></li>
                ))}
              </ul>
              <p className="ad-mut">{d.stat.kesimpulan_akurasi}</p>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

/* ---------- Curah hujan manual ---------- */
export function CurahHujan() {
  const toast = useToast()
  const [kec, setKec] = useState(null); const [amb, setAmb] = useState([])
  const [f, setF] = useState({ id_kecamatan: '', curah_hujan: '', suhu: '', kelembapan: '', status_peringatan: '' })
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const load = () => api.kecamatan().then(setKec, (e) => { setKec([]); setErr(e.message) })
  useEffect(() => { load(); api.ambang().then(setAmb, () => {}) }, [])
  const a = amb[0] || { ambang_waspada: 5, ambang_siaga: 10 }
  const mm = parseFloat(f.curah_hujan)
  const auto = !Number.isFinite(mm) ? null : mm > +a.ambang_siaga ? 'Siaga' : mm > +a.ambang_waspada ? 'Waspada' : 'Normal'
  const submit = async (e) => {
    e.preventDefault()
    if (!f.id_kecamatan || !Number.isFinite(mm) || mm < 0) return setErr('Pilih kecamatan dan isi curah hujan (angka ≥ 0).')
    setBusy(true); setErr('')
    try {
      const body = { id_kecamatan: +f.id_kecamatan, curah_hujan: mm, ...(f.suhu !== '' && { suhu: +f.suhu }), ...(f.kelembapan !== '' && { kelembapan: +f.kelembapan }), ...(f.status_peringatan && { status_peringatan: f.status_peringatan }) }
      const r = await api.curahManual(body); toast.success(r.message || 'Curah hujan tersimpan.')
      setF((x) => ({ ...x, curah_hujan: '', suhu: '', kelembapan: '', status_peringatan: '' })); load()
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <div className="ad-sec">
      <div className="ad-head"><div><h1>Curah hujan manual</h1><p>Cadangan bila penarikan Open-Meteo gagal atau ada laporan lapangan. Nilai langsung dipakai peta publik dan peringatan dini.</p></div></div>
      <div className="ad-split narrow">
        <form className="ad-panel" onSubmit={submit} noValidate>
          <header><h3>Input data</h3></header>
          <div className="ad-grid">
            <label className="ad-field" style={{ gridColumn: 'span 2' }}><span>Kecamatan <em>*</em></span>
              <select value={f.id_kecamatan} onChange={(e) => setF({ ...f, id_kecamatan: e.target.value })}><option value="">— pilih —</option>{(kec || []).map((k) => <option key={k.id} value={k.id}>{k.nama_kecamatan}</option>)}</select>
            </label>
            <label className="ad-field"><span>Curah hujan (mm/jam) <em>*</em></span><input type="number" min="0" step="0.1" value={f.curah_hujan} onChange={(e) => setF({ ...f, curah_hujan: e.target.value })} /></label>
            <label className="ad-field"><span>Status</span>
              <select value={f.status_peringatan} onChange={(e) => setF({ ...f, status_peringatan: e.target.value })}><option value="">Otomatis{auto ? ` (${auto})` : ''}</option><option>Normal</option><option>Waspada</option><option>Siaga</option></select>
            </label>
            <label className="ad-field"><span>Suhu (°C)</span><input type="number" step="0.1" value={f.suhu} onChange={(e) => setF({ ...f, suhu: e.target.value })} /></label>
            <label className="ad-field"><span>Kelembapan (%)</span><input type="number" min="0" max="100" value={f.kelembapan} onChange={(e) => setF({ ...f, kelembapan: e.target.value })} /></label>
          </div>
          {auto && !f.status_peringatan && <p className="ad-note" style={{ '--c': stc(auto) }}><i />Dengan ambang saat ini (Waspada &gt; {a.ambang_waspada}, Siaga &gt; {a.ambang_siaga} mm/jam) status menjadi <b>{auto}</b>.</p>}
          {err && <p className="ad-err" role="alert">{err}</p>}
          <button type="submit" className="ad-btn wide" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan curah hujan'}</button>
        </form>
        <section className="ad-panel">
          <header><h3>Data terkini</h3><button type="button" className="ad-icon" onClick={load} aria-label="Muat ulang">{Ico.refresh}</button></header>
          <div className="ad-mini">
            <div className="ad-mini-h"><span>Kecamatan</span><span>mm/jam</span><span>Status</span><span>Sumber</span></div>
            {(kec || []).map((k) => (
              <button type="button" key={k.id} className={`ad-mini-r${+f.id_kecamatan === k.id ? ' on' : ''}`} onClick={() => setF({ ...f, id_kecamatan: String(k.id) })}>
                <span>{k.nama_kecamatan}</span><span>{(+k.curah_hujan_terkini || 0).toFixed(1)}</span>
                <span><i style={{ background: stc(k.status_peringatan) }} />{k.status_peringatan || 'Normal'}</span>
                <span className="ad-mut" title={k.sumber_data}>{String(k.sumber_data || '–').replace('Manual Fallback (Admin BPBD)', 'Manual')} · {ago(k.terakhir_update)}</span>
              </button>
            ))}
            {kec == null && <div className="ad-skel" style={{ height: 240 }} />}
          </div>
        </section>
      </div>
    </div>
  )
}

/* ---------- Pengaturan ambang & bobot ---------- */
export function Pengaturan() {
  const toast = useToast()
  const [amb, setAmb] = useState(null); const [bob, setBob] = useState(null)
  const [dirty, setDirty] = useState({}); const [busy, setBusy] = useState(false)
  useEffect(() => { api.ambang().then(setAmb, () => setAmb([])); api.bobot().then(setBob, () => setBob([])) }, [])
  const total = (bob || []).reduce((a, b) => a + (+b.bobot_persen || 0), 0)
  const editA = (id, k, v) => { setAmb((l) => l.map((x) => (x.id === id ? { ...x, [k]: v } : x))); setDirty((d) => ({ ...d, [`a${id}`]: true })) }
  const editB = (id, v) => { setBob((l) => l.map((x) => (x.id === id ? { ...x, bobot_persen: v } : x))); setDirty((d) => ({ ...d, [`b${id}`]: true })) }
  const saveA = async (r) => {
    if (+r.ambang_siaga <= +r.ambang_waspada) return toast.error('Ambang Siaga harus lebih besar dari ambang Waspada.')
    try { const x = await api.updateAmbang(r.id, { ambang_waspada: +r.ambang_waspada, ambang_siaga: +r.ambang_siaga, deskripsi: r.deskripsi }); toast.success(x.message || 'Ambang tersimpan.'); setDirty((d) => ({ ...d, [`a${r.id}`]: false })) }
    catch (e) { toast.error(e.message) }
  }
  const saveB = async () => {
    if (Math.abs(total - 100) > 0.05) return toast.error(`Total bobot harus 100% (sekarang ${total.toFixed(2)}%).`)
    setBusy(true)
    try {
      for (const b of bob.filter((x) => dirty[`b${x.id}`])) await api.updateBobot(b.id, { bobot_persen: +b.bobot_persen, keterangan: b.keterangan })
      toast.success('Bobot model tersimpan.'); setDirty((d) => Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith('b'))))
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  const anyB = Object.entries(dirty).some(([k, v]) => k.startsWith('b') && v)
  return (
    <div className="ad-sec">
      <div className="ad-head"><div><h1>Pengaturan</h1><p>Ambang peringatan dini dan bobot faktor model kerawanan (AHP).</p></div></div>
      <section className="ad-panel">
        <header><h3>Ambang peringatan</h3></header>
        {amb == null ? <div className="ad-skel" style={{ height: 90 }} /> : amb.map((r) => (
          <div key={r.id} className="ad-amb">
            <div><b>{String(r.parameter).replace(/_/g, ' ')}</b><small>{r.satuan}</small></div>
            <label className="ad-field"><span style={{ color: '#9a7400' }}>Waspada &gt;</span><input type="number" step="0.1" value={r.ambang_waspada} onChange={(e) => editA(r.id, 'ambang_waspada', e.target.value)} /></label>
            <label className="ad-field"><span style={{ color: '#c4561a' }}>Siaga &gt;</span><input type="number" step="0.1" value={r.ambang_siaga} onChange={(e) => editA(r.id, 'ambang_siaga', e.target.value)} /></label>
            <label className="ad-field grow"><span>Deskripsi</span><input value={r.deskripsi || ''} onChange={(e) => editA(r.id, 'deskripsi', e.target.value)} /></label>
            <button type="button" className="ad-btn" disabled={!dirty[`a${r.id}`]} onClick={() => saveA(r)}>Simpan</button>
          </div>
        ))}
      </section>
      <section className="ad-panel">
        <header><h3>Bobot faktor model</h3><span className={`ad-total${Math.abs(total - 100) > 0.05 ? ' bad' : ''}`}>Total {total.toFixed(2)}%</span></header>
        {bob == null ? <div className="ad-skel" style={{ height: 220 }} /> : (
          <>
            <div className="ad-stack" aria-hidden="true">{bob.map((b, i) => <i key={b.id} style={{ flex: +b.bobot_persen || 0, opacity: 1 - i * 0.12 }} title={b.nama_faktor} />)}</div>
            {bob.map((b) => (
              <div key={b.id} className="ad-bob">
                <div><b>{b.nama_faktor}</b><small>{b.keterangan}</small></div>
                <input type="range" min="0" max="50" step="0.1" value={b.bobot_persen} onChange={(e) => editB(b.id, e.target.value)} aria-label={`Bobot ${b.nama_faktor}`} />
                <label className="ad-num"><input type="number" min="0" max="100" step="0.1" value={b.bobot_persen} onChange={(e) => editB(b.id, e.target.value)} />%</label>
              </div>
            ))}
            <div className="ad-row-end"><span className="ad-mut">Perubahan bobot tidak menghitung ulang zona rawan secara otomatis.</span><button type="button" className="ad-btn" disabled={!anyB || busy} onClick={saveB}>{busy ? 'Menyimpan…' : 'Simpan bobot'}</button></div>
          </>
        )}
      </section>
    </div>
  )
}

/* ---------- Notifikasi ---------- */
export function Notifikasi() {
  const [pel, setPel] = useState(null); const [log, setLog] = useState(null)
  useEffect(() => { api.pelanggan().then(setPel, () => setPel([])); api.logNotif().then(setLog, () => setLog([])) }, [])
  const ver = (pel || []).filter((p) => p.is_verified).length
  return (
    <div className="ad-sec">
      <div className="ad-head"><div><h1>Notifikasi email</h1><p>Pelanggan peringatan dini dan riwayat pengiriman.</p></div></div>
      <div className="ad-cards three">
        <div className="ad-card static"><small>Pelanggan</small><b>{pel?.length ?? '–'}</b></div>
        <div className="ad-card static"><small>Terverifikasi</small><b>{pel ? ver : '–'}</b></div>
        <div className="ad-card static"><small>Peringatan terkirim</small><b>{log ? log.reduce((a, l) => a + (+l.jumlah_terkirim || 0), 0) : '–'}</b></div>
      </div>
      <div className="ad-split">
        <section className="ad-panel">
          <header><h3>Riwayat pengiriman</h3></header>
          <div className="ad-mini">
            <div className="ad-mini-h four"><span>Waktu</span><span>Kecamatan</span><span>Status baru</span><span>Terkirim</span></div>
            {(log || []).map((l) => <div key={l.id} className="ad-mini-r four"><span className="ad-mut">{ago(l.waktu)}</span><span>{l.nama_kecamatan}</span><span><i style={{ background: stc(l.status_baru) }} />{l.status_baru}</span><span>{l.jumlah_terkirim} · {l.status_pengiriman}</span></div>)}
            {log?.length === 0 && <p className="ad-mut">Belum ada peringatan yang dikirim.</p>}
          </div>
        </section>
        <section className="ad-panel">
          <header><h3>Pelanggan</h3></header>
          <div className="ad-mini">
            <div className="ad-mini-h three"><span>Email</span><span>Kecamatan</span><span>Status</span></div>
            {(pel || []).map((p) => <div key={p.id} className="ad-mini-r three"><span>{p.email}</span><span>{p.nama_kecamatan}</span><span className={p.is_verified ? 'ok' : 'ad-mut'}>{p.is_verified ? 'Terverifikasi' : 'Menunggu'}</span></div>)}
            {pel?.length === 0 && <p className="ad-mut">Belum ada pelanggan.</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

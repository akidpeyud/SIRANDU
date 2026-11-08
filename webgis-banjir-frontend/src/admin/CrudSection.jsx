import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { api } from './adminApi.js'
import { useToast } from '../context/ToastContext.jsx'
import { kecamatanAt } from '../components/map/kecamatan.js'
import { Ico } from './icons.jsx'

const MapPicker = lazy(() => import('./MapPicker.jsx'))
const fmt = (d) => (d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–')

export function Confirm({ title, body, danger = 'Hapus', onYes, onNo, busy }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onNo(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onNo])
  return (
    <div className="ad-dim" onMouseDown={(e) => e.target === e.currentTarget && onNo()}>
      <div className="ad-confirm" role="alertdialog" aria-modal="true" aria-labelledby="cf-t">
        <span className="ad-confirm-i">{Ico.trash}</span>
        <h3 id="cf-t">{title}</h3>
        <p>{body}</p>
        <div><button type="button" className="ad-btn ghost" onClick={onNo}>Batal</button><button type="button" className="ad-btn danger" onClick={onYes} disabled={busy} autoFocus>{busy ? 'Menghapus…' : danger}</button></div>
      </div>
    </div>
  )
}

function Field({ f, value, onChange }) {
  const id = `fld-${f.k}`
  if (f.type === 'bool') return (
    <label className="ad-switch" style={{ gridColumn: 'span 2' }}><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /><i /><span>{f.label}</span></label>
  )
  return (
    <label className="ad-field" htmlFor={id} style={f.span === 2 ? { gridColumn: 'span 2' } : undefined}>
      <span>{f.label}{f.req && <em> *</em>}</span>
      {f.type === 'select' ? (
        <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— pilih —</option>{f.opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : f.type === 'textarea' ? (
        <textarea id={id} rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={f.ph} />
      ) : (
        <input id={id} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} inputMode={f.type === 'number' ? 'decimal' : undefined}
          min={f.min} step={f.step || 'any'} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={f.ph} required={f.req} />
      )}
    </label>
  )
}

/** Laci formulir tambah/ubah, dengan peta pemilih lokasi. */
function Editor({ cfg, row, rows, onClose, onSaved }) {
  const toast = useToast()
  const editing = !!row
  const [form, setForm] = useState(() => (row ? cfg.fromRow(row) : { ...cfg.empty }))
  const [pt, setPt] = useState(() => (row?.lat != null ? { lat: +row.lat, lng: +row.lng } : null))
  const [line, setLine] = useState(() => row?.geometry?.coordinates || [])
  const [latIn, setLatIn] = useState(pt?.lat ?? ''); const [lngIn, setLngIn] = useState(pt?.lng ?? '')
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const placePoint = (p) => {
    setPt(p); setLatIn(p.lat); setLngIn(p.lng); setErr('')
    const k = kecamatanAt(p.lat, p.lng)
    if (k && cfg.fields.some((f) => f.k === 'kecamatan')) setForm((f) => ({ ...f, kecamatan: f.kecamatan || k }))
  }
  const applyCoords = () => {
    const lat = parseFloat(String(latIn).replace(',', '.')), lng = parseFloat(String(lngIn).replace(',', '.'))
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) placePoint({ lat, lng })
    else setErr('Koordinat tidak valid.')
  }
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])

  const submit = async (e) => {
    e.preventDefault()
    const miss = cfg.fields.find((f) => f.req && !String(form[f.k] ?? '').trim())
    if (miss) return setErr(`${miss.label} wajib diisi.`)
    if (cfg.geo === 'point' && !pt) return setErr('Tentukan lokasi di peta atau isi koordinat.')
    if (cfg.geo === 'line' && line.length < 2) return setErr('Gambar ruas jalan minimal 2 titik di peta.')
    setBusy(true); setErr('')
    try {
      const body = cfg.toBody(form, pt, line)
      const r = editing ? await api.update(cfg.res, row.id, body) : await api.create(cfg.res, body)
      toast.success(r.message || 'Data tersimpan.')
      onSaved()
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }

  const others = cfg.geo === 'point' ? rows.filter((r) => r.lat != null && r.id !== row?.id).map((r) => ({ lat: +r.lat, lng: +r.lng })) : []
  return (
    <div className="ad-dim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="ad-drawer" onSubmit={submit} noValidate aria-label={`${editing ? 'Ubah' : 'Tambah'} ${cfg.single}`}>
        <header><div><small>{cfg.title}</small><h2>{editing ? `Ubah ${cfg.single}` : `Tambah ${cfg.single}`}</h2></div><button type="button" className="ad-icon" onClick={onClose} aria-label="Tutup">{Ico.x}</button></header>
        <div className="ad-drawer-body">
          <section>
            <h4>{cfg.geo === 'line' ? 'Gambar ruas jalan' : 'Lokasi'}</h4>
            <Suspense fallback={<div className="ad-picker ad-skel" />}>
              <MapPicker mode={cfg.geo} point={pt} onPoint={placePoint} line={line} onLine={setLine} others={others} />
            </Suspense>
            {cfg.geo === 'point' && (
              <div className="ad-coord">
                <label className="ad-field"><span>Latitude</span><input value={latIn} onChange={(e) => setLatIn(e.target.value)} onBlur={applyCoords} inputMode="decimal" placeholder="-1.6101" /></label>
                <label className="ad-field"><span>Longitude</span><input value={lngIn} onChange={(e) => setLngIn(e.target.value)} onBlur={applyCoords} inputMode="decimal" placeholder="103.6131" /></label>
              </div>
            )}
          </section>
          <section>
            <h4>Data</h4>
            <div className="ad-grid">
              {cfg.fields.filter((f) => editing || !f.editOnly).map((f) => <Field key={f.k} f={f} value={form[f.k]} onChange={(v) => set(f.k, v)} />)}
            </div>
          </section>
        </div>
        <footer>
          {err ? <p className="ad-err" role="alert">{err}</p> : <span />}
          <div><button type="button" className="ad-btn ghost" onClick={onClose}>Batal</button><button type="submit" className="ad-btn" disabled={busy}>{busy ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Simpan'}</button></div>
        </footer>
      </form>
    </div>
  )
}

export default function CrudSection({ cfg }) {
  const toast = useToast()
  const [rows, setRows] = useState(null); const [err, setErr] = useState('')
  const [q, setQ] = useState(''); const [flt, setFlt] = useState('semua')
  const [edit, setEdit] = useState(null) // null | 'new' | row
  const [del, setDel] = useState(null); const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState({})

  const load = useCallback(() => {
    setErr('')
    api.list(cfg.res).then(setRows, (e) => { setErr(e.message); setRows([]) })
  }, [cfg.res])
  useEffect(() => { setRows(null); setQ(''); setFlt('semua'); load() }, [load])

  const shown = useMemo(() => (rows || []).filter((r) => {
    const s = `${cfg.title_of(r)} ${cfg.sub_of(r) || ''}`.toLowerCase()
    if (q && !s.includes(q.toLowerCase())) return false
    if (cfg.toggleKey && flt !== 'semua') return flt === 'aktif' ? !!r[cfg.toggleKey] : !r[cfg.toggleKey]
    return true
  }), [rows, q, flt, cfg])

  const toggle = async (r) => {
    const v = !r[cfg.toggleKey]
    setPending((p) => ({ ...p, [r.id]: true }))
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, [cfg.toggleKey]: v } : x)))
    try { const res = await api.status(cfg.res, r.id, { [cfg.toggleKey]: v }); toast.success(res.message || 'Status diperbarui.') }
    catch (e) { setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, [cfg.toggleKey]: !v } : x))); toast.error(e.message) }
    finally { setPending((p) => ({ ...p, [r.id]: false })) }
  }
  const doDelete = async () => {
    setBusy(true)
    try { const r = await api.remove(cfg.res, del.id); toast.success(r.message || 'Data dihapus.'); setRows((rs) => rs.filter((x) => x.id !== del.id)); setDel(null) }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  const [onL, offL] = cfg.toggleLabel || ['Aktif', 'Nonaktif']
  const nOn = (rows || []).filter((r) => cfg.toggleKey && r[cfg.toggleKey]).length

  return (
    <div className="ad-sec">
      <div className="ad-head">
        <div><h1>{cfg.title}</h1><p>{cfg.desc}</p></div>
        <div className="ad-head-act"><a className="ad-btn ghost" href="#/admin/impor">{Ico.imp}Impor file</a><button type="button" className="ad-btn" onClick={() => setEdit('new')}>{Ico.plus}Tambah {cfg.single}</button></div>
      </div>

      <div className="ad-tools">
        <label className="ad-search">{Ico.search}<input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Cari ${cfg.single}…`} aria-label="Cari" /></label>
        {cfg.toggleKey && (
          <div className="ad-seg" role="tablist">
            {[['semua', `Semua ${rows?.length ?? ''}`], ['aktif', `${onL} ${rows ? nOn : ''}`], ['non', `${offL} ${rows ? rows.length - nOn : ''}`]].map(([k, t]) => (
              <button key={k} type="button" role="tab" aria-selected={flt === k} className={flt === k ? 'on' : ''} onClick={() => setFlt(k)}>{t}</button>
            ))}
          </div>
        )}
        <button type="button" className="ad-icon" onClick={load} aria-label="Muat ulang" title="Muat ulang">{Ico.refresh}</button>
      </div>

      {err && <div className="ad-alert">{err} <button type="button" onClick={load}>Coba lagi</button></div>}
      <div className="ad-table" role="table" aria-label={cfg.title} style={{ '--gt': `minmax(200px,2.2fr) ${cfg.cols.map(() => 'minmax(90px,1fr)').join(' ')}${cfg.toggleKey ? ' 120px' : ''} 130px 84px` }}>
        <div className="ad-tr ad-th" role="row">
          <span role="columnheader">Nama</span>
          {cfg.cols.map((c) => <span key={c.h} role="columnheader">{c.h}</span>)}
          {cfg.toggleKey && <span role="columnheader">Status</span>}
          <span role="columnheader">Diperbarui</span><span />
        </div>
        {rows == null && [0, 1, 2, 3].map((i) => <div key={i} className="ad-tr ad-skel-row"><i /><i /><i /><i /></div>)}
        {rows && shown.length === 0 && !err && (
          <div className="ad-empty">{rows.length ? 'Tidak ada data yang cocok dengan pencarian.' : <>Belum ada {cfg.single}. <button type="button" onClick={() => setEdit('new')}>Tambah sekarang</button></>}</div>
        )}
        {shown.map((r) => (
          <div className="ad-tr" role="row" key={r.id}>
            <span className="ad-name" role="cell"><b>{cfg.title_of(r) || '—'}</b><small>{cfg.sub_of(r) || ' '}</small></span>
            {cfg.cols.map((c) => {
              const v = c.r(r)
              return <span key={c.h} role="cell" data-h={c.h}>{v && typeof v === 'object' ? <span className="ad-cap"><i style={{ width: `${v.bar * 100}%` }} className={v.bar > 0.85 ? 'hot' : ''} />{v.t}</span> : v || '–'}</span>
            })}
            {cfg.toggleKey && (
              <span role="cell" data-h="Status">
                <button type="button" className={`ad-pill ${r[cfg.toggleKey] ? 'on' : ''}`} onClick={() => toggle(r)} disabled={pending[r.id]} aria-pressed={!!r[cfg.toggleKey]} title="Klik untuk mengubah status">
                  <i />{r[cfg.toggleKey] ? onL : offL}
                </button>
              </span>
            )}
            <span role="cell" className="ad-mut" data-h="Diperbarui">{fmt(r.updated_at || r.created_at)}</span>
            <span role="cell" className="ad-act">
              {!cfg.noEdit && <button type="button" className="ad-icon" onClick={() => setEdit(r)} aria-label={`Ubah ${cfg.title_of(r)}`} title="Ubah">{Ico.edit}</button>}
              <button type="button" className="ad-icon danger" onClick={() => setDel(r)} aria-label={`Hapus ${cfg.title_of(r)}`} title="Hapus">{Ico.trash}</button>
            </span>
          </div>
        ))}
      </div>

      {edit && <Editor cfg={cfg} row={edit === 'new' ? null : edit} rows={rows || []} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load() }} />}
      {del && <Confirm title={`Hapus ${cfg.single} ini?`} body={<><b>{cfg.title_of(del)}</b> akan dihapus permanen dari database dan hilang dari peta publik. Tindakan ini tidak bisa dibatalkan.</>} onYes={doDelete} onNo={() => setDel(null)} busy={busy} />}
    </div>
  )
}

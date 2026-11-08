import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import { api } from './adminApi.js'
import { useToast } from '../context/ToastContext.jsx'
import { Ico } from './icons.jsx'
import { ACCEPT, FORMATS, parseFile, normKey, toNum, downloadCsv } from './importers.js'
import { TARGETS, normalizeProps } from './importTargets.js'
import { KOTA, kecamatanAt, norm } from '../components/map/kecamatan.js'

/**
 * Impor data dari file: pilih jenis data → unggah file → cocokkan kolom → periksa → impor.
 * Titik & tabel memakai endpoint admin yang sudah ada (per baris); poligon/garis memakai
 * POST /api/admin/import/:layer (berkelompok, satu transaksi per kelompok).
 */
const GROUPS = ['Titik', 'Garis', 'Poligon', 'Tabel']
const GEOM_OF = { Point: 'point', MultiPoint: 'point', LineString: 'line', MultiLineString: 'line', Polygon: 'polygon', MultiPolygon: 'polygon' }
const inJambiArea = (lat, lng) => lat > -2.2 && lat < -1.2 && lng > 103.2 && lng < 104.1
const CHUNK = 250

function autoMap(target, columns) {
  const m = {}
  const used = new Set()
  const fields = target.geom === 'point' ? [...target.fields, { k: '__lat', syn: ['lat', 'latitude', 'lintang', 'y', 'koordinaty'] }, { k: '__lng', syn: ['lng', 'lon', 'long', 'longitude', 'bujur', 'x', 'koordinatx'] }] : target.fields
  for (const pass of ['exact', 'partial']) {
    fields.forEach((f) => {
      if (m[f.k]) return
      const syn = [f.k, ...(f.syn || [])].map(normKey)
      const c = columns.find((col) => !used.has(col) && (pass === 'exact' ? syn.includes(normKey(col)) : syn.some((s) => s.length > 3 && normKey(col).includes(s))))
      if (c) { m[f.k] = c; used.add(c) }
    })
  }
  return m
}

function FitTo({ data }) {
  const map = useMap()
  useEffect(() => {
    try { const b = L.geoJSON(data).getBounds(); if (b.isValid()) map.fitBounds(b, { padding: [20, 20], maxZoom: 15 }) } catch { /* abaikan */ }
  }, [data, map])
  return null
}

export default function ImportPage() {
  const toast = useToast()
  const [tid, setTid] = useState(null)
  const [file, setFile] = useState(null); const [parsed, setParsed] = useState(null)
  const [parsing, setParsing] = useState(false); const [perr, setPerr] = useState('')
  const [map, setMap] = useState({}); const [mode, setMode] = useState('append')
  const [kecList, setKecList] = useState([]); const [summary, setSummary] = useState(null)
  const [run, setRun] = useState(null) // {done,total,ok,fail}
  const [result, setResult] = useState(null)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef(null)
  const target = TARGETS.find((t) => t.id === tid)

  useEffect(() => { api.kecamatan().then(setKecList, () => {}); api.importSummary().then(setSummary, () => {}) }, [])
  useEffect(() => { if (target && parsed) setMap(autoMap(target, parsed.columns)) }, [target, parsed])

  const reset = () => { setFile(null); setParsed(null); setPerr(''); setResult(null); setRun(null); setMode('append') }
  const pickTarget = (id) => { setTid(id); reset() }
  const onFile = async (f) => {
    if (!f) return
    setFile(f); setPerr(''); setParsed(null); setResult(null); setParsing(true)
    try {
      const p = await parseFile(f)
      const n = p.kind === 'geo' ? p.features.length : p.rows.length
      if (!n) throw new Error('File tidak berisi data.')
      setParsed(p)
    } catch (e) { setPerr(e.message) } finally { setParsing(false) }
  }

  /* ---------- susun & periksa tiap baris ---------- */
  const records = useMemo(() => {
    if (!target || !parsed) return []
    const items = parsed.kind === 'geo' ? parsed.features : parsed.rows
    return items.map((it, i) => {
      const src = parsed.kind === 'geo' ? it.properties || {} : it
      const v = {}
      target.fields.forEach((f) => { if (map[f.k]) v[f.k] = src[map[f.k]] })
      const r = { i, src, v: normalizeProps(target, v), errors: [], warns: [] }
      target.fields.forEach((f) => { if (f.req && (v[f.k] === undefined || v[f.k] === null || String(v[f.k]).trim() === '')) r.errors.push(`${f.label} kosong`) })
      target.fields.forEach((f) => { if (f.date && v[f.k] && !toDateOk(v[f.k])) r.errors.push(`${f.label} tidak dikenali (pakai format 2025-01-31 atau 31/01/2025)`) })

      if (target.geom === 'point') {
        let lat, lng
        if (parsed.kind === 'geo') {
          const g = it.geometry
          if (GEOM_OF[g?.type] !== 'point') r.errors.push(`Geometri ${g?.type || 'kosong'}, bukan titik`)
          else { const c = g.type === 'Point' ? g.coordinates : g.coordinates[0]; [lng, lat] = c }
        } else {
          lat = toNum(src[map.__lat]); lng = toNum(src[map.__lng])
          if (lat == null || lng == null) r.errors.push('Latitude/longitude kosong atau bukan angka')
        }
        if (lat != null && lng != null) {
          if (!inJambiArea(lat, lng) && inJambiArea(lng, lat)) { [lat, lng] = [lng, lat]; r.warns.push('Latitude & longitude tertukar, sudah dibalik') }
          if (Math.abs(lat) > 90 || Math.abs(lng) > 180) r.errors.push('Koordinat di luar rentang')
          else {
            r.pt = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) }
            r.kec = kecamatanAt(lat, lng)
            if (!r.kec) r.warns.push(inJambiArea(lat, lng) ? 'Di luar batas Kota Jambi' : 'Jauh di luar Jambi, cek koordinat')
          }
        }
      } else if (target.geom === 'line' || target.geom === 'polygon') {
        const g = parsed.kind === 'geo' ? it.geometry : null
        if (!g) r.errors.push(parsed.kind === 'table' ? 'File tabel tidak punya geometri garis/poligon' : 'Fitur tanpa geometri')
        else if (GEOM_OF[g.type] !== target.geom) r.errors.push(`Geometri ${g.type}, butuh ${target.geom === 'line' ? 'garis' : 'poligon'}`)
        else {
          r.geometry = g
          const first = g.type === 'LineString' ? g.coordinates[0] : g.type === 'MultiLineString' ? g.coordinates[0][0] : g.type === 'Polygon' ? g.coordinates[0][0] : g.coordinates[0][0][0]
          if (first && (Math.abs(first[0]) > 180 || Math.abs(first[1]) > 90)) r.errors.push('Koordinat bukan derajat (WGS84). Ekspor ulang dengan EPSG:4326 atau unggah Shapefile .zip dengan .prj')
          else if (first && !inJambiArea(first[1], first[0])) r.warns.push('Berada di luar area Jambi')
          if (target.id === 'jalan') r.parts = g.type === 'LineString' ? [g.coordinates] : g.coordinates
        }
      } else if (target.id === 'hujan') {
        const k = kecList.find((x) => norm(x.nama_kecamatan) === norm(v.kecamatan))
        if (v.kecamatan && !k) r.errors.push(`Kecamatan "${v.kecamatan}" tidak dikenal`)
        r.kecId = k?.id
        if (r.v.curah_hujan != null && r.v.curah_hujan < 0) r.errors.push('Curah hujan negatif')
      }
      if (target.id === 'zona' && r.v.kelas_kerawanan && !['sangat rendah', 'rendah', 'sedang', 'tinggi', 'sangat tinggi'].includes(String(r.v.kelas_kerawanan).toLowerCase())) r.warns.push(`Kelas "${r.v.kelas_kerawanan}" tidak dikenal → dianggap Sedang`)
      if (target.id === 'elevasi' && r.v.kelas_elevasi && !['rendah', 'sedang', 'tinggi'].includes(String(r.v.kelas_elevasi).toLowerCase())) r.warns.push(`Kelas "${r.v.kelas_elevasi}" tidak dikenal → dianggap Sedang`)
      return r
    })
  }, [target, parsed, map, kecList])

  const ok = records.filter((r) => !r.errors.length)
  const nWarn = records.filter((r) => !r.errors.length && r.warns.length).length
  const missingReq = target ? [...target.fields, ...(target.geom === 'point' && parsed?.kind === 'table' ? [{ k: '__lat', label: 'Latitude', req: true }, { k: '__lng', label: 'Longitude', req: true }] : [])].filter((f) => f.req && !map[f.k]) : []

  const preview = useMemo(() => ({
    type: 'FeatureCollection',
    features: records.filter((r) => r.pt || r.geometry).slice(0, 3000).map((r) => ({ type: 'Feature', properties: { bad: r.errors.length > 0 }, geometry: r.geometry || { type: 'Point', coordinates: [r.pt.lng, r.pt.lat] } })),
  }), [records])

  /* ---------- jalankan impor ---------- */
  const start = async () => {
    if (!ok.length) return
    const fails = []; let done = 0, okN = 0
    setResult(null); setRun({ done: 0, total: ok.length, ok: 0, fail: 0 })
    const tick = () => setRun({ done, total: ok.length, ok: okN, fail: fails.length })
    try {
      if (target.via === 'layer') {
        for (let c = 0; c < ok.length; c += CHUNK) {
          const part = ok.slice(c, c + CHUNK)
          const features = part.map((r) => ({ type: 'Feature', properties: { ...r.v, kecamatan: r.v.kecamatan || undefined }, geometry: r.geometry }))
          try {
            const res = await api.importLayer(target.layer, features, c === 0 ? mode : 'append')
            okN += (res.inserted || 0) + (res.updated || 0)
            ;(res.failed || []).forEach((f) => fails.push({ r: part[f.index], message: f.message }))
          } catch (e) {
            part.forEach((r) => fails.push({ r, message: e.message }))
            if (c === 0) break // kelompok pertama gagal (mis. server mati) → hentikan
          }
          done += part.length; tick()
        }
      } else {
        const queue = target.id === 'jalan' ? ok.flatMap((r) => r.parts.map((coords, k) => ({ r, coords, k }))) : ok.map((r) => ({ r }))
        let idx = 0
        const worker = async () => {
          while (idx < queue.length) {
            const job = queue[idx++]
            try {
              if (target.via === 'hujan') await api.curahManual({ id_kecamatan: job.r.kecId, curah_hujan: job.r.v.curah_hujan, ...(job.r.v.suhu != null && { suhu: job.r.v.suhu }), ...(job.r.v.kelembapan != null && { kelembapan: job.r.v.kelembapan }) })
              else await api.create(target.res, target.build(job.r.v, job.r.pt, job.r.kec, job.coords))
              okN++
            } catch (e) { fails.push({ r: job.r, message: e.message }); if (e.status === 401 || e.status === 403) { idx = queue.length } }
            done++; tick()
          }
        }
        await Promise.all(Array.from({ length: target.via === 'hujan' ? 1 : 3 }, worker))
      }
    } finally {
      setResult({ ok: okN, fails, skipped: records.length - ok.length })
      setRun(null)
      api.importSummary().then(setSummary, () => {})
      if (okN) toast.success(`${okN} data berhasil diimpor ke ${target.label.toLowerCase()}.`)
      else toast.error('Tidak ada data yang berhasil diimpor.')
    }
  }

  const downloadTemplate = (t) => {
    const cols = [...t.fields.map((f) => f.k), ...(t.geom === 'point' ? ['latitude', 'longitude'] : [])]
    downloadCsv(`template-${t.id}.csv`, cols, t.example ? [t.example] : [])
  }
  const downloadFails = () => {
    const cols = [...(parsed?.columns || []), 'alasan_gagal']
    downloadCsv(`gagal-impor-${target.id}.csv`, cols, result.fails.map((f) => ({ ...f.r.src, alasan_gagal: f.message })))
  }
  const fieldsShown = target ? [...target.fields, ...(target.geom === 'point' && parsed?.kind === 'table' ? [{ k: '__lat', label: 'Latitude', req: true }, { k: '__lng', label: 'Longitude', req: true }] : [])] : []

  /* ---------- tampilan ---------- */
  return (
    <div className="ad-sec">
      <div className="ad-head"><div><h1>Impor data dari file</h1><p>Unggah banyak data sekaligus. Format yang diterima: CSV, Excel (.xlsx), GeoJSON, KML, GPX, dan Shapefile (.zip).</p></div></div>

      {/* 1. jenis data */}
      <section className="ad-panel">
        <header><h3><span className="ad-step">1</span>Pilih jenis data</h3>{target && <button type="button" className="ad-link" onClick={() => { setTid(null); reset() }}>Ganti jenis</button>}</header>
        {!target ? (
          <div className="im-targets">
            {GROUPS.map((g) => (
              <div key={g} className="im-group">
                <h6>{g === 'Titik' ? 'Data titik' : g === 'Garis' ? 'Data garis' : g === 'Poligon' ? 'Data area (poligon)' : 'Data tabel'}</h6>
                {TARGETS.filter((t) => t.group === g).map((t) => (
                  <button key={t.id} type="button" className="im-target" onClick={() => pickTarget(t.id)}>
                    <b>{t.label}</b>
                    <small>{t.geom === 'point' ? 'CSV, Excel, GeoJSON, KML, Shapefile' : t.geom ? 'GeoJSON, KML, Shapefile .zip' : 'CSV, Excel'}</small>
                    {t.layer && summary && <em>{summary[t.layer] ?? 0} di database</em>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="im-chosen">
            <b>{target.label}</b>
            <span className="ad-mut">{target.geom === 'point' ? 'Titik dengan latitude & longitude' : target.geom === 'line' ? 'Garis (LineString)' : target.geom === 'polygon' ? 'Area (Polygon/MultiPolygon)' : 'Tabel tanpa lokasi'}{target.note ? ` · ${target.note}` : ''}</span>
            {(target.example || target.geom === 'point') && <button type="button" className="ad-btn ghost sm" onClick={() => downloadTemplate(target)}>Unduh template CSV</button>}
          </div>
        )}
      </section>

      {/* 2. file */}
      {target && (
        <section className="ad-panel">
          <header><h3><span className="ad-step">2</span>Unggah file</h3>{file && <button type="button" className="ad-link" onClick={reset}>Ganti file</button>}</header>
          {!parsed ? (
            <label className={`im-drop${drag ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]) }}>
              <input ref={inputRef} type="file" accept={ACCEPT} onChange={(e) => onFile(e.target.files[0])} />
              <span className="im-drop-i">{parsing ? <span className="ad-spin" /> : Ico.upload}</span>
              <b>{parsing ? `Membaca ${file?.name}…` : 'Tarik file ke sini atau klik untuk memilih'}</b>
              <ul className="im-formats">{FORMATS.map(([f, d]) => <li key={f}><b>{f}</b><span>{d}</span></li>)}</ul>
            </label>
          ) : (
            <div className="im-file">
              <span className="im-file-i">{Ico.file}</span>
              <div><b>{file.name}</b><small>{(file.size / 1024).toFixed(0)} KB · {parsed.kind === 'geo' ? `${parsed.features.length} fitur` : `${parsed.rows.length} baris`} · {parsed.columns.length} kolom</small></div>
            </div>
          )}
          {perr && <p className="ad-err" role="alert">{perr}</p>}
        </section>
      )}

      {/* 3. cocokkan kolom + periksa */}
      {target && parsed && (
        <section className="ad-panel">
          <header><h3><span className="ad-step">3</span>Cocokkan kolom & periksa data</h3></header>
          <div className="im-map-grid">
            {fieldsShown.map((f) => (
              <label key={f.k} className={`ad-field${f.req && !map[f.k] ? ' miss' : ''}`}>
                <span>{f.label}{f.req && <em> *</em>}</span>
                <select value={map[f.k] || ''} onChange={(e) => setMap((m) => ({ ...m, [f.k]: e.target.value || undefined }))}>
                  <option value="">— tidak dipakai —</option>
                  {parsed.columns.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            ))}
          </div>
          {missingReq.length > 0 && <p className="ad-err">Pilih kolom untuk: {missingReq.map((f) => f.label).join(', ')}.</p>}

          <div className="im-stats">
            <span><b>{records.length}</b> total</span>
            <span className="ok"><b>{ok.length}</b> siap diimpor</span>
            {nWarn > 0 && <span className="warn"><b>{nWarn}</b> dengan catatan</span>}
            {records.length - ok.length > 0 && <span className="bad"><b>{records.length - ok.length}</b> dilewati (error)</span>}
          </div>

          <div className={`im-preview${target.geom ? '' : ' nomap'}`}>
            {target.geom && (
              <div className="im-pmap">
                <MapContainer center={[-1.61, 103.61]} zoom={11} className="ad-map">
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={19} attribution="&copy; Esri" />
                  <GeoJSON data={KOTA} interactive={false} style={() => ({ color: '#6EC1E4', weight: 2.5, fill: false })} />
                  <GeoJSON key={`${tid}-${records.length}-${ok.length}-${JSON.stringify(map).length}`} data={preview}
                    style={(f) => ({ color: f.properties.bad ? '#ef4444' : '#ffffff', weight: 2, fillColor: f.properties.bad ? '#ef4444' : '#f97316', fillOpacity: 0.35 })}
                    pointToLayer={(f, ll) => L.circleMarker(ll, { radius: 5, color: '#fff', weight: 1.5, fillColor: f.properties.bad ? '#ef4444' : '#1D6FA3', fillOpacity: 1 })} />
                  <FitTo data={preview} />
                </MapContainer>
              </div>
            )}
            <div className="im-rows">
              <div className="im-row im-rh"><span>#</span><span>Data</span><span>Status</span></div>
              {records.slice(0, 200).map((r) => (
                <div key={r.i} className={`im-row${r.errors.length ? ' bad' : r.warns.length ? ' warn' : ''}`}>
                  <span className="ad-mut">{r.i + 1}</span>
                  <span className="im-vals">{target.fields.filter((f) => r.v[f.k] != null && r.v[f.k] !== '').slice(0, 3).map((f) => <span key={f.k}><small>{f.label}</small>{String(r.v[f.k])}</span>)}{r.kec && <span><small>Lokasi</small>Kec. {r.kec}</span>}</span>
                  <span className="im-st">{r.errors.length ? r.errors[0] : r.warns.length ? r.warns[0] : 'OK'}</span>
                </div>
              ))}
              {records.length > 200 && <p className="ad-mut im-more">…dan {records.length - 200} baris lainnya</p>}
            </div>
          </div>
        </section>
      )}

      {/* 4. impor */}
      {target && parsed && (
        <section className="ad-panel">
          <header><h3><span className="ad-step">4</span>Impor</h3></header>
          {target.replaceable && (
            <div className="im-mode" role="radiogroup" aria-label="Cara impor">
              <label className={mode === 'append' ? 'on' : ''}><input type="radio" name="mode" checked={mode === 'append'} onChange={() => setMode('append')} /><b>Tambahkan</b><span>Data baru ditambahkan, data lama tetap ada.</span></label>
              <label className={`danger${mode === 'replace' ? ' on' : ''}`}><input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} /><b>Ganti semua</b><span>Hapus {summary?.[target.layer] ?? 'semua'} data {target.label.toLowerCase()} lama, lalu isi dari file ini. Batal otomatis bila tidak ada yang berhasil.</span></label>
            </div>
          )}
          {run && (
            <div className="im-prog" aria-live="polite">
              <div><i style={{ width: `${(run.done / run.total) * 100}%` }} /></div>
              <span>{run.done} / {run.total} diproses · {run.ok} berhasil{run.fail ? ` · ${run.fail} gagal` : ''}</span>
            </div>
          )}
          {result && (
            <div className={`im-result${result.fails.length ? ' part' : ''}`}>
              <b>{result.ok} data berhasil diimpor.</b>
              <span>{result.fails.length ? `${result.fails.length} gagal di server` : 'Tidak ada yang gagal di server'}{result.skipped ? ` · ${result.skipped} dilewati karena error di file` : ''}.</span>
              {result.fails.length > 0 && (
                <>
                  <ul>{result.fails.slice(0, 5).map((f, k) => <li key={k}>Baris {f.r.i + 1}: {f.message}</li>)}</ul>
                  <button type="button" className="ad-btn ghost sm" onClick={downloadFails}>Unduh baris yang gagal (CSV)</button>
                </>
              )}
            </div>
          )}
          <div className="ad-row-end">
            <span className="ad-mut">{target.via === 'layer' ? 'Dikirim berkelompok ke server dalam satu transaksi per kelompok.' : 'Dikirim baris per baris ke server.'}</span>
            <button type="button" className="ad-btn" disabled={!!run || !ok.length || missingReq.length > 0} onClick={start}>
              {run ? 'Mengimpor…' : `Impor ${ok.length} data`}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

function toDateOk(v) { return !!(v instanceof Date || /^\d{4}-\d{1,2}-\d{1,2}/.test(String(v)) || /^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}$/.test(String(v).trim()) || /^\d{5}$/.test(String(v).trim())) }

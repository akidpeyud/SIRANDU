import { useMemo, useState } from 'react'
import BlurText from '../lib/BlurText.jsx'
import { RAIN_BOUNDS as B, RAIN_CLASSES, RAIN_LADDER } from '../data/content.js'
import { useWebgis } from '../context/WebgisContext.jsx'

// Slider dibagi 6 segmen sama lebar (bukan linear) supaya kelas sempit seperti "Ringan" tetap mudah dipilih.
const toMm = (v) => { const t = (v / 1000) * 6, i = Math.min(5, Math.floor(t)), f = t - i; return B[i] + f * (B[i + 1] - B[i]) }
const toSlider = (mm) => { let i = 0; while (i < 5 && mm > B[i + 1]) i++; return Math.round(((i + (mm - B[i]) / (B[i + 1] - B[i])) / 6) * 1000) }
const classify = (mm) => (mm < 5 ? 0 : mm <= 20 ? 1 : mm <= 50 ? 2 : mm <= 100 ? 3 : mm <= 150 ? 4 : 5)
const MID = [12, 35, 75, 125, 175]

export default function Klasifikasi() {
  const { cuacaData, ringkasan, triggerSync, syncing, openMap } = useWebgis()
  const [v, setV] = useState(600)
  const [selectedKec, setSelectedKec] = useState('')
  const mm = Math.round(toMm(v))
  const idx = classify(mm)
  const c = RAIN_CLASSES[idx]
  const track = useMemo(() => 'linear-gradient(90deg,#A9C3D3 0 16.66%,#6EC1E4 16.66% 33.33%,#F2C94C 33.33% 50%,#F2994A 50% 66.66%,#E5533D 66.66% 83.33%,#B3261E 83.33%)', [])

  const handleSelectKecamatan = (kec) => {
    setSelectedKec(kec.nama_kecamatan)
    const val = parseFloat(kec.curah_hujan_terkini) || 0
    setV(toSlider(val))
  }

  return (
    <section className="cls" id="klasifikasi">
      <div className="wrap">
        <span className="tag rv">Klasifikasi curah hujan</span>
        <BlurText as="h2" style={{ maxWidth: 900 }}>Dari angka mentah jadi tindakan.</BlurText>
        <p className="lead rv">Prakiraan cuaca biasanya hanya angka seperti 80 mm/hari. SIRANDU mengubahnya menjadi level yang mudah dimengerti dan memicu tindakan, mengacu standar BMKG untuk curah hujan harian.</p>

        {/* Live Weather Status Bar from Backend API */}
        <div 
          className="rv"
          style={{
            background: '#0B3C5D',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '16px 24px',
            margin: '28px 0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 10px 25px -5px rgba(11, 60, 93, 0.25)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '24px' }}>📡</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>
                Data Cuaca Real-Time 11 Kecamatan Kota Jambi
              </div>
              <div style={{ fontSize: '12px', color: '#6EC1E4', display: 'flex', gap: '10px', marginTop: '2px' }}>
                <span>Sumber: Open-Meteo API</span>
                <span>•</span>
                <span>Normal: {ringkasan.normal}</span>
                <span>•</span>
                <span>Waspada: {ringkasan.waspada}</span>
                <span>•</span>
                <span>Siaga: {ringkasan.siaga}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={triggerSync}
              disabled={syncing}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: syncing ? 'wait' : 'pointer',
                transition: '0.2s'
              }}
            >
              {syncing ? 'Menyinkronkan...' : '⚡ Sync Cuaca Sekarang'}
            </button>
            <button
              type="button"
              onClick={() => openMap()}
              style={{
                background: '#6EC1E4',
                border: 'none',
                color: '#0B3C5D',
                padding: '8px 16px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Buka di Peta ↗
            </button>
          </div>
        </div>

        {/* Live Subdistricts Chips */}
        {cuacaData.length > 0 && (
          <div 
            className="rv"
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '12px',
              marginBottom: '20px'
            }}
          >
            {cuacaData.map((kec) => (
              <button
                key={kec.id}
                type="button"
                onClick={() => handleSelectKecamatan(kec)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  background: selectedKec === kec.nama_kecamatan ? '#0B3C5D' : '#f1f5f9',
                  color: selectedKec === kec.nama_kecamatan ? '#ffffff' : '#334155',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span 
                  style={{ 
                    width: '7px', 
                    height: '7px', 
                    borderRadius: '50%', 
                    background: kec.status_peringatan === 'Siaga' ? '#ef4444' : kec.status_peringatan === 'Waspada' ? '#f59e0b' : '#10b981' 
                  }} 
                />
                <span>{kec.nama_kecamatan}</span>
                <span style={{ opacity: 0.7, fontSize: '11px' }}>{kec.curah_hujan_terkini} mm</span>
              </button>
            ))}
          </div>
        )}

        <div className="cls-grid">
          <div className="cls-prob rv">
            <span className="lab2">Masalah</span>
            <p className="big">Warga tidak paham angka curah hujan, dan peringatan datang terlambat.</p>
            <ul>
              <li>Prakiraan hanya berupa angka atau ikon awan, jadi warga awam tidak tahu apakah angka itu berbahaya.</li>
              <li>Tidak ada patokan yang menghubungkan curah hujan dengan risiko banjir di wilayah mereka.</li>
              <li>Akibatnya, warga baru sadar setelah air naik, dan tidak sempat bersiap atau mengungsi.</li>
            </ul>
          </div>

          <div className="cls-sim rv" style={{ '--d': '.12s' }}>
            <span className="lab2 lt">Simulasi, geser untuk mencoba</span>
            <div className="sim-top">
              <div className="sim-val"><b>{mm >= 200 ? '200+' : mm}</b><span>mm/hari</span></div>
              <div className="sim-stat" style={{ '--c': c.color }}><i /><b>{c.status}</b><em>{c.kelas}</em></div>
            </div>
            <p className="sim-act">{c.aksi}</p>
            <div className="sim-track">
              <input type="range" min="0" max="1000" value={v} onChange={(e) => setV(+e.target.value)} id="simR" aria-label="Curah hujan harian dalam milimeter" style={{ background: track }} />
              <div className="sim-lab">{[5, 20, 50, 100, 150].map((n, i) => <span key={n} style={{ left: `${((i + 1) / 6) * 100}%` }}>{n}</span>)}</div>
            </div>
            <div className="ladder">
              <div className="lr lh"><span>Kelas</span><span>mm/hari</span><span>Status</span><span>Tindakan</span></div>
              {RAIN_LADDER.map((r, i) => (
                <div key={r.kelas} className={`lr${idx - 1 === i ? ' on' : ''}`} style={{ '--c': r.color }} onClick={() => setV(toSlider(MID[i]))}>
                  <span>{r.kelas}</span><span>{r.range}</span><span><i />{r.status}</span><span>{r.aksi}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

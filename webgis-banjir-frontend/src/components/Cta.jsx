import { useState } from 'react'
import BlurText from '../lib/BlurText.jsx'
import { useWebgis } from '../context/WebgisContext.jsx'
import { subscribeEmail } from '../services/api.js'

export default function Cta() {
  const { openMap, cuacaData } = useWebgis()
  const [email, setEmail] = useState('')
  const [idKecamatan, setIdKecamatan] = useState('1')
  const [status, setStatus] = useState({ state: 'idle', msg: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setStatus({ state: 'error', msg: 'Harap masukkan alamat email yang valid.' })
      return
    }

    setStatus({ state: 'loading', msg: 'Mendaftarkan email...' })
    try {
      const res = await subscribeEmail(email, parseInt(idKecamatan, 10))
      if (res && res.success) {
        setStatus({
          state: 'success',
          msg: res.message || 'Berhasil mendaftar! Email notifikasi akan dikirim jika status peringatan naik.'
        })
        setEmail('')
      } else {
        setStatus({
          state: 'error',
          msg: res?.message || 'Gagal mendaftar notifikasi. Coba lagi beberapa saat.'
        })
      }
    } catch {
      setStatus({ state: 'error', msg: 'Terjadi kesalahan jaringan.' })
    }
  }

  return (
    <section className="cta" id="mulai" style={{ padding: '100px 0' }}>
      <div className="ripples" aria-hidden="true"><span /><span /><span /></div>
      <div className="wrap" style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <BlurText as="h2">Siap sebelum <em>air naik.</em></BlurText>
        <p className="rv" style={{ fontSize: '18px', maxWidth: '620px', margin: '20px auto 36px', color: 'rgba(255,255,255,0.85)' }}>
          Buka SIRANDU dan ketahui risiko, posko, serta jalur evakuasi di sekitar Anda — atau daftarkan email Anda untuk menerima peringatan dini otomatis.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '48px' }}>
          <button 
            type="button"
            className="btn pri rv" 
            onClick={() => openMap()}
            style={{ cursor: 'pointer', border: 'none', padding: '16px 32px', fontSize: '16px' }}
          >
            Buka Peta SIRANDU <span className="arr">→</span>
          </button>
        </div>

        {/* Form Notifikasi Email (F06) */}
        <div 
          className="rv"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '20px',
            padding: '32px 28px',
            backdropFilter: 'blur(12px)',
            textAlign: 'left',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>🔔</span>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
              Langganan Notifikasi Peringatan Dini (F06)
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '20px' }}>
            Dapatkan email otomatis saat status cuaca kecamatan Anda meningkat menjadi <b>Waspada</b> atau <b>Siaga</b>. Bebas berhenti berlangganan kapan saja.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukkan alamat email Anda..."
              required
              style={{
                flex: '2',
                minWidth: '220px',
                padding: '12px 18px',
                borderRadius: '999px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none'
              }}
            />

            <select
              value={idKecamatan}
              onChange={(e) => setIdKecamatan(e.target.value)}
              style={{
                flex: '1',
                minWidth: '160px',
                padding: '12px 18px',
                borderRadius: '999px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                background: '#0B3C5D',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {cuacaData && cuacaData.length > 0 ? (
                cuacaData.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama_kecamatan}
                  </option>
                ))
              ) : (
                <>
                  <option value="1">Kota Baru</option>
                  <option value="2">Alam Barajo</option>
                  <option value="3">Jambi Selatan</option>
                  <option value="4">Paal Merah</option>
                  <option value="5">Jelutung</option>
                  <option value="6">Pasar Jambi</option>
                  <option value="7">Telanaipura</option>
                  <option value="8">Danau Sipin</option>
                  <option value="9">Danau Teluk</option>
                  <option value="10">Pelayangan</option>
                  <option value="11">Jambi Timur</option>
                </>
              )}
            </select>

            <button
              type="submit"
              disabled={status.state === 'loading'}
              style={{
                padding: '12px 24px',
                borderRadius: '999px',
                background: '#6EC1E4',
                color: '#0B3C5D',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: status.state === 'loading' ? 'wait' : 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {status.state === 'loading' ? 'Mendaftar...' : 'Daftar Notifikasi'}
            </button>
          </form>

          {status.msg && (
            <div 
              style={{
                marginTop: '14px',
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                background: status.state === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                border: `1px solid ${status.state === 'success' ? '#10b981' : '#ef4444'}`,
                color: status.state === 'success' ? '#6ee7b7' : '#fca5a5'
              }}
            >
              {status.msg}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

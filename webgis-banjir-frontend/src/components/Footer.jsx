import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import logo from '../assets/logo.png'
import { FEATURES, RAIN_LADDER } from '../data/content.js'
import { subscribeEmail } from '../services/api.js'
import { useWebgis } from '../context/WebgisContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { prefersReducedMotion } from '../lib/motion.jsx'

gsap.registerPlugin(ScrollTrigger)

const EMERGENCY = [['112', 'Darurat umum'], ['115', 'Basarnas (SAR)'], ['117', 'BNPB']]
const SOCIAL = ['Instagram', 'GitHub', 'Email']

export default function Footer() {
  const root = useRef(null)
  const [sent, setSent] = useState(false)
  const [mail, setMail] = useState('')
  const { cuacaData } = useWebgis()
  const toast = useToast()
  const [kec, setKec] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.from('.sf-word span', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: '.sf-word', start: 'top 92%', once: true } })
      gsap.from('.sf-col', { y: 36, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: '.sf-cols', start: 'top 85%', once: true } })
    }, root)
    return () => ctx.revert()
  }, [])

  // Cahaya mengikuti kursor pada seluruh footer.
  const move = (e) => {
    const r = root.current.getBoundingClientRect()
    root.current.style.setProperty('--mx', `${e.clientX - r.left}px`)
    root.current.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  const submit = async (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(mail)) { setErr('Alamat email belum valid.'); return }
    if (!kec) { setErr('Pilih kecamatan yang ingin dipantau.'); return }
    setErr(''); setBusy(true)
    try { const r = await subscribeEmail(mail.trim(), kec); setSent(true); toast.success(r?.message || 'Berhasil mendaftar. Cek email untuk verifikasi.') }
    catch (x) { setErr(x.message || 'Gagal mendaftar. Coba lagi.'); toast.error(x.message || 'Gagal mendaftar.') } finally { setBusy(false) }
  }

  return (
    <footer className="sf" ref={root} onPointerMove={move}>
      <div className="sf-glow" aria-hidden="true" />
      <div className="wrap">
        <div className="sf-top">
          <div className="sf-sub">
            <span className="tag" style={{ color: 'var(--accent)' }}>Notifikasi dini</span>
            <h3>Dapat kabar sebelum air naik.</h3>
            <p>Masukkan email untuk menerima peringatan saat status wilayahmu naik.</p>
          </div>
          <form className="sf-form" id="notifikasi" onSubmit={submit} noValidate>
            {sent ? (
              <div className="sf-ok" role="status"><i />Terima kasih. Cek <b>{mail}</b> untuk tautan verifikasi.</div>
            ) : (
              <>
                <select aria-label="Kecamatan" value={kec} onChange={(e) => setKec(e.target.value)} disabled={busy} className="sf-kec"><option value="">Kecamatan…</option>{cuacaData.map((k) => <option key={k.id} value={k.id}>{k.nama_kecamatan}</option>)}</select>
                <input type="email" placeholder="nama@email.com" value={mail} onChange={(e) => setMail(e.target.value)} aria-label="Alamat email" aria-invalid={!!err} disabled={busy} />
                <button type="submit" disabled={busy}>{busy ? 'Mengirim…' : 'Aktifkan peringatan'}<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
              </>
            )}
            {err && <p className="sf-err" role="alert">{err}</p>}
          </form>
        </div>

        <div className="sf-cols">
          <div className="sf-col sf-brand">
            <a className="logo" href="#top"><img className="lg" src={logo} alt="Logo SIRANDU" width="44" height="44" />sirandu</a>
            <p>Sistem Informasi Rawan Bencana Kota Jambi. Peta risiko, posko, dan jalur evakuasi dalam satu tempat.</p>
            <div className="sf-soc">{SOCIAL.map((s) => <a key={s} href="#top" onClick={(e) => e.preventDefault()} aria-label={`${s} (segera hadir)`}>{s}</a>)}</div>
          </div>
          <div className="sf-col">
            <h5>Jelajahi</h5>
            <a href="#masalah">Masalah</a><a href="#fitur">Fitur</a><a href="#klasifikasi">Klasifikasi hujan</a><a href="#cara">Cara kerja</a><a href="#mulai">Mulai</a>
          </div>
          <div className="sf-col">
            <h5>Fitur</h5>
            {FEATURES.map((f) => <a key={f.title} href="#fitur">{f.title}</a>)}
          </div>
          <div className="sf-col">
            <h5>Level siaga</h5>
            <ul className="sf-lv">{RAIN_LADDER.map((r) => <li key={r.kelas} style={{ '--c': r.color }}><i />{r.status}<em>{r.range} mm</em></li>)}</ul>
            <h5 style={{ marginTop: 26 }}>Nomor darurat</h5>
            <ul className="sf-em">{EMERGENCY.map(([n, t]) => <li key={n}><a href={`tel:${n}`}><b>{n}</b>{t}</a></li>)}</ul>
          </div>
        </div>
      </div>

      <div className="sf-word" aria-hidden="true">
        {'SIRANDU'.split('').map((ch, i) => <span key={i}>{ch}</span>)}
      </div>
      <svg className="sf-wave" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true">
        <path className="a" d="M0 30 Q75 8 150 30 T300 30 T450 30 T600 30 T750 30 T900 30 T1050 30 T1200 30 T1350 30 T1500 30 V60 H0Z" />
        <path className="b" d="M0 38 Q75 18 150 38 T300 38 T450 38 T600 38 T750 38 T900 38 T1050 38 T1200 38 T1350 38 T1500 38 V60 H0Z" />
      </svg>

      <div className="sf-base">
        <div className="wrap">
          <small>© 2026 SIRANDU, Kota Jambi. Data dan ilustrasi pada halaman ini adalah placeholder untuk pengembangan. Klasifikasi curah hujan mengacu pada standar BMKG.</small>
          <a className="sf-admin" href="#/admin">Masuk admin</a>
          <a className="sf-up" href="#top" aria-label="Kembali ke atas"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg></a>
        </div>
      </div>
    </footer>
  )
}

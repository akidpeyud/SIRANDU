import { lazy, Suspense, useEffect, useState } from 'react'
import './admin.css'
import { api, session, setOnExpired } from './adminApi.js'
import { useToast } from '../context/ToastContext.jsx'
import { RESOURCES } from './resources.js'
import CrudSection from './CrudSection.jsx'
import { Dashboard, CurahHujan, Pengaturan, Notifikasi } from './Pages.jsx'
const ImportPage = lazy(() => import('./ImportPage.jsx'))
import { Ico } from './icons.jsx'
import logo from '../assets/logo-mark-sm.png'

/**
 * Panel admin SIRANDU di #/admin/<halaman>.
 * Login → JWT (POST /api/admin/login), lalu kelola posko, air bersih, titik banjir,
 * jalan tergenang, curah hujan manual, ambang & bobot model, dan notifikasi.
 */
const NAV = [
  { id: 'ringkasan', label: 'Ringkasan', i: Ico.home },
  { group: 'Data peta' },
  { id: 'posko', label: 'Posko', i: Ico.posko },
  { id: 'air', label: 'Air bersih', i: Ico.air },
  { id: 'jalan', label: 'Jalan tergenang', i: Ico.jalan },
  { id: 'banjir', label: 'Titik banjir', i: Ico.banjir },
  { id: 'impor', label: 'Impor dari file', i: Ico.imp },
  { group: 'Cuaca & sistem' },
  { id: 'hujan', label: 'Curah hujan', i: Ico.rain },
  { id: 'pengaturan', label: 'Pengaturan', i: Ico.sliders },
  { id: 'notifikasi', label: 'Notifikasi', i: Ico.mail },
]
const pageFromHash = () => {
  const p = window.location.hash.replace(/^#\/admin\/?/, '').split('?')[0]
  return NAV.some((n) => n.id === p) ? p : 'ringkasan'
}

function Login({ onIn }) {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [rem, setRem] = useState(false)
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [show, setShow] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (!u || !p) return setErr('Isi username dan password.')
    setBusy(true); setErr('')
    try { const r = await api.login(u.trim(), p); session.set({ token: r.token, admin: r.admin }, rem); onIn(r.admin) }
    catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <div className="ad-login">
      <div className="ad-login-art" aria-hidden="true">
        <div className="ad-login-rain">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>
        <svg className="ad-login-wave" viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="M0 60 Q 180 10 360 60 T 720 60 T 1080 60 T 1440 60 V120 H0Z" /></svg>
        <div className="ad-login-copy"><img src={logo} alt="" width="64" height="56" /><h2>SIRANDU<br /><span>Pusat kendali data.</span></h2><p>Perbarui posko, air bersih, jalan tergenang, dan curah hujan. Perubahan langsung tampil di peta warga.</p></div>
      </div>
      <form className="ad-login-form" onSubmit={submit} noValidate>
        <h1>Masuk admin</h1>
        <p className="ad-mut">Khusus petugas BPBD / tim SIRANDU.</p>
        <label className="ad-field"><span>Username</span><input autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} autoFocus /></label>
        <label className="ad-field"><span>Password</span>
          <span className="ad-pass"><input type={show ? 'text' : 'password'} autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} /><button type="button" onClick={() => setShow((s) => !s)}>{show ? 'Sembunyikan' : 'Tampilkan'}</button></span>
        </label>
        <label className="ad-check"><input type="checkbox" checked={rem} onChange={(e) => setRem(e.target.checked)} />Ingat saya di perangkat ini</label>
        {err && <p className="ad-err" role="alert">{err}</p>}
        <button type="submit" className="ad-btn wide" disabled={busy}>{busy ? 'Memeriksa…' : 'Masuk'}</button>
        <a className="ad-link" href="#">← Kembali ke situs</a>
      </form>
    </div>
  )
}

export default function AdminApp() {
  const toast = useToast()
  const [admin, setAdmin] = useState(() => session.get()?.admin || null)
  const [page, setPage] = useState(pageFromHash)
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.remove('is-loading')
    document.title = 'Admin · SIRANDU'
    const onHash = () => { setPage(pageFromHash()); setNavOpen(false) }
    window.addEventListener('hashchange', onHash)
    setOnExpired((m) => { setAdmin(null); toast.info(m || 'Sesi berakhir. Silakan masuk lagi.') })
    return () => { window.removeEventListener('hashchange', onHash); document.title = 'SIRANDU — Sistem Informasi Rawan Bencana Kota Jambi' }
  }, [toast])
  // pastikan token masih berlaku saat halaman dibuka
  useEffect(() => { if (admin) api.me().catch(() => {}) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!admin) return <Login onIn={(a) => { setAdmin(a); toast.success(`Selamat datang, ${a?.nama_lengkap || a?.username}.`) }} />

  const go = (id) => { window.location.hash = `#/admin/${id}` }
  const logout = () => { session.clear(); setAdmin(null) }
  const cur = NAV.find((n) => n.id === page)

  return (
    <div className={`ad${navOpen ? ' nav-open' : ''}`}>
      <aside className="ad-side">
        <a className="ad-brand" href="#/admin"><img src={logo} alt="" width="34" height="30" /><span><b>SIRANDU</b><small>Panel admin</small></span></a>
        <nav>
          {NAV.map((n, i) => n.group ? <h6 key={i}>{n.group}</h6> : (
            <a key={n.id} href={`#/admin/${n.id}`} className={page === n.id ? 'on' : ''} aria-current={page === n.id ? 'page' : undefined}>{n.i}<span>{n.label}</span></a>
          ))}
        </nav>
        <div className="ad-side-foot">
          <a href="#" className="ad-side-link">{Ico.globe}Lihat situs</a>
          <a href="#/peta" className="ad-side-link">{Ico.jalan}Buka peta publik</a>
        </div>
      </aside>
      <div className="ad-scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />

      <div className="ad-main">
        <header className="ad-top">
          <button type="button" className="ad-icon ad-burger" onClick={() => setNavOpen(true)} aria-label="Buka menu">{Ico.menu}</button>
          <span className="ad-crumb">Admin <i>/</i> <b>{cur?.label}</b></span>
          <div className="ad-user">
            <span className="ad-av" aria-hidden="true">{String(admin.nama_lengkap || admin.username || '?').slice(0, 1).toUpperCase()}</span>
            <span className="ad-uname"><b>{admin.nama_lengkap || admin.username}</b><small>{admin.role || 'admin'}</small></span>
            <button type="button" className="ad-btn ghost sm" onClick={logout}>{Ico.out}Keluar</button>
          </div>
        </header>
        <main className="ad-content" key={page}>
          {page === 'ringkasan' && <Dashboard go={go} />}
          {RESOURCES[page] && <CrudSection cfg={RESOURCES[page]} />}
          {page === 'hujan' && <CurahHujan />}
          {page === 'pengaturan' && <Pengaturan />}
          {page === 'notifikasi' && <Notifikasi />}
          {page === 'impor' && <Suspense fallback={<div className="ad-skel" style={{ height: 300 }} />}><ImportPage /></Suspense>}
        </main>
      </div>
    </div>
  )
}

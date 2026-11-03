import logo from '../assets/logo.png'

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="row">
          <div>
            <a className="logo" href="#top"><img className="lg" src={logo} alt="Logo SIRANDU" width="44" height="44" />sirandu</a>
            <p style={{ marginTop: 14, maxWidth: 320, lineHeight: 1.5 }}>Sistem Informasi Rawan Bencana Kota Jambi.</p>
          </div>
          <nav>
            <a href="#masalah">Masalah</a>
            <a href="#fitur">Fitur</a>
            <a href="#cara">Cara kerja</a>
            <a href="#mulai">Mulai</a>
            <a href="/admin" target="_blank" style={{ color: '#6EC1E4', fontWeight: 600 }}>🔐 Portal Admin BPBD</a>
          </nav>
        </div>
        <small>© 2026 SIRANDU. Data dan ilustrasi pada halaman ini adalah placeholder untuk pengembangan.</small>
      </div>
    </footer>
  )
}

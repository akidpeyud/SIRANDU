import { KECAMATAN } from '../components/map/kecamatan.js'

/** Konfigurasi data yang bisa dikelola admin. Nama field mengikuti adminCrudController di backend. */
const KEC_OPTS = KECAMATAN.features.map((f) => f.properties.nama_kecamatan)
const num = (v) => (v === '' || v == null ? null : Number(v))

export const RESOURCES = {
  posko: {
    res: 'posko', title: 'Posko pengungsian', single: 'posko', geo: 'point', toggleKey: 'status_aktif',
    desc: 'Lokasi, kapasitas, dan kontak penanggung jawab posko.',
    fields: [
      { k: 'nama', label: 'Nama posko', req: true, span: 2, ph: 'mis. Posko GOR Kota Baru' },
      { k: 'alamat', label: 'Alamat', span: 2, ph: 'Jl. …' },
      { k: 'kontak', label: 'Kontak penanggung jawab', ph: '08xx' },
      { k: 'kapasitas', label: 'Kapasitas (jiwa)', type: 'number', min: 0 },
      { k: 'terisi_jiwa', label: 'Terisi saat ini (jiwa)', type: 'number', min: 0, editOnly: true },
      { k: 'fasilitas', label: 'Fasilitas', span: 2, ph: 'Dapur umum, MCK, Klinik (pisahkan dengan koma)' },
      { k: 'status_aktif', label: 'Posko aktif', type: 'bool' },
    ],
    empty: { nama: '', alamat: '', kontak: '', kapasitas: 100, terisi_jiwa: 0, fasilitas: '', status_aktif: true },
    fromRow: (r) => ({ ...r, fasilitas: Array.isArray(r.fasilitas) ? r.fasilitas.join(', ') : r.fasilitas || '' }),
    toBody: (f, p) => ({ nama: f.nama, alamat: f.alamat, kontak: f.kontak, kapasitas: num(f.kapasitas), terisi_jiwa: num(f.terisi_jiwa), fasilitas: f.fasilitas, status_aktif: !!f.status_aktif, latitude: p.lat, longitude: p.lng }),
    title_of: (r) => r.nama, sub_of: (r) => r.alamat,
    cols: [
      { h: 'Kapasitas', r: (x) => ({ bar: x.kapasitas ? Math.min(1, (x.terisi_jiwa || 0) / x.kapasitas) : 0, t: `${x.terisi_jiwa || 0} / ${x.kapasitas ?? '–'}` }) },
      { h: 'Kontak', r: (x) => x.kontak },
    ],
  },
  air: {
    res: 'air-bersih', title: 'Sumber air bersih', single: 'sumber air', geo: 'point', toggleKey: 'status_aktif',
    desc: 'Sumur, hidran, dan tangki air darurat untuk warga.',
    fields: [
      { k: 'nama_lokasi', label: 'Nama lokasi', req: true, span: 2, ph: 'mis. Hidran Simpang Kawat' },
      { k: 'jenis', label: 'Jenis', type: 'select', opts: ['PDAM / Kran Komunal', 'Sumur Bor', 'Hidran Umum', 'Tangki Air Darurat', 'Lainnya'] },
      { k: 'pengelola', label: 'Pengelola', ph: 'PDAM Tirta Mayang' },
      { k: 'jam_operasional', label: 'Jam operasional', ph: '24 Jam' },
      { k: 'debit_liter_detik', label: 'Debit (liter/detik)', type: 'number', min: 0, step: 0.1 },
      { k: 'keterangan', label: 'Keterangan', type: 'textarea', span: 2 },
      { k: 'status_aktif', label: 'Sumber aktif & layak', type: 'bool' },
    ],
    empty: { nama_lokasi: '', jenis: 'PDAM / Kran Komunal', pengelola: '', jam_operasional: '24 Jam', debit_liter_detik: 5, keterangan: '', status_aktif: true },
    fromRow: (r) => ({ ...r }),
    toBody: (f, p) => ({ ...f, debit_liter_detik: num(f.debit_liter_detik), status_aktif: !!f.status_aktif, latitude: p.lat, longitude: p.lng }),
    title_of: (r) => r.nama_lokasi, sub_of: (r) => [r.jenis, r.pengelola].filter(Boolean).join(' · '),
    cols: [
      { h: 'Jam', r: (x) => x.jam_operasional },
      { h: 'Debit', r: (x) => (x.debit_liter_detik != null ? `${x.debit_liter_detik} L/dtk` : '–') },
    ],
  },
  banjir: {
    res: 'titik-banjir', title: 'Titik banjir historis', single: 'titik banjir', geo: 'point',
    desc: 'Kejadian banjir di lapangan, dipakai untuk memvalidasi model zona rawan.',
    fields: [
      { k: 'nama_lokasi', label: 'Nama lokasi', req: true, span: 2, ph: 'mis. Simpang Rimbo' },
      { k: 'kecamatan', label: 'Kecamatan', type: 'select', opts: KEC_OPTS, auto: true },
      { k: 'tanggal_kejadian', label: 'Tanggal kejadian', type: 'date', req: true },
      { k: 'tinggi_genangan_cm', label: 'Tinggi genangan (cm)', type: 'number', min: 0 },
      { k: 'lama_genangan_jam', label: 'Lama genangan (jam)', type: 'number', min: 0 },
      { k: 'keterangan', label: 'Keterangan', type: 'textarea', span: 2 },
    ],
    empty: { nama_lokasi: '', kecamatan: '', tanggal_kejadian: new Date().toISOString().slice(0, 10), tinggi_genangan_cm: '', lama_genangan_jam: '', keterangan: '' },
    fromRow: (r) => ({ ...r, tanggal_kejadian: r.tanggal_kejadian ? String(r.tanggal_kejadian).slice(0, 10) : '' }),
    toBody: (f, p) => ({ ...f, tinggi_genangan_cm: num(f.tinggi_genangan_cm), lama_genangan_jam: num(f.lama_genangan_jam), latitude: p.lat, longitude: p.lng }),
    title_of: (r) => r.nama_lokasi, sub_of: (r) => r.kecamatan && `Kec. ${r.kecamatan}`,
    cols: [
      { h: 'Tanggal', r: (x) => (x.tanggal_kejadian ? new Date(x.tanggal_kejadian).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '–') },
      { h: 'Genangan', r: (x) => (x.tinggi_genangan_cm != null ? `${x.tinggi_genangan_cm} cm` : '–') },
    ],
  },
  jalan: {
    res: 'jalan-tergenang', title: 'Jalan tergenang', single: 'ruas jalan', geo: 'line', toggleKey: 'status_tergenang', noEdit: true,
    desc: 'Ruas jalan yang tergenang. Rute evakuasi otomatis menghindarinya.',
    toggleLabel: ['Tergenang', 'Surut'],
    fields: [
      { k: 'nama_jalan', label: 'Nama jalan', req: true, span: 2, ph: 'mis. Jl. Kapten Pattimura' },
      { k: 'kecamatan', label: 'Kecamatan', type: 'select', opts: KEC_OPTS },
      { k: 'kedalaman_genangan_cm', label: 'Kedalaman (cm)', type: 'number', min: 0 },
      { k: 'keterangan', label: 'Keterangan', type: 'textarea', span: 2 },
      { k: 'status_tergenang', label: 'Sedang tergenang', type: 'bool' },
    ],
    empty: { nama_jalan: '', kecamatan: '', kedalaman_genangan_cm: 30, keterangan: '', status_tergenang: true },
    fromRow: (r) => ({ ...r }),
    toBody: (f, _p, line) => ({ ...f, kedalaman_genangan_cm: num(f.kedalaman_genangan_cm), status_tergenang: !!f.status_tergenang, coordinates: line }),
    title_of: (r) => r.nama_jalan, sub_of: (r) => r.kecamatan && `Kec. ${r.kecamatan}`,
    cols: [{ h: 'Kedalaman', r: (x) => (x.kedalaman_genangan_cm != null ? `${x.kedalaman_genangan_cm} cm` : '–') }],
  },
}

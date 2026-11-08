import { toNum, toDate, toBool } from './importers.js'

/**
 * Tujuan impor. `fields` = kolom tujuan + sinonim nama kolom sumber untuk pencocokan otomatis.
 * geom: 'point' | 'line' | 'polygon' | null (tabel tanpa lokasi).
 * via:  'crud'   → tiap baris dikirim ke endpoint admin yang sudah ada (POST /api/admin/<res>)
 *       'layer'  → dikirim berkelompok ke POST /api/admin/import/<layer> (endpoint baru)
 *       'hujan'  → POST /api/admin/curah-hujan-manual per baris
 */
const LAT = { k: '__lat', label: 'Latitude', req: true, syn: ['lat', 'latitude', 'lintang', 'y', 'koordinaty', 'ycoord'] }
const LNG = { k: '__lng', label: 'Longitude', req: true, syn: ['lng', 'lon', 'long', 'longitude', 'bujur', 'x', 'koordinatx', 'xcoord'] }
const KEC = { k: 'kecamatan', label: 'Kecamatan', syn: ['kecamatan', 'namakecamatan', 'kec', 'wadmkc', 'district', 'subdistrict'] }

export const TARGETS = [
  {
    id: 'posko', label: 'Posko pengungsian', group: 'Titik', geom: 'point', via: 'crud', res: 'posko',
    fields: [
      { k: 'nama', label: 'Nama posko', req: true, syn: ['nama', 'namaposko', 'posko', 'name', 'nama_lokasi', 'lokasi'] },
      { k: 'alamat', label: 'Alamat', syn: ['alamat', 'address', 'lokasi', 'jalan'] },
      { k: 'kontak', label: 'Kontak', syn: ['kontak', 'kontakpj', 'telp', 'telepon', 'hp', 'nohp', 'phone', 'cp'] },
      { k: 'kapasitas', label: 'Kapasitas (jiwa)', num: true, syn: ['kapasitas', 'kapasitasjiwa', 'daya tampung', 'dayatampung', 'capacity'] },
      { k: 'fasilitas', label: 'Fasilitas', syn: ['fasilitas', 'facilities'] },
      { k: 'status_aktif', label: 'Aktif (ya/tidak)', bool: true, syn: ['statusaktif', 'aktif', 'status'] },
    ],
    build: (v, pt) => ({ nama: v.nama, alamat: v.alamat || '-', kontak: v.kontak || '-', kapasitas: toNum(v.kapasitas) ?? 100, fasilitas: v.fasilitas || '-', status_aktif: toBool(v.status_aktif), latitude: pt.lat, longitude: pt.lng }),
    example: { nama: 'Posko GOR Kota Baru', alamat: 'Jl. Jend. Sudirman', kontak: '0812xxxx', kapasitas: 250, fasilitas: 'Dapur umum, MCK', status_aktif: 'ya', latitude: -1.6372, longitude: 103.6011 },
  },
  {
    id: 'air', label: 'Sumber air bersih', group: 'Titik', geom: 'point', via: 'crud', res: 'air-bersih',
    fields: [
      { k: 'nama_lokasi', label: 'Nama lokasi', req: true, syn: ['namalokasi', 'namatitik', 'nama', 'name', 'lokasi'] },
      { k: 'jenis', label: 'Jenis', syn: ['jenis', 'tipe', 'type', 'kategori'] },
      { k: 'pengelola', label: 'Pengelola', syn: ['pengelola', 'operator', 'pemilik'] },
      { k: 'jam_operasional', label: 'Jam operasional', syn: ['jamoperasional', 'jam', 'operasional'] },
      { k: 'debit_liter_detik', label: 'Debit (L/detik)', num: true, syn: ['debitliterdetik', 'debit', 'debitlds'] },
      { k: 'keterangan', label: 'Keterangan', syn: ['keterangan', 'catatan', 'ket', 'description', 'deskripsi'] },
    ],
    build: (v, pt) => ({ nama_lokasi: v.nama_lokasi, jenis: v.jenis || undefined, pengelola: v.pengelola || undefined, jam_operasional: v.jam_operasional || undefined, debit_liter_detik: toNum(v.debit_liter_detik), keterangan: v.keterangan || undefined, status_aktif: true, latitude: pt.lat, longitude: pt.lng }),
    example: { nama_lokasi: 'Hidran Simpang Kawat', jenis: 'Hidran Umum', pengelola: 'PDAM Tirta Mayang', jam_operasional: '24 Jam', debit_liter_detik: 5, keterangan: '', latitude: -1.6101, longitude: 103.6131 },
  },
  {
    id: 'banjir', label: 'Titik banjir historis', group: 'Titik', geom: 'point', via: 'crud', res: 'titik-banjir',
    fields: [
      { k: 'nama_lokasi', label: 'Nama lokasi', req: true, syn: ['namalokasi', 'lokasi', 'nama', 'name'] },
      KEC,
      { k: 'tanggal_kejadian', label: 'Tanggal kejadian', req: true, date: true, syn: ['tanggalkejadian', 'tanggal', 'tgl', 'date', 'waktu'] },
      { k: 'tinggi_genangan_cm', label: 'Tinggi genangan (cm)', num: true, syn: ['tinggigenangancm', 'tinggigenangan', 'tinggi', 'kedalaman', 'depth'] },
      { k: 'lama_genangan_jam', label: 'Lama genangan (jam)', num: true, syn: ['lamagenanganjam', 'lamagenangan', 'durasi', 'lama'] },
      { k: 'keterangan', label: 'Keterangan', syn: ['keterangan', 'catatan', 'ket', 'description'] },
    ],
    build: (v, pt, kec) => ({ nama_lokasi: v.nama_lokasi, kecamatan: v.kecamatan || kec || undefined, tanggal_kejadian: toDate(v.tanggal_kejadian), tinggi_genangan_cm: toNum(v.tinggi_genangan_cm), lama_genangan_jam: toNum(v.lama_genangan_jam), keterangan: v.keterangan || undefined, latitude: pt.lat, longitude: pt.lng }),
    example: { nama_lokasi: 'Simpang Rimbo', kecamatan: 'Alam Barajo', tanggal_kejadian: '2025-01-12', tinggi_genangan_cm: 60, lama_genangan_jam: 8, keterangan: '', latitude: -1.6409, longitude: 103.5701 },
  },
  {
    id: 'jalan', label: 'Jalan tergenang', group: 'Garis', geom: 'line', via: 'crud', res: 'jalan-tergenang',
    fields: [
      { k: 'nama_jalan', label: 'Nama jalan', req: true, syn: ['namajalan', 'jalan', 'nama', 'name', 'namobj', 'road'] },
      KEC,
      { k: 'kedalaman_genangan_cm', label: 'Kedalaman (cm)', num: true, syn: ['kedalamangenangancm', 'kedalaman', 'tinggi', 'depth'] },
      { k: 'keterangan', label: 'Keterangan', syn: ['keterangan', 'catatan', 'ket', 'description'] },
      { k: 'status_tergenang', label: 'Tergenang (ya/tidak)', bool: true, syn: ['statustergenang', 'tergenang', 'status'] },
    ],
    build: (v, _pt, kec, coords) => ({ nama_jalan: v.nama_jalan, kecamatan: v.kecamatan || kec || undefined, kedalaman_genangan_cm: toNum(v.kedalaman_genangan_cm) ?? 30, keterangan: v.keterangan || undefined, status_tergenang: toBool(v.status_tergenang), coordinates: coords }),
  },
  {
    id: 'hujan', label: 'Curah hujan manual', group: 'Tabel', geom: null, via: 'hujan',
    fields: [
      { k: 'kecamatan', label: 'Kecamatan', req: true, syn: ['kecamatan', 'namakecamatan', 'kec', 'wilayah'] },
      { k: 'curah_hujan', label: 'Curah hujan (mm/jam)', req: true, num: true, syn: ['curahhujan', 'hujan', 'mm', 'precipitation', 'rain', 'curahhujanmmjam'] },
      { k: 'suhu', label: 'Suhu (°C)', num: true, syn: ['suhu', 'temperatur', 'temperature', 'temp'] },
      { k: 'kelembapan', label: 'Kelembapan (%)', num: true, syn: ['kelembapan', 'kelembaban', 'humidity', 'rh'] },
    ],
    example: { kecamatan: 'Jelutung', curah_hujan: 6.5, suhu: 27.4, kelembapan: 88 },
  },
  {
    id: 'zona', label: 'Zona rawan banjir', group: 'Poligon', geom: 'polygon', via: 'layer', layer: 'zona', replaceable: true,
    fields: [
      { k: 'kelas_kerawanan', label: 'Kelas kerawanan', req: true, syn: ['kelaskerawanan', 'kelas', 'tingkatrawan', 'kerawanan', 'class', 'gridcode', 'kategori'] },
      { k: 'nama_zona', label: 'Nama zona', syn: ['namazona', 'nama', 'name'] },
      KEC,
      { k: 'skor_total', label: 'Skor AHP', num: true, syn: ['skortotal', 'skor', 'score', 'nilai'] },
      { k: 'faktor_penyebab_utama', label: 'Penyebab utama', syn: ['faktorpenyebabutama', 'penyebab', 'faktor'] },
      { k: 'rekomendasi_mitigasi', label: 'Rekomendasi mitigasi', syn: ['rekomendasimitigasi', 'mitigasi', 'rekomendasi'] },
      { k: 'warna_hex', label: 'Warna (#hex)', syn: ['warnahex', 'warna', 'color'] },
    ],
    note: 'Kelas: Sangat Rendah, Rendah, Sedang, Tinggi, Sangat Tinggi (juga menerima angka 1–5).',
  },
  {
    id: 'elevasi', label: 'Ketinggian tanah (DEMNAS)', group: 'Poligon', geom: 'polygon', via: 'layer', layer: 'elevasi', replaceable: true,
    fields: [
      { k: 'kelas_elevasi', label: 'Kelas elevasi', req: true, syn: ['kelaselevasi', 'kelas', 'class', 'gridcode', 'kategori'] },
      { k: 'rentang_mdpl', label: 'Rentang (mdpl)', syn: ['rentangmdpl', 'rentang', 'range'] },
      { k: 'rata_elevasi_mdpl', label: 'Rata-rata (mdpl)', num: true, syn: ['rataelevasimdpl', 'elevasi', 'mean', 'rata', 'dn'] },
      { k: 'nama_wilayah', label: 'Nama wilayah', syn: ['namawilayah', 'nama', 'name', 'wilayah'] },
      KEC,
      { k: 'warna_hex', label: 'Warna (#hex)', syn: ['warnahex', 'warna', 'color'] },
    ],
    note: 'Kelas: Rendah, Sedang, Tinggi (juga menerima angka 1–3).',
  },
  {
    id: 'batas', label: 'Batas kelurahan', group: 'Poligon', geom: 'polygon', via: 'layer', layer: 'batas', replaceable: false,
    fields: [
      { k: 'nama_kecamatan', label: 'Nama kecamatan', req: true, syn: ['namakecamatan', 'kecamatan', 'wadmkc', 'kec', 'district'] },
      { k: 'nama_kelurahan', label: 'Nama kelurahan', req: true, syn: ['namakelurahan', 'kelurahan', 'desa', 'wadmkd', 'namobj', 'village'] },
      { k: 'kode_wilayah', label: 'Kode wilayah', syn: ['kodewilayah', 'kode', 'kdepum', 'kodekel', 'code'] },
    ],
    note: 'Diperbarui per kelurahan (berdasarkan nama kecamatan + kelurahan). Data lama tidak dihapus, karena dipakai pelanggan notifikasi dan zona.',
  },
  {
    id: 'sungai', label: 'Sungai', group: 'Garis', geom: 'line', via: 'layer', layer: 'sungai', replaceable: true,
    fields: [
      { k: 'nama_sungai', label: 'Nama sungai', req: true, syn: ['namasungai', 'nama', 'name', 'namobj', 'sungai'] },
      { k: 'tipe', label: 'Tipe (Sungai Utama / Anak Sungai)', syn: ['tipe', 'type', 'kategori', 'remark'] },
      { k: 'lebar_rata_rata_meter', label: 'Lebar rata-rata (m)', num: true, syn: ['lebarratarata', 'lebar', 'width'] },
    ],
    note: 'Buffer bahaya 150/400/800 m dihitung otomatis dari sungai bertipe "Sungai Utama".',
  },
]

const ANGKA_RAWAN = { 1: 'Sangat Rendah', 2: 'Rendah', 3: 'Sedang', 4: 'Tinggi', 5: 'Sangat Tinggi' }
const ANGKA_ELEV = { 1: 'Rendah', 2: 'Sedang', 3: 'Tinggi' }
/** Normalisasi nilai kelas yang sering berupa angka di hasil QGIS. */
export function normalizeProps(target, v) {
  const o = { ...v }
  if (target.id === 'zona' && ANGKA_RAWAN[String(o.kelas_kerawanan).trim()]) o.kelas_kerawanan = ANGKA_RAWAN[String(o.kelas_kerawanan).trim()]
  if (target.id === 'elevasi' && ANGKA_ELEV[String(o.kelas_elevasi).trim()]) o.kelas_elevasi = ANGKA_ELEV[String(o.kelas_elevasi).trim()]
  target.fields.forEach((f) => { if (f.num && o[f.k] !== undefined) o[f.k] = toNum(o[f.k]) })
  return o
}

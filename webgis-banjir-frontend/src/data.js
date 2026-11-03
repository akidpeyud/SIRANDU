export const features = [
  { id: 'banjir', title: 'Daerah Rawan Banjir', desc: 'Peta zonasi tingkat kerawanan banjir per kecamatan dan kelurahan di Kota Jambi.', tag: 'Peta' },
  { id: 'hujan', title: 'Grafik Klasifikasi Curah Hujan', desc: 'Visualisasi curah hujan bulanan yang diklasifikasikan menjadi rendah, sedang, tinggi, dan sangat tinggi.', tag: 'Grafik' },
  { id: 'air', title: 'Peta Sumber Air Bersih', desc: 'Lokasi titik air bersih yang dapat diakses warga saat air bersih terganggu akibat banjir.', tag: 'Peta' },
  { id: 'posko', title: 'Posko Pengungsian', desc: 'Daftar dan lokasi posko pengungsian beserta informasi dasar untuk membantu warga memilih tujuan.', tag: 'Peta' },
  { id: 'tinggi', title: 'Klasifikasi Ketinggian Tanah', desc: 'Pemetaan elevasi wilayah untuk mengenali area dataran rendah yang lebih mudah tergenang.', tag: 'Analisis' },
  { id: 'notif', title: 'Notifikasi Email', desc: 'Peringatan dini dikirim ke email warga yang berlangganan untuk wilayah pilihannya.', tag: 'Peringatan' },
  { id: 'evakuasi', title: 'Peta Navigasi Jalur Evakuasi', desc: 'Rute menuju posko pengungsian terdekat agar warga bergerak dengan arah yang jelas.', tag: 'Navigasi' },
]
// DATA ILUSTRASI: ganti dengan data resmi (BMKG / BPBD / BPS) sebelum dipublikasikan.
export const rainfall = [
  { m: 'Jan', v: 310 }, { m: 'Feb', v: 260 }, { m: 'Mar', v: 280 }, { m: 'Apr', v: 220 },
  { m: 'Mei', v: 170 }, { m: 'Jun', v: 120 }, { m: 'Jul', v: 110 }, { m: 'Agu', v: 130 },
  { m: 'Sep', v: 180 }, { m: 'Okt', v: 250 }, { m: 'Nov', v: 340 }, { m: 'Des', v: 360 },
]
export const classify = (v) => v >= 300 ? ['Sangat tinggi', '#E5532D'] : v >= 200 ? ['Tinggi', '#FFD758'] : v >= 100 ? ['Sedang', '#218DAE'] : ['Rendah', '#2BBBD7']
export const steps = [
  { n: 'Kumpulkan', t: 'Data curah hujan, elevasi, dan fasilitas publik dihimpun dari sumber resmi.' },
  { n: 'Petakan', t: 'Data diolah dalam SIG menjadi zona kerawanan dan lapisan peta.' },
  { n: 'Peringatkan', t: 'Warga yang berlangganan menerima notifikasi email saat risiko meningkat.' },
  { n: 'Evakuasi', t: 'Peta jalur mengarahkan warga menuju posko pengungsian terdekat.' },
]
export const roles = [
  { id: 'warga', label: 'warga', note: 'Anda ingin tahu kondisi lingkungan sendiri dan harus ke mana saat air naik.' },
  { id: 'relawan', label: 'relawan', note: 'Anda perlu data lokasi untuk membantu warga dan menyalurkan bantuan.' },
  { id: 'petugas', label: 'petugas', note: 'Anda memantau wilayah dan mengambil keputusan berbasis data.' },
]
export const needs = [
  { id: 'risiko', label: 'cek risiko', feature: 0 },
  { id: 'posko', label: 'cari posko', feature: 3 },
  { id: 'alert', label: 'dapat peringatan', feature: 5 },
]
export const detail = {
  banjir: { link: 'Buka peta kerawanan', chips: ['Per kecamatan', 'Per kelurahan'] },
  hujan: { link: 'Lihat grafik curah hujan', chips: ['Bulanan', 'Klasifikasi 4 level'] },
  air: { link: 'Cari titik air bersih', chips: ['Lokasi', 'Akses'] },
  posko: { link: 'Lihat daftar posko', chips: ['Lokasi', 'Info dasar'] },
  tinggi: { link: 'Lihat peta elevasi', chips: ['Dataran rendah', 'Dataran tinggi'] },
  notif: { link: 'Atur notifikasi', chips: ['Pilih wilayah', 'Email'] },
  evakuasi: { link: 'Buka jalur evakuasi', chips: ['Rute terdekat', 'Navigasi'] },
}
// GANTI dengan data tim sebenarnya.
export const team = [
  { name: 'Nama Anggota 1', role: 'Ketua tim', lead: 'Pengembangan web', bio: 'Isi deskripsi singkat peran dan keahlian anggota tim di sini.', tags: ['React', 'SIG'] },
  { name: 'Nama Anggota 2', role: 'Anggota tim', lead: 'Data dan analisis', bio: 'Isi deskripsi singkat peran dan keahlian anggota tim di sini.', tags: ['Data', 'Peta'] },
]

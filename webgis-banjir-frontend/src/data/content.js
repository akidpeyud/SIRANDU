export const NAV_LINKS = [
  ['#top', 'Beranda'], ['#masalah', 'Masalah'], ['#fitur', 'Fitur'], ['#cara', 'Cara kerja'], ['#mulai', 'Mulai'],
]

export const PROBLEMS = [
  ['Warga tidak tahu risiko wilayahnya', 'Peta zona rawan + klasifikasi ketinggian + cek lokasi'],
  ['Peringatan terlambat', 'Grafik curah hujan + status peringatan + notifikasi'],
  ['Bingung saat evakuasi', 'Posko pengungsian + peta navigasi jalur evakuasi'],
  ['Sulit akses kebutuhan dasar saat bencana', 'Peta sumber air bersih'],
]

export const METRICS = [
  { n: 24, suffix: '/7', title: 'Pemantauan hujan', sub: 'Berjalan terus-menerus' },
  { n: 12, suffix: '+', title: 'Posko pengungsian', sub: 'Terpetakan di Kota Jambi' },
  { n: 20, suffix: '+', title: 'Titik air bersih', sub: 'Sumur, hidran & tangki' },
  { n: 8, suffix: '', title: 'Jalur evakuasi', sub: 'Rute menuju posko' },
]

export const RING_INFO = [
  { n: '12', label: 'Posko pengungsian', kicker: 'LAPIS I · POSKO', text: 'Posko pengungsian terdekat dari lokasi Anda beserta kapasitas dan kontaknya.' },
  { n: '5', label: 'Kelas curah hujan', kicker: 'LAPIS II · PERINGATAN', text: 'Angka curah hujan diubah jadi lima kelas, dari Normal sampai Awas, lengkap dengan tindakan yang disarankan.' },
  { n: '20+', label: 'Titik air bersih', kicker: 'LAPIS III · AIR BERSIH', text: 'Titik air bersih, sumur, dan hidran di sekitar wilayah Anda saat air terputus.' },
  { n: '8', label: 'Jalur evakuasi', kicker: 'LAPIS IV · JALUR EVAKUASI', text: 'Rute evakuasi teraman menuju posko, menghindari ruas yang tergenang.' },
]

export const FEATURES = [
  { bg: 'b1', title: 'Daerah Rawan Banjir', desc: 'Peta zonasi tingkat kerawanan banjir per kecamatan dan kelurahan di Kota Jambi.', link: 'Buka peta kerawanan', chips: ['Per kecamatan', 'Per kelurahan'] },
  { bg: 'b2', title: 'Grafik Klasifikasi Curah Hujan', desc: 'Grafik mengubah angka mentah curah hujan menjadi level yang mudah dimengerti dan memicu tindakan.', link: 'Buka grafik curah hujan', chips: ['Ringan sampai ekstrem', 'Standar BMKG'] },
  { bg: 'b3', title: 'Peta Sumber Air Bersih', desc: 'Titik sumur, hidran, dan tangki darurat terdekat saat air bersih terputus.', link: 'Buka peta air bersih', chips: ['Sumur', 'Hidran', 'Tangki'] },
  { bg: 'b4', title: 'Posko Pengungsian', desc: 'Lokasi posko beserta kapasitas dan kontak penanggung jawab di sekitar Anda.', link: 'Buka peta posko', chips: ['Kapasitas', 'Kontak'] },
  { bg: 'b5', title: 'Klasifikasi Ketinggian Tanah', desc: 'Peta kontur dan kelas elevasi untuk mengenali wilayah cekungan yang mudah tergenang.', link: 'Buka peta ketinggian', chips: ['Kontur', 'Kelas elevasi'] },
  { bg: 'b6', title: 'Notifikasi Email', desc: 'Peringatan dini langsung dikirim ke email Anda saat status wilayah naik.', link: 'Atur notifikasi', chips: ['Per wilayah', 'Per level'] },
  { bg: 'b7', title: 'Peta Navigasi Jalur Evakuasi', desc: 'Rute evakuasi teraman dari lokasi Anda menuju posko terdekat.', link: 'Buka peta evakuasi', chips: ['Dari lokasi saya', 'Ke posko'] },
]

/** Klasifikasi curah hujan harian (mengacu standar BMKG). */
export const RAIN_LADDER = [
  { kelas: 'Ringan', range: '5–20', status: 'Normal', aksi: 'Aktivitas normal', color: '#6EC1E4' },
  { kelas: 'Sedang', range: '20–50', status: 'Waspada', aksi: 'Pantau informasi', color: '#F2C94C' },
  { kelas: 'Lebat', range: '50–100', status: 'Siaga', aksi: 'Siapkan tas darurat, cek jalur evakuasi', color: '#F2994A' },
  { kelas: 'Sangat lebat', range: '100–150', status: 'Awas', aksi: 'Bersiap mengungsi di zona rawan', color: '#E5533D' },
  { kelas: 'Ekstrem', range: '>150', status: 'Awas (darurat)', aksi: 'Evakuasi segera', color: '#B3261E' },
]
export const RAIN_BOUNDS = [0, 5, 20, 50, 100, 150, 200]
export const RAIN_CLASSES = [
  { kelas: 'Di bawah 5 mm', status: 'Belum diklasifikasi', aksi: 'Hujan sangat ringan atau tidak hujan', color: '#A9C3D3' },
  ...RAIN_LADDER,
]

export const STEPS = [
  { title: 'Cek lokasi.', text: 'Masukkan alamat atau izinkan lokasi, lalu lihat klasifikasi risiko banjir di wilayah Anda.' },
  { title: 'Pantau hujan.', text: 'Angka curah hujan diubah jadi level yang mudah dipahami: Normal, Waspada, Siaga, Awas. Anda tahu apa yang harus dilakukan.' },
  { title: 'Terima peringatan.', text: 'Saat status wilayah naik, notifikasi dikirim lebih dulu, sebelum air sampai ke depan rumah.' },
  { title: 'Evakuasi.', text: 'Ikuti jalur teraman ke posko terdekat, dan temukan sumber air bersih di sekitarnya.' },
]

export const TEAM = [
  { idx: '01', role: 'Pengembang & Perancang Sistem', name: ['Aria'], sub: 'Memimpin desain dan pengembangan SIRANDU', bio: 'Mahasiswa Teknik Informatika yang merancang dan membangun SIRANDU, sistem informasi rawan bencana untuk Kota Jambi.', tags: ['Desain UI', 'Pengembangan web', 'Data kebencanaan'], delay: 0 },
  { idx: '02', role: 'Peran anggota tim', name: ['Nama', 'Anggota'], sub: 'Tugas utama di proyek', bio: 'Tulis profil singkat anggota tim di sini, misalnya latar belakang dan kontribusinya pada SIRANDU.', tags: ['Peran 1', 'Peran 2'], delay: 0.12 },
]

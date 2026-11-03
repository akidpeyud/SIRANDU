// API Client Service untuk SIRANDU (WebGIS Banjir Kota Jambi)
const API_BASE = '/api';

/**
 * Mengambil ringkasan dan data status cuaca 11 kecamatan terkini (Open-Meteo)
 */
export async function getCuacaKecamatan() {
  try {
    const res = await fetch(`${API_BASE}/cuaca`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Gagal mengambil data cuaca 11 kecamatan:', err);
    return null;
  }
}

/**
 * Mengambil riwayat log curah hujan 24 jam untuk grafik per kecamatan
 */
export async function getDetailCuacaKecamatan(idKecamatan) {
  try {
    const res = await fetch(`${API_BASE}/cuaca/${idKecamatan}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`Gagal mengambil detail cuaca kecamatan ${idKecamatan}:`, err);
    return null;
  }
}

/**
 * Memicu sinkronisasi manual cuaca Open-Meteo
 */
export async function syncCuacaSekarang() {
  try {
    const res = await fetch(`${API_BASE}/cuaca/sync-sekarang`, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Gagal sinkronisasi cuaca:', err);
    return null;
  }
}

/**
 * Mengambil GeoJSON batas administrasi 11 kecamatan Kota Jambi
 */
export async function getBatasAdministrasi(kecamatan = '') {
  try {
    const url = kecamatan && kecamatan !== 'Semua' 
      ? `${API_BASE}/peta/batas-administrasi?kecamatan=${encodeURIComponent(kecamatan)}`
      : `${API_BASE}/peta/batas-administrasi`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Gagal mengambil batas administrasi:', err);
    return null;
  }
}

/**
 * Mengambil GeoJSON zona rawan banjir (AHP 6 faktor)
 */
export async function getZonaRawan(kecamatan = '') {
  try {
    const url = kecamatan && kecamatan !== 'Semua'
      ? `${API_BASE}/peta/zona-rawan?kecamatan=${encodeURIComponent(kecamatan)}`
      : `${API_BASE}/peta/zona-rawan`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Gagal mengambil zona rawan banjir:', err);
    return null;
  }
}

/**
 * Mengambil GeoJSON klasifikasi ketinggian tanah (DEMNAS)
 */
export async function getElevasi() {
  try {
    const res = await fetch(`${API_BASE}/peta/elevasi`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Gagal mengambil klasifikasi elevasi:', err);
    return null;
  }
}

/**
 * Mengambil GeoJSON zona buffer sungai Batanghari (150m, 400m, 800m)
 */
export async function getSungaiBuffer() {
  try {
    const res = await fetch(`${API_BASE}/peta/sungai-buffer`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Gagal mengambil buffer sungai:', err);
    return null;
  }
}

/**
 * Mengambil GeoJSON posko pengungsian & titik kumpul aktif
 */
export async function getPoskoPengungsian(kecamatan = '') {
  try {
    const url = kecamatan && kecamatan !== 'Semua'
      ? `${API_BASE}/posko/geojson?kecamatan=${encodeURIComponent(kecamatan)}`
      : `${API_BASE}/posko/geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Gagal mengambil data posko:', err);
    return null;
  }
}

/**
 * Mengambil GeoJSON sumber air bersih (PDAM / BPBD)
 */
export async function getSumberAirBersih(kecamatan = '') {
  try {
    const url = kecamatan && kecamatan !== 'Semua'
      ? `${API_BASE}/air-bersih/geojson?kecamatan=${encodeURIComponent(kecamatan)}`
      : `${API_BASE}/air-bersih/geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Gagal mengambil data sumber air bersih:', err);
    return null;
  }
}

/**
 * Mengambil GeoJSON titik banjir historis (Februari 2025)
 */
export async function getTitikBanjirHistoris() {
  try {
    const res = await fetch(`${API_BASE}/titik-banjir/geojson`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Gagal mengambil titik banjir historis:', err);
    return null;
  }
}

/**
 * Mengambil GeoJSON ruas jalan tergenang yang ditandai admin
 */
export async function getRuasJalanTergenang() {
  try {
    const res = await fetch(`${API_BASE}/jalan-tergenang/geojson`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Gagal mengambil ruas jalan tergenang:', err);
    return null;
  }
}

/**
 * Cek risiko lokasi spasial pengguna (PostGIS ST_Intersects / ST_Contains)
 * Sesuai kebijakan privasi: Koordinat TIDAK disimpan di database server.
 */
export async function cekRisikoLokasi(lat, lng) {
  try {
    const res = await fetch(`${API_BASE}/cek-lokasi?lat=${lat}&lng=${lng}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Gagal memeriksa risiko lokasi:', err);
    return null;
  }
}

/**
 * Menghitung rute evakuasi peka risiko ke posko terdekat (pgRouting pgr_dijkstra)
 */
export async function hitungRuteEvakuasi(lat, lng, idPosko = null) {
  try {
    let url = `${API_BASE}/evakuasi/rute?lat=${lat}&lng=${lng}`;
    if (idPosko) url += `&id_posko=${idPosko}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Gagal menghitung rute evakuasi:', err);
    return null;
  }
}

/**
 * Mendaftarkan email warga untuk notifikasi early warning (F06)
 */
export async function subscribeEmail(email, idKecamatan) {
  try {
    const res = await fetch(`${API_BASE}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, id_kecamatan: idKecamatan })
    });
    return await res.json();
  } catch (err) {
    console.error('Gagal subscribe email:', err);
    return { success: false, message: 'Gagal menghubungkan ke server.' };
  }
}

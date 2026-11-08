/**
 * Klien API SIRANDU (WebGIS Banjir Kota Jambi).
 * Semua fungsi mengembalikan data atau MELEMPAR ApiError (pesan aman ditampilkan ke pengguna),
 * sehingga komponen bisa menampilkan toast. Basis URL: VITE_API_URL, default '/api' (proxy Vite → backend :3000).
 */
const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const TIMEOUT_MS = 12000

export class ApiError extends Error {
  constructor(message, status = 0, body = null) { super(message); this.name = 'ApiError'; this.status = status; this.body = body }
}

async function request(path, { method = 'GET', body, params, signal } = {}) {
  const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString() : ''
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  signal?.addEventListener('abort', () => ctrl.abort())
  try {
    const res = await fetch(`${API_BASE}${path}${qs}`, {
      method, signal: ctrl.signal,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new ApiError(data?.message || `Permintaan gagal (${res.status})`, res.status, data)
    return data
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError(e.name === 'AbortError' ? 'Server tidak merespons. Coba lagi sebentar.' : 'Tidak dapat terhubung ke server SIRANDU.')
  } finally { clearTimeout(timer) }
}

const kec = (k) => (k && k !== 'Semua' ? { kecamatan: k } : undefined)

// ---- Cuaca (F04 & F05) ----
/** GET /api/cuaca → { ringkasan_kota, data: [kecamatan...] } */
export const getCuacaKecamatan = (signal) => request('/cuaca', { signal })
/** GET /api/cuaca/:id → { kecamatan, grafik_24_jam: [{ curah_hujan (mm/jam), jam_label, ... }] } */
export const getDetailCuacaKecamatan = (id, signal) => request(`/cuaca/${id}`, { signal })
/** POST /api/cuaca/sync-manual (endpoint uji backend; sebaiknya diproteksi, lihat CATATAN_INTEGRASI.md) */
export const syncCuacaSekarang = () => request('/cuaca/sync-manual', { method: 'POST' })

// ---- Layer peta (GeoJSON) ----
export const getBatasAdministrasi = (k, signal) => request('/peta/batas-administrasi', { params: kec(k), signal })
export const getZonaRawan = (k, signal) => request('/peta/zona-rawan', { params: kec(k), signal })
export const getElevasi = (signal) => request('/peta/elevasi', { signal })
export const getSungaiBuffer = (signal) => request('/peta/sungai-buffer', { signal })
export const getPoskoPengungsian = (k, signal) => request('/posko/geojson', { params: kec(k), signal })
export const getSumberAirBersih = (k, signal) => request('/air-bersih/geojson', { params: kec(k), signal })
export const getTitikBanjirHistoris = (signal) => request('/titik-banjir/geojson', { signal })
export const getRuasJalanTergenang = (signal) => request('/jalan-tergenang/geojson', { signal })

// ---- Analisis lokasi & evakuasi ----
/** GET /api/cek-lokasi?lat&lng. Koordinat tidak disimpan server. */
export const cekRisikoLokasi = (lat, lng, signal) => request('/cek-lokasi', { params: { lat, lng }, signal })
/** GET /api/evakuasi/rute?lat&lng[&posko_id] (parameter backend: posko_id, bukan id_posko) */
export const hitungRuteEvakuasi = (lat, lng, poskoId, signal) => request('/evakuasi/rute', { params: { lat, lng, posko_id: poskoId }, signal })

// ---- Notifikasi email (F06) ----
export const subscribeEmail = (email, idKecamatan) => request('/subscribe', { method: 'POST', body: { email, id_kecamatan: Number(idKecamatan) } })

// ---- Riwayat cuaca (langsung ke Open-Meteo, tanpa API key) ----
/**
 * Riwayat 7 hari + 24 jam terakhir untuk satu titik. Open-Meteo = sumber yang sama dengan penarikan backend.
 * → { hourly: { time[], precipitation[], temperature_2m[], relative_humidity_2m[] }, daily: { time[], precipitation_sum[], temperature_2m_max[], temperature_2m_min[], precipitation_hours[] } }
 */
export async function getRiwayatOpenMeteo(lat, lng, signal) {
  const q = new URLSearchParams({
    latitude: lat, longitude: lng, timezone: 'Asia/Jakarta', past_days: 7, forecast_days: 1,
    hourly: 'precipitation,temperature_2m,relative_humidity_2m',
    daily: 'precipitation_sum,temperature_2m_max,temperature_2m_min,precipitation_hours',
  })
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  signal?.addEventListener('abort', () => ctrl.abort())
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`, { signal: ctrl.signal })
    if (!res.ok) throw new ApiError(`Open-Meteo menolak permintaan (${res.status})`, res.status)
    return await res.json()
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError(e.name === 'AbortError' ? 'Open-Meteo tidak merespons.' : 'Tidak dapat terhubung ke Open-Meteo.')
  } finally { clearTimeout(t) }
}

/**
 * Klien API panel admin SIRANDU (route /api/admin/* di webgis-banjir-backend, dilindungi JWT).
 * Token disimpan di sessionStorage (atau localStorage bila "Ingat saya"). 401/403 → keluar otomatis.
 */
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
const KEY = 'sirandu-admin'

export class AdminError extends Error {
  constructor(message, status = 0) { super(message); this.status = status }
}

const store = {
  get() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || 'null') } catch { return null }
  },
  set(v, remember) {
    try { (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(v)) } catch { /* mode privat */ }
  },
  clear() { try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY) } catch { /* abaikan */ } },
}
export const session = store

let onExpired = () => {}
export const setOnExpired = (fn) => { onExpired = fn }

async function req(path, { method = 'GET', body } = {}) {
  const s = store.get()
  let res
  try {
    res = await fetch(`${BASE}/admin${path}`, {
      method,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(s?.token ? { Authorization: `Bearer ${s.token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new AdminError('Tidak dapat terhubung ke server SIRANDU. Pastikan backend berjalan.')
  }
  const data = await res.json().catch(() => null)
  if ((res.status === 401 || res.status === 403) && path !== '/login') { store.clear(); onExpired(data?.message); throw new AdminError(data?.message || 'Sesi berakhir. Silakan masuk lagi.', res.status) }
  if (!res.ok || data?.success === false) throw new AdminError(data?.message || `Permintaan gagal (${res.status})`, res.status)
  return data
}

export const api = {
  login: (username, password) => req('/login', { method: 'POST', body: { username, password } }),
  me: () => req('/me'),
  list: (res) => req(`/${res}`).then((d) => d.data || []),
  create: (res, body) => req(`/${res}`, { method: 'POST', body }),
  update: (res, id, body) => req(`/${res}/${id}`, { method: 'PUT', body }),
  status: (res, id, body) => req(`/${res}/${id}/status`, { method: 'PATCH', body }),
  remove: (res, id) => req(`/${res}/${id}`, { method: 'DELETE' }),
  statistikBanjir: () => req('/titik-banjir/statistik').then((d) => d.data),
  kecamatan: () => req('/kecamatan-list').then((d) => d.data || []),
  curahManual: (body) => req('/curah-hujan-manual', { method: 'POST', body }),
  ambang: () => req('/pengaturan-ambang').then((d) => d.data || []),
  updateAmbang: (id, body) => req(`/pengaturan-ambang/${id}`, { method: 'PUT', body }),
  bobot: () => req('/bobot-model').then((d) => d.data || []),
  updateBobot: (id, body) => req(`/bobot-model/${id}`, { method: 'PUT', body }),
  importLayer: (layer, features, mode) => req(`/import/${layer}`, { method: 'POST', body: { features, mode } }),
  importSummary: () => req('/import/summary').then((d) => d.data || {}),
  logNotif: () => req('/log-notifikasi').then((d) => d.data || []),
  pelanggan: () => req('/pelanggan-notifikasi').then((d) => d.data || []),
}

import { useCallback, useState } from 'react'

const MSG = {
  1: 'Izin lokasi ditolak. Aktifkan izin lokasi di pengaturan browser, atau isi koordinat manual.',
  2: 'Posisi perangkat tidak dapat ditentukan. Pastikan GPS/lokasi aktif.',
  3: 'Pencarian lokasi terlalu lama. Coba lagi di tempat terbuka.',
}

/** Deteksi lokasi perangkat (GPS 1-klik). Butuh HTTPS atau localhost. */
export function useGeolocation() {
  const [loading, setLoading] = useState(false)
  const locate = useCallback(() => new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Browser ini tidak mendukung deteksi lokasi.'))
    if (!window.isSecureContext) return reject(new Error('Deteksi lokasi hanya berfungsi lewat HTTPS atau localhost.'))
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (p) => { setLoading(false); resolve({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), akurasi: Math.round(p.coords.accuracy) }) },
      (e) => { setLoading(false); reject(new Error(MSG[e.code] || 'Gagal mendeteksi lokasi.')) },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  }), [])
  return { locate, loading }
}

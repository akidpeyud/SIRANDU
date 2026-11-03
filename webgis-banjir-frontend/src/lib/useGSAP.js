import { useEffect } from 'react'

/** Efek ringan: jalankan setup, bersihkan saat unmount (aman untuk StrictMode). */
export function useGSAP(setup, deps = []) {
  useEffect(() => {
    const cleanup = setup()
    return () => { if (typeof cleanup === 'function') cleanup() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const Ctx = createContext(null)
const ICON = { success: '✓', error: '!', info: 'i' }

/** Notifikasi non-blocking pengganti alert(): tidak menghentikan JS maupun scroll halus Lenis. */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const id = useRef(0)
  const dismiss = useCallback((k) => setItems((l) => l.filter((t) => t.id !== k)), [])
  const push = useCallback((type, message, ms = 4800) => {
    const k = ++id.current
    setItems((l) => [...l.slice(-3), { id: k, type, message }])
    if (ms) setTimeout(() => dismiss(k), ms)
    return k
  }, [dismiss])
  const api = useMemo(() => ({
    success: (m, ms) => push('success', m, ms), error: (m, ms) => push('error', m, ms ?? 7000), info: (m, ms) => push('info', m, ms), dismiss,
  }), [push, dismiss])
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="tst-host" role="region" aria-label="Notifikasi" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`tst ${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
            <i aria-hidden="true">{ICON[t.type]}</i><span>{t.message}</span>
            <button type="button" aria-label="Tutup notifikasi" onClick={() => dismiss(t.id)}>×</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
export function useToast() { const c = useContext(Ctx); if (!c) throw new Error('useToast harus di dalam ToastProvider'); return c }

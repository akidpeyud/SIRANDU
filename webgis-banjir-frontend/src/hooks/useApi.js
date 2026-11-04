import { useCallback, useEffect, useRef, useState } from 'react'

/** Ambil data async dengan status loading/error, batalkan otomatis saat unmount, dan refetch manual. */
export function useApi(fn, { pollMs } = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const fnRef = useRef(fn); fnRef.current = fn
  const ctrl = useRef(null)
  const run = useCallback(() => {
    ctrl.current?.abort()
    const c = (ctrl.current = new AbortController())
    setState((s) => ({ ...s, loading: true, error: null }))
    fnRef.current(c.signal).then(
      (data) => !c.signal.aborted && setState({ data, loading: false, error: null }),
      (error) => !c.signal.aborted && setState((s) => ({ data: s.data, loading: false, error })),
    )
  }, [])
  useEffect(() => { run(); const t = pollMs && setInterval(run, pollMs); return () => { clearInterval(t); ctrl.current?.abort() } }, [run, pollMs])
  return { ...state, refetch: run }
}

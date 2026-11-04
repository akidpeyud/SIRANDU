import { useEffect, useRef, useState } from 'react'

const TEXT = 'Informasi bencana seharusnya sampai ke warga sebelum air naik, bukan sesudahnya.'

/** Teks yang menyala kata demi kata mengikuti scroll (terinspirasi react-bits ScrollReveal). */
export default function Statement() {
  const ref = useRef(null)
  const words = TEXT.split(' ')
  const [on, setOn] = useState(0)
  useEffect(() => {
    const f = () => {
      const r = ref.current.getBoundingClientRect(), vh = window.innerHeight
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)))
      setOn(Math.round(p * words.length))
    }
    f()
    window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [words.length])
  return (
    <section>
      <div className="wrap">
        <span className="tag rv">Mengapa SIRANDU</span>
        <h2 className="words" ref={ref}>
          {words.map((w, i) => <span key={i}><span className={i < on ? 'on' : ''}>{w}</span>{' '}</span>)}
        </h2>
      </div>
    </section>
  )
}

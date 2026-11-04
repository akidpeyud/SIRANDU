import { useRef } from 'react'
import { gsap } from '../lib/motion.jsx'
import { useGSAP } from '../lib/useGSAP.js'

export default function Progress() {
  const ref = useRef(null)
  useGSAP(() => {
    const t = gsap.to(ref.current, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } })
    return () => { t.scrollTrigger?.kill(); t.kill() }
  }, [])
  return <div className="prog" ref={ref} />
}

import { useCallback, useRef, useState } from 'react'
import BlurText from '../lib/BlurText.jsx'
import { useWebgis } from '../context/WebgisContext.jsx'
import Water from './Water.jsx'

export default function Cta() {
  const { openMap } = useWebgis()
  const ref = useRef(null)
  const [gl, setGl] = useState(false)
  const ready = useCallback(() => setGl(true), [])
  return (
    <section className={`cta${gl ? ' gl' : ''}`} id="mulai" ref={ref}>
      <Water sectionRef={ref} onReady={ready} />
      <div className="ripples" aria-hidden="true"><span /><span /><span /></div>
      <div className="wrap">
        <BlurText as="h2">Siap sebelum <em>air naik.</em></BlurText>
        <p className="rv">Buka SIRANDU dan ketahui risiko, posko, dan jalur evakuasi di sekitar Anda.</p>
        <button type="button" className="btn pri rv" onClick={() => openMap()}>Buka peta SIRANDU <span className="arr">→</span></button>
      </div>
    </section>
  )
}

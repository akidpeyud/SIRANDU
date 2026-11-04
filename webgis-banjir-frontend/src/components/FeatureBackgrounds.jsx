import { useMemo } from 'react'

// PRNG deterministik agar tampilan konsisten di setiap render
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

const contour = (i) => {
  const r = 38 + i * 40
  const pts = Array.from({ length: 72 }, (_, k) => {
    const a = (k / 72) * Math.PI * 2
    const rr = r * (1 + 0.16 * Math.sin(3 * a + i) + 0.09 * Math.sin(5 * a + i * 2) + 0.05 * Math.sin(9 * a))
    return [200 + rr * Math.cos(a), 350 + rr * Math.sin(a) * 1.35]
  })
  return 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') + 'Z'
}

const WATER = 'M200 -20 C120 90 300 160 190 250 S90 380 220 470 S320 600 180 730'
const ROUTE = 'M40 640 C120 560 90 470 190 420 S330 330 300 230 S250 110 360 40'

export function B1() { return <div className="bg b1"><i /><i /><i /></div> }
export function B2() { return <div className="bg b2" /> }
export function B3() {
  return (
    <div className="bg b3">
      <svg viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice">
        <defs><filter id="fx-gb"><feGaussianBlur stdDeviation="9" /></filter></defs>
        <path d={WATER} stroke="#6EC1E4" strokeWidth="34" fill="none" filter="url(#fx-gb)" opacity=".6" />
        <path className="flow" d={WATER} stroke="#E6F3FA" strokeWidth="2.4" fill="none" opacity=".85" />
      </svg>
    </div>
  )
}
export function B4() { return <div className="bg b4" /> }
export function B5() {
  return (
    <div className="bg b5">
      <svg viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice">
        <g className="cont">
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d={contour(i)} stroke={`rgba(110,193,228,${i === 3 ? 0.5 : 0.2})`} strokeWidth={i === 3 ? 1.6 : 1} fill="none" />
          ))}
        </g>
      </svg>
    </div>
  )
}
export function B6() { return <div className="bg b6"><i /><i /><i /><i /></div> }
export function B7() {
  const lines = useMemo(() => { const r = mulberry(7); return Array.from({ length: 14 }, () => [r() * 400, r() * 700, r() * 400, r() * 700]) }, [])
  return (
    <div className="bg b7">
      <svg viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="fx-gb2"><feGaussianBlur stdDeviation="6" /></filter>
          <linearGradient id="fx-rg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#1D6FA3" stopOpacity="0" /><stop offset=".5" stopColor="#6EC1E4" /><stop offset="1" stopColor="#E6F3FA" /></linearGradient>
        </defs>
        <g stroke="rgba(110,193,228,.16)" strokeWidth="1">{lines.map((l, i) => <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} />)}</g>
        <path d={ROUTE} stroke="url(#fx-rg)" strokeWidth="16" fill="none" filter="url(#fx-gb2)" opacity=".7" />
        <path className="flow" d={ROUTE} stroke="url(#fx-rg)" strokeWidth="3" fill="none" />
        <circle r="5" fill="#fff"><animateMotion dur="6s" repeatCount="indefinite" path={ROUTE} /></circle>
      </svg>
    </div>
  )
}

export const BACKGROUNDS = { b1: B1, b2: B2, b3: B3, b4: B4, b5: B5, b6: B6, b7: B7 }

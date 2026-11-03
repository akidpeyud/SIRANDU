import markImg from './assets/logo-mark.png'
import { rainfall, classify } from './data.js'
// Ilustrasi mini per fitur (bukan ikon): cuplikan nyata dari apa yang dilihat pengguna.
const T = '#218DAE', C = '#2BBBD7', CR = '#FCE59A', S = '#FFD758'
export function Preview({ id }) {
  const common = { viewBox: '0 0 240 120', className: 'pv-svg', role: 'img', 'aria-label': `Cuplikan fitur ${id}` }
  const frame = <rect width="240" height="120" rx="8" fill="rgba(255,255,255,.08)" />
  if (id === 'hujan') return (
    <svg {...common}>{frame}{rainfall.map((d, i) => <rect key={d.m} x={12 + i * 18.5} y={110 - d.v / 4} width="13" height={d.v / 4} rx="2" fill={classify(d.v)[1]} />)}</svg>
  )
  if (id === 'banjir') return (
    <svg {...common}>{frame}<ellipse cx="70" cy="78" rx="52" ry="26" fill="#E5532D" opacity=".85" /><ellipse cx="150" cy="62" rx="44" ry="22" fill={S} opacity=".9" /><ellipse cx="200" cy="92" rx="30" ry="14" fill={C} opacity=".9" /><path d="M0 100 C50 84 90 112 140 96 S210 84 240 96" fill="none" stroke={CR} strokeWidth="2" /></svg>
  )
  if (id === 'air') return (
    <svg {...common}>{frame}<path d="M0 84 C60 60 100 100 160 70 S220 60 240 70" fill="none" stroke={T} strokeWidth="10" opacity=".7" />{[[46, 58], [112, 82], [176, 56], [206, 80]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7" fill={C} stroke="#fff" strokeWidth="2" />)}</svg>
  )
  if (id === 'posko') return (
    <svg {...common}>{frame}{[[40, 40], [110, 74], [180, 46]].map(([x, y], i) => <rect key={i} x={x} y={y} width="26" height="26" rx="5" fill={CR} stroke="#fff" strokeWidth="2" />)}<path d="M53 66 L123 74 M123 74 L193 72" stroke={S} strokeWidth="2" strokeDasharray="4 4" /></svg>
  )
  if (id === 'tinggi') return (
    <svg {...common}>{frame}{[56, 42, 28, 14].map((r, i) => <ellipse key={r} cx="120" cy="64" rx={r * 2.4} ry={r} fill="none" stroke={i % 2 ? CR : C} strokeWidth="2" />)}</svg>
  )
  if (id === 'notif') return (
    <svg {...common}>{frame}<rect x="30" y="22" width="180" height="76" rx="8" fill="#fff" /><rect x="44" y="36" width="70" height="8" rx="2" fill={T} /><rect x="44" y="54" width="140" height="6" rx="2" fill="#cfe6ec" /><rect x="44" y="68" width="110" height="6" rx="2" fill="#cfe6ec" /><rect x="152" y="80" width="46" height="10" rx="3" fill={S} /></svg>
  )
  return (
    <svg {...common}>{frame}<path d="M30 88 C80 88 70 40 120 44 S180 80 210 32" fill="none" stroke={S} strokeWidth="3" strokeDasharray="7 6" /><circle cx="30" cy="88" r="7" fill="#fff" /><rect x="203" y="25" width="14" height="14" rx="3" fill={CR} stroke="#fff" strokeWidth="2" /></svg>
  )
}
export function Logo() {
  return <img className="logo-mark" src={markImg} alt="" aria-hidden />
}

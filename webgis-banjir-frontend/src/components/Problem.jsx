import BlurText from '../lib/BlurText.jsx'
import { PROBLEMS } from '../data/content.js'

export default function Problem() {
  return (
    <section className="problem" id="masalah">
      <div className="wrap">
        <span className="tag rv">Masalah → Solusi</span>
        <BlurText as="h2">Empat masalah di lapangan, empat jawaban dalam satu aplikasi.</BlurText>
        <div className="ptable">
          {PROBLEMS.map(([m, s]) => (
            <div className="prow rv" key={m}><div className="m">{m}</div><div className="s">{s}</div></div>
          ))}
        </div>
      </div>
    </section>
  )
}

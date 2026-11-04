import { Children, cloneElement, isValidElement, useRef } from 'react'
import { useGSAP } from './useGSAP.js'
import { gsap, prefersReducedMotion } from './motion.jsx'

/** Teks per-kata dengan efek blur-in saat masuk viewport (terinspirasi react-bits BlurText). */
function split(node, key = 'k') {
  if (typeof node === 'string') {
    return node.split(/(\s+)/).filter(Boolean).map((t, i) =>
      /^\s+$/.test(t) ? ' ' : <span className="bw" key={`${key}${i}`}>{t}</span>
    )
  }
  if (isValidElement(node)) {
    if (node.type === 'br') return node
    return cloneElement(node, { key }, ...Children.toArray(node.props.children).map((c, i) => split(c, `${key}${i}`)))
  }
  return node
}

export default function BlurText({ as: Tag = 'h2', children, className = '', style }) {
  const ref = useRef(null)
  useGSAP(() => {
    if (prefersReducedMotion()) return
    const words = ref.current.querySelectorAll('.bw')
    const tween = gsap.from(words, {
      opacity: 0, filter: 'blur(12px)', y: 26, duration: 0.9, ease: 'power3.out', stagger: 0.06,
      scrollTrigger: { trigger: ref.current, start: 'top 88%', once: true },
    })
    return () => { tween.scrollTrigger?.kill(); tween.kill() }
  }, [])
  return <Tag ref={ref} className={`bt ${className}`} style={style}>{Children.toArray(children).map((c, i) => split(c, `b${i}`))}</Tag>
}

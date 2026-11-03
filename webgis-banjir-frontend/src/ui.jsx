import { Fragment, useRef } from 'react'
import { motion } from 'motion/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)
const ease = [0.2, 0.7, 0.2, 1]
const noMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// Semua section memakai satu gerak masuk yang sama; pembeda antar-section ada di bentuk dan warna lembar.
const VARIANTS = {
  rise: { from: { opacity: 0, y: 40 }, to: { opacity: 1, y: 0 } },
  left: { from: { opacity: 0, x: -90 }, to: { opacity: 1, x: 0 } },
  right: { from: { opacity: 0, x: 90, rotate: 3 }, to: { opacity: 1, x: 0, rotate: 0 } },
  drop: { from: { opacity: 0, y: -60 }, to: { opacity: 1, y: 0 } },
  scale: { from: { opacity: 0, scale: 0.86 }, to: { opacity: 1, scale: 1 } },
  tilt: { from: { opacity: 0, rotateX: 28, y: 50, transformPerspective: 900 }, to: { opacity: 1, rotateX: 0, y: 0, transformPerspective: 900 } },
  clip: { from: { opacity: 1, clipPath: 'inset(0 100% 0 0)' }, to: { opacity: 1, clipPath: 'inset(0 0% 0 0)' } },
}
export const Reveal = ({ children, delay = 0, as: Tag = 'div', className = '', variant = 'rise' }) => {
  const C = motion[Tag]
  const v = VARIANTS.rise
  return (
    <C className={className} initial={v.from} whileInView={v.to} viewport={{ once: true, amount: 0.15 }}
       transition={{ duration: 0.9, delay: delay / 1000, ease }}>
      {children}
    </C>
  )
}

// Huruf demi huruf naik dari balik masker.
export function SplitChars({ text, className = '', delay = 0 }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(' ').map((w, wi) => (
        <Fragment key={wi}><span className="sc-word" aria-hidden>
          {[...w].map((ch, ci) => (
            <motion.span key={ci} className="sc-mask" initial="h" whileInView="s" viewport={{ once: true, amount: 0.3 }}>
              <motion.span className="sc-ch" variants={{ h: { y: '115%', rotate: 8 }, s: { y: 0, rotate: 0, transition: { duration: 0.8, ease, delay: delay + (wi * 5 + ci) * 0.035 } } }}>{ch}</motion.span>
            </motion.span>
          ))}
        </span>{' '}</Fragment>
      ))}
    </span>
  )
}

// Tirai pembuka section: tiap section memakai gaya wipe yang berbeda, dikendalikan scroll.
export function Curtain({ kind = 'up', color = '#2BBBD7' }) {
  const ref = useRef()
  useGSAP(() => {
    if (noMotion()) return
    const el = ref.current
    const st = { trigger: el.parentElement, start: 'top 92%', end: 'top 28%', scrub: 0.6 }
    if (kind === 'up') gsap.fromTo(el, { yPercent: 0 }, { yPercent: -101, ease: 'power2.inOut', scrollTrigger: st })
    if (kind === 'down') gsap.fromTo(el, { yPercent: 0 }, { yPercent: 101, ease: 'power2.inOut', scrollTrigger: st })
    if (kind === 'right') gsap.fromTo(el, { xPercent: 0 }, { xPercent: 101, ease: 'power2.inOut', scrollTrigger: st })
    if (kind === 'left') gsap.fromTo(el, { xPercent: 0 }, { xPercent: -101, ease: 'power2.inOut', scrollTrigger: st })
    if (kind === 'iris') gsap.fromTo(el, { clipPath: 'circle(150% at 50% 40%)' }, { clipPath: 'circle(0% at 50% 40%)', ease: 'power2.inOut', scrollTrigger: st })
    if (kind === 'diag') gsap.fromTo(el, { clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)' }, { clipPath: 'polygon(0 0,0 0,0 100%,0 100%)', ease: 'power2.inOut', scrollTrigger: st })
    if (kind === 'blinds') gsap.fromTo(el.children, { scaleY: 1 }, { scaleY: 0, transformOrigin: 'top', stagger: 0.12, ease: 'power2.inOut', scrollTrigger: st })
  }, { scope: ref })
  return (
    <div ref={ref} className={`curtain curtain-${kind}`} style={kind === 'blinds' ? undefined : { background: color }} aria-hidden>
      {kind === 'blinds' && [0, 1, 2, 3, 4].map((i) => <i key={i} style={{ background: i % 2 ? '#FFD758' : color }} />)}
    </div>
  )
}

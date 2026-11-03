import { useEffect } from 'react'
import { SmoothScroll, useLenis, prefersReducedMotion } from './lib/motion.jsx'
import { useReveal } from './lib/useReveal.js'
import { useMagnet } from './lib/Magnet.js'
import { WebgisProvider } from './context/WebgisContext.jsx'
import WebgisModal from './components/WebgisModal.jsx'
import Nav from './components/Nav.jsx'
import Progress from './components/Progress.jsx'
import Hero from './components/Hero.jsx'
import Proof from './components/Proof.jsx'
import Statement from './components/Statement.jsx'
import Problem from './components/Problem.jsx'
import PetaOrbit from './components/PetaOrbit.jsx'
import Features from './components/Features.jsx'
import Klasifikasi from './components/Klasifikasi.jsx'
import HowItWorks from './components/HowItWorks.jsx'
import Cta from './components/Cta.jsx'
import Team from './components/Team.jsx'
import Footer from './components/Footer.jsx'
import Toast from './components/Toast.jsx'

function Page() {
  const lenis = useLenis()
  useReveal()
  useMagnet()

  // semua tautan #anchor memakai scroll halus Lenis
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]')
      if (!a) return
      const t = document.querySelector(a.getAttribute('href'))
      if (!t) return
      e.preventDefault()
      lenis ? lenis.scrollTo(t, { duration: 1.4 }) : t.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [lenis])

  return (
    <>
      <Progress />
      <Nav />
      <main id="top">
        <Hero />
        <Proof />
        <Statement />
        <Problem />
        <PetaOrbit />
        <Features />
        <Klasifikasi />
        <HowItWorks />
        <Cta />
      </main>
      <Team />
      <Footer />
      <Toast />
      <WebgisModal />
    </>
  )
}

export default function App() {
  return (
    <WebgisProvider>
      <SmoothScroll><Page /></SmoothScroll>
    </WebgisProvider>
  )
}

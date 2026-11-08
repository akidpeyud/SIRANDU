import { lazy, Suspense, useEffect, useState } from 'react'
import { SmoothScroll, useLenis, prefersReducedMotion } from './lib/motion.jsx'
import { useReveal } from './lib/useReveal.js'
import { useMagnet } from './lib/Magnet.js'
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
import { WebgisProvider } from './context/WebgisContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import WebgisModal from './components/WebgisModal.jsx'
import Preloader from './components/Preloader.jsx'

function Page() {
  const lenis = useLenis()
  useReveal()
  useMagnet()

  // semua tautan #anchor memakai scroll halus Lenis
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]')
      if (!a || a.getAttribute('href').startsWith('#/')) return
      let t = null
      try { t = document.querySelector(a.getAttribute('href')) } catch { return }
      if (!t) return
      e.preventDefault()
      lenis ? lenis.scrollTo(t, { duration: 1.4 }) : t.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [lenis])

  return (
    <>
      <Preloader />
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
      <WebgisModal />
    </>
  )
}

// Panel admin (#/admin) dimuat terpisah: pengunjung biasa tidak mengunduh kodenya.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const isAdminHash = () => window.location.hash.startsWith('#/admin')

export default function App() {
  const [admin, setAdmin] = useState(isAdminHash)
  useEffect(() => {
    const f = () => setAdmin(isAdminHash())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  if (admin) {
    return (
      <ToastProvider>
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#5f788b', fontFamily: 'Inter, sans-serif' }}>Memuat panel admin…</div>}>
          <AdminApp />
        </Suspense>
      </ToastProvider>
    )
  }
  return (
    <ToastProvider>
      <WebgisProvider>
        <SmoothScroll><Page /></SmoothScroll>
      </WebgisProvider>
    </ToastProvider>
  )
}

import { useEffect, useState } from 'react'

export default function Toast() {
  const [show, setShow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShow(true), 1800); return () => clearTimeout(t) }, [])
  return (
    <div className={`toast${show ? ' show' : ''}`} role="status">
      <b>Mode pratinjau</b>Peta dan data di halaman ini masih berupa ilustrasi. Gambar asli akan ditambahkan nanti.<br />
      <button onClick={() => setShow(false)}>Mengerti</button>
    </div>
  )
}

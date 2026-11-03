# SIRANDU (React + Vite)

Sistem Informasi Rawan Bencana Kota Jambi — front end.

## Menjalankan
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # hasil di dist/
npm run preview
```

## Struktur
- `src/components/` — satu komponen per section (Hero, Proof, Problem, PetaOrbit, Features, Klasifikasi, HowItWorks, Cta, Team, Footer)
- `src/data/content.js` — semua teks & data (fitur, kelas curah hujan BMKG, langkah, tim). Ubah isi di sini.
- `src/lib/` — Lenis + GSAP (`motion.jsx`), `BlurText`, `useReveal`, `Magnet`
- `src/index.css` — seluruh gaya & palet (`--primary #0B3C5D`, `--secondary #1D6FA3`, `--accent #6EC1E4`, `--tint #E6F3FA`)
- `src/assets/logo.png` — logo (versi lambang saja)

## Yang masih placeholder
Foto tim, nama anggota ke-2, tautan sosial, peta Kota Jambi (poligon abstrak), dan angka ilustrasi.
Latar hero bisa diganti foto lewat variabel CSS `--hero-img` pada `.hero`.

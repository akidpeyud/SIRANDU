import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Line, Html } from '@react-three/drei'
import { JAMBI_GEO, toLocal } from '../../data/jambiGeo.js'

/**
 * Peta 3D Kota Jambi di atas citra satelit (React Three Fiber).
 * - Alas: ubin citra satelit Esri World Imagery (sama dengan basemap "Satelit" di WebgisMap),
 *   ditata ulang ke koordinat km lokal. Area di luar kota diredupkan agar Kota Jambi menonjol.
 * - Batas 11 kecamatan digambar sebagai garis; layer "hujan" menaikkan kolom transparan berwarna status.
 * - Posko, air bersih, dan jalan tergenang dari GeoJSON server SIRANDU (tidak ada titik karangan).
 * Satuan adegan = km. Bidang peta XZ, sumbu Y = tinggi, utara = -Z.
 */

export const SAT_URL = (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`

const W = (x, y, h = 0) => [x, h, -y]
const MAX_H = 1.6

/* ---------- ubin satelit ---------- */
const lon2x = (lon, z) => ((lon + 180) / 360) * 2 ** z
const lat2y = (lat, z) => ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z
const x2lon = (x, z) => (x / 2 ** z) * 360 - 180
const y2lat = (y, z) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI

/** Daftar ubin zoom z yang menutup kotak [barat, selatan, timur, utara] ± margin (dalam ubin). */
function tilesFor(z, [w, s, e, n], margin = 0) {
  const x0 = Math.floor(lon2x(w, z)) - margin, x1 = Math.floor(lon2x(e, z)) + margin
  const y0 = Math.floor(lat2y(n, z)) - margin, y1 = Math.floor(lat2y(s, z)) + margin
  const out = []
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
    const [ax, ay] = toLocal([x2lon(x, z), y2lat(y, z)]), [bx, by] = toLocal([x2lon(x + 1, z), y2lat(y + 1, z)])
    out.push({ key: `${z}/${x}/${y}`, url: SAT_URL(z, x, y), cx: (ax + bx) / 2, cy: (ay + by) / 2, w: bx - ax, h: ay - by })
  }
  return out
}

const loader = new THREE.TextureLoader()
loader.setCrossOrigin('anonymous')

function Tile({ t, y, onState, renderOrder }) {
  const [tex, setTex] = useState(null)
  const { gl } = useThree()
  useEffect(() => {
    let alive = true, tx
    loader.load(t.url, (texture) => {
      if (!alive) { texture.dispose(); return }
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
      tx = texture; setTex(texture); onState?.('ok')
    }, undefined, () => alive && onState?.('err'))
    return () => { alive = false; tx?.dispose() }
  }, [t.url, gl, onState])
  if (!tex) return null
  return (
    <mesh position={W(t.cx, t.cy, y)} rotation={[-Math.PI / 2, 0, 0]} renderOrder={renderOrder}>
      <planeGeometry args={[t.w * 1.002, t.h * 1.002]} />
      <meshBasicMaterial map={tex} toneMapped={false} fog={false} depthWrite={false} />
    </mesh>
  )
}

function Satellite({ onStatus }) {
  const xs = JAMBI_GEO.outline.map((p) => p[0]), ys = JAMBI_GEO.outline.map((p) => p[1])
  const [o0, o1] = JAMBI_GEO.origin, [kx, ky] = JAMBI_GEO.k
  const bbox = [o0 + Math.min(...xs) / kx, o1 + Math.min(...ys) / ky, o0 + Math.max(...xs) / kx, o1 + Math.max(...ys) / ky]
  const coarse = useMemo(() => tilesFor(12, bbox, 2), []) // eslint-disable-line react-hooks/exhaustive-deps
  const fine = useMemo(() => tilesFor(14, bbox, 0), []) // eslint-disable-line react-hooks/exhaustive-deps
  const stat = useRef({ ok: 0, err: 0 })
  const onState = useMemo(() => (s) => {
    stat.current[s]++
    const { ok, err } = stat.current
    onStatus?.(ok > 0 ? 'ok' : err >= 4 ? 'err' : 'loading')
  }, [onStatus])
  return (
    <group>
      {coarse.map((t) => <Tile key={t.key} t={t} y={-0.03} renderOrder={0} onState={onState} />)}
      {fine.map((t) => <Tile key={t.key} t={t} y={-0.02} renderOrder={1} onState={onState} />)}
    </group>
  )
}

/** Tirai gelap di luar batas kota (bidang besar berlubang mengikuti batas kota). */
function OutsideVeil() {
  const shape = useMemo(() => {
    const s = new THREE.Shape([[-60, -60], [60, -60], [60, 60], [-60, 60]].map(([x, y]) => new THREE.Vector2(x, y)))
    s.holes.push(new THREE.Path([...JAMBI_GEO.outline].reverse().map(([x, y]) => new THREE.Vector2(x, y))))
    return s
  }, [])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} renderOrder={2}>
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial color="#03111d" transparent opacity={0.6} depthWrite={false} fog={false} />
    </mesh>
  )
}

/* ---------- kecamatan: isian transparan + garis batas ---------- */
function District({ d, target, color, fill, hovered, onOver, onOut, onPick }) {
  const g = useRef(), mat = useRef()
  const geo = useMemo(() => {
    const s = new THREE.Shape(d.ring.map(([x, y]) => new THREE.Vector2(x, y)))
    return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false })
  }, [d])
  const edge = useMemo(() => [...d.ring, d.ring[0]].map(([x, y]) => [x, y, 1.002]), [d])
  const col = useMemo(() => new THREE.Color(), [])
  useEffect(() => () => geo.dispose(), [geo])

  useFrame((_, dt) => {
    const k = 1 - Math.pow(0.002, dt)
    g.current.scale.z += (target - g.current.scale.z) * k
    col.set(color); mat.current.color.lerp(col, k)
    mat.current.opacity += ((hovered ? Math.max(fill, 0.22) : fill) - mat.current.opacity) * k
  })

  return (
    <group ref={g} scale={[1, 1, 0.02]}>
      <mesh geometry={geo} renderOrder={3}
        onPointerOver={(e) => { e.stopPropagation(); onOver(d) }} onPointerOut={onOut}
        onClick={(e) => { e.stopPropagation(); onPick(d) }}>
        <meshStandardMaterial ref={mat} color={color} transparent opacity={0} depthWrite={false} roughness={0.4} />
      </mesh>
      {/* garis batas: bayangan gelap + garis terang di atasnya agar terbaca di atas citra apa pun */}
      <Line points={edge} color="#04121e" lineWidth={hovered ? 5 : 3.2} transparent opacity={0.45} renderOrder={4} />
      <Line points={edge} color="#ffffff" lineWidth={hovered ? 2.6 : 1.3} transparent opacity={hovered ? 1 : 0.85} renderOrder={5} />
    </group>
  )
}

/* ---------- arus Sungai Batanghari (sungainya sendiri sudah tampak di citra) ---------- */
function RiverFlow() {
  const flow = useRef()
  const pts = useMemo(() => JAMBI_GEO.river.map(([x, y]) => W(x, y, 0.04)), [])
  useFrame((_, dt) => { if (flow.current) flow.current.material.dashOffset -= dt * 0.5 })
  return <Line ref={flow} points={pts} color="#8fdcff" lineWidth={1.6} dashed dashSize={0.3} gapSize={0.55} transparent opacity={0.75} />
}

/* ---------- lapis titik dari server ---------- */
function Pins({ items, color, height, onOver, onOut, kind }) {
  const grp = useRef()
  useFrame(({ clock }) => {
    if (!grp.current) return
    grp.current.children.forEach((c, i) => { const ring = c.children[2]; if (ring) { const t = (clock.elapsedTime * 0.6 + i * 0.37) % 1; ring.scale.setScalar(0.4 + t * 1.8); ring.material.opacity = 0.9 * (1 - t) } })
  })
  return (
    <group ref={grp}>
      {items.map((p, i) => (
        <group key={i} position={W(p.x, p.y, 0)}
          onPointerOver={(e) => { e.stopPropagation(); onOver({ kind, ...p }) }} onPointerOut={onOut}>
          <mesh position={[0, height / 2, 0]}><cylinderGeometry args={[0.028, 0.028, height, 6]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.85} /></mesh>
          <mesh position={[0, height, 0]}><sphereGeometry args={[kind === 'posko' ? 0.2 : 0.15, 24, 24]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} /></mesh>
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.18, 0.26, 32]} /><meshBasicMaterial color={color} transparent opacity={0.8} depthWrite={false} /></mesh>
        </group>
      ))}
    </group>
  )
}

function Roads({ lines }) {
  const refs = useRef([])
  useFrame((_, dt) => refs.current.forEach((l) => { if (l?.material) l.material.dashOffset -= dt * 0.8 }))
  return lines.map((l, i) => (
    <Line key={i} ref={(el) => (refs.current[i] = el)} points={l.pts.map(([x, y]) => W(x, y, 0.06))}
      color={l.wet ? '#ff4d8d' : '#ffffff'} lineWidth={l.wet ? 4.5 : 1.4} transparent opacity={l.wet ? 1 : 0.55}
      dashed={l.wet} dashSize={0.22} gapSize={0.12} />
  ))
}

/* ---------- kamera: dolly masuk saat pertama tampil ---------- */
function Intro() {
  const { camera, size } = useThree()
  const t = useRef(0)
  const f = size.width / size.height < 1.1 ? 1.55 : size.width / size.height < 1.5 ? 1.2 : 1
  useFrame((_, dt) => {
    if (t.current >= 1) return
    t.current = Math.min(1, t.current + dt / 2.6)
    const e = 1 - Math.pow(1 - t.current, 3)
    camera.position.lerpVectors(new THREE.Vector3(0, 42 * f, 3), new THREE.Vector3(0, 19 * f, 15 * f), e)
    camera.lookAt(0, 0, 0)
  })
  return null
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '')

export default function JambiMap3D({ layer, cuaca, statusColor, posko, air, roads, hover, setHover, onPick, active, coarse, reduce, onSatStatus }) {
  const rain = useMemo(() => {
    const m = new Map(); cuaca.forEach((k) => m.set(norm(k.nama_kecamatan), k)); return m
  }, [cuaca])
  const maxRain = useMemo(() => Math.max(5, ...cuaca.map((k) => Number(k.curah_hujan_terkini) || 0)), [cuaca])

  const districts = JAMBI_GEO.kecamatan.map((d) => {
    const c = rain.get(norm(d.nama))
    const v = Number(c?.curah_hujan_terkini) || 0
    const rainOn = layer === 1 && c
    return {
      d,
      target: rainOn ? 0.12 + (v / maxRain) * MAX_H : hover?.nama === d.nama ? 0.12 : 0.02,
      color: rainOn ? statusColor(c.status_peringatan) : '#ffffff',
      fill: rainOn ? 0.62 : 0,
    }
  })

  return (
    <Canvas className="m3d-canvas" flat frameloop={active ? 'always' : 'never'} dpr={[1, 1.8]}
      camera={{ position: [0, 42, 3], fov: 36, near: 0.1, far: 300 }} gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => setHover(null)}>
      <fog attach="fog" args={['#04182a', 40, 80]} />
      <hemisphereLight args={['#ffffff', '#33506a', 2.2]} />
      <directionalLight position={[9, 16, 7]} intensity={1.6} />

      {/* alas gelap di luar jangkauan ubin */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <circleGeometry args={[60, 64]} />
        <meshBasicMaterial color="#04182a" />
      </mesh>
      <Satellite onStatus={onSatStatus} />
      <OutsideVeil />
      <Line points={[...JAMBI_GEO.outline, JAMBI_GEO.outline[0]].map(([x, y]) => W(x, y, 0.03))} color="#6EC1E4" lineWidth={3} />
      <RiverFlow />

      <group rotation={[-Math.PI / 2, 0, 0]}>
        {districts.map(({ d, target, color, fill }) => (
          <District key={d.nama} d={d} target={target} color={color} fill={fill}
            hovered={hover?.kind === 'kec' && hover.nama === d.nama}
            onOver={(dd) => setHover({ kind: 'kec', nama: dd.nama, km2: dd.km2, cuaca: rain.get(norm(dd.nama)) || null })}
            onOut={() => setHover(null)} onPick={onPick} />
        ))}
      </group>

      {districts.map(({ d, target }) => (
        <Html key={d.nama} position={W(d.c[0], d.c[1], target + 0.3)} center zIndexRange={[2, 0]} style={{ pointerEvents: 'none' }}>
          <span className={`m3d-lbl${hover?.nama === d.nama ? ' on' : ''}`}>{d.nama}</span>
        </Html>
      ))}

      {layer === 0 && <Pins kind="posko" items={posko} color="#ffb020" height={1.9} onOver={setHover} onOut={() => setHover(null)} />}
      {layer === 2 && <Pins kind="air" items={air} color="#3ad1ff" height={1.3} onOver={setHover} onOut={() => setHover(null)} />}
      {layer === 3 && <Roads lines={roads} />}

      <Intro />
      <OrbitControls makeDefault enableZoom={false} enablePan={false} enableRotate={!coarse} enableDamping dampingFactor={0.06}
        autoRotate={!reduce && !hover} autoRotateSpeed={0.3} minPolarAngle={0.2} maxPolarAngle={1.0} target={[0, 0, 0]} />
    </Canvas>
  )
}

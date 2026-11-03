import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { water } from './store.js'

const NOISE = /* glsl */`
  float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }
`

/* ---------- AIR ---------- */
const wVert = /* glsl */`
  uniform float uTime; uniform float uAmp;
  varying vec3 vPos; varying float vH; varying vec3 vN;
  float wave(vec2 p){
    return sin(p.x*0.9+uTime*0.9)*0.5 + sin(p.y*1.3-uTime*1.1)*0.35
         + sin((p.x+p.y)*1.7+uTime*1.6)*0.18 + sin((p.x-p.y)*3.1-uTime*2.2)*0.07;
  }
  void main(){
    vec3 p = position;
    float h = wave(p.xy) * uAmp;
    p.z += h; vH = h;
    float e = 0.06;
    float hx = wave(position.xy + vec2(e,0.0))*uAmp; float hy = wave(position.xy + vec2(0.0,e))*uAmp;
    vN = normalize((modelMatrix * vec4(normalize(vec3(-(hx-h)/e, -(hy-h)/e, 1.0)), 0.0)).xyz);
    vec4 w = modelMatrix * vec4(p,1.0);
    vPos = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`
const wFrag = /* glsl */`
  precision highp float;
  uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uFog; uniform vec3 uSun; uniform float uTime;
  varying vec3 vPos; varying float vH; varying vec3 vN;
  ${NOISE}
  float ripple(vec2 q, float t){
    return vnoise(q*3.0+vec2(t*0.5,t*0.25)) + 0.55*vnoise(q*7.5-vec2(t*0.8,t*0.1)) + 0.3*vnoise(q*16.0+vec2(-t*0.4,t*0.6));
  }
  vec3 skyCol(vec3 d){
    float t = clamp(d.y, 0.0, 1.0);
    vec3 zen = vec3(0.09, 0.44, 0.60);
    return mix(uFog, zen, pow(t, 0.5));
  }
  void main(){
    vec3 n = normalize(vN);
    vec2 q = vPos.xz; float e = 0.04; float t = uTime;
    float r0 = ripple(q, t), rx = ripple(q+vec2(e,0.0), t), rz = ripple(q+vec2(0.0,e), t);
    n = normalize(n + vec3((r0-rx)/e, 0.0, (r0-rz)/e) * 0.05);
    vec3 V = normalize(cameraPosition - vPos);
    vec3 R = reflect(-V, n); R.y = abs(R.y);
    float ndv = max(dot(n, V), 0.0);
    float fres = 0.03 + 0.97*pow(1.0 - ndv, 4.0);
    float depthMix = clamp(vH*1.4 + 0.5, 0.0, 1.0)*0.5 + (1.0 - ndv)*0.5;
    vec3 body = mix(uDeep*0.8, uShallow, depthMix);
    vec3 col = mix(body, skyCol(R), clamp(fres*1.15, 0.0, 1.0));
    vec3 S = normalize(uSun);
    float sd = max(dot(R, S), 0.0);
    col += (pow(sd, 260.0)*2.4 + pow(sd, 30.0)*0.35 + pow(sd, 6.0)*0.08) * vec3(1.0, 0.88, 0.55);
    col = mix(col, vec3(0.99, 0.94, 0.80), smoothstep(0.24, 0.52, vH + (r0-1.0)*0.04) * 0.38);
    float d = length(vPos - cameraPosition);
    col = mix(col, uFog, smoothstep(10.0, 36.0, d));
    gl_FragColor = vec4(col, 1.0);
  }`

function Surface({ source, amp, fog, far }) {
  const grp = useRef()
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uAmp: { value: amp },
    uDeep: { value: new THREE.Color('#218DAE') }, uShallow: { value: new THREE.Color('#2BBBD7') }, uFog: { value: new THREE.Color(fog) },
    uSun: { value: new THREE.Vector3(0.32, 0.1, -1.0) },
  }), [amp, fog])
  useFrame((s, dt) => {
    uniforms.uTime.value += dt
    const target = -1.6 + water[source].level * 2.6
    grp.current.position.y += (target - grp.current.position.y) * Math.min(1, dt * 3)
  })
  return (
    <group ref={grp} position={[0, -1.4, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[44, 44, 200, 200]} />
        <shaderMaterial vertexShader={wVert} fragmentShader={wFrag} uniforms={uniforms} />
      </mesh>
      {far && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -100]}><planeGeometry args={[300, 160]} /><meshBasicMaterial color={fog} fog={false} /></mesh>}
    </group>
  )
}

/* ---------- GUNUNG ---------- */
const tVert = /* glsl */`
  uniform float uSeed; uniform float uScale;
  varying vec3 vWorld; varying vec3 vN; varying float vH;
  ${NOISE}
  float ridged(vec2 p){
    float a = 0.5, s = 0.0, w = 1.0;
    for(int i=0;i<8;i++){
      float n = 1.0 - abs(vnoise(p)*2.0 - 1.0); n = n*n*w; s += n*a; w = clamp(n*2.2, 0.0, 1.0);
      p = p*2.09 + vec2(17.1, 9.2); a *= 0.48;
    }
    return s;
  }
  float height(vec2 w){
    float d = smoothstep(16.0, 46.0, -w.y);
    float base = ridged(w*0.038 + uSeed);
    float massif = smoothstep(0.12, 0.72, vnoise(w*0.017 + uSeed*2.0));
    return pow(base, 1.2) * uScale * d * (0.3 + 0.7*massif) - 4.0;
  }
  void main(){
    vec3 pw = (modelMatrix * vec4(position, 1.0)).xyz;
    float h = height(pw.xz);
    float e = 0.5;
    float hx = height(pw.xz + vec2(e, 0.0)); float hz = height(pw.xz + vec2(0.0, e));
    vN = normalize(vec3(-(hx-h)/e, 1.0, -(hz-h)/e));
    pw.y = h; vH = h; vWorld = pw;
    gl_Position = projectionMatrix * viewMatrix * vec4(pw, 1.0);
  }`
const tFrag = /* glsl */`
  precision highp float;
  uniform vec3 uForestLo; uniform vec3 uForestHi; uniform vec3 uRock; uniform vec3 uSnow; uniform vec3 uHaze; uniform vec3 uSun;
  varying vec3 vWorld; varying vec3 vN; varying float vH;
  ${NOISE}
  float fbm(vec2 p){ float a=0.5,s=0.0; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.1+3.7; a*=0.5; } return s; }
  void main(){
    vec3 n = normalize(vN);
    vec2 q = vWorld.xz * 0.35;
    float e = 0.12;
    float d0 = fbm(q), dx = fbm(q+vec2(e,0.0)), dz = fbm(q+vec2(0.0,e));
    n = normalize(n + vec3((d0-dx)/e, 0.0, (d0-dz)/e) * 0.35);
    float alt = vH + (d0-0.5)*5.0;
    float slope = 1.0 - n.y;
    vec3 forest = mix(uForestLo, uForestHi, smoothstep(-4.0, 10.0, alt));
    vec3 col = mix(forest, uRock, clamp(smoothstep(0.22, 0.5, slope) + smoothstep(9.0, 17.0, alt)*0.7, 0.0, 1.0));
    float snow = smoothstep(17.0, 24.0, alt) * smoothstep(0.62, 0.22, slope);
    col = mix(col, uSnow, snow);
    col *= 0.8 + 0.4*d0;
    vec3 S = normalize(uSun);
    float diff = clamp(dot(n, S), 0.0, 1.0);
    vec3 lit = vec3(1.0, 0.86, 0.6) * diff * 1.15 + vec3(0.2, 0.3, 0.4) * (0.55 + 0.45*n.y);
    col *= lit;
    float dist = length(vWorld - cameraPosition);
    float f = 1.0 - exp(-pow(dist * 0.0105, 1.6));
    float valley = exp(-max(vWorld.y + 3.0, 0.0) * 0.1) * smoothstep(14.0, 60.0, dist) * 0.6;
    col = mix(col, uHaze, clamp(max(f, valley), 0.0, 0.97));
    gl_FragColor = vec4(col, 1.0);
  }`
function Terrain({ haze }) {
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(280, 180, 360, 230); g.rotateX(-Math.PI / 2); return g }, [])
  const u = useMemo(() => ({
    uSeed: { value: 3.7 }, uScale: { value: 34 },
    uForestLo: { value: new THREE.Color('#0d3f43') }, uForestHi: { value: new THREE.Color('#2c6a58') }, uRock: { value: new THREE.Color('#6d8791') },
    uSnow: { value: new THREE.Color('#FFF4CF') }, uHaze: { value: new THREE.Color(haze) }, uSun: { value: new THREE.Vector3(0.5, 0.42, -0.2) },
  }), [haze])
  return <mesh geometry={geo} position={[0, 0, -78]} frustumCulled={false}><shaderMaterial vertexShader={tVert} fragmentShader={tFrag} uniforms={u} /></mesh>
}

/* ---------- AWAN ---------- */
const cFrag = /* glsl */`
  precision highp float;
  uniform float uTime; varying vec2 vUv;
  ${NOISE}
  float fbm(vec2 p){ float a=0.5,s=0.0; for(int i=0;i<6;i++){ s+=a*vnoise(p); p=p*2.03+vec2(5.3,1.7); a*=0.5; } return s; }
  void main(){
    vec2 p = vUv * vec2(7.0, 2.4) + vec2(uTime*0.012, 0.0);
    float c = fbm(p + fbm(p*0.7 + uTime*0.01)*0.8);
    c = smoothstep(0.5, 0.82, c);
    float fade = smoothstep(0.02, 0.35, vUv.y) * (1.0 - smoothstep(0.78, 1.0, vUv.y));
    float shade = fbm(p*1.6 + 9.0);
    vec3 col = mix(vec3(0.72, 0.88, 0.94), vec3(1.0, 0.98, 0.9), smoothstep(0.3, 0.8, shade));
    gl_FragColor = vec4(col, c * fade * 0.9);
  }`
function Clouds() {
  const u = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame((s, dt) => { u.uTime.value += dt })
  return (
    <mesh position={[0, 62, -210]} renderOrder={-1} frustumCulled={false}>
      <planeGeometry args={[760, 150]} />
      <shaderMaterial transparent depthWrite={false} fog={false} uniforms={u}
        vertexShader={'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'}
        fragmentShader={cFrag} />
    </mesh>
  )
}

/* ---------- HUJAN ---------- */
function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 32
  const g = c.getContext('2d'); const r = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = r; g.fillRect(0, 0, 32, 32)
  return new THREE.CanvasTexture(c)
}
function Rain({ count = 260, tint = '#1f7d9c' }) {
  const ref = useRef()
  const tex = useMemo(dotTexture, [])
  const data = useMemo(() => {
    const pos = new Float32Array(count * 3), spd = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18; pos[i * 3 + 1] = Math.random() * 8; pos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2
      spd[i] = 1.5 + Math.random() * 2.5
    }
    return { pos, spd }
  }, [count])
  useFrame((s, dt) => {
    const a = ref.current.geometry.attributes.position
    for (let i = 0; i < count; i++) {
      let y = a.array[i * 3 + 1] - data.spd[i] * dt
      if (y < -1.5) y = 7 + Math.random()
      a.array[i * 3 + 1] = y
    }
    a.needsUpdate = true
  })
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry><bufferAttribute attach="attributes-position" array={data.pos} count={count} itemSize={3} /></bufferGeometry>
      <pointsMaterial map={tex} color={tint} size={0.09} sizeAttenuation transparent opacity={0.7} depthWrite={false} />
    </points>
  )
}

function Rig() {
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    const tx = s.pointer.x * 0.8, ty = 1.4 + s.pointer.y * 0.3
    s.camera.position.x += (tx - s.camera.position.x) * Math.min(1, dt * 2)
    s.camera.position.y += (ty + Math.sin(t * 0.4) * 0.05 - s.camera.position.y) * Math.min(1, dt * 2)
    s.camera.lookAt(0, 2.0, -8)
  })
  return null
}

export default function WaterCanvas({ source = 'hero', amp = 0.28, rain = true, fog = '#FFFBEF', mountains = false }) {
  return (
    <Canvas className="water-canvas" dpr={[1, 1.6]} camera={{ position: [0, 1.4, 5], fov: 55, near: 0.1, far: 400 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} aria-hidden>
      <fog attach="fog" args={[fog, 8, 30]} />
      {mountains && <Clouds />}
      {mountains && <Terrain haze={fog} />}
      <Surface source={source} amp={amp} fog={fog} far={mountains} />
      {rain && <Rain tint={mountains ? '#e3f4fb' : '#1f7d9c'} />}
      <Rig />
    </Canvas>
  )
}

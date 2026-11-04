import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/motion.jsx'

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`

// Permukaan air prosedural: gelombang berlapis + normal map + fresnel + pantulan langit + kilau matahari + kaustik.
// Riak dari kursor/klik dihitung sebagai gelombang melingkar yang meluruh.
const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec4 uR[8];
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p=p*2.03+vec2(7.3,1.7); a*=.5; } return v; }
float ripple(vec2 p, vec4 r, float t){
  if(r.w <= 0.) return 0.;
  float age = t - r.z; if(age < 0. || age > 5.) return 0.;
  float d = length(p - r.xy), front = age * .42;
  return sin((d - front) * 42.) * exp(-abs(d - front) * 10.) * exp(-age * .8) * r.w * .05;
}
float height(vec2 p, float t){
  float h = 0.;
  h += sin(dot(p, vec2(.8,.6)) * 6. + t*1.0) * .040;
  h += sin(dot(p, vec2(-.5,.86)) * 9. + t*1.3) * .024;
  h += sin(dot(p, vec2(.2,-.98)) * 15. + t*1.8) * .012;
  h += (fbm(p*5.5 + vec2(t*.17, -t*.11)) - .5) * .05;
  h += (fbm(p*13. + vec2(-t*.2, t*.15)) - .5) * .014;
  for(int i=0;i<8;i++) h += ripple(p, uR[i], t);
  return h;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = vec2(uv.x * uRes.x / uRes.y, uv.y);
  float t = uTime, e = .002, h = height(p, t);
  vec3 n = normalize(vec3(-(height(p+vec2(e,0.),t)-h)/e*.55, -(height(p+vec2(0.,e),t)-h)/e*.55, 1.));
  vec3 V = normalize(vec3(0., -.55, .83));
  float fres = pow(1. - max(dot(n, V), 0.), 3.) * .9 + .05;
  vec3 R = reflect(-V, n);
  vec3 sky = mix(vec3(.08,.36,.55), vec3(.62,.86,.96), smoothstep(-.1, .95, R.y*.5 + .5));
  vec3 deep = mix(vec3(.02,.15,.27), vec3(.07,.40,.60), smoothstep(0., 1., uv.y));
  vec3 col = mix(deep, sky, fres);
  // kilau matahari
  vec3 L = normalize(vec3(.35, .55, .75));
  col += vec3(.92,.98,1.) * pow(max(dot(reflect(-L, n), V), 0.), 90.) * 1.0;
  // kaustik halus
  vec2 q = p * 13.;
  float c = sin(q.x + sin(q.y + t*.6)*1.6) * sin(q.y*1.1 + sin(q.x*.9 - t*.5)*1.6);
  col += vec3(.43,.76,.89) * pow(abs(c), 6.) * .22 * (1. - uv.y*.4);
  // busa tipis di puncak riak
  col += vec3(.8,.92,1.) * smoothstep(.07, .13, h) * .12;
  col *= mix(.72, 1., smoothstep(1.25, .15, length(uv - .5) * 1.25));
  gl_FragColor = vec4(col, 1.);
}`

function compile(gl, type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src); gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader error')
  return s
}

/** Air realistis (WebGL) untuk latar CTA; interaktif: kursor & klik membuat riak. */
export default function Water({ sectionRef, onReady }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const cv = canvasRef.current, sec = sectionRef.current
    const gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
    if (!gl) return
    let prog
    try {
      prog = gl.createProgram()
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link error')
    } catch (err) { console.warn('Water: WebGL dinonaktifkan', err); return }
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'a')
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const uRes = gl.getUniformLocation(prog, 'uRes'), uTime = gl.getUniformLocation(prog, 'uTime'), uR = gl.getUniformLocation(prog, 'uR')
    onReady?.()

    const reduce = prefersReducedMotion()
    const ripples = new Float32Array(32); let rIdx = 0
    const t0 = performance.now()
    let w = 1, h = 1
    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1.25) * 0.9   // render lebih kecil agar ringan
      w = cv.width = Math.max(2, Math.floor(sec.clientWidth * scale)); h = cv.height = Math.max(2, Math.floor(sec.clientHeight * scale))
      gl.viewport(0, 0, w, h)
    }
    resize(); window.addEventListener('resize', resize)

    const drop = (x, y, s) => {
      const r = sec.getBoundingClientRect()
      const ux = (x - r.left) / r.height * 1, uy = 1 - (y - r.top) / r.height
      ripples.set([ux, uy, (performance.now() - t0) / 1000, s], rIdx * 4); rIdx = (rIdx + 1) % 8
    }
    let lastX = -999, lastY = -999
    const onMove = (e) => { if (Math.hypot(e.clientX - lastX, e.clientY - lastY) > 70) { lastX = e.clientX; lastY = e.clientY; drop(e.clientX, e.clientY, 0.55) } }
    const onDown = (e) => drop(e.clientX, e.clientY, 1.1)
    sec.addEventListener('pointermove', onMove); sec.addEventListener('pointerdown', onDown)

    let visible = true, raf, nextAuto = 0.6
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0 })
    io.observe(sec)
    const frame = () => {
      const t = (performance.now() - t0) / 1000
      if (visible) {
        // tetesan acak supaya air terasa hidup walau kursor diam
        if (!reduce && t > nextAuto) {
          const r = sec.getBoundingClientRect()
          drop(r.left + Math.random() * r.width, r.top + r.height * (0.15 + Math.random() * 0.7), 0.5 + Math.random() * 0.4)
          nextAuto = t + 1.2 + Math.random() * 1.6
        }
        gl.uniform2f(uRes, w, h); gl.uniform1f(uTime, reduce ? 3 : t); gl.uniform4fv(uR, ripples)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('resize', resize)
      sec.removeEventListener('pointermove', onMove); sec.removeEventListener('pointerdown', onDown)
      // Jangan loseContext(): di React StrictMode (npm run dev) efek jalan dua kali pada kanvas yang sama,
      // dan getContext() akan mengembalikan konteks yang sudah mati -> kanvas kosong (tampak abu-abu).
      gl.deleteBuffer(buf); gl.deleteProgram(prog)
    }
  }, [sectionRef, onReady])

  return <canvas ref={canvasRef} className="water" aria-hidden="true" />
}

import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

/* ============================================================
   THE NETWORK  (Three.js neural net + bloom)
   Layered neurons, data pulses flowing forward through the
   edges — the adversarial AI reading the contract. Flaws in
   the output layer fire red as the scan surfaces them.
   ============================================================ */

const LAYERS = [7, 12, 16, 16, 12, 5]
const X_SPAN = 20
const BASE = new THREE.Color(0x4da3ff)     // electric blue neuron
const SEV: Record<string, number> = { crit: 0xff4d6a, high: 0xff9f4d, med: 0xffd54d, low: 0x6fa8ff }

// flaw output nodes → severity + scan reveal threshold
const FLAWS: [keyof typeof SEV, number][] = [['crit', 0.15], ['high', 0.38], ['med', 0.58], ['low', 0.76]]

export interface NetworkFx {
  setScan(p: number): void
  setScroll(p: number): void
  setActive(a: boolean): void
  onReveal(cb: (i: number, sev: string) => void): void
  destroy(): void
}

function frand(seed: number) {
  let s = seed >>> 0
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
}

export function initNetwork(canvas: HTMLCanvasElement): NetworkFx | null {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' })
  if (!gl) return null

  let renderer: THREE.WebGLRenderer
  try { renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: false, powerPreference: 'high-performance' }) }
  catch { return null }
  const dpr = Math.min(devicePixelRatio, 1.8)
  renderer.setPixelRatio(dpr)
  renderer.setClearColor(0x06070b, 1)
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 200)
  camera.position.set(0, 0, 20)

  const rnd = frand(1234)

  // ---- build nodes ----
  type Node = { x: number; y: number; z: number; layer: number }
  const nodes: Node[] = []
  const layerStart: number[] = []
  LAYERS.forEach((count, li) => {
    layerStart[li] = nodes.length
    const x = -X_SPAN / 2 + (li / (LAYERS.length - 1)) * X_SPAN
    const radius = 2.2 + count * 0.42
    for (let n = 0; n < count; n++) {
      // even-ish spread in the y-z plane via golden angle
      const t = (n + 0.5) / count
      const ang = n * 2.399963
      const r = Math.sqrt(t) * radius
      nodes.push({ x: x + (rnd() - 0.5) * 1.2, y: Math.cos(ang) * r, z: Math.sin(ang) * r * 0.7, layer: li })
    }
  })
  const N = nodes.length

  // ---- edges (each node → K in next layer) ----
  const edges: [number, number][] = []
  for (let li = 0; li < LAYERS.length - 1; li++) {
    const a0 = layerStart[li], a1 = layerStart[li] + LAYERS[li]
    const b0 = layerStart[li + 1], b1 = b0 + LAYERS[li + 1]
    for (let a = a0; a < a1; a++) {
      const K = 2 + Math.floor(rnd() * 3)
      const used = new Set<number>()
      for (let k = 0; k < K; k++) {
        const b = b0 + Math.floor(rnd() * (b1 - b0))
        if (used.has(b)) continue
        used.add(b); edges.push([a, b])
      }
    }
  }

  // node geometry (Points) with per-vertex color + activation
  const nodePos = new Float32Array(N * 3)
  const nodeCol = new Float32Array(N * 3)
  const nodeAct = new Float32Array(N)
  const nodeBaseCol = new Float32Array(N * 3)
  nodes.forEach((nd, i) => {
    nodePos[i * 3] = nd.x; nodePos[i * 3 + 1] = nd.y; nodePos[i * 3 + 2] = nd.z
    BASE.toArray(nodeBaseCol, i * 3)
    nodeCol[i * 3] = BASE.r; nodeCol[i * 3 + 1] = BASE.g; nodeCol[i * 3 + 2] = BASE.b
    nodeAct[i] = 0.15 + rnd() * 0.1
  })
  const nodeGeo = new THREE.BufferGeometry()
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePos, 3))
  nodeGeo.setAttribute('aColor', new THREE.BufferAttribute(nodeCol, 3))
  nodeGeo.setAttribute('aAct', new THREE.BufferAttribute(nodeAct, 1))
  const nodeMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uSize: { value: 4.2 * dpr } },
    vertexShader: `
      attribute vec3 aColor; attribute float aAct; uniform float uSize;
      varying vec3 vC; varying float vA;
      void main(){ vC = aColor; vA = aAct;
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.55 + aAct*2.4) * (60.0 / -mv.z); }`,
    fragmentShader: `
      varying vec3 vC; varying float vA;
      void main(){ vec2 d = gl_PointCoord-0.5; float l = length(d);
        float core = smoothstep(0.5,0.12,l);            // crisp centre
        vec3 c = mix(vC, vec3(1.0), min(vA*0.35,0.5)) * (0.55 + vA*1.2);
        gl_FragColor = vec4(c, core); }`,
  })
  const nodePoints = new THREE.Points(nodeGeo, nodeMat)

  // edges as lines
  const edgePos = new Float32Array(edges.length * 6)
  edges.forEach(([a, b], i) => {
    edgePos[i * 6] = nodes[a].x; edgePos[i * 6 + 1] = nodes[a].y; edgePos[i * 6 + 2] = nodes[a].z
    edgePos[i * 6 + 3] = nodes[b].x; edgePos[i * 6 + 4] = nodes[b].y; edgePos[i * 6 + 5] = nodes[b].z
  })
  const edgeGeo = new THREE.BufferGeometry()
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePos, 3))
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x2f5c9e, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
  const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat)

  // pulses travelling along edges
  const NUM_PULSES = 320
  const pulse = { e: new Int32Array(NUM_PULSES), t: new Float32Array(NUM_PULSES), spd: new Float32Array(NUM_PULSES) }
  for (let i = 0; i < NUM_PULSES; i++) { pulse.e[i] = Math.floor(rnd() * edges.length); pulse.t[i] = rnd(); pulse.spd[i] = 0.35 + rnd() * 0.5 }
  const pulsePos = new Float32Array(NUM_PULSES * 3)
  const pulseGeo = new THREE.BufferGeometry()
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos, 3))
  const pulseMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uSize: { value: 4 * dpr }, uColor: { value: new THREE.Color(0x7fdcff) } },
    vertexShader: `uniform float uSize; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0);
      gl_Position = projectionMatrix*mv; gl_PointSize = uSize*(60.0/-mv.z); }`,
    fragmentShader: `uniform vec3 uColor; void main(){ vec2 d=gl_PointCoord-0.5; float m=smoothstep(0.5,0.0,length(d));
      gl_FragColor=vec4(uColor*1.6, m); }`,
  })
  const pulsePoints = new THREE.Points(pulseGeo, pulseMat)

  const group = new THREE.Group()
  group.add(edgeLines, nodePoints, pulsePoints)
  scene.add(group)

  // flaw node global indices
  const lastStart = layerStart[LAYERS.length - 1]
  const flawNode = FLAWS.map((_, i) => lastStart + i)

  // ---- postprocessing: bloom ----
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.42, 0.28)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  function resize() {
    const w = innerWidth, h = innerHeight
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
    camera.aspect = w / h; camera.updateProjectionMatrix()
  }
  resize(); addEventListener('resize', resize)

  // state
  let scan = 0, scanCur = 0, scroll = 0, active = true
  let px = 0, py = 0, tpx = 0, tpy = 0
  const revealed = new Set<number>()
  let revealCb: ((i: number, sev: string) => void) | null = null
  addEventListener('pointermove', (e) => { tpx = e.clientX / innerWidth - 0.5; tpy = e.clientY / innerHeight - 0.5 }, { passive: true })

  const colAttr = nodeGeo.getAttribute('aColor') as THREE.BufferAttribute
  const actAttr = nodeGeo.getAttribute('aAct') as THREE.BufferAttribute
  const pulseAttr = pulseGeo.getAttribute('position') as THREE.BufferAttribute
  const tmp = new THREE.Color()

  let raf = 0, last = performance.now(), t = 0
  function loop(now: number) {
    raf = requestAnimationFrame(loop)
    const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt
    if (!active) return

    scanCur += (scan - scanCur) * Math.min(dt * 3, 1)
    px += (tpx - px) * Math.min(dt * 2, 1); py += (tpy - py) * Math.min(dt * 2, 1)

    // hero: net biased right; recenters + zooms as you scroll into the analysis
    const bias = 1 - Math.min(scroll * 1.5, 1)
    group.position.x = bias * 4.5
    group.rotation.y = -0.35 + px * 0.5 + scroll * 0.6
    group.rotation.x = py * 0.3 + Math.sin(t * 0.2) * 0.03
    camera.position.z = 20 - scroll * 3

    // decay activations
    for (let i = 0; i < N; i++) nodeAct[i] = Math.max(0.12, nodeAct[i] - dt * 1.4)

    // advance pulses; on arrival, activate destination node
    const speedBoost = 1 + scanCur * 1.2
    for (let i = 0; i < NUM_PULSES; i++) {
      pulse.t[i] += pulse.spd[i] * speedBoost * dt
      let e = pulse.e[i]
      if (pulse.t[i] >= 1) {
        const dst = edges[e][1]
        nodeAct[dst] = Math.min(2.2, nodeAct[dst] + 0.9)
        // respawn on a new edge (bias to whole net)
        e = Math.floor(rnd() * edges.length); pulse.e[i] = e; pulse.t[i] = pulse.t[i] - 1
      }
      const [a, b] = edges[e]; const tt = pulse.t[i]
      pulsePos[i * 3] = nodes[a].x + (nodes[b].x - nodes[a].x) * tt
      pulsePos[i * 3 + 1] = nodes[a].y + (nodes[b].y - nodes[a].y) * tt
      pulsePos[i * 3 + 2] = nodes[a].z + (nodes[b].z - nodes[a].z) * tt
    }
    pulseAttr.needsUpdate = true

    // flaws light red as the scan crosses their thresholds
    flawNode.forEach((gi, i) => {
      const lit = Math.max(0, Math.min(1, (scanCur - FLAWS[i][1]) * 6))
      nodeAct[gi] = Math.max(nodeAct[gi], 0.3 + lit * 1.9)
      tmp.set(BASE).lerp(new THREE.Color(SEV[FLAWS[i][0]]), lit)
      colAttr.setXYZ(gi, tmp.r, tmp.g, tmp.b)
      if (lit > 0.5 && !revealed.has(i)) { revealed.add(i); revealCb?.(i, FLAWS[i][0]) }
      if (lit < 0.2) revealed.delete(i)
    })
    colAttr.needsUpdate = true
    for (let i = 0; i < N; i++) actAttr.setX(i, nodeAct[i])
    actAttr.needsUpdate = true

    composer.render()
  }
  raf = requestAnimationFrame(loop)

  return {
    setScan(p) { scan = Math.max(0, Math.min(1, p)) },
    setScroll(p) { scroll = Math.max(0, Math.min(1, p)) },
    setActive(a) { active = a; if (a) last = performance.now() },
    onReveal(cb) { revealCb = cb },
    destroy() {
      cancelAnimationFrame(raf); removeEventListener('resize', resize)
      nodeGeo.dispose(); nodeMat.dispose(); edgeGeo.dispose(); edgeMat.dispose()
      pulseGeo.dispose(); pulseMat.dispose(); composer.dispose(); renderer.dispose()
    },
  }
}

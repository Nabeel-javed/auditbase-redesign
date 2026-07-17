import * as THREE from 'three'

/* ============================================================
   THE GLASS CONTRACT  (Three.js physical transmission)
   A refractive crystal — the opaque contract made transparent —
   with severity-coloured "flaws" suspended inside, lit by an
   ambient studio environment. Calm, premium, light.
   ============================================================ */

const SEV = {
  crit: 0xe5484d, high: 0xe08a2b, med: 0xd8b41e, low: 0x5b7fb0, info: 0x8a8578,
}

// inclusions: [severity, x, y, z, revealAt]
const INCLUSIONS: [keyof typeof SEV, number, number, number, number][] = [
  ['crit', 0.15, 0.35, 0.2, 0.15],
  ['high', -0.45, -0.1, -0.25, 0.38],
  ['med', 0.4, -0.35, 0.15, 0.58],
  ['low', -0.1, 0.5, -0.3, 0.74],
  ['low', 0.28, 0.05, -0.4, 0.88],
]

export interface Glass {
  setScan(p: number): void
  setScroll(p: number): void
  onReveal(cb: (i: number, sev: string) => void): void
  destroy(): void
}

function gradientEnv(): THREE.Texture {
  // High-contrast studio: dark surround with bright softbox strips. The faceted
  // glass reflects this, giving it crystalline form even over a light page.
  const c = document.createElement('canvas')
  c.width = 1024; c.height = 512
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, 512)
  g.addColorStop(0, '#3a3d44')       // upper surround
  g.addColorStop(0.5, '#232428')
  g.addColorStop(0.5, '#191a1d')
  g.addColorStop(1, '#0e0e10')       // floor
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1024, 512)
  // bright vertical softboxes → crisp specular streaks on the facets
  const boxes = [[190, 90], [520, 150], [800, 70]]
  boxes.forEach(([x, w]) => {
    const bg = ctx.createLinearGradient(x - w, 0, x + w, 0)
    bg.addColorStop(0, 'rgba(255,255,255,0)')
    bg.addColorStop(0.5, 'rgba(255,252,246,0.95)')
    bg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = bg
    ctx.fillRect(x - w, 40, w * 2, 300)
  })
  // warm floor bounce
  const fg = ctx.createLinearGradient(0, 340, 0, 512)
  fg.addColorStop(0, 'rgba(214,196,160,0)')
  fg.addColorStop(1, 'rgba(214,196,160,0.35)')
  ctx.fillStyle = fg
  ctx.fillRect(0, 340, 1024, 172)
  const tex = new THREE.CanvasTexture(c)
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function initGlass(canvas: HTMLCanvasElement): Glass | null {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch { return null }
  if (!renderer.getContext()) return null

  const dpr = Math.min(devicePixelRatio, 2)
  renderer.setPixelRatio(dpr)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  camera.position.set(0, 0, 8)

  // environment for reflections + refraction
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTex = gradientEnv()
  const envRT = pmrem.fromEquirectangular(envTex)
  scene.environment = envRT.texture
  envTex.dispose()

  // key + fill lights (help the facets read)
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 6, 5); scene.add(key)
  const fill = new THREE.DirectionalLight(0xfff4e2, 0.6); fill.position.set(-5, -2, 3); scene.add(fill)
  scene.add(new THREE.AmbientLight(0xffffff, 0.25))

  const group = new THREE.Group()
  scene.add(group)

  // the glass crystal — faceted icosahedron
  const geo = new THREE.IcosahedronGeometry(1.8, 0)
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xeef1f4,
    metalness: 0,
    roughness: 0.04,
    transmission: 0.96,
    thickness: 0.9,
    ior: 1.48,
    iridescence: 0.45,
    iridescenceIOR: 1.32,
    specularIntensity: 1,
    envMapIntensity: 1.7,
    attenuationColor: new THREE.Color(0xafc0d4),
    attenuationDistance: 6,
    clearcoat: 0.7,
    clearcoatRoughness: 0.1,
  })
  const crystal = new THREE.Mesh(geo, glassMat)
  group.add(crystal)

  // crisp facet edges so the crystal reads as cut glass
  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0x16130e, transparent: true, opacity: 0.22 })
  )
  wire.scale.setScalar(1.002)
  group.add(wire)

  // inclusions (the flaws)
  const incMeshes: { mesh: THREE.Mesh; halo: THREE.Sprite; base: number; reveal: number; hex: number }[] = []
  const haloTex = makeHalo()
  INCLUSIONS.forEach(([sev, x, y, z, reveal]) => {
    const hex = SEV[sev]
    const m = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.085, 0),
      new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.4, roughness: 0.3, toneMapped: false })
    )
    m.position.set(x * 1.1, y * 1.1, z * 1.1)   // suspended inside the r=1.8 crystal
    group.add(m)
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: haloTex, color: hex, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }))
    halo.scale.setScalar(0.7)
    halo.position.copy(m.position)
    group.add(halo)
    incMeshes.push({ mesh: m, halo, base: 0, reveal, hex })
  })

  function makeHalo(): THREE.Texture {
    const c = document.createElement('canvas'); c.width = c.height = 128
    const x = c.getContext('2d')!
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.6)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    x.fillStyle = g; x.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  }

  function resize() {
    const w = innerWidth, h = innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()
  addEventListener('resize', resize)

  // state
  let scan = 0, scanCur = 0, scroll = 0, active = true
  let px = 0, py = 0, tpx = 0, tpy = 0
  const revealed = new Set<number>()
  let revealCb: ((i: number, sev: string) => void) | null = null
  addEventListener('pointermove', (e) => {
    tpx = e.clientX / innerWidth - 0.5
    tpy = e.clientY / innerHeight - 0.5
  }, { passive: true })

  let raf = 0, last = performance.now(), t = 0
  function loop(now: number) {
    raf = requestAnimationFrame(loop)
    const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt
    if (!active) return

    scanCur += (scan - scanCur) * Math.min(dt * 3, 1)
    px += (tpx - px) * Math.min(dt * 2.2, 1)
    py += (tpy - py) * Math.min(dt * 2.2, 1)

    // hero: object right of the headline; stays in the right column during reveal
    const bias = 1 - Math.min(scroll * 1.6, 1)
    group.position.x = 1.75 + bias * 0.55
    group.scale.setScalar(0.86)
    group.rotation.y = t * 0.16 + px * 0.6 + scroll * Math.PI * 1.1
    group.rotation.x = -0.12 + py * 0.4 + Math.sin(t * 0.4) * 0.04
    group.position.y = Math.sin(t * 0.6) * 0.06

    // reveal inclusions as scan crosses their threshold
    incMeshes.forEach((inc, i) => {
      const lit = Math.max(0, Math.min(1, (scanCur - inc.reveal) * 6))
      const pulse = 0.8 + 0.2 * Math.sin(t * 3 + i)
      ;(inc.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35 + lit * (2.4 + pulse * 0.8)
      ;(inc.halo.material as THREE.SpriteMaterial).opacity = lit * 0.7 * pulse
      inc.halo.scale.setScalar(0.5 + lit * 0.6)
      if (lit > 0.5 && !revealed.has(i)) { revealed.add(i); revealCb?.(i, INCLUSIONS[i][0]) }
      if (lit < 0.2) revealed.delete(i)
    })

    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(loop)

  return {
    setScan(p) { scan = Math.max(0, Math.min(1, p)) },
    setScroll(p) { scroll = Math.max(0, Math.min(1, p)) },
    onReveal(cb) { revealCb = cb },
    destroy() {
      cancelAnimationFrame(raf); removeEventListener('resize', resize)
      geo.dispose(); glassMat.dispose(); envRT.dispose(); pmrem.dispose(); renderer.dispose()
    },
  }
}

/* ============================================================
   THE READING MACHINE  (raw WebGL2 — no framework)
   A particle organism that morphs through the product story,
   rendered to a framebuffer then redrawn as ASCII glyphs on GPU.
   ============================================================ */

const COUNT = 13000

/* ---------- formations ---------- */
type Form = (out: Float32Array) => void

function frand(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

// 0 — SPECIMEN: (2,3) torus knot tube
const formSpecimen: Form = (out) => {
  const p = 2, q = 3, S = 6.0, tube = 2.3
  const rnd = frand(7)
  for (let i = 0; i < COUNT; i++) {
    const u = (i / COUNT) * Math.PI * 2
    const r0 = 2 + Math.cos(q * u)
    const cx = S * r0 * Math.cos(p * u)
    const cy = S * r0 * Math.sin(p * u)
    const cz = S * Math.sin(q * u)
    const du = 0.01
    const r1 = 2 + Math.cos(q * (u + du))
    const tx = S * (r1 * Math.cos(p * (u + du)) - r0 * Math.cos(p * u)) / du
    const ty = S * (r1 * Math.sin(p * (u + du)) - r0 * Math.sin(p * u)) / du
    const tz = S * (Math.sin(q * (u + du)) - Math.sin(q * u)) / du
    const tl = Math.hypot(tx, ty, tz) || 1
    let nx = -ty / tl, ny = tx / tl, nz = 0
    const nl = Math.hypot(nx, ny, nz) || 1
    nx /= nl; ny /= nl; nz /= nl
    const bx = (ty / tl) * nz - (tz / tl) * ny
    const by = (tz / tl) * nx - (tx / tl) * nz
    const bz = (tx / tl) * ny - (ty / tl) * nx
    const a = rnd() * Math.PI * 2
    const rr = tube * (0.6 + rnd() * 0.4)
    out[i * 3] = cx + (Math.cos(a) * nx + Math.sin(a) * bx) * rr
    out[i * 3 + 1] = cy + (Math.cos(a) * ny + Math.sin(a) * by) * rr
    out[i * 3 + 2] = cz + (Math.cos(a) * nz + Math.sin(a) * bz) * rr
  }
}

// 1 — CODE FIELD: rows and columns (static sweep)
const formCode: Form = (out) => {
  const cols = 74, rowsN = Math.ceil(COUNT / cols)
  const rnd = frand(21)
  const w = 46, lh = 0.92
  for (let i = 0; i < COUNT; i++) {
    const c = i % cols, rN = Math.floor(i / cols)
    const lineLen = 20 + Math.floor(frand(rN + 3)() * cols)
    const gap = c > lineLen
    const x = -w / 2 + (c / cols) * w + (rnd() - 0.5) * 0.2
    const y = (rowsN * lh) / 2 - rN * lh + (rnd() - 0.5) * 0.2
    const z = (rnd() - 0.5) * 1.2
    out[i * 3] = gap ? x + 60 : x
    out[i * 3 + 1] = y
    out[i * 3 + 2] = z
  }
}

// 2 — STATE TREE: branching structure (symbolic exec)
const formTree: Form = (out) => {
  const rnd = frand(43)
  const nodes: { x: number; y: number; d: number }[] = []
  const maxD = 9
  function grow(x: number, y: number, d: number, spread: number) {
    nodes.push({ x, y, d })
    if (d >= maxD) return
    const nx = x + 3.2
    grow(nx, y + spread, d + 1, spread * 0.62)
    grow(nx, y - spread, d + 1, spread * 0.62)
  }
  grow(-20, 0, 0, 9)
  for (let i = 0; i < COUNT; i++) {
    const n = nodes[i % nodes.length]
    const t = rnd()
    const px = -20 + (n.x + 20) * (1 - 0.5 / (n.d + 1))
    out[i * 3] = px + (n.x - px) * t + (rnd() - 0.5) * 0.4
    out[i * 3 + 1] = n.y * t + (rnd() - 0.5) * 0.4
    out[i * 3 + 2] = (rnd() - 0.5) * 4
  }
}

// 3 — REPORT LATTICE: a page of justified text (the deliverable)
const formDoc: Form = (out) => {
  const rnd = frand(88)
  const pw = 40, ph = 40, margin = 3.5
  const rows = 30, rowH = (ph - margin * 2) / rows
  const rowLen: number[] = []
  for (let r = 0; r < rows; r++) {
    const rr = frand(r + 100)()
    rowLen.push(r % 9 === 0 ? 0.4 : 0.6 + rr * 0.38)
  }
  for (let i = 0; i < COUNT; i++) {
    const onBorder = i % 11 === 0
    let x, y
    if (onBorder) {
      const per = rnd()
      if (per < 0.5) { x = -pw / 2 + rnd() * pw; y = (per < 0.25 ? 1 : -1) * ph / 2 }
      else { x = (per < 0.75 ? -1 : 1) * pw / 2; y = -ph / 2 + rnd() * ph }
    } else {
      const r = Math.floor(rnd() * rows)
      x = -pw / 2 + margin + rnd() * (pw - margin * 2) * rowLen[r]
      y = ph / 2 - margin - r * rowH + (rnd() - 0.5) * 0.25
    }
    out[i * 3] = x
    out[i * 3 + 1] = y
    out[i * 3 + 2] = (rnd() - 0.5) * 0.6
  }
}

const FORMS: Form[] = [formSpecimen, formCode, formTree, formDoc]

/* ---------- glyph atlas ---------- */
function buildGlyphCanvas(): HTMLCanvasElement {
  const RAMP = ' .:-=+*x#%@'
  const cell = 32
  const cnv = document.createElement('canvas')
  cnv.width = cell * RAMP.length
  cnv.height = cell
  const ctx = cnv.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, cnv.width, cnv.height)
  ctx.fillStyle = '#fff'
  ctx.font = `${Math.floor(cell * 0.82)}px 'IBM Plex Mono', monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < RAMP.length; i++) ctx.fillText(RAMP[i], i * cell + cell / 2, cell / 2 + 1)
  return cnv
}
const GLYPH_N = 11

/* ---------- tiny mat4 ---------- */
type M4 = Float32Array
function m4(): M4 { return new Float32Array(16) }
function ident(o: M4): M4 { o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o }
function perspective(o: M4, fovy: number, aspect: number, near: number, far: number): M4 {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far)
  o.fill(0)
  o[0] = f / aspect; o[5] = f; o[10] = (far + near) * nf; o[11] = -1; o[14] = 2 * far * near * nf
  return o
}
function mul(o: M4, a: M4, b: M4): M4 {
  const r = m4()
  for (let c = 0; c < 4; c++) for (let d = 0; d < 4; d++) {
    let s = 0
    for (let k = 0; k < 4; k++) s += a[k * 4 + d] * b[c * 4 + k]
    r[c * 4 + d] = s
  }
  o.set(r); return o
}
function lookAt(o: M4, ex: number, ey: number, ez: number, cx: number, cy: number, cz: number): M4 {
  let zx = ex - cx, zy = ey - cy, zz = ez - cz
  let zl = Math.hypot(zx, zy, zz) || 1; zx /= zl; zy /= zl; zz /= zl
  // up = (0,1,0)
  let xx = 1 * zz - 0 * zy, xy = 0 * zx - 0 * zz, xz = 0 * zy - 1 * zx
  let xl = Math.hypot(xx, xy, xz) || 1; xx /= xl; xy /= xl; xz /= xl
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx
  o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0
  o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0
  o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0
  o[12] = -(xx * ex + xy * ey + xz * ez)
  o[13] = -(yx * ex + yy * ey + yz * ez)
  o[14] = -(zx * ex + zy * ey + zz * ez)
  o[15] = 1
  return o
}
function rotY(o: M4, a: number): M4 { ident(o); const c = Math.cos(a), s = Math.sin(a); o[0] = c; o[2] = -s; o[8] = s; o[10] = c; return o }
function rotX(o: M4, a: number): M4 { ident(o); const c = Math.cos(a), s = Math.sin(a); o[5] = c; o[6] = s; o[9] = -s; o[10] = c; return o }
function transl(o: M4, x: number, y: number, z: number): M4 { ident(o); o[12] = x; o[13] = y; o[14] = z; return o }

/* ---------- shaders ---------- */
const V_POINTS = `#version 300 es
in vec3 aPos; in float aSeed;
uniform mat4 uMVP; uniform float uTime; uniform float uSize;
out float vShim; out float vSeed;
void main(){
  vSeed = aSeed;
  vec3 p = aPos;
  p.x += sin(uTime*0.6 + aSeed*6.28)*0.18;
  p.y += cos(uTime*0.5 + aSeed*6.28)*0.18;
  gl_Position = uMVP * vec4(p,1.0);
  gl_PointSize = uSize * (1.0 + aSeed*1.4) * (60.0 / max(gl_Position.w, 0.1));
  vShim = 0.6 + 0.4*sin(uTime*2.0 + aSeed*20.0);
}`
const F_POINTS = `#version 300 es
precision highp float;
uniform vec3 uAmber; uniform vec3 uBone; uniform float uHeat;
in float vShim; in float vSeed;
out vec4 frag;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float m = smoothstep(0.5, 0.05, length(d));
  vec3 c = mix(uBone, uAmber, clamp(step(0.82, vSeed) + uHeat*0.5*step(0.5, vSeed), 0.0, 1.0));
  frag = vec4(c * vShim * 1.35, m * 0.85);
}`
const V_ASCII = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }`
const F_ASCII = `#version 300 es
precision highp float;
uniform sampler2D tScene; uniform sampler2D tGlyph;
uniform vec2 uRes; uniform float uCell; uniform float uGlyphs;
uniform vec3 uInk; uniform vec3 uAmber; uniform float uAberr;
in vec2 vUv; out vec4 frag;
float bayer(vec2 p){
  int x = int(mod(p.x,4.0)); int y = int(mod(p.y,4.0)); int i = x + y*4;
  float m[16]; m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;
  m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
  float v=0.; for(int k=0;k<16;k++){ if(k==i) v=m[k]; } return v/16.;
}
void main(){
  vec2 fr = vUv * uRes;
  vec2 cellId = floor(fr / uCell);
  vec2 cc = (cellId + 0.5) * uCell / uRes;
  float a = uAberr;
  vec3 sc;
  sc.r = texture(tScene, cc + vec2(a,0.)).r;
  sc.g = texture(tScene, cc).g;
  sc.b = texture(tScene, cc - vec2(a,0.)).b;
  float raw = dot(sc, vec3(0.299,0.587,0.114));
  float lum = clamp(pow(raw,0.62)*1.55, 0.0, 1.0);
  lum += (bayer(cellId)-0.5)*0.11; lum = clamp(lum,0.0,1.0);
  float gi = floor(lum*(uGlyphs-0.001));
  vec2 local = fract(fr/uCell);
  vec2 guv = vec2((gi+local.x)/uGlyphs, local.y);
  float glyph = texture(tGlyph, guv).r;
  vec3 col = mix(uInk, uAmber, smoothstep(0.4,0.92,lum));
  col *= glyph * (0.55 + lum*1.0);
  col *= 0.85 + 0.15*sin(fr.y*3.14159);
  vec2 vd = vUv - 0.5; col *= 1.0 - dot(vd,vd)*0.6;
  frag = vec4(col, 1.0);
}`

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src); gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(sh))
  return sh
}
function program(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs))
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p))
  return p
}

export interface Machine {
  setMorph(v: number): void
  setActive(active: boolean): void
  pulse(x: number, y: number): void
  onFps(cb: (fps: number) => void): void
  destroy(): void
}

export function initMachine(canvas: HTMLCanvasElement): Machine | null {
  const ctx = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' })
  if (!ctx) return null
  const gl: WebGL2RenderingContext = ctx

  const dpr = Math.min(devicePixelRatio, 1.75)

  const progP = program(gl, V_POINTS, F_POINTS)
  const progA = program(gl, V_ASCII, F_ASCII)

  // formations
  const forms = FORMS.map((f) => { const a = new Float32Array(COUNT * 3); f(a); return a })
  const cur = new Float32Array(COUNT * 3); cur.set(forms[0])
  const seed = new Float32Array(COUNT)
  for (let i = 0; i < COUNT; i++) seed[i] = Math.random()

  // point VAO
  const vaoP = gl.createVertexArray()!; gl.bindVertexArray(vaoP)
  const posBuf = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
  gl.bufferData(gl.ARRAY_BUFFER, cur, gl.DYNAMIC_DRAW)
  const aPos = gl.getAttribLocation(progP, 'aPos'); gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0)
  const seedBuf = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf)
  gl.bufferData(gl.ARRAY_BUFFER, seed, gl.STATIC_DRAW)
  const aSeed = gl.getAttribLocation(progP, 'aSeed'); gl.enableVertexAttribArray(aSeed)
  gl.vertexAttribPointer(aSeed, 1, gl.FLOAT, false, 0, 0)
  gl.bindVertexArray(null)

  // fullscreen triangle VAO
  const vaoA = gl.createVertexArray()!; gl.bindVertexArray(vaoA)
  const triBuf = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, triBuf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const aA = gl.getAttribLocation(progA, 'aPos'); gl.enableVertexAttribArray(aA)
  gl.vertexAttribPointer(aA, 2, gl.FLOAT, false, 0, 0)
  gl.bindVertexArray(null)

  // scene render target
  const rtTex = gl.createTexture()!
  const fbo = gl.createFramebuffer()!
  function sizeRT(w: number, h: number) {
    gl.bindTexture(gl.TEXTURE_2D, rtTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rtTex, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  // glyph texture
  const glyphTex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, glyphTex)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildGlyphCanvas())
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)

  // uniforms
  const uP = {
    mvp: gl.getUniformLocation(progP, 'uMVP'), time: gl.getUniformLocation(progP, 'uTime'),
    size: gl.getUniformLocation(progP, 'uSize'), amber: gl.getUniformLocation(progP, 'uAmber'),
    bone: gl.getUniformLocation(progP, 'uBone'), heat: gl.getUniformLocation(progP, 'uHeat'),
  }
  const uA = {
    scene: gl.getUniformLocation(progA, 'tScene'), glyph: gl.getUniformLocation(progA, 'tGlyph'),
    res: gl.getUniformLocation(progA, 'uRes'), cell: gl.getUniformLocation(progA, 'uCell'),
    glyphs: gl.getUniformLocation(progA, 'uGlyphs'), ink: gl.getUniformLocation(progA, 'uInk'),
    amber: gl.getUniformLocation(progA, 'uAmber'), aberr: gl.getUniformLocation(progA, 'uAberr'),
  }

  let W = 0, H = 0, rw = 0, rh = 0, cellPx = 0
  function resize() {
    W = innerWidth; H = innerHeight
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr)
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
    rw = canvas.width; rh = canvas.height
    cellPx = (W < 720 ? 6 : 7) * dpr
    sizeRT(rw, rh)
  }
  resize()
  addEventListener('resize', resize)

  // state
  let morph = 0, morphCur = 0, active = true, heat = 0
  const pulses: { t: number }[] = []
  let px = 0, py = 0, tpx = 0, tpy = 0
  addEventListener('pointermove', (e) => {
    tpx = e.clientX / innerWidth - 0.5
    tpy = e.clientY / innerHeight - 0.5
  }, { passive: true })

  function applyMorph(mv: number) {
    const i0 = Math.floor(mv), i1 = Math.min(i0 + 1, FORMS.length - 1), f = mv - i0
    const a = forms[i0], b = forms[i1]
    for (let i = 0; i < COUNT * 3; i++) cur[i] = a[i] + (b[i] - a[i]) * f
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, cur)
  }

  const P = m4(), V = m4(), M = m4(), MV = m4(), MVP = m4(), R = m4(), T = m4()
  let fpsCb: ((n: number) => void) | null = null
  let frames = 0, fpsT = 0, last = performance.now(), t = 0, raf = 0

  const AMBER = [1.0, 0.698, 0.141], BONE = [0.925, 0.898, 0.847], INK = [0.561, 0.533, 0.478]

  function loop(now: number) {
    raf = requestAnimationFrame(loop)
    const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt
    frames++; fpsT += dt
    if (fpsT >= 0.5) { if (fpsCb) fpsCb(Math.round(frames / fpsT)); frames = 0; fpsT = 0 }
    if (!active) return

    morphCur += (morph - morphCur) * Math.min(dt * 3.2, 1)
    if (Math.abs(morph - morphCur) > 0.0004) applyMorph(morphCur)

    let ht = 1 - Math.abs(morphCur - 2); ht = Math.max(0, ht)
    heat += (ht - heat) * Math.min(dt * 2, 1)

    px += (tpx - px) * Math.min(dt * 2.5, 1)
    py += (tpy - py) * Math.min(dt * 2.5, 1)

    // model: translate(heroBias) * rotY * rotX
    const heroBias = 1 - Math.min(morphCur, 1)
    rotY(R, t * 0.06 + px * 0.5)
    rotX(T, -py * 0.35 + Math.sin(t * 0.2) * 0.05)
    mul(M, T, R)
    transl(T, heroBias * 11, heroBias * 1.5, 0)
    mul(M, T, M)

    lookAt(V, px * 6, -py * 4, 34, 0, 0, 0)
    perspective(P, (50 * Math.PI) / 180, W / H, 0.1, 200)
    mul(MV, V, M)
    mul(MVP, P, MV)

    let ab = 0.0012
    for (let i = pulses.length - 1; i >= 0; i--) { pulses[i].t -= dt; if (pulses[i].t <= 0) pulses.splice(i, 1); else ab += 0.004 * pulses[i].t }

    // pass 1 — points → RT (additive)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.viewport(0, 0, rw, rh)
    gl.clearColor(0.043, 0.039, 0.031, 1); gl.clear(gl.COLOR_BUFFER_BIT)
    gl.disable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
    gl.useProgram(progP)
    gl.uniformMatrix4fv(uP.mvp, false, MVP)
    gl.uniform1f(uP.time, t)
    gl.uniform1f(uP.size, 4.6 * dpr)
    gl.uniform3fv(uP.amber, AMBER); gl.uniform3fv(uP.bone, BONE)
    gl.uniform1f(uP.heat, heat)
    gl.bindVertexArray(vaoP)
    gl.drawArrays(gl.POINTS, 0, COUNT)

    // pass 2 — ASCII → screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, rw, rh)
    gl.disable(gl.BLEND)
    gl.useProgram(progA)
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rtTex); gl.uniform1i(uA.scene, 0)
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, glyphTex); gl.uniform1i(uA.glyph, 1)
    gl.uniform2f(uA.res, rw, rh)
    gl.uniform1f(uA.cell, cellPx)
    gl.uniform1f(uA.glyphs, GLYPH_N)
    gl.uniform3fv(uA.ink, INK); gl.uniform3fv(uA.amber, AMBER)
    gl.uniform1f(uA.aberr, ab)
    gl.bindVertexArray(vaoA)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindVertexArray(null)
  }
  raf = requestAnimationFrame(loop)

  return {
    setMorph(v) { morph = Math.max(0, Math.min(FORMS.length - 1, v)) },
    setActive(a) { active = a; if (a) last = performance.now() },
    pulse() { pulses.push({ t: 0.6 }) },
    onFps(cb) { fpsCb = cb },
    destroy() { cancelAnimationFrame(raf); removeEventListener('resize', resize) },
  }
}

import '@fontsource/instrument-serif/latin-400.css'
import '@fontsource/instrument-serif/latin-400-italic.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-600.css'
import './style.css'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import { initMachine, type Machine } from './machine'
import { RM, initCursor, bindScrambles, collectReveals, checkReveals, initReveals } from './fx'
import { CODE, FINDINGS, SCAN_PHASES, WALL_DIST, WALL_NAMES, WALL_FAMS, SEV_LABEL, FEED, CATALOG } from './data'

gsap.registerPlugin(ScrollTrigger)

/* ================= MACHINE ================= */
let machine: Machine | null = null
try {
  if (!RM) machine = initMachine(document.getElementById('machine') as HTMLCanvasElement)
} catch (err) {
  // WebGL can be unavailable/throwing in sandboxed iframes — never let it
  // block the rest of the page from booting.
  console.warn('machine init failed, continuing without it', err)
  machine = null
}
if (!machine) document.body.classList.add('no-gl')

const fpsEl = document.getElementById('fps')
machine?.onFps((n) => { if (fpsEl) fpsEl.textContent = `${n}FPS` })

/* ================= SMOOTH SCROLL ================= */
let lenis: Lenis | null = null
try {
  if (!RM) {
    lenis = new Lenis({ lerp: 0.11, autoRaf: false })
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => lenis!.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
  }
} catch (err) {
  console.warn('lenis init failed, using native scroll', err)
  lenis = null
}
function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true })
  else window.scrollTo({ top: 0, behavior: 'auto' })
}
function scrollToEl(el: Element) {
  if (lenis) lenis.scrollTo(el as HTMLElement, { offset: -20 })
  else el.scrollIntoView()
}

/* ================= ROUTER ================= */
const PAGES = ['home', 'console', 'report', 'detectors']
const rbar = document.getElementById('rbar')!

function parseHash(): { page: string; anchor: string | null } {
  const h = location.hash || '#/'
  if (!h.startsWith('#/')) return { page: 'home', anchor: h.slice(1) }
  const rest = h.slice(2)
  if (rest.startsWith('#')) return { page: 'home', anchor: rest.slice(1) }
  if (PAGES.includes(rest)) return { page: rest, anchor: null }
  return { page: 'home', anchor: null }
}

let scenesBuilt = false

function route(first = false) {
  const r = parseHash()
  document.body.dataset.page = r.page
  document.querySelectorAll<HTMLElement>('section[data-route]').forEach((s) => {
    s.classList.toggle('active', s.dataset.route === r.page)
  })
  document.querySelectorAll<HTMLAnchorElement>('.nav-links a').forEach((a) => {
    const n = a.getAttribute('data-nav') || ''
    a.classList.toggle('on', n === r.page || n === `${r.page}-${r.anchor || ''}`)
  })

  machine?.setActive(r.page === 'home')

  if (!first && !RM) {
    rbar.style.transition = 'none'; rbar.style.width = '0'; rbar.style.opacity = '1'
    void rbar.offsetWidth
    rbar.style.transition = ''; rbar.style.width = '100%'
    setTimeout(() => { rbar.style.opacity = '0'; rbar.style.width = '0' }, 420)
  }

  requestAnimationFrame(() => {
    if (r.page === 'home' && !scenesBuilt) buildScrollScenes()
    ScrollTrigger.refresh()
    if (r.anchor) {
      const el = document.getElementById(r.anchor)
      if (el) setTimeout(() => scrollToEl(el), 80)
    } else {
      scrollToTop()
    }
    collectReveals()
    checkReveals()
  })
}
addEventListener('hashchange', () => route(false))

/* ================= SCAN DEMO (scroll-scrubbed) ================= */
const codearea = document.getElementById('codearea')
const LH = 21, PT = 16, HEAD_H = 46
let scanLines: HTMLElement[] = []
let scanChips: HTMLElement[] = []

function buildScanPanel() {
  if (!codearea) return
  const lamp = document.getElementById('lamp')!
  CODE.forEach((html, i) => {
    const d = document.createElement('div')
    d.className = 'cl'
    d.innerHTML = `<span class="no">${i + 1}</span><span class="cd">${html || ' '}</span>`
    codearea.insertBefore(d, lamp)
  })
  scanLines = Array.from(codearea.querySelectorAll('.cl'))
  const chipbox = document.getElementById('fchips')!
  FINDINGS.forEach((f) => {
    const c = document.createElement('div')
    c.className = `fchip c-${f.sev}`
    c.innerHTML = `${f.chip}<small>${f.sub}</small>`
    c.style.top = `${HEAD_H + PT + f.idx * LH + LH / 2}px`
    chipbox.appendChild(c)
    scanChips.push(c)
  })
}

function driveScan(p: number) {
  const lamp = document.getElementById('lamp')!
  const phase = document.getElementById('scanphase')!
  const led = document.getElementById('scanled')!
  const card = document.getElementById('scancard')!
  const ring = document.getElementById('cardring') as unknown as SVGCircleElement
  const score = document.getElementById('cardscore')!
  const stamp = document.getElementById('stamp')!

  let ph = SCAN_PHASES[0][1]
  for (const [t, s] of SCAN_PHASES) if (p >= t) ph = s
  phase.textContent = ph

  const lp = Math.max(0, Math.min(1, (p - 0.05) / 0.75))
  const li = lp * (CODE.length - 1)
  lamp.style.opacity = p > 0.03 && p < 0.83 ? '1' : '0'
  lamp.style.transform = `translateY(${PT + li * LH + LH / 2 - 18}px)`

  scanLines.forEach((l, i) => l.classList.toggle('lit', Math.abs(i - li) < 0.6))

  let critOn = false
  FINDINGS.forEach((f, k) => {
    const on = li >= f.idx - 0.2
    scanLines[f.idx]?.classList.toggle(`f-${f.sev}`, on)
    scanChips[k]?.classList.toggle('show', on)
    if (f.sev === 'crit' && on) critOn = true
  })

  led.className = 'led' + (p > 0.83 ? '' : critOn ? ' hot' : p > 0.03 ? ' busy' : '')

  const cardOn = p > 0.86
  card.classList.toggle('show', cardOn)
  stamp.classList.toggle('in', p > 0.93)
  const sc = cardOn ? Math.round(58 * Math.min(1, (p - 0.86) / 0.09)) : 0
  score.textContent = String(sc)
  ring.style.transition = 'none'
  ring.style.strokeDashoffset = String(163.4 * (1 - sc / 100))
}

/* ================= SCROLL SCENES (home only) ================= */
function buildScrollScenes() {
  scenesBuilt = true

  const copies = Array.from(document.querySelectorAll<HTMLElement>('.ch-copy'))
  const bars = Array.from(document.querySelectorAll<HTMLElement>('.ch-progress i'))
  ScrollTrigger.create({
    trigger: '#engine',
    start: 'top top',
    end: '+=300%',
    pin: '.ch-stage',
    scrub: true,
    onUpdate(self) {
      const p = self.progress
      machine?.setMorph(p * 3)
      const idx = Math.min(2, Math.floor(p * 3))
      copies.forEach((c, i) => c.classList.toggle('on', i === idx))
      bars.forEach((b, i) => b.classList.toggle('on', i <= idx))
    },
    onLeave() { machine?.setMorph(3) },
    onEnterBack() { machine?.setMorph(2.9) },
  })
  ScrollTrigger.create({
    trigger: '#hero',
    start: 'top top',
    end: 'bottom 40%',
    onEnterBack() { machine?.setMorph(0) },
  })

  ScrollTrigger.create({
    trigger: '#scandemo',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate(self) { driveScan(self.progress) },
  })

  const track = document.getElementById('mqtrack')
  if (track && !RM) {
    track.innerHTML += track.innerHTML
    const tween = gsap.to(track, { xPercent: -50, ease: 'none', duration: 46, repeat: -1 })
    ScrollTrigger.create({
      onUpdate(self) {
        const v = Math.min(Math.abs(self.getVelocity()) / 900, 5)
        gsap.to(tween, { timeScale: 1 + v, duration: 0.2, overwrite: true })
        gsap.to(tween, { timeScale: 1, duration: 1.2, delay: 0.25 })
      },
    })
  }
}

/* ================= DETECTOR WALL ================= */
interface WallCell { el: HTMLElement; sev: string }
const wall = document.getElementById('wall')
const wallCells: WallCell[] = []

function buildWall() {
  if (!wall) return
  const frag = document.createDocumentFragment()
  WALL_DIST.forEach(([sev, count]) => {
    for (let n = 1; n <= count; n++) {
      const code = `${WALL_FAMS[sev]}-${String(n).padStart(2, '0')}`
      const name = WALL_NAMES[sev][(n - 1) % WALL_NAMES[sev].length]
      const c = document.createElement('span')
      c.className = `cell sv-${sev}`
      c.textContent = code
      c.dataset.sev = sev
      c.dataset.cur = `${code} · ${SEV_LABEL[sev]} — ${name.length > 30 ? name.slice(0, 29) + '…' : name}`
      frag.appendChild(c)
      wallCells.push({ el: c, sev })
    }
  })
  wall.appendChild(frag)

  let near: HTMLElement[] = []
  wall.addEventListener('pointermove', (e) => {
    const wr = wall.getBoundingClientRect()
    const first = wallCells[0].el
    const cw = first.offsetWidth + 5, ch = first.offsetHeight + 5
    const cols = Math.max(1, Math.round((wr.width + 5) / cw))
    const col = Math.floor((e.clientX - wr.left) / cw)
    const row = Math.floor((e.clientY - wr.top) / ch)
    const next: HTMLElement[] = []
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const i = (row + dr) * cols + (col + dc)
        if (i >= 0 && i < wallCells.length && !(dr === 0 && dc === 0)) next.push(wallCells[i].el)
      }
    }
    near.forEach((el) => { if (!next.includes(el)) el.classList.remove('near') })
    next.forEach((el) => el.classList.add('near'))
    near = next
  })
  wall.addEventListener('pointerleave', () => { near.forEach((el) => el.classList.remove('near')); near = [] })

  document.getElementById('wallfilter')!.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('.fbtn') as HTMLElement | null
    if (!b) return
    document.querySelectorAll('#wallfilter .fbtn').forEach((x) => x.classList.remove('on'))
    b.classList.add('on')
    const f = b.dataset.f
    let shown = 0
    wallCells.forEach(({ el, sev }) => {
      const hit = f === 'all' || sev === f
      el.classList.toggle('dim', !hit)
      if (hit) shown++
    })
    document.getElementById('wallcount')!.textContent = `${shown} / 247 SHOWN`
  })
}

/* ================= MONITORING FEED ================= */
const termlines = document.getElementById('termlines')
let feedIdx = 0
let feedLive = false

function feedLine() {
  if (!termlines) return
  const item = FEED[feedIdx % FEED.length]
  feedIdx++
  const base = new Date(2026, 6, 17, 3, 11, 44 + feedIdx * 7)
  const hh = String(base.getHours()).padStart(2, '0')
  const mm = String(base.getMinutes()).padStart(2, '0')
  const ss = String(base.getSeconds()).padStart(2, '0')
  const tags: Record<string, string> = { ok: 'OK', med: 'MED', crit: 'CRIT', sys: 'SYS' }
  const d = document.createElement('div')
  d.className = 'tl'
  d.innerHTML = `<span class="tt">${hh}:${mm}:${ss}</span><span class="tg ${item[0]}">${tags[item[0]]}</span><span class="tm">${item[1]}</span>`
  termlines.appendChild(d)
  while (termlines.children.length > 11) termlines.removeChild(termlines.firstChild!)
}

function startFeed() {
  if (feedLive || !termlines || RM) return
  const rc = termlines.getBoundingClientRect()
  if (rc.top < innerHeight && rc.bottom > 0) {
    feedLive = true
    setInterval(() => { if (document.body.dataset.page === 'home') feedLine() }, 1900)
  }
}

/* ================= CATALOG PAGE ================= */
const dtgrid = document.getElementById('dtgrid')
const SEVC: Record<string, string> = {
  crit: 'var(--crit)', high: 'var(--high)', med: 'var(--med)',
  low: 'var(--low)', info: 'var(--info)', gas: 'var(--bone2)',
}

function renderCat() {
  if (!dtgrid) return
  const q = (document.getElementById('dtsearch') as HTMLInputElement).value.toLowerCase()
  const f = (document.querySelector('#dtfilter .fbtn.on') as HTMLElement).dataset.f
  dtgrid.innerHTML = ''
  let shown = 0
  CATALOG.forEach((d) => {
    if (f !== 'all' && d[3] !== f) return
    if (q && !`${d[0]} ${d[1]} ${d[2]}`.toLowerCase().includes(q)) return
    shown++
    const el = document.createElement('div')
    el.className = 'dcard'
    el.innerHTML = `<div class="dcode" style="color:${SEVC[d[3]]}">${d[0]} · ${SEV_LABEL[d[3]]}</div>` +
      `<h4>${d[1]}</h4><p>${d[2]}</p>` +
      `<div class="dtags"><span>${d[4]}</span><span>SOLIDITY</span></div>`
    dtgrid.appendChild(el)
  })
  const more = document.createElement('div')
  more.className = 'dcard more'
  more.innerHTML = `<span>+ ${247 - CATALOG.length} more in the full base →</span>`
  dtgrid.appendChild(more)
  document.getElementById('dtcount')!.textContent =
    `SHOWING ${shown} CURATED OF 247 LIVE DETECTORS${q ? ` · QUERY “${q.toUpperCase()}”` : ''}`
}

function bindCatalog() {
  if (!dtgrid) return
  document.getElementById('dtsearch')!.addEventListener('input', renderCat)
  document.getElementById('dtfilter')!.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('.fbtn') as HTMLElement | null
    if (!b) return
    document.querySelectorAll('#dtfilter .fbtn').forEach((x) => x.classList.remove('on'))
    b.classList.add('on')
    renderCat()
  })
  renderCat()
}

/* ================= CONSOLE MICRO-INTERACTIONS ================= */
function bindConsole() {
  document.querySelectorAll('.cs-new').forEach((box) => {
    box.addEventListener('click', (e) => {
      const o = (e.target as Element).closest('.srcopt')
      if (!o) return
      box.querySelectorAll('.srcopt').forEach((x) => x.classList.remove('sel'))
      o.classList.add('sel')
    })
  })
  const est = document.getElementById('csest')
  const COPY = [
    'EST. <b>~2 MIN</b> · <b>10 CREDITS</b> — COVERED BY FREE TIER',
    'EST. <b>~45 MIN</b> · <b>20 CREDITS</b> — COVERED BY FREE TIER',
    'EST. <b>2–24 H</b> · <b>180 CREDITS</b> — 80 BEYOND FREE TIER',
  ]
  document.querySelectorAll('.tierpick').forEach((tp) => {
    tp.addEventListener('click', (e) => {
      const b = (e.target as Element).closest('button')
      if (!b) return
      Array.from(tp.querySelectorAll('button')).forEach((x, i) => {
        const on = x === b
        x.classList.toggle('on', on)
        if (on && est) est.innerHTML = COPY[i]
      })
    })
  })
}

/* ================= MOBILE MENU ================= */
function bindMenu() {
  const mm = document.getElementById('mmenu')!
  document.getElementById('burger')!.addEventListener('click', () => mm.classList.add('open'))
  document.getElementById('mclose')!.addEventListener('click', () => mm.classList.remove('open'))
  mm.addEventListener('click', (e) => { if ((e.target as Element).tagName === 'A') mm.classList.remove('open') })
}

/* ================= BOOT =================
   Each step is isolated so one failure can't blank the whole page. */
function safe(label: string, fn: () => void) {
  try { fn() } catch (err) { console.warn(`boot step "${label}" failed`, err) }
}
safe('scanPanel', buildScanPanel)
safe('wall', buildWall)
safe('feed', () => { for (let k = 0; k < 6; k++) feedLine() })
safe('catalog', bindCatalog)
safe('console', bindConsole)
safe('menu', bindMenu)
safe('cursor', initCursor)
safe('scrambles', () => bindScrambles())
safe('reveals', initReveals)
setInterval(startFeed, 600)
safe('route', () => route(true))

// Hard safety net: whatever happened above, the page must not stay blank.
if (!document.querySelector('section[data-route].active')) {
  const home = document.querySelector<HTMLElement>('section[data-route="home"]')
  if (home) { home.classList.add('active'); document.body.dataset.page = 'home' }
  document.querySelectorAll<HTMLElement>('.rv').forEach((el) => el.classList.add('in'))
}

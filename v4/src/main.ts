import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'
import './style.css'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { initNetwork, type NetworkFx } from './network'
import { WALL_DIST, WALL_NAMES, WALL_FAMS, SEV_LABEL, FEED, CATALOG } from './data'

gsap.registerPlugin(ScrollTrigger)
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches

/* ================= NETWORK ================= */
let net: NetworkFx | null = null
try {
  if (!RM) net = initNetwork(document.getElementById('net') as HTMLCanvasElement)
} catch (err) { console.warn('network init failed', err); net = null }
if (!net) document.body.classList.add('no-gl')

/* ================= SMOOTH SCROLL ================= */
let lenis: Lenis | null = null
try {
  if (!RM) {
    lenis = new Lenis({ lerp: 0.1, autoRaf: false })
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((t) => lenis!.raf(t * 1000))
    gsap.ticker.lagSmoothing(0)
  }
} catch (err) { console.warn('lenis failed', err); lenis = null }
function scrollTop() {
  // route swaps toggle display → Lenis dimensions go stale; resize before scrolling
  if (lenis) { lenis.resize(); lenis.scrollTo(0, { immediate: true, force: true }) }
  window.scrollTo(0, 0)
}
function scrollToEl(el: Element) {
  if (lenis) { lenis.resize(); lenis.scrollTo(el as HTMLElement, { offset: -20, force: true }) }
  else el.scrollIntoView()
}

/* ================= REVEALS ================= */
const ringsDone = new WeakSet<Element>()
let revealables: HTMLElement[] = []
function collect() {
  revealables = Array.from(document.querySelectorAll<HTMLElement>('section.active .rv, footer .rv'))
  document.querySelectorAll<SVGCircleElement>('section.active .csring').forEach((r) => { if (!ringsDone.has(r)) revealables.push(r as unknown as HTMLElement) })
}
function countUp(el: HTMLElement) {
  if (el.dataset.done) return; el.dataset.done = '1'
  const target = parseInt(el.dataset.count!, 10)
  if (RM) { el.textContent = String(target); return }
  const t0 = performance.now()
  const tick = (t: number) => { const p = Math.min((t - t0) / 1100, 1); el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(tick) }
  requestAnimationFrame(tick)
}
function fillRing(r: SVGCircleElement) {
  if (ringsDone.has(r)) return; ringsDone.add(r)
  const c = 2 * Math.PI * parseFloat(r.getAttribute('r')!)
  r.style.strokeDashoffset = String(c * (1 - parseInt(r.dataset.score!, 10) / 100))
}
function checkReveals() {
  const vh = innerHeight
  for (let i = revealables.length - 1; i >= 0; i--) {
    const el = revealables[i], rc = el.getBoundingClientRect()
    if (rc.top < vh * 0.92 && rc.bottom > -20) {
      if (el.classList.contains('csring')) fillRing(el as unknown as SVGCircleElement)
      else { el.classList.add('in'); el.querySelectorAll<HTMLElement>('[data-count]').forEach(countUp); if (el.dataset.count) countUp(el); el.querySelectorAll<SVGCircleElement>('.csring').forEach(fillRing) }
      revealables.splice(i, 1)
    }
  }
  maybeFeed()
}
addEventListener('scroll', () => requestAnimationFrame(checkReveals), { passive: true })
addEventListener('resize', () => requestAnimationFrame(checkReveals), { passive: true })
setInterval(() => { if (revealables.length) checkReveals() }, 400)

/* ================= ROUTER ================= */
const PAGES = ['home', 'console', 'report', 'detectors']
const rbar = document.getElementById('rbar')!
function parseHash() {
  const h = location.hash || '#/'
  if (!h.startsWith('#/')) return { page: 'home', anchor: h.slice(1) }
  const rest = h.slice(2)
  if (rest.startsWith('#')) return { page: 'home', anchor: rest.slice(1) }
  if (PAGES.includes(rest)) return { page: rest, anchor: null }
  return { page: 'home', anchor: null as string | null }
}
let scenesBuilt = false
function route(first = false) {
  const r = parseHash()
  document.body.dataset.page = r.page
  document.querySelectorAll<HTMLElement>('section[data-route]').forEach((s) => s.classList.toggle('active', s.dataset.route === r.page))
  document.querySelectorAll<HTMLAnchorElement>('.nav-links a').forEach((a) => {
    const n = a.getAttribute('data-nav') || ''
    a.classList.toggle('on', n === r.page || n === `${r.page}-${r.anchor || ''}`)
  })
  if (!first && !RM) {
    rbar.style.transition = 'none'; rbar.style.width = '0'; rbar.style.opacity = '1'; void rbar.offsetWidth
    rbar.style.transition = ''; rbar.style.width = '100%'
    setTimeout(() => { rbar.style.opacity = '0'; rbar.style.width = '0' }, 420)
  }
  const wt = document.getElementById('walltip'); if (wt) wt.style.opacity = '0'
  // reset scroll immediately (before ScrollTrigger.refresh can restore a stale position)
  if (!r.anchor) scrollTop()
  requestAnimationFrame(() => {
    if (r.page === 'home' && !scenesBuilt) buildScenes()
    ScrollTrigger.refresh()
    if (r.anchor) { const el = document.getElementById(r.anchor); if (el) setTimeout(() => scrollToEl(el), 80) }
    else { scrollTop(); requestAnimationFrame(scrollTop) }
    collect(); checkReveals()
  })
}
addEventListener('hashchange', () => route(false))

/* ================= SCROLL SCENES ================= */
const REVEAL_THRESH = [0.14, 0.36, 0.56, 0.74]
function buildScenes() {
  scenesBuilt = true
  const items = Array.from(document.querySelectorAll<HTMLElement>('#revealList li'))
  const counter = document.getElementById('revealN')
  ScrollTrigger.create({
    trigger: '#reveal', start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate(self) {
      const p = self.progress
      net?.setScan(p)
      net?.setScroll(p)
      let n = 0
      items.forEach((li, i) => { const lit = p > REVEAL_THRESH[i]; li.classList.toggle('lit', lit); if (lit) n++ })
      if (counter) counter.textContent = String(n)
    },
  })
  // marquee
  const track = document.getElementById('mqtrack')
  if (track && !RM) {
    track.innerHTML += track.innerHTML
    const tw = gsap.to(track, { xPercent: -50, ease: 'none', duration: 40, repeat: -1 })
    ScrollTrigger.create({ onUpdate(self) {
      const v = Math.min(Math.abs(self.getVelocity()) / 1000, 4)
      gsap.to(tw, { timeScale: 1 + v, duration: 0.2, overwrite: true }); gsap.to(tw, { timeScale: 1, duration: 1.1, delay: 0.25 })
    } })
  }
}

/* ================= DETECTOR WALL ================= */
const wall = document.getElementById('wall')
const wallCells: { el: HTMLElement; sev: string }[] = []
function buildWall() {
  if (!wall) return
  const walltip = document.getElementById('walltip')!
  const frag = document.createDocumentFragment()
  WALL_DIST.forEach(([sev, count]) => {
    for (let n = 1; n <= count; n++) {
      const code = `${WALL_FAMS[sev]}-${String(n).padStart(2, '0')}`
      const name = WALL_NAMES[sev][(n - 1) % WALL_NAMES[sev].length]
      const c = document.createElement('span')
      c.className = `cell sv-${sev}`; c.textContent = code
      c.dataset.sev = sev; c.dataset.name = name
      frag.appendChild(c); wallCells.push({ el: c, sev })
    }
  })
  wall.appendChild(frag)
  const SEVC: Record<string, string> = { crit: 'var(--crit)', high: 'var(--high)', med: 'var(--med)', low: 'var(--low)', info: 'var(--info)', gas: 'var(--ink3)' }
  wall.addEventListener('mousemove', (e) => {
    const t = e.target as HTMLElement
    if (!t.classList.contains('cell')) { walltip.style.opacity = '0'; return }
    walltip.innerHTML = `<b>${t.textContent}</b> · ${t.dataset.name}<div class="tsev" style="color:${SEVC[t.dataset.sev!]}">${SEV_LABEL[t.dataset.sev!]} · runs on every scan</div>`
    walltip.style.opacity = '1'
    walltip.style.left = Math.min(e.clientX + 16, innerWidth - 270) + 'px'
    walltip.style.top = (e.clientY + 18) + 'px'
  })
  wall.addEventListener('mouseleave', () => { walltip.style.opacity = '0' })
  document.getElementById('wallfilter')!.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('.fbtn') as HTMLElement | null; if (!b) return
    document.querySelectorAll('#wallfilter .fbtn').forEach((x) => x.classList.remove('on')); b.classList.add('on')
    const f = b.dataset.f; let shown = 0
    wallCells.forEach(({ el, sev }) => { const hit = f === 'all' || sev === f; el.classList.toggle('dim', !hit); if (hit) shown++ })
    document.getElementById('wallcount')!.textContent = `${shown} / 247 shown`
  })
}

/* ================= FEED ================= */
const termlines = document.getElementById('termlines')
let feedIdx = 0, feedLive = false
function feedLine() {
  if (!termlines) return
  const item = FEED[feedIdx % FEED.length]; feedIdx++
  const base = new Date(2026, 6, 17, 3, 11, 44 + feedIdx * 7)
  const p2 = (n: number) => String(n).padStart(2, '0')
  const tags: Record<string, string> = { ok: 'OK', med: 'MED', crit: 'CRIT', sys: 'SYS' }
  const d = document.createElement('div'); d.className = 'tl'
  d.innerHTML = `<span class="tt">${p2(base.getHours())}:${p2(base.getMinutes())}:${p2(base.getSeconds())}</span><span class="tg ${item[0]}">${tags[item[0]]}</span><span class="tm">${item[1]}</span>`
  termlines.appendChild(d)
  while (termlines.children.length > 11) termlines.removeChild(termlines.firstChild!)
}
function maybeFeed() {
  if (feedLive || !termlines || RM) return
  const rc = termlines.getBoundingClientRect()
  if (rc.top < innerHeight && rc.bottom > 0) { feedLive = true; setInterval(() => { if (document.body.dataset.page === 'home') feedLine() }, 1900) }
}

/* ================= CATALOG ================= */
const dtgrid = document.getElementById('dtgrid')
const SEVC2: Record<string, string> = { crit: 'var(--crit)', high: 'var(--high)', med: 'var(--medink)', low: 'var(--low)', info: 'var(--info)', gas: 'var(--ink3)' }
function renderCat() {
  if (!dtgrid) return
  const q = (document.getElementById('dtsearch') as HTMLInputElement).value.toLowerCase()
  const f = (document.querySelector('#dtfilter .fbtn.on') as HTMLElement).dataset.f
  dtgrid.innerHTML = ''; let shown = 0
  CATALOG.forEach((d) => {
    if (f !== 'all' && d[3] !== f) return
    if (q && !`${d[0]} ${d[1]} ${d[2]}`.toLowerCase().includes(q)) return
    shown++
    const el = document.createElement('div'); el.className = 'dcard'
    el.innerHTML = `<div class="dcode" style="color:${SEVC2[d[3]]}">${d[0]} · ${SEV_LABEL[d[3]]}</div><h4>${d[1]}</h4><p>${d[2]}</p><div class="dtags"><span>${d[4]}</span><span>Solidity</span></div>`
    dtgrid.appendChild(el)
  })
  const more = document.createElement('div'); more.className = 'dcard more'
  more.innerHTML = `<span>+ ${247 - CATALOG.length} more in the full base →</span>`; dtgrid.appendChild(more)
  document.getElementById('dtcount')!.textContent = `Showing ${shown} curated of 247 live detectors${q ? ` · “${q}”` : ''}`
}
function bindCatalog() {
  if (!dtgrid) return
  document.getElementById('dtsearch')!.addEventListener('input', renderCat)
  document.getElementById('dtfilter')!.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('.fbtn') as HTMLElement | null; if (!b) return
    document.querySelectorAll('#dtfilter .fbtn').forEach((x) => x.classList.remove('on')); b.classList.add('on'); renderCat()
  })
  renderCat()
}

/* ================= CONSOLE + MENU ================= */
function bindConsole() {
  document.querySelectorAll('.cs-new').forEach((box) => box.addEventListener('click', (e) => {
    const o = (e.target as Element).closest('.srcopt'); if (!o) return
    box.querySelectorAll('.srcopt').forEach((x) => x.classList.remove('sel')); o.classList.add('sel')
  }))
  const est = document.getElementById('csest')
  const COPY = ['Est. <b>~2 min</b> · <b>10 credits</b> — covered by free tier', 'Est. <b>~45 min</b> · <b>20 credits</b> — covered by free tier', 'Est. <b>2–24 h</b> · <b>180 credits</b> — 80 beyond free tier']
  document.querySelectorAll('.tierpick').forEach((tp) => tp.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('button'); if (!b) return
    Array.from(tp.querySelectorAll('button')).forEach((x, i) => { const on = x === b; x.classList.toggle('on', on); if (on && est) est.innerHTML = COPY[i] })
  }))
}
function bindMenu() {
  const mm = document.getElementById('mmenu')!
  document.getElementById('burger')!.addEventListener('click', () => mm.classList.add('open'))
  document.getElementById('mclose')!.addEventListener('click', () => mm.classList.remove('open'))
  mm.addEventListener('click', (e) => { if ((e.target as Element).tagName === 'A') mm.classList.remove('open') })
}

/* ================= BOOT ================= */
function safe(label: string, fn: () => void) { try { fn() } catch (err) { console.warn(`boot "${label}"`, err) } }
safe('wall', buildWall)
safe('feed', () => { for (let k = 0; k < 6; k++) feedLine() })
safe('catalog', bindCatalog)
safe('console', bindConsole)
safe('menu', bindMenu)
setInterval(maybeFeed, 600)
safe('route', () => route(true))
if (!document.querySelector('section[data-route].active')) {
  const home = document.querySelector<HTMLElement>('section[data-route="home"]')
  if (home) { home.classList.add('active'); document.body.dataset.page = 'home' }
  document.querySelectorAll<HTMLElement>('.rv').forEach((el) => el.classList.add('in'))
}

/* fx — decrypt scramble, reticle cursor, viewport reveals */

const GLYPHS = '▓▒░<>/{}[]#$%&@=+*'

export const RM = matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------- text scramble (decrypt-in) ---------- */
export function scrambleIn(el: HTMLElement, dur = 900) {
  const text = el.dataset.text || el.textContent || ''
  if (RM) { el.textContent = text; return }
  const t0 = performance.now()
  const n = text.length
  function tick(t: number) {
    const p = Math.min((t - t0) / dur, 1)
    const settled = Math.floor(p * n)
    let out = text.slice(0, settled)
    for (let i = settled; i < n; i++) {
      const ch = text[i]
      out += ch === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0]
    }
    el.textContent = out
    if (p < 1) requestAnimationFrame(tick)
    else el.textContent = text
  }
  requestAnimationFrame(tick)
}

export function bindScrambles(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('.scramble-hover').forEach((el) => {
    let busy = false
    el.addEventListener('pointerenter', () => {
      if (busy || RM) return
      busy = true
      scrambleIn(el, 600)
      setTimeout(() => (busy = false), 700)
    })
  })
}

/* ---------- reticle cursor ---------- */
export function initCursor() {
  if (RM || matchMedia('(pointer:coarse)').matches) return
  const c = document.getElementById('cursor')!
  const label = c.querySelector<HTMLElement>('.clabel')!
  const coords = c.querySelector<HTMLElement>('.ccoords')!
  document.body.classList.add('curs-on')

  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y
  let seen = false

  addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY
    if (!seen) { seen = true; x = tx; y = ty }
    const t = (e.target as Element | null)?.closest?.('[data-cur]') as HTMLElement | null
    if (t) {
      label.textContent = t.dataset.cur || ''
      c.classList.add('hot')
    } else {
      c.classList.remove('hot')
    }
  }, { passive: true })

  addEventListener('pointerdown', () => c.classList.add('hot'))
  addEventListener('pointerup', () => {
    // restore based on hover target next move
  })

  const hud = document.getElementById('hudcoords')
  function loop() {
    x += (tx - x) * 0.22
    y += (ty - y) * 0.22
    c.style.transform = `translate(${x}px, ${y}px)`
    coords.textContent = `${Math.round(x)} · ${Math.round(y)}`
    if (hud) hud.textContent = `X ${String(Math.round(tx)).padStart(4, '0')} · Y ${String(Math.round(ty)).padStart(4, '0')}`
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}

/* ---------- viewport reveals (deterministic — no IO lag) ---------- */
let revealables: HTMLElement[] = []
let ringsFilled = new WeakSet<Element>()

export function collectReveals() {
  revealables = Array.from(document.querySelectorAll<HTMLElement>('section.active .rv, footer .rv'))
  document.querySelectorAll<SVGCircleElement>('section.active .csring').forEach((r) => {
    if (!ringsFilled.has(r)) revealables.push(r as unknown as HTMLElement)
  })
}

function countUp(el: HTMLElement) {
  if (el.dataset.done) return
  el.dataset.done = '1'
  const target = parseInt(el.dataset.count!, 10)
  if (RM) { el.textContent = String(target); return }
  const t0 = performance.now()
  function tick(t: number) {
    const p = Math.min((t - t0) / 1100, 1)
    el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))))
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function fillRing(r: SVGCircleElement) {
  if (ringsFilled.has(r)) return
  ringsFilled.add(r)
  const c = 2 * Math.PI * parseFloat(r.getAttribute('r')!)
  const off = c * (1 - parseInt(r.dataset.score!, 10) / 100)
  requestAnimationFrame(() => requestAnimationFrame(() => { r.style.strokeDashoffset = String(off) }))
}

export function checkReveals() {
  const vh = innerHeight
  for (let i = revealables.length - 1; i >= 0; i--) {
    const el = revealables[i]
    const rc = el.getBoundingClientRect()
    if (rc.top < vh * 0.94 && rc.bottom > -20) {
      if (el.classList.contains('csring')) {
        fillRing(el as unknown as SVGCircleElement)
      } else {
        el.classList.add('in')
        el.querySelectorAll<HTMLElement>('[data-count]').forEach(countUp)
        if (el.dataset.count) countUp(el)
        el.querySelectorAll<SVGCircleElement>('.csring').forEach(fillRing)
        el.querySelectorAll<HTMLElement>('.scramble').forEach((s) => {
          if (!s.dataset.played) { s.dataset.played = '1'; scrambleIn(s) }
        })
        if (el.classList.contains('scramble') && !el.dataset.played) {
          el.dataset.played = '1'; scrambleIn(el)
        }
      }
      revealables.splice(i, 1)
    }
  }
}

export function initReveals() {
  addEventListener('scroll', () => requestAnimationFrame(checkReveals), { passive: true })
  addEventListener('resize', () => requestAnimationFrame(checkReveals), { passive: true })
  setInterval(() => { if (revealables.length) checkReveals() }, 400)
}

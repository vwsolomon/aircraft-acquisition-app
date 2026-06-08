'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { LayoutDashboard, PlusCircle, BarChart3, CheckSquare, FileText } from 'lucide-react'

const links = [
  { href: '/', label: 'Pipeline', icon: LayoutDashboard },
  { href: '/import', label: 'Import', icon: PlusCircle },
  { href: '/comparison', label: 'Compare', icon: BarChart3 },
  { href: '/diligence', label: 'Diligence', icon: CheckSquare },
  { href: '/mentor', label: 'Mentor', icon: FileText },
]

export default function Nav() {
  const path = usePathname()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = 1360, H = 220
    canvas.width = W
    canvas.height = H

    function mix(a: number, b: number, t: number) { return a * (1 - t) + b * t }
    function smoothstep(a: number, b: number, t: number) { t = Math.max(0, Math.min(1, (t - a) / (b - a))); return t * t * (3 - 2 * t) }
    function hash(x: number, y: number) { let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h) }
    function noise(x: number, y: number) {
      const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy)
      return mix(mix(hash(ix, iy), hash(ix + 1, iy), ux), mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), ux), uy)
    }
    function fbm(x: number, y: number) {
      let v = 0, a = 0.5, f = 1
      for (let i = 0; i < 5; i++) { v += a * noise(x * f, y * f); a *= 0.5; f *= 2.1 }
      return v
    }

    const img = ctx.createImageData(W, H)
    const d = img.data

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = x / W, ny = y / H
        const t1 = fbm(nx * 2.8, ny * 2.8) * Math.PI * 2
        const t2 = fbm(nx * 2.8 + 5.2, ny * 2.8 + 1.3) * Math.PI * 2
        const t3 = fbm(nx * 1.4 + t1 * 0.3, ny * 1.4 + t2 * 0.3)

        const Lx = 0.28, Ly = 0.65
        const ldx = nx - Lx, ldy = ny - Ly
        const lr = Math.sqrt(ldx * ldx + ldy * ldy * 1.4) + 0.001
        const lAngle = Math.atan2(ldy * 1.2, ldx)
        const lSwirl = lAngle + 1.8 / (lr * 3.5 + 0.5)
        const lField = Math.sin(lSwirl * 1.1 + t3 * 1.2)
        const lWeight = Math.exp(-lr * 2.8)

        const Rx = 0.72, Ry = 0.42
        const rdx = nx - Rx, rdy = ny - Ry
        const rr = Math.sqrt(rdx * rdx + rdy * rdy * 1.4) + 0.001
        const rAngle = Math.atan2(rdy * 1.2, rdx)
        const rSwirl = rAngle - 1.6 / (rr * 3.5 + 0.5)
        const rField = Math.sin(rSwirl * 1.0 + t3 * 1.1)
        const rWeight = Math.exp(-rr * 2.5)

        const bgField = fbm(nx * 1.2 + 0.4, ny * 1.2 + 0.7)
        const totalW = lWeight + rWeight + 0.18
        const lW = lWeight / totalW, rW = rWeight / totalW, bgW = 0.18 / totalW

        const lv = Math.max(0, Math.min(1, lField * 0.5 + 0.5 + t3 * 0.15))
        const lR = mix(mix(140, 255, smoothstep(0, 0.5, lv)), 255, smoothstep(0.5, 1, lv))
        const lG = mix(mix(15, 115, smoothstep(0, 0.5, lv)), 200, smoothstep(0.5, 1, lv))
        const lB = mix(mix(5, 10, smoothstep(0, 0.5, lv)), 100, smoothstep(0.5, 1, lv))

        const rv = Math.max(0, Math.min(1, rField * 0.5 + 0.5 + t3 * 0.12))
        const rR = mix(mix(4, 0, smoothstep(0, 0.5, rv)), 165, smoothstep(0.5, 1, rv))
        const rG = mix(mix(12, 125, smoothstep(0, 0.5, rv)), 220, smoothstep(0.5, 1, rv))
        const rB = mix(mix(45, 210, smoothstep(0, 0.5, rv)), 255, smoothstep(0.5, 1, rv))

        const bgR = mix(5, 12, bgField), bgG = mix(7, 14, bgField), bgB = mix(18, 28, bgField)

        const i4 = (y * W + x) * 4
        d[i4]   = Math.max(0, Math.min(255, Math.round(lR * lW + rR * rW + bgR * bgW)))
        d[i4+1] = Math.max(0, Math.min(255, Math.round(lG * lW + rG * rW + bgG * bgW)))
        d[i4+2] = Math.max(0, Math.min(255, Math.round(lB * lW + rB * rW + bgB * bgW)))
        d[i4+3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)

    // Subtle center glow
    const glow = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, W * 0.3)
    glow.addColorStop(0, 'rgba(255,220,160,0.07)')
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)

    // Climbing letters
    const word = "POSITIVE RATE"
    const letters = word.split('')
    const N = letters.length
    ctx.textBaseline = 'alphabetic'

    const info: any[] = []
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1)
      const ease = t * t * 0.45 + t * 0.55
      const sz = Math.round(34 + (42 - 34) * ease)
      const baseline = 178
      ctx.font = `900 ${sz}px system-ui,-apple-system,sans-serif`
      const w = ctx.measureText(letters[i]).width
      info.push({ l: letters[i], sz, baseline, w, kern: i === 0 ? 0 : 1 + t * 2 })
    }

    let cx = 48
    for (let i = 0; i < N; i++) {
      const { l, sz, baseline, w, kern } = info[i]
      if (i > 0) cx += kern
      ctx.font = `900 ${sz}px system-ui,-apple-system,sans-serif`
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillText(l, cx + 1.5, baseline + 1.5)
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.fillText(l, cx + 3, baseline + 3)
      cx += w
    }

    cx = 48
    for (let i = 0; i < N; i++) {
      const { l, sz, baseline, w, kern } = info[i]
      if (i > 0) cx += kern
      const t = i / (N - 1)
      ctx.font = `900 ${sz}px system-ui,-apple-system,sans-serif`
      ctx.fillStyle = `rgb(${Math.round(mix(255, 210, t))},${Math.round(mix(250, 235, t))},${Math.round(mix(228, 255, t))})`
      ctx.fillText(l, cx, baseline)
      cx += w
    }

    ctx.font = '700 18px system-ui,sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.38)'
    ctx.fillText('AIRCRAFT ACQUISITION PLATFORM', 50, 200)
    ctx.font = 'italic 16px system-ui,sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.fillText("The sky is not the limit — it's just where we begin.", 50, 216)
  }, [])

  return (
    <nav className="sticky top-0 z-50" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: 220 }} />
        <div style={{ position: 'absolute', top: 12, right: 16, display: 'flex', gap: 6 }}>
          {links.map(({ href, label, icon: Icon }) => {
            const active = path === href || (href !== '/' && path.startsWith(href))
            return (
              <Link key={href} href={href} style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 5,
                color: active ? '#ffffff' : 'rgba(255,255,255,0.42)',
                background: active ? '#FF5F1F' : 'rgba(0,0,0,0.25)',
                textDecoration: 'none', transition: 'all 0.15s ease',
                backdropFilter: 'blur(8px)',
                border: active ? 'none' : '1px solid rgba(255,255,255,0.12)',
              }}>
                <Icon size={11} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

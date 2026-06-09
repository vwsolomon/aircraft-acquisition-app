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


    // Draw logo mark after last letter
    const logoImg = new window.Image()
    const g550b64 = 'data:image/png;base64,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'
    logoImg.onload = () => {
      // Draw vortex spirals
      const lx = cx + 14, ly = 173
      ctx.save()

      // Left vortex — orange CW
      ctx.strokeStyle = '#FF5F1F'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.globalAlpha = 0.9
      ctx.beginPath(); ctx.moveTo(lx-22, ly-2); ctx.bezierCurveTo(lx-22,ly-9,lx-16,ly-14,lx-9,ly-14); ctx.bezierCurveTo(lx-2,ly-14,lx+2,ly-8,lx+2,ly-1); ctx.bezierCurveTo(lx+2,ly+6,lx-4,ly+10,lx-11,ly+8); ctx.bezierCurveTo(lx-18,ly+6,lx-20,ly-2,lx-16,ly-8); ctx.stroke()
      ctx.strokeStyle = '#FF8C00'; ctx.lineWidth = 4; ctx.globalAlpha = 0.55
      ctx.beginPath(); ctx.moveTo(lx-22,ly-2); ctx.bezierCurveTo(lx-20,ly+8,lx-12,ly+18,lx-2,ly+20); ctx.bezierCurveTo(lx+8,ly+22,lx+14,ly+12,lx+12,ly); ctx.bezierCurveTo(lx+10,ly-10,lx+2,ly-16,lx-8,ly-12); ctx.stroke()
      ctx.strokeStyle = '#FF5F1F'; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.28
      ctx.beginPath(); ctx.moveTo(lx-22,ly-2); ctx.bezierCurveTo(lx-18,ly+14,lx-8,ly+24,lx+4,ly+24); ctx.bezierCurveTo(lx+16,ly+24,lx+22,ly+12,lx+18,ly-2); ctx.bezierCurveTo(lx+14,ly-14,lx+4,ly-20,lx-6,ly-16); ctx.stroke()

      // Right vortex — cyan CCW
      ctx.strokeStyle = '#00BFFF'; ctx.lineWidth = 3.5; ctx.globalAlpha = 0.9
      ctx.beginPath(); ctx.moveTo(lx+22,ly-2); ctx.bezierCurveTo(lx+22,ly-9,lx+16,ly-14,lx+9,ly-14); ctx.bezierCurveTo(lx+2,ly-14,lx-2,ly-8,lx-2,ly-1); ctx.bezierCurveTo(lx-2,ly+6,lx+4,ly+10,lx+11,ly+8); ctx.bezierCurveTo(lx+18,ly+6,lx+20,ly-2,lx+16,ly-8); ctx.stroke()
      ctx.strokeStyle = '#00D4FF'; ctx.lineWidth = 4; ctx.globalAlpha = 0.55
      ctx.beginPath(); ctx.moveTo(lx+22,ly-2); ctx.bezierCurveTo(lx+20,ly+8,lx+12,ly+18,lx+2,ly+20); ctx.bezierCurveTo(lx-8,ly+22,lx-14,ly+12,lx-12,ly); ctx.bezierCurveTo(lx-10,ly-10,lx-2,ly-16,lx+8,ly-12); ctx.stroke()
      ctx.strokeStyle = '#00BFFF'; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.28
      ctx.beginPath(); ctx.moveTo(lx+22,ly-2); ctx.bezierCurveTo(lx+18,ly+14,lx+8,ly+24,lx-4,ly+24); ctx.bezierCurveTo(lx-16,ly+24,lx-22,ly+12,lx-18,ly-2); ctx.bezierCurveTo(lx-14,ly-14,lx-4,ly-20,lx+6,ly-16); ctx.stroke()

      // G550 silhouette — centered on logo mark, smaller than vortex span
      ctx.globalAlpha = 1
      const planeW = 52, planeH = 14
      ctx.drawImage(logoImg, lx - planeW/2, ly - 20, planeW, planeH)
      ctx.restore()
    }
    logoImg.src = g550b64

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

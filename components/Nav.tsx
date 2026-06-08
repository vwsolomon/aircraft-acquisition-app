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
    const W = 1360, H = 160
    canvas.width = W
    canvas.height = H

    const imageData = ctx.createImageData(W, H)
    const buf = imageData.data

    for (let i = 0; i < W * H * 4; i += 4) {
      buf[i] = 8; buf[i+1] = 10; buf[i+2] = 18; buf[i+3] = 255
    }

    function setPixel(x: number, y: number, r: number, g: number, b: number, a: number) {
      if (x < 0 || x >= W || y < 0 || y >= H) return
      const i = (Math.round(y) * W + Math.round(x)) * 4
      const ea = a / 255, ia = 1 - ea
      buf[i]   = buf[i]   * ia + r * ea
      buf[i+1] = buf[i+1] * ia + g * ea
      buf[i+2] = buf[i+2] * ia + b * ea
      buf[i+3] = Math.min(255, buf[i+3] + a * 0.4)
    }

    function noise(x: number, y: number, seed: number) {
      const s = Math.sin(x * 127.1 + y * 311.7 + seed) * 43758.5453
      return s - Math.floor(s)
    }

    function smoothNoise(x: number, y: number, seed: number) {
      const ix = Math.floor(x), iy = Math.floor(y)
      const fx = x - ix, fy = y - iy
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy)
      return noise(ix,iy,seed)*(1-ux)*(1-uy) + noise(ix+1,iy,seed)*ux*(1-uy) +
             noise(ix,iy+1,seed)*(1-ux)*uy + noise(ix+1,iy+1,seed)*ux*uy
    }

    function fbm(x: number, y: number, seed: number) {
      let v = 0, a = 0.5, f = 1
      for (let i = 0; i < 6; i++) {
        v += a * smoothNoise(x * f, y * f, seed + i * 17)
        a *= 0.5; f *= 2.1
      }
      return v
    }

    function vortexField(px: number, py: number) {
      const lx = W * 0.228, ly = H * 0.74
      const rx = W * 0.772, ry = H * 0.74
      const ldx = px-lx, ldy = py-ly, lr = Math.sqrt(ldx*ldx+ldy*ldy)+1
      const lS = Math.min(16000, 12000/(lr*0.8))
      const rdx = px-rx, rdy = py-ry, rr = Math.sqrt(rdx*rdx+rdy*rdy)+1
      const rS = Math.min(16000, 12000/(rr*0.8))
      return {
        vx: -ldy/lr*lS/lr + rdy/rr*rS/rr,
        vy:  ldx/lr*lS/lr - rdx/rr*rS/rr
      }
    }

    const palette = [
      [255,95,31],[255,140,0],[255,60,10],[0,191,255],
      [0,212,255],[0,140,200],[255,255,255],[255,200,100],
      [100,220,255],[255,120,50]
    ]

    const NUM = 18000
    const particles: any[] = []
    for (let i = 0; i < NUM; i++) {
      const band = noise(i*0.01, i*0.007, 42)
      const colorIdx = Math.floor(band * palette.length) % palette.length
      const bx = (i/NUM)*W*1.1 - W*0.05
      const by = H*0.5 + (noise(i*0.013,0,7)-0.5)*H*1.6
      const angle = fbm(bx/240, by/240, 3) * Math.PI * 4
      const radius = noise(i*0.009, i*0.003, 13)*160
      particles.push({
        x: bx + Math.cos(angle)*radius,
        y: by + Math.sin(angle)*radius,
        color: palette[colorIdx],
        alpha: 160 + noise(i*0.02, i*0.015, 5)*95,
        size: 1.2 + noise(i*0.03, i*0.02, 9)*2.5,
      })
    }

    const STEPS = 20
    for (let step = 0; step < STEPS; step++) {
      const t = step/STEPS
      for (const p of particles) {
        const field = vortexField(p.x, p.y)
        const turb = fbm(p.x/160+t, p.y/160+t, step*3)
        const turbAngle = turb*Math.PI*3
        p.x += field.vx*0.035 + Math.cos(turbAngle)*0.8
        p.y += field.vy*0.035 + Math.sin(turbAngle)*0.8
        const a = p.alpha*(0.3+t*0.7)*(step<4?step/4:1)
        const sz = p.size
        for (let dx = -sz; dx <= sz; dx++) {
          for (let dy = -sz; dy <= sz; dy++) {
            if (dx*dx+dy*dy<=sz*sz) {
              setPixel(p.x+dx, p.y+dy, p.color[0], p.color[1], p.color[2],
                a*(1-Math.sqrt(dx*dx+dy*dy)/sz*0.5))
            }
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)

    // Wake corridor
    const wakeGrad = ctx.createLinearGradient(0,75,W,75)
    wakeGrad.addColorStop(0,'rgba(255,140,0,0)')
    wakeGrad.addColorStop(0.08,'rgba(255,255,255,0.12)')
    wakeGrad.addColorStop(0.5,'rgba(255,255,255,0.18)')
    wakeGrad.addColorStop(0.92,'rgba(0,191,255,0.12)')
    wakeGrad.addColorStop(1,'rgba(0,191,255,0)')
    ctx.fillStyle = wakeGrad
    ctx.beginPath()
    ctx.ellipse(W/2, 72, W/2, 14, 0, 0, Math.PI*2)
    ctx.fill()

    // Jet silhouette
    ctx.save()
    ctx.translate(W/2, 20)
    ctx.fillStyle = 'rgba(255,255,255,0.98)'
    ctx.shadowColor = 'rgba(255,255,255,0.8)'
    ctx.shadowBlur = 8
    ctx.beginPath(); ctx.ellipse(0,0,28,4,0,0,Math.PI*2); ctx.fill()
    ctx.beginPath(); ctx.moveTo(-6,-2); ctx.lineTo(-50,12); ctx.lineTo(-38,14); ctx.lineTo(3,4); ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.moveTo(-6,-2); ctx.lineTo(36,12); ctx.lineTo(24,14); ctx.lineTo(3,4); ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.moveTo(-22,-3); ctx.lineTo(-36,-14); ctx.lineTo(-30,-11); ctx.lineTo(-19,0); ctx.closePath(); ctx.fill()
    ctx.restore()
  }, [])

  return (
    <nav className="sticky top-0 z-50" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: 160 }} />
        <div style={{ position: 'absolute', inset: 0, padding: '0 24px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1.1, textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
              Positive Rate
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '3.5px', marginTop: 4 }}>
              AIRCRAFT ACQUISITION PLATFORM
            </div>
            <div style={{ fontSize: 10, fontStyle: 'italic', color: 'rgba(255,255,255,0.24)', marginTop: 3 }}>
              The sky is not the limit — it&apos;s just where we begin.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {links.map(({ href, label, icon: Icon }) => {
              const active = path === href || (href !== '/' && path.startsWith(href))
              return (
                <Link key={href} href={href} style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5,
                  color: active ? '#ffffff' : 'rgba(255,255,255,0.38)',
                  background: active ? '#FF5F1F' : 'rgba(255,255,255,0.08)',
                  textDecoration: 'none', transition: 'all 0.15s ease',
                }}>
                  <Icon size={11} />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}

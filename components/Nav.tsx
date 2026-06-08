'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plane, LayoutDashboard, PlusCircle, BarChart3, CheckSquare, FileText } from 'lucide-react'

const links = [
  { href: '/', label: 'Pipeline', icon: LayoutDashboard },
  { href: '/import', label: 'Import', icon: PlusCircle },
  { href: '/comparison', label: 'Compare', icon: BarChart3 },
  { href: '/diligence', label: 'Diligence', icon: CheckSquare },
  { href: '/mentor', label: 'Mentor', icon: FileText },
]

export default function Nav() {
  const path = usePathname()
  return (
    <nav style={{ background: 'rgba(6,13,31,0.95)', borderBottom: '1px solid #1e3a5f', backdropFilter: 'blur(12px)' }} className="sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 font-black text-white" style={{ fontSize: 16, letterSpacing: '-0.02em' }}>
            <div style={{ background: 'linear-gradient(135deg, #38bdf8, #6366f1)', borderRadius: 8, padding: '5px 7px' }}>
              <Plane size={14} color="white" />
            </div>
            AeroAcquire
          </Link>
          <div className="flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = path === href || (href !== '/' && path.startsWith(href))
              return (
                <Link key={href} href={href}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    color: active ? '#38bdf8' : '#7fa8cc',
                    background: active ? 'rgba(56,189,248,0.1)' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}>
                  <Icon size={13} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}

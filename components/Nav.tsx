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
    <nav style={{ background: 'rgba(18,18,18,0.97)', borderBottom: '1px solid #2a3a4f', backdropFilter: 'blur(12px)' }} className="sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 font-black" style={{ fontSize: 15, letterSpacing: '-0.02em', color: '#e8eef5', textDecoration: 'none' }}>
            <div style={{ background: 'linear-gradient(135deg, #00A8E8, #4A6FA5)', borderRadius: 8, padding: '5px 7px' }}>
              <Plane size={14} color="white" />
            </div>
            The Horologe Acquisitions
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    color: active ? '#00A8E8' : '#6b82a0',
                    background: active ? 'rgba(0,168,232,0.1)' : 'transparent',
                    transition: 'all 0.15s ease',
                    textDecoration: 'none',
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

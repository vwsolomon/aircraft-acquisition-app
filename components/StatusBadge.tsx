import { AircraftStatus } from '@/lib/types'

const colors: Record<AircraftStatus, { bg: string; color: string }> = {
  'New Lead':           { bg: 'rgba(56,189,248,0.15)',  color: '#38bdf8' },
  'Contacted':          { bg: 'rgba(99,102,241,0.15)',  color: '#818cf8' },
  'Records Requested':  { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
  'Records Received':   { bg: 'rgba(245,158,11,0.2)',   color: '#f59e0b' },
  'Under Review':       { bg: 'rgba(234,179,8,0.15)',   color: '#eab308' },
  'Pre-Buy':            { bg: 'rgba(249,115,22,0.15)',  color: '#fb923c' },
  'Offer':              { bg: 'rgba(168,85,247,0.15)',  color: '#c084fc' },
  'Closed Won':         { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e' },
  'Closed Lost':        { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
}

export default function StatusBadge({ status }: { status: AircraftStatus }) {
  const { bg, color } = colors[status] ?? { bg: 'rgba(100,100,100,0.15)', color: '#999' }
  return (
    <span className="badge" style={{ background: bg, color }}>
      {status}
    </span>
  )
}

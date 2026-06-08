'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Aircraft, AircraftStatus } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import { PlusCircle, Plane, DollarSign, Clock, TrendingUp, ChevronRight } from 'lucide-react'

const STATUSES: AircraftStatus[] = [
  'New Lead','Contacted','Records Requested','Records Received',
  'Under Review','Pre-Buy','Offer','Closed Won','Closed Lost'
]

export default function PipelinePage() {
  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('aircraft')
        .select('*')
        .order('updated_at', { ascending: false })
      setAircraft(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filterStatus === 'all' ? aircraft : aircraft.filter(a => a.status === filterStatus)
  const active = aircraft.filter(a => !['Closed Won','Closed Lost'].includes(a.status))
  const totalValue = active.reduce((s, a) => s + (a.asking_price || 0), 0)
  const avgHours = active.length
    ? Math.round(active.reduce((s, a) => s + (a.airframe_hours || 0), 0) / active.length)
    : 0

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Acquisition Pipeline</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            {active.length} active opportunities
          </p>
        </div>
        <Link href="/import" className="btn-primary">
          <PlusCircle size={15} />
          Import Aircraft
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <span className="stat-value">{active.length}</span>
          <span className="stat-label">Active Leads</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ fontSize: 22 }}>
            {totalValue > 0 ? `$${(totalValue/1000000).toFixed(1)}M` : '—'}
          </span>
          <span className="stat-label">Pipeline Value</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{avgHours > 0 ? avgHours.toLocaleString() : '—'}</span>
          <span className="stat-label">Avg Airframe Hrs</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {aircraft.filter(a => a.status === 'Closed Won').length}
          </span>
          <span className="stat-label">Closed Won</span>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setFilterStatus('all')}
          style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            border: '1px solid',
            borderColor: filterStatus === 'all' ? 'var(--accent)' : 'var(--border)',
            color: filterStatus === 'all' ? 'var(--accent)' : 'var(--text-secondary)',
            background: filterStatus === 'all' ? 'rgba(56,189,248,0.1)' : 'transparent',
            cursor: 'pointer',
          }}>
          All
        </button>
        {STATUSES.slice(0,7).map(s => (
          <button key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              border: '1px solid',
              borderColor: filterStatus === s ? 'var(--accent)' : 'var(--border)',
              color: filterStatus === s ? 'var(--accent)' : 'var(--text-secondary)',
              background: filterStatus === s ? 'rgba(56,189,248,0.1)' : 'transparent',
              cursor: 'pointer',
            }}>
            {s}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 60 }}>
          Loading pipeline...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <Plane size={40} style={{ color: 'var(--text-dim)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No aircraft yet</p>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 6 }}>
            Import your first listing to get started
          </p>
          <Link href="/import" className="btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>
            <PlusCircle size={15} /> Import Aircraft
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(a => (
            <Link key={a.id} href={`/aircraft/${a.id}`}
              style={{ textDecoration: 'none' }}
              className="card card-hover">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(99,102,241,0.2))',
                    border: '1px solid rgba(56,189,248,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Plane size={18} style={{ color: '#38bdf8' }} />
                  </div>
                  <div className="min-w-0">
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 15 }}>
                      {a.year} {a.make} {a.model}
                      {a.registration && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginLeft: 8 }}>
                          {a.registration}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {a.location && <span>{a.location}</span>}
                      {a.airframe_hours && <span> · {a.airframe_hours.toLocaleString()} hrs</span>}
                      {a.seller_name && <span> · {a.seller_name}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {a.asking_price && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8', fontSize: 14 }}>
                      ${a.asking_price.toLocaleString()}
                    </span>
                  )}
                  <StatusBadge status={a.status} />
                  <ChevronRight size={14} style={{ color: 'var(--text-dim)' }} />
                </div>
              </div>
              {a.next_action && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={11} />
                  Next: {a.next_action}
                  {a.next_action_date && <span style={{ color: 'var(--text-dim)' }}>· {a.next_action_date}</span>}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

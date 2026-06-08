'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Aircraft, DiligenceItem } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import { FileText, Printer, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function MentorPage() {
  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  const [diligence, setDiligence] = useState<DiligenceItem[]>([])
  const [expanded, setExpanded] = useState<string[]>([])
  const [mentorNotes, setMentorNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: ac }, { data: dil }] = await Promise.all([
        supabase.from('aircraft').select('*').not('status', 'in', '("Closed Lost")').order('updated_at', { ascending: false }),
        supabase.from('diligence').select('*'),
      ])
      setAircraft(ac || [])
      setDiligence(dil || [])
      setLoading(false)
    }
    load()
  }, [])

  function toggle(id: string) {
    setExpanded(e => e.includes(id) ? e.filter(x => x !== id) : [...e, id])
  }

  function getDiligenceFor(id: string) {
    const items = diligence.filter(d => d.aircraft_id === id)
    const complete = items.filter(d => d.status === 'Complete').length
    const blocked = items.filter(d => d.status === 'Blocked').length
    return { items, complete, total: items.length, blocked }
  }

  function getRiskFlags(a: Aircraft): string[] {
    const flags: string[] = []
    if (!a.serial_number) flags.push('Serial number not documented')
    if (!a.damage_history) flags.push('Damage history not confirmed')
    if (!a.engine_program) flags.push('Engine program status unknown')
    if (!a.annual_due) flags.push('Annual inspection due date missing')
    if (!a.airframe_hours) flags.push('Airframe hours not verified')
    if (a.airframe_hours && a.airframe_hours > 10000) flags.push(`High airframe time: ${a.airframe_hours.toLocaleString()} hrs`)
    return flags
  }

  const activeAircraft = aircraft.filter(a => !['Closed Won','Closed Lost'].includes(a.status))
  const topCandidates = aircraft.filter(a => ['Pre-Buy','Offer','Under Review'].includes(a.status))

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: 60, textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="page-title">Mentor Summary</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            Exportable brief for mentor review
          </p>
        </div>
        <button className="btn-secondary" onClick={() => window.print()}>
          <Printer size={14} /> Print / Export PDF
        </button>
      </div>

      {/* Summary stats */}
      <div className="card mb-6" style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(99,102,241,0.08))', border: '1px solid rgba(56,189,248,0.2)' }}>
        <div className="section-title">Pipeline Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{activeAircraft.length}</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginTop: 4 }}>Active Leads</div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-mono)', color: topCandidates.length > 0 ? '#38bdf8' : 'var(--text-primary)' }}>{topCandidates.length}</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginTop: 4 }}>Top Candidates</div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              {activeAircraft.length > 0
                ? `$${(activeAircraft.reduce((s,a) => s+(a.asking_price||0),0)/1000000).toFixed(1)}M`
                : '—'}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginTop: 4 }}>Pipeline Value</div>
          </div>
        </div>
      </div>

      {/* Aircraft cards */}
      {aircraft.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <FileText size={40} style={{ color: 'var(--text-dim)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No aircraft to summarize</p>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 6 }}>Import aircraft to build your mentor brief</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {aircraft.map(a => {
            const { complete, total, blocked } = getDiligenceFor(a.id)
            const risks = getRiskFlags(a)
            const isExpanded = expanded.includes(a.id)
            const isTop = ['Pre-Buy','Offer'].includes(a.status)

            return (
              <div key={a.id} className="card" style={{ border: isTop ? '1px solid rgba(56,189,248,0.3)' : undefined }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>
                        {a.year} {a.make} {a.model}
                      </span>
                      <StatusBadge status={a.status} />
                      {isTop && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.08em' }}>
                          TOP CANDIDATE
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {a.asking_price && <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 700 }}>${a.asking_price.toLocaleString()}</span>}
                      {a.airframe_hours && <span>{a.airframe_hours.toLocaleString()} hrs</span>}
                      {a.location && <span>{a.location}</span>}
                      {a.seller_name && <span>{a.seller_name}</span>}
                    </div>
                  </div>
                  <button onClick={() => toggle(a.id)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, flexShrink: 0 }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Diligence progress */}
                {total > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: complete === total ? '#22c55e' : '#38bdf8', width: `${(complete/total)*100}%`, borderRadius: 2, transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                      {complete}/{total} diligence
                    </span>
                    {blocked > 0 && (
                      <span style={{ fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <AlertCircle size={10} /> {blocked} blocked
                      </span>
                    )}
                  </div>
                )}

                {/* Risk flags */}
                {risks.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {risks.map(r => (
                      <span key={r} style={{ fontSize: 11, fontWeight: 600, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '2px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle size={9} /> {r}
                      </span>
                    ))}
                  </div>
                )}

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                      {[
                        ['Serial', a.serial_number],
                        ['Registration', a.registration],
                        ['Engine Model', a.engine_model],
                        ['Engine Time', a.engine_time ? `${a.engine_time.toLocaleString()} hrs` : null],
                        ['Engine Program', a.engine_program],
                        ['Damage History', a.damage_history],
                        ['Annual Due', a.annual_due],
                        ['Avionics', a.avionics_notes],
                      ].map(([label, val]) => val ? (
                        <div key={label as string}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 2 }}>{label}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{val}</div>
                        </div>
                      ) : null)}
                    </div>

                    {a.notes && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>Working Notes</div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{a.notes}</p>
                      </div>
                    )}

                    {/* Mentor note input */}
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>Mentor Note</div>
                      <textarea
                        className="input"
                        placeholder="Add a note for your mentor review..."
                        value={mentorNotes[a.id] || ''}
                        onChange={e => setMentorNotes(n => ({ ...n, [a.id]: e.target.value }))}
                        style={{ minHeight: 60 }}
                      />
                    </div>

                    {a.next_action && (
                      <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', fontSize: 13, color: '#38bdf8', fontWeight: 600 }}>
                        Next: {a.next_action} {a.next_action_date && `· ${a.next_action_date}`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

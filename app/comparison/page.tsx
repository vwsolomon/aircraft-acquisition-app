'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Aircraft } from '@/lib/types'
import Link from 'next/link'
import { BarChart3, ExternalLink, Plus, X, Star } from 'lucide-react'

const ROWS = [
  { key: 'asking_price', label: 'Asking Price', format: (v: any) => v ? `$${Number(v).toLocaleString()}` : '—' },
  { key: 'year', label: 'Year', format: (v: any) => v || '—' },
  { key: 'airframe_hours', label: 'Airframe Hours', format: (v: any) => v ? Number(v).toLocaleString() : '—' },
  { key: 'engine_model', label: 'Engine Model', format: (v: any) => v || '—' },
  { key: 'engine_time', label: 'Engine Time (SMOH)', format: (v: any) => v ? Number(v).toLocaleString() : '—' },
  { key: 'engine_program', label: 'Engine Program', format: (v: any) => v || '—' },
  { key: 'prop_time', label: 'Prop Time', format: (v: any) => v ? Number(v).toLocaleString() : '—' },
  { key: 'avionics_notes', label: 'Avionics', format: (v: any) => v || '—' },
  { key: 'damage_history', label: 'Damage History', format: (v: any) => v || '—' },
  { key: 'annual_due', label: 'Annual Due', format: (v: any) => v || '—' },
  { key: 'location', label: 'Location', format: (v: any) => v || '—' },
  { key: 'seller_name', label: 'Seller / Broker', format: (v: any) => v || '—' },
]

// Simple scoring: lower price = better, lower hours = better, etc.
function scoreAircraft(a: Aircraft, all: Aircraft[]): number {
  let score = 100
  const prices = all.map(x => x.asking_price).filter(Boolean) as number[]
  const hours = all.map(x => x.airframe_hours).filter(Boolean) as number[]
  if (a.asking_price && prices.length > 1) {
    const min = Math.min(...prices), max = Math.max(...prices)
    score -= ((a.asking_price - min) / (max - min || 1)) * 25
  }
  if (a.airframe_hours && hours.length > 1) {
    const min = Math.min(...hours), max = Math.max(...hours)
    score -= ((a.airframe_hours - min) / (max - min || 1)) * 25
  }
  if (a.engine_program) score += 10
  if (a.damage_history && /no|clean|none/i.test(a.damage_history)) score += 10
  return Math.max(0, Math.round(score))
}

export default function ComparisonPage() {
  const [allAircraft, setAllAircraft] = useState<Aircraft[]>([])
  const [selected, setSelected] = useState<Aircraft[]>([])
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    supabase.from('aircraft').select('*').order('updated_at', { ascending: false }).then(({ data }) => {
      setAllAircraft(data || [])
    })
  }, [])

  function toggle(a: Aircraft) {
    setSelected(s => s.find(x => x.id === a.id) ? s.filter(x => x.id !== a.id) : [...s, a].slice(0,6))
  }

  const scores = selected.map(a => ({ id: a.id, score: scoreAircraft(a, selected) }))
  const bestScore = Math.max(...scores.map(s => s.score))

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Comparison Table</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            Side-by-side view of up to 6 aircraft
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowPicker(!showPicker)}>
          <Plus size={15} /> Add Aircraft
        </button>
      </div>

      {/* Picker */}
      {showPicker && (
        <div className="card mb-6">
          <div className="section-title">Select Aircraft to Compare</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allAircraft.map(a => {
              const sel = !!selected.find(x => x.id === a.id)
              return (
                <div key={a.id}
                  onClick={() => toggle(a)}
                  style={{
                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                    border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
                    background: sel ? 'rgba(56,189,248,0.08)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                  }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
                    {a.year} {a.make} {a.model}
                    {a.registration && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginLeft: 8 }}>{a.registration}</span>}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {a.asking_price && <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8', fontSize: 13, fontWeight: 700 }}>${a.asking_price.toLocaleString()}</span>}
                    {sel && <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 700 }}>✓ Selected</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {selected.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <BarChart3 size={40} style={{ color: 'var(--text-dim)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No aircraft selected</p>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 6 }}>Add aircraft above to start comparing</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', width: 160, position: 'sticky', left: 0, background: 'var(--bg-primary)', zIndex: 1 }}>
                  Field
                </th>
                {selected.map(a => {
                  const sc = scores.find(s => s.id === a.id)?.score ?? 0
                  const isBest = sc === bestScore && selected.length > 1
                  return (
                    <th key={a.id} style={{ padding: '12px 16px', minWidth: 180, background: 'var(--bg-card)', borderTopLeftRadius: 12, borderTopRightRadius: 12, border: `1px solid ${isBest ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`, borderBottom: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 13 }}>
                            {a.year} {a.make} {a.model}
                          </div>
                          {a.registration && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>{a.registration}</div>}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                            <div style={{
                              padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                              background: isBest ? 'rgba(34,197,94,0.15)' : 'rgba(56,189,248,0.1)',
                              color: isBest ? '#22c55e' : '#38bdf8',
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                              {isBest && <Star size={9} fill="currentColor" />}
                              Score {sc}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => toggle(a)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4 }}>
                          <X size={14} />
                        </button>
                      </div>
                      {a.source_url && (
                        <a href={a.source_url} target="_blank" rel="noopener noreferrer"
                          style={{ marginTop: 8, fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                          <ExternalLink size={10} /> View listing
                        </a>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, ri) => (
                <tr key={row.key}>
                  <td style={{
                    padding: '12px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase', color: 'var(--text-dim)',
                    position: 'sticky', left: 0, background: 'var(--bg-primary)', zIndex: 1,
                    borderTop: '1px solid var(--border)',
                  }}>
                    {row.label}
                  </td>
                  {selected.map(a => {
                    const val = a[row.key as keyof Aircraft]
                    const formatted = row.format(val)
                    const isBest = scores.find(s => s.id === a.id)?.score === bestScore && selected.length > 1
                    return (
                      <td key={a.id} style={{
                        padding: '12px 16px', fontSize: 13, color: formatted === '—' ? 'var(--text-dim)' : 'var(--text-primary)',
                        background: 'var(--bg-card)',
                        borderLeft: `1px solid ${isBest ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
                        borderRight: `1px solid ${isBest ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
                        borderTop: '1px solid var(--border)',
                        fontFamily: ['asking_price','airframe_hours','engine_time','prop_time'].includes(row.key) ? 'var(--font-mono)' : undefined,
                      }}>
                        {formatted}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {/* Bottom border */}
              <tr>
                <td style={{ borderTop: '1px solid var(--border)', padding: 0 }} />
                {selected.map(a => {
                  const isBest = scores.find(s => s.id === a.id)?.score === bestScore && selected.length > 1
                  return (
                    <td key={a.id} style={{ borderTop: '1px solid var(--border)', borderLeft: `1px solid ${isBest ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`, borderRight: `1px solid ${isBest ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`, borderBottom: `1px solid ${isBest ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, padding: '10px 16px' }}>
                      <Link href={`/aircraft/${a.id}`} style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                        View Record →
                      </Link>
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Aircraft, AircraftStatus } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import { ArrowLeft, Edit2, Save, Trash2, ExternalLink, Clock, CheckSquare, Loader2 } from 'lucide-react'

const STATUSES: AircraftStatus[] = [
  'New Lead','Contacted','Records Requested','Records Received',
  'Under Review','Pre-Buy','Offer','Closed Won','Closed Lost'
]

function Field({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  if (!value) return (
    <div>
      <div className="label">{label}</div>
      <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>—</div>
    </div>
  )
  return (
    <div>
      <div className="label">{label}</div>
      <div style={{ color: 'var(--text-primary)', fontSize: 14, fontFamily: mono ? 'var(--font-mono)' : undefined }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="section-title">{children}</div>
}

export default function AircraftPage() {
  const { id } = useParams()
  const router = useRouter()
  const [aircraft, setAircraft] = useState<Aircraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [fields, setFields] = useState<Partial<Aircraft>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('aircraft').select('*').eq('id', id).single()
      setAircraft(data)
      setFields(data || {})
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSave() {
    setSaving(true)
    const { data } = await supabase
      .from('aircraft')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    setAircraft(data)
    setEditing(false)
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this aircraft record? This cannot be undone.')) return
    await supabase.from('aircraft').delete().eq('id', id)
    router.push('/')
  }

  const set = (k: keyof Aircraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFields(f => ({ ...f, [k]: e.target.value }))

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: 60, textAlign: 'center' }}>Loading...</div>
  if (!aircraft) return <div style={{ color: 'var(--text-secondary)', padding: 60, textAlign: 'center' }}>Aircraft not found</div>

  const a = editing ? fields as Aircraft : aircraft

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <ArrowLeft size={14} /> Pipeline
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="page-title">{a.year} {a.make} {a.model}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <StatusBadge status={a.status} />
            {a.registration && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', background: 'rgba(56,189,248,0.1)', padding: '3px 10px', borderRadius: 6 }}>
                {a.registration}
              </span>
            )}
            {a.asking_price && (
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8', fontSize: 16 }}>
                ${a.asking_price.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {a.source_url && (
            <a href={a.source_url} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ textDecoration: 'none' }}>
              <ExternalLink size={13} /> Listing
            </a>
          )}
          <Link href={`/diligence?aircraft=${id}`} className="btn-secondary" style={{ textDecoration: 'none' }}>
            <CheckSquare size={13} /> Diligence
          </Link>
          {!editing ? (
            <button className="btn-primary" onClick={() => setEditing(true)}><Edit2 size={13} /> Edit</button>
          ) : (
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
            </button>
          )}
          <button onClick={handleDelete} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', background: 'transparent', cursor: 'pointer' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <SectionTitle>Deal Info</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div><label className="label">Status</label><select className="input" value={fields.status} onChange={set('status')}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
              <div><label className="label">Asking Price</label><input className="input" value={fields.asking_price ?? ''} onChange={set('asking_price')} /></div>
              <div><label className="label">Make</label><input className="input" value={fields.make ?? ''} onChange={set('make')} /></div>
              <div><label className="label">Model</label><input className="input" value={fields.model ?? ''} onChange={set('model')} /></div>
              <div><label className="label">Year</label><input className="input" value={fields.year ?? ''} onChange={set('year')} /></div>
              <div><label className="label">Serial Number</label><input className="input" value={fields.serial_number ?? ''} onChange={set('serial_number')} /></div>
              <div><label className="label">Registration</label><input className="input" value={fields.registration ?? ''} onChange={set('registration')} /></div>
              <div><label className="label">Location</label><input className="input" value={fields.location ?? ''} onChange={set('location')} /></div>
              <div><label className="label">Seller / Broker</label><input className="input" value={fields.seller_name ?? ''} onChange={set('seller_name')} /></div>
              <div><label className="label">Seller Contact</label><input className="input" value={fields.seller_contact ?? ''} onChange={set('seller_contact')} /></div>
            </div>
          </div>

          <div className="card">
            <SectionTitle>Airframe & Engines</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div><label className="label">Airframe Hours</label><input className="input" value={fields.airframe_hours ?? ''} onChange={set('airframe_hours')} /></div>
              <div><label className="label">Cycles</label><input className="input" value={fields.cycles ?? ''} onChange={set('cycles')} /></div>
              <div><label className="label">Engine Model</label><input className="input" value={fields.engine_model ?? ''} onChange={set('engine_model')} /></div>
              <div><label className="label">Engine Serial</label><input className="input" value={fields.engine_serial ?? ''} onChange={set('engine_serial')} /></div>
              <div><label className="label">Engine Time (SMOH)</label><input className="input" value={fields.engine_time ?? ''} onChange={set('engine_time')} /></div>
              <div><label className="label">Engine Program</label><input className="input" value={fields.engine_program ?? ''} onChange={set('engine_program')} /></div>
              <div><label className="label">Prop Model</label><input className="input" value={fields.prop_model ?? ''} onChange={set('prop_model')} /></div>
              <div><label className="label">Prop Time</label><input className="input" value={fields.prop_time ?? ''} onChange={set('prop_time')} /></div>
            </div>
          </div>

          <div className="card">
            <SectionTitle>Avionics</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div><label className="label">Autopilot</label><input className="input" value={fields.autopilot ?? ''} onChange={set('autopilot')} placeholder="e.g. Garmin GFC 700, KAP 140" /></div>
              <div><label className="label">GPS / Nav System</label><input className="input" value={fields.gps_nav ?? ''} onChange={set('gps_nav')} placeholder="e.g. Garmin GTN 750Xi" /></div>
              <div><label className="label">ADS-B</label><input className="input" value={fields.ads_b ?? ''} onChange={set('ads_b')} placeholder="e.g. In/Out, Out only, None" /></div>
              <div><label className="label">TAWS / Terrain</label><input className="input" value={fields.taws ?? ''} onChange={set('taws')} placeholder="e.g. Garmin TAWS-B" /></div>
              <div><label className="label">Traffic System</label><input className="input" value={fields.traffic_system ?? ''} onChange={set('traffic_system')} placeholder="e.g. Garmin TAS, Avidyne TAS600" /></div>
              <div><label className="label">Weather System</label><input className="input" value={fields.weather_system ?? ''} onChange={set('weather_system')} placeholder="e.g. XM Weather, Stormscope" /></div>
              <div><label className="label">Engine Monitor</label><input className="input" value={fields.engine_monitor ?? ''} onChange={set('engine_monitor')} placeholder="e.g. JPI EDM 930, Garmin EIS" /></div>
            </div>
            <div style={{ marginTop: 16 }}><label className="label">Additional Avionics Notes</label><textarea className="input" value={fields.avionics_notes ?? ''} onChange={set('avionics_notes')} placeholder="Any other avionics equipment..." /></div>
          </div>

          <div className="card">
            <SectionTitle>Condition & History</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div><label className="label">Damage History</label><input className="input" value={fields.damage_history ?? ''} onChange={set('damage_history')} placeholder="e.g. None reported" /></div>
              <div><label className="label">Prop Strike History</label><input className="input" value={fields.prop_strike_history ?? ''} onChange={set('prop_strike_history')} placeholder="e.g. None, or describe event" /></div>
              <div><label className="label">Accident / Incident History</label><input className="input" value={fields.accident_history ?? ''} onChange={set('accident_history')} placeholder="e.g. NTSB clean, or describe" /></div>
              <div><label className="label">Annual Due</label><input className="input" value={fields.annual_due ?? ''} onChange={set('annual_due')} /></div>
              <div><label className="label">Next Action</label><input className="input" value={fields.next_action ?? ''} onChange={set('next_action')} /></div>
              <div><label className="label">Next Action Date</label><input className="input" type="date" value={fields.next_action_date ?? ''} onChange={set('next_action_date')} /></div>
            </div>
            <div style={{ marginTop: 16 }}><label className="label">Interior Notes</label><textarea className="input" value={fields.interior_notes ?? ''} onChange={set('interior_notes')} /></div>
            <div style={{ marginTop: 12 }}><label className="label">Notes</label><textarea className="input" value={fields.notes ?? ''} onChange={set('notes')} /></div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <SectionTitle>Deal Info</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
              <Field label="Make" value={a.make} />
              <Field label="Model" value={a.model} />
              <Field label="Year" value={a.year} />
              <Field label="Serial Number" value={a.serial_number} mono />
              <Field label="Registration" value={a.registration} mono />
              <Field label="Asking Price" value={a.asking_price ? `$${a.asking_price.toLocaleString()}` : null} />
              <Field label="Location" value={a.location} />
              <Field label="Seller / Broker" value={a.seller_name} />
              <Field label="Seller Contact" value={a.seller_contact} />
            </div>
          </div>

          <div className="card">
            <SectionTitle>Airframe & Engines</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
              <Field label="Airframe Hours" value={a.airframe_hours} />
              <Field label="Cycles" value={a.cycles} />
              <Field label="Engine Model" value={a.engine_model} />
              <Field label="Engine Serial" value={a.engine_serial} mono />
              <Field label="Engine Time (SMOH)" value={a.engine_time} />
              <Field label="Engine Program" value={a.engine_program} />
              <Field label="Prop Model" value={a.prop_model} />
              <Field label="Prop Time" value={a.prop_time} />
            </div>
          </div>

          <div className="card">
            <SectionTitle>Avionics</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
              <Field label="Autopilot" value={a.autopilot} />
              <Field label="GPS / Nav System" value={a.gps_nav} />
              <Field label="ADS-B" value={a.ads_b} />
              <Field label="TAWS / Terrain" value={a.taws} />
              <Field label="Traffic System" value={a.traffic_system} />
              <Field label="Weather System" value={a.weather_system} />
              <Field label="Engine Monitor" value={a.engine_monitor} />
              <Field label="Additional Avionics" value={a.avionics_notes} />
            </div>
          </div>

          <div className="card">
            <SectionTitle>Condition & History</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <Field label="Damage History" value={a.damage_history} />
              <Field label="Prop Strike History" value={a.prop_strike_history} />
              <Field label="Accident / Incident History" value={a.accident_history} />
              <Field label="Annual Due" value={a.annual_due} />
              <Field label="Interior" value={a.interior_notes} />
            </div>
          </div>

          {(a.next_action || a.notes) && (
            <div className="card">
              <SectionTitle>Actions & Notes</SectionTitle>
              {a.next_action && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}>
                  <Clock size={13} style={{ color: '#38bdf8' }} />
                  <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: 13 }}>Next: {a.next_action}</span>
                  {a.next_action_date && <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>· {a.next_action_date}</span>}
                </div>
              )}
              {a.notes && <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{a.notes}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

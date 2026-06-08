'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Aircraft, AircraftStatus } from '@/lib/types'
import { Link2, Loader2, AlertCircle, Save, RefreshCw } from 'lucide-react'

type ParsedField = { value: string | number | null; confidence: 'high' | 'medium' | 'low' | 'missing' }
type ParsedAircraft = Partial<Record<keyof Aircraft, ParsedField>>

const STATUSES: AircraftStatus[] = [
  'New Lead','Contacted','Records Requested','Records Received',
  'Under Review','Pre-Buy','Offer','Closed Won','Closed Lost'
]

function ConfidenceDot({ confidence }: { confidence: string }) {
  const colors: Record<string, string> = { high: '#22c55e', medium: '#f59e0b', low: '#ef4444', missing: '#3d6080' }
  return <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: colors[confidence] ?? '#3d6080', marginRight: 6, flexShrink: 0 }} title={confidence} />
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ gridColumn: '1 / -1', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
      {children}
    </div>
  )
}

const IMPORT_FIELDS = [
  { section: 'Identity & Deal' },
  { key: 'make', label: 'Make' },
  { key: 'model', label: 'Model' },
  { key: 'year', label: 'Year' },
  { key: 'serial_number', label: 'Serial Number' },
  { key: 'registration', label: 'Registration' },
  { key: 'asking_price', label: 'Asking Price' },
  { key: 'location', label: 'Location' },
  { key: 'seller_name', label: 'Seller / Broker' },
  { section: 'Airframe & Engines' },
  { key: 'airframe_hours', label: 'Airframe Hours' },
  { key: 'engine_model', label: 'Engine Model' },
  { key: 'engine_time', label: 'Engine Time (SMOH)' },
  { key: 'engine_program', label: 'Engine Program' },
  { key: 'prop_model', label: 'Prop Model' },
  { key: 'prop_time', label: 'Prop Time' },
  { section: 'Avionics' },
  { key: 'autopilot', label: 'Autopilot' },
  { key: 'gps_nav', label: 'GPS / Nav System' },
  { key: 'ads_b', label: 'ADS-B' },
  { key: 'taws', label: 'TAWS / Terrain' },
  { key: 'traffic_system', label: 'Traffic System' },
  { key: 'weather_system', label: 'Weather System' },
  { key: 'engine_monitor', label: 'Engine Monitor' },
  { key: 'avionics_notes', label: 'Additional Avionics' },
  { section: 'Condition & History' },
  { key: 'damage_history', label: 'Damage History' },
  { key: 'prop_strike_history', label: 'Prop Strike History' },
  { key: 'accident_history', label: 'Accident / Incident History' },
  { key: 'annual_due', label: 'Annual Due' },
]

const CRITICAL_FIELDS = ['serial_number','airframe_hours','engine_model','damage_history','annual_due','prop_strike_history','accident_history']

export default function ImportPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState<ParsedAircraft | null>(null)
  const [rawSnapshot, setRawSnapshot] = useState('')
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [saving, setSaving] = useState(false)
  const [fields, setFields] = useState<Partial<Aircraft>>({})

  async function handleImport() {
    if (!url.trim()) return
    setLoading(true)
    setError('')
    setWarning('')
    setParsed(null)
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setParsed(data.parsed)
      setRawSnapshot(data.snapshot || '')
      if (data.warning) setWarning(data.warning)
      const flat: Partial<Aircraft> = { status: 'New Lead', source_url: url }
      for (const [k, v] of Object.entries(data.parsed)) {
        const key = k as keyof Aircraft
        if ((v as ParsedField).value !== null) {
          // @ts-ignore
          flat[key] = (v as ParsedField).value
        }
      }
      setFields(flat)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const confidence: Record<string, string> = {}
      if (parsed) {
        for (const [k, v] of Object.entries(parsed)) {
          confidence[k] = (v as ParsedField).confidence
        }
      }
      const { data, error: err } = await supabase
        .from('aircraft')
        .insert([{ ...fields, raw_snapshot: rawSnapshot, import_confidence: confidence, updated_at: new Date().toISOString() }])
        .select()
        .single()
      if (err) throw err
      router.push(`/aircraft/${data.id}`)
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  const missingCriticals = parsed
    ? Object.entries(parsed).filter(([k, v]) => CRITICAL_FIELDS.includes(k) && (v as ParsedField).confidence === 'missing')
    : []

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="mb-8">
        <h1 className="page-title">Import Listing</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          Paste a listing URL — the app extracts aircraft fields for your review
        </p>
      </div>

      <div className="card mb-6">
        <label className="label">Listing URL</label>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Link2 size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input className="input" style={{ paddingLeft: 34 }} placeholder="https://www.controller.com/listings/..." value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleImport()} />
          </div>
          <button className="btn-primary" onClick={handleImport} disabled={loading || !url.trim()}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : 'Import'}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
        {warning && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={14} /> {warning}
          </div>
        )}
      </div>

      {missingCriticals.length > 0 && (
        <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: 13, marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
            <AlertCircle size={14} /> Missing critical fields — verify before saving
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {missingCriticals.map(([k]) => (
              <span key={k} style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                {k.replace(/_/g,' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {parsed && (
        <div className="card mb-6">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div className="section-title" style={{ margin: 0 }}>Review Extracted Fields</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-dim)' }}>
              <span><ConfidenceDot confidence="high" />High</span>
              <span><ConfidenceDot confidence="medium" />Medium</span>
              <span><ConfidenceDot confidence="missing" />Missing</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {IMPORT_FIELDS.map((f, i) => {
              if ('section' in f) return <SectionHeader key={i}>{f.section}</SectionHeader>
              const pf = parsed[f.key as keyof Aircraft] as ParsedField | undefined
              const conf = pf?.confidence ?? 'missing'
              return (
                <div key={f.key}>
                  <label className="label" style={{ display: 'flex', alignItems: 'center' }}>
                    <ConfidenceDot confidence={conf} />{f.label}
                  </label>
                  <input
                    className="input"
                    value={(fields[f.key as keyof Aircraft] as string) ?? ''}
                    onChange={e => setFields(flds => ({ ...flds, [f.key]: e.target.value }))}
                    placeholder={conf === 'missing' ? 'Not found in listing' : ''}
                    style={{ borderColor: conf === 'missing' && CRITICAL_FIELDS.includes(f.key) ? 'rgba(245,158,11,0.4)' : undefined }}
                  />
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label">Pipeline Status</label>
              <select className="input" value={fields.status ?? 'New Lead'} onChange={e => setFields(f => ({ ...f, status: e.target.value as AircraftStatus }))}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Next Action</label>
              <input className="input" value={fields.next_action ?? ''} onChange={e => setFields(f => ({ ...f, next_action: e.target.value }))} placeholder="e.g. Request maintenance logs" />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label className="label">Notes</label>
            <textarea className="input" value={fields.notes ?? ''} onChange={e => setFields(f => ({ ...f, notes: e.target.value }))} placeholder="Your notes about this aircraft..." />
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => { setParsed(null); setUrl('') }}>
              <RefreshCw size={13} /> Start Over
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Aircraft Record
            </button>
          </div>
        </div>
      )}

      {!parsed && !loading && (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>or</p>
          <button className="btn-secondary" style={{ marginTop: 12 }} onClick={() => { setParsed({} as ParsedAircraft); setFields({ status: 'New Lead' }) }}>
            Enter aircraft manually
          </button>
        </div>
      )}
    </div>
  )
}

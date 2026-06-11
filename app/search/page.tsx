'use client'
import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Search, Loader2, Copy, Check, Download, Save,
  AlertTriangle, ExternalLink, ChevronUp, ChevronDown,
  ChevronsUpDown, Filter, Sparkles, Mail, BookOpen
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AircraftResult {
  id: string
  source: string
  tail: string | null
  sn: string | null
  year: number | null
  aftt: number | null
  asking_price: number | null
  engine_program: string | null
  last_inspection: string | null
  interior: string | null
  paint_year: number | null
  broker_name: string | null
  broker_contact: string | null
  url: string | null
  score: number
  budget_fit: 'fit' | 'close' | 'over'
  flags: string[]
  location: string | null
}

interface EmailResult {
  id: string
  tail: string
  subject: string
  body: string
}

interface SearchResults {
  aircraft: AircraftResult[]
  emails: EmailResult[]
  mentor_brief: string
}

interface SourceStatus {
  key: string
  label: string
  state: 'idle' | 'searching' | 'done'
  count: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PRIORITY_CHIPS = [
  'Low Engine Time',
  'Nice Interior',
  'TAP Blue',
  'Recent Paint',
  'Fresh Inspection',
  'Low Cycles',
  'US Based',
  'One Owner',
]

const SOURCES: SourceStatus[] = [
  { key: 'controller', label: 'Controller.com', state: 'idle', count: 0 },
  { key: 'avbuyer', label: 'AvBuyer', state: 'idle', count: 0 },
  { key: 'aircraftexchange', label: 'AircraftExchange', state: 'idle', count: 0 },
  { key: 'trade-a-plane', label: 'Trade-A-Plane', state: 'idle', count: 0 },
  { key: 'jetaviva', label: 'JetAVIVA', state: 'idle', count: 0 },
]

const TABLE_COLS: { key: keyof AircraftResult | 'aircraft'; label: string; mono?: boolean }[] = [
  { key: 'aircraft', label: 'Aircraft / Tail' },
  { key: 'year', label: 'Year', mono: true },
  { key: 'aftt', label: 'AFTT', mono: true },
  { key: 'asking_price', label: 'Asking Price', mono: true },
  { key: 'engine_program', label: 'Engine Program' },
  { key: 'last_inspection', label: 'Last Insp.' },
  { key: 'interior', label: 'Interior' },
  { key: 'paint_year', label: 'Paint', mono: true },
  { key: 'score', label: 'Score', mono: true },
  { key: 'broker_name', label: 'Broker' },
  { key: 'url', label: 'Listing' },
]

// ─── Small helpers ────────────────────────────────────────────────────────────

function fmt$( v: number | null ) {
  if (!v) return '—'
  return '$' + v.toLocaleString()
}

function BudgetTag({ fit }: { fit: 'fit' | 'close' | 'over' }) {
  const map = {
    fit: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'FIT' },
    close: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'CLOSE' },
    over: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'OVER' },
  }
  const s = map[fit]
  return (
    <span style={{ background: s.bg, color: s.color, padding: '1px 7px', borderRadius: 20, fontSize: 9, fontWeight: 800, letterSpacing: '0.08em' }}>
      {s.label}
    </span>
  )
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', border: `2px solid ${color}`, color, fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13 }}>
      {score}
    </span>
  )
}

function FlagChip({ flag }: { flag: string }) {
  const labels: Record<string, string> = {
    damage_history: 'Damage',
    bird_strike: 'Bird Strike',
    aoc_operation: 'AOC Ops',
    high_cycles: 'Hi Cycles',
    no_engine_program: 'No Eng. Prog.',
    old_paint: 'Old Paint',
  }
  return (
    <span style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', padding: '1px 7px', borderRadius: 20, fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <AlertTriangle size={8} />{labels[flag] || flag}
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: copied ? '#22c55e' : 'var(--text-dim)', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SearchPage() {
  // Form
  const [aircraftType, setAircraftType] = useState('')
  const [budget, setBudget] = useState('')
  const [maxHours, setMaxHours] = useState('')
  const [location, setLocation] = useState('')
  const [priorities, setPriorities] = useState<string[]>([])

  // Search state
  const [isSearching, setIsSearching] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [sources, setSources] = useState<SourceStatus[]>(SOURCES.map(s => ({ ...s })))
  const [results, setResults] = useState<SearchResults | null>(null)
  const [searchError, setSearchError] = useState('')

  // Table state
  const [sortBy, setSortBy] = useState<string>('score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filterBudget, setFilterBudget] = useState<string>('all')
  const [filterEngineProgram, setFilterEngineProgram] = useState(false)
  const [filterMaxPrice, setFilterMaxPrice] = useState('')
  const [filterMaxHours, setFilterMaxHours] = useState('')

  // Save state
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  const printRef = useRef<HTMLDivElement>(null)

  function togglePriority(p: string) {
    setPriorities(ps => ps.includes(p) ? ps.filter(x => x !== p) : [...ps, p])
  }

  function resetSources() {
    setSources(SOURCES.map(s => ({ ...s, state: 'idle', count: 0 })))
  }

  const handleSearch = useCallback(async () => {
    if (!aircraftType.trim() || !budget.trim()) return
    setIsSearching(true)
    setIsAnalyzing(false)
    setResults(null)
    setSearchError('')
    setSaved(false)
    setSaveError('')
    resetSources()

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aircraft_type: aircraftType, budget, max_hours: maxHours, location, priorities }),
      })

      if (!response.body) throw new Error('No response stream')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const msg = JSON.parse(line.slice(6))
            if (msg.type === 'status') {
              setSources(prev => prev.map(s =>
                s.key === msg.source
                  ? { ...s, state: msg.state, count: msg.count ?? s.count }
                  : s
              ))
            } else if (msg.type === 'analyzing') {
              setIsAnalyzing(true)
            } else if (msg.type === 'results') {
              setResults(msg.data)
              setIsAnalyzing(false)
            } else if (msg.type === 'error') {
              setSearchError(msg.message)
            }
          } catch {
            // malformed line, skip
          }
        }
      }
    } catch (e: any) {
      setSearchError(e.message)
    } finally {
      setIsSearching(false)
      setIsAnalyzing(false)
    }
  }, [aircraftType, budget, maxHours, location, priorities])

  async function handleSave() {
    if (!results) return
    setSaving(true)
    setSaveError('')
    try {
      const { data: search, error: searchErr } = await supabase
        .from('aircraft_searches')
        .insert([{
          aircraft_type: aircraftType,
          budget,
          priorities: priorities,
          results: results.aircraft,
          emails: results.emails,
          mentor_brief: results.mentor_brief,
        }])
        .select()
        .single()

      if (searchErr) throw searchErr

      const leads = results.aircraft.map(a => ({
        search_id: search.id,
        tail: a.tail,
        sn: a.sn,
        year: a.year,
        tt: a.aftt,
        price: a.asking_price,
        engine_program: a.engine_program,
        last_inspection: a.last_inspection,
        interior: a.interior,
        paint: a.paint_year ? String(a.paint_year) : null,
        score: a.score,
        broker: a.broker_name,
        broker_contact: a.broker_contact,
        url: a.url,
        budget_fit: a.budget_fit,
        flags: a.flags,
      }))

      if (leads.length > 0) {
        const { error: leadsErr } = await supabase.from('aircraft_leads').insert(leads)
        if (leadsErr) throw leadsErr
      }

      setSaved(true)
    } catch (e: any) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Sorting + filtering
  const filteredAircraft = (results?.aircraft ?? []).filter(a => {
    if (filterBudget !== 'all' && a.budget_fit !== filterBudget) return false
    if (filterEngineProgram && !a.engine_program) return false
    if (filterMaxPrice && a.asking_price && a.asking_price > parseFloat(filterMaxPrice.replace(/[^0-9.]/g, '')) * (filterMaxPrice.toLowerCase().includes('m') ? 1000000 : 1)) return false
    if (filterMaxHours && a.aftt && a.aftt > parseInt(filterMaxHours)) return false
    return true
  })

  const sortedAircraft = [...filteredAircraft].sort((a, b) => {
    let av: any = a[sortBy as keyof AircraftResult]
    let bv: any = b[sortBy as keyof AircraftResult]
    if (av === null || av === undefined) av = sortDir === 'asc' ? Infinity : -Infinity
    if (bv === null || bv === undefined) bv = sortDir === 'asc' ? Infinity : -Infinity
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  function handleSort(col: string) {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortDir('desc')
    }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortBy !== col) return <ChevronsUpDown size={11} style={{ color: 'var(--text-dim)', opacity: 0.5 }} />
    return sortDir === 'desc'
      ? <ChevronDown size={11} style={{ color: 'var(--accent)' }} />
      : <ChevronUp size={11} style={{ color: 'var(--accent)' }} />
  }

  const anySearching = isSearching || isAnalyzing
  const totalFound = sources.reduce((s, src) => s + src.count, 0)

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div ref={printRef}>
      <div className="mb-8">
        <h1 className="page-title">Aircraft Search</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          Live search across 5 marketplaces — scored, flagged, and ready to act on
        </p>
      </div>

      {/* ── Search Form ── */}
      <div className="card mb-6">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 14 }}>
          <div>
            <label className="label">Aircraft Type</label>
            <input className="input" placeholder="e.g. Citation CJ1+" value={aircraftType} onChange={e => setAircraftType(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>
          <div>
            <label className="label">Budget</label>
            <input className="input" placeholder="e.g. $2.2M" value={budget} onChange={e => setBudget(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>
          <div>
            <label className="label">Max Hours</label>
            <input className="input" placeholder="e.g. 4000" value={maxHours} onChange={e => setMaxHours(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>
          <div>
            <label className="label">Location Pref.</label>
            <input className="input" placeholder="e.g. Southeast US" value={location} onChange={e => setLocation(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>
        </div>

        {/* Priority chips */}
        <div style={{ marginTop: 16 }}>
          <label className="label">Priorities (select to score)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {PRIORITY_CHIPS.map(p => {
              const active = priorities.includes(p)
              return (
                <button key={p} onClick={() => togglePriority(p)} style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  border: `1px solid ${active ? '#FF5F1F' : 'var(--border)'}`,
                  background: active ? 'rgba(255,95,31,0.12)' : 'transparent',
                  color: active ? '#FF5F1F' : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 0.12s',
                }}>
                  {p}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn-primary" onClick={handleSearch} disabled={anySearching || !aircraftType.trim() || !budget.trim()} style={{ minWidth: 140 }}>
            {anySearching ? <><Loader2 size={14} className="animate-spin" /> Searching…</> : <><Search size={14} /> Search Markets</>}
          </button>
          {priorities.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              {priorities.length} priorit{priorities.length === 1 ? 'y' : 'ies'} active
            </span>
          )}
        </div>

        {searchError && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertTriangle size={14} /> {searchError}
          </div>
        )}
      </div>

      {/* ── Source Status ── */}
      {(anySearching || sources.some(s => s.state !== 'idle')) && (
        <div className="card mb-6">
          <div className="section-title">Search Status</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {sources.map(s => (
              <div key={s.key} style={{
                padding: '12px 14px', borderRadius: 10,
                border: `1px solid ${s.state === 'done' ? 'rgba(34,197,94,0.3)' : s.state === 'searching' ? 'rgba(255,95,31,0.4)' : 'var(--border)'}`,
                background: s.state === 'done' ? 'rgba(34,197,94,0.05)' : s.state === 'searching' ? 'rgba(255,95,31,0.06)' : 'transparent',
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{s.label}</span>
                  {s.state === 'searching' && <Loader2 size={12} className="animate-spin" style={{ color: '#FF5F1F' }} />}
                  {s.state === 'done' && <Check size={12} style={{ color: '#22c55e' }} />}
                </div>
                <div style={{ fontSize: 10, color: s.state === 'done' ? '#22c55e' : s.state === 'searching' ? '#FF5F1F' : 'var(--text-dim)', fontWeight: 600 }}>
                  {s.state === 'idle' ? 'Pending' : s.state === 'searching' ? 'Scanning…' : `${s.count} page${s.count !== 1 ? 's' : ''} fetched`}
                </div>
              </div>
            ))}
          </div>

          {isAnalyzing && (
            <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10, background: 'rgba(0,191,255,0.06)', border: '1px solid rgba(0,191,255,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Loader2 size={14} className="animate-spin" style={{ color: '#00BFFF' }} />
              <span style={{ fontSize: 13, color: '#00BFFF', fontWeight: 600 }}>
                Analyzing {totalFound} page{totalFound !== 1 ? 's' : ''} with Claude — scoring, flagging, generating emails…
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Results ── */}
      {results && results.aircraft.length > 0 && (
        <>
          {/* Filter + actions bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <Filter size={14} style={{ color: 'var(--text-dim)' }} />

            <select className="input" style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }} value={filterBudget} onChange={e => setFilterBudget(e.target.value)}>
              <option value="all">All Budget Fits</option>
              <option value="fit">Fit</option>
              <option value="close">Close</option>
              <option value="over">Over</option>
            </select>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={filterEngineProgram} onChange={e => setFilterEngineProgram(e.target.checked)} />
              Engine Program only
            </label>

            <input className="input" style={{ width: 140, padding: '6px 10px', fontSize: 12 }} placeholder="Max price $" value={filterMaxPrice} onChange={e => setFilterMaxPrice(e.target.value)} />

            <input className="input" style={{ width: 120, padding: '6px 10px', fontSize: 12 }} placeholder="Max hours" value={filterMaxHours} onChange={e => setFilterMaxHours(e.target.value)} />

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => window.print()}>
                <Download size={13} /> PDF
              </button>
              {!saved ? (
                <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {saving ? 'Saving…' : 'Save to Pipeline'}
                </button>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#22c55e', fontWeight: 700 }}>
                  <Check size={13} /> Saved
                </span>
              )}
            </div>
          </div>

          {saveError && (
            <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 13 }}>
              Save error: {saveError}
            </div>
          )}

          {/* Comparison Table */}
          <div style={{ overflowX: 'auto', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
              <thead>
                <tr>
                  {TABLE_COLS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => col.key !== 'url' && col.key !== 'aircraft' && handleSort(col.key)}
                      style={{
                        padding: '10px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: 'var(--text-dim)',
                        borderBottom: '1px solid var(--border)', textAlign: 'left',
                        cursor: col.key !== 'url' && col.key !== 'aircraft' ? 'pointer' : 'default',
                        whiteSpace: 'nowrap', userSelect: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {col.label}
                        {col.key !== 'url' && col.key !== 'aircraft' && <SortIcon col={col.key} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedAircraft.map((a, ri) => (
                  <tr key={a.id} style={{ borderTop: ri > 0 ? '1px solid var(--border)' : undefined }}>
                    {/* Aircraft / Tail */}
                    <td style={{ padding: '10px 12px', minWidth: 160 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
                        {a.tail || a.sn || 'Unknown'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                        {a.source}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                        <BudgetTag fit={a.budget_fit} />
                        {a.flags.map(f => <FlagChip key={f} flag={f} />)}
                      </div>
                    </td>

                    {/* Year */}
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 13, color: a.year ? 'var(--text-primary)' : 'var(--text-dim)' }}>
                      {a.year || '—'}
                    </td>

                    {/* AFTT */}
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 13, color: a.aftt ? 'var(--text-primary)' : 'var(--text-dim)' }}>
                      {a.aftt ? a.aftt.toLocaleString() : '—'}
                    </td>

                    {/* Asking Price */}
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: a.asking_price ? '#00BFFF' : 'var(--text-dim)' }}>
                      {fmt$(a.asking_price)}
                    </td>

                    {/* Engine Program */}
                    <td style={{ padding: '10px 12px', fontSize: 12, color: a.engine_program ? '#22c55e' : 'var(--text-dim)', maxWidth: 120 }}>
                      {a.engine_program || '—'}
                    </td>

                    {/* Last Inspection */}
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 110, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.last_inspection || '—'}
                    </td>

                    {/* Interior */}
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 120 }}>
                      {a.interior ? a.interior.slice(0, 30) + (a.interior.length > 30 ? '…' : '') : '—'}
                    </td>

                    {/* Paint */}
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 13, color: a.paint_year ? 'var(--text-primary)' : 'var(--text-dim)' }}>
                      {a.paint_year || '—'}
                    </td>

                    {/* Score */}
                    <td style={{ padding: '10px 12px' }}>
                      <ScoreRing score={a.score} />
                    </td>

                    {/* Broker */}
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 130 }}>
                      <div>{a.broker_name || '—'}</div>
                      {a.broker_contact && <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{a.broker_contact}</div>}
                    </td>

                    {/* Listing URL */}
                    <td style={{ padding: '10px 12px' }}>
                      {a.url ? (
                        <a href={a.url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#00BFFF', fontWeight: 600, textDecoration: 'none' }}>
                          <ExternalLink size={11} /> View
                        </a>
                      ) : <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Emails */}
          {results.emails.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Mail size={16} style={{ color: '#FF5F1F' }} />
                <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Seller Inquiry Emails</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {results.emails.map((email) => {
                  const ac = results.aircraft.find(a => a.id === email.id)
                  const fullText = `Subject: ${email.subject}\n\n${email.body}`
                  return (
                    <div key={email.id} className="card">
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
                            {email.tail}
                            {ac && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>— {ac.broker_name || 'Unknown broker'}</span>}
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#FF5F1F', marginTop: 3 }}>
                            {email.subject}
                          </div>
                        </div>
                        <CopyButton text={fullText} />
                      </div>
                      <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0, padding: '12px 14px', background: '#fafafa', borderRadius: 8, border: '1px solid var(--border)' }}>
                        {email.body}
                      </pre>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Mentor Brief */}
          {results.mentor_brief && (
            <div className="card" style={{ marginBottom: 24, border: '1px solid rgba(0,191,255,0.2)', background: 'linear-gradient(135deg,rgba(0,191,255,0.04),rgba(255,95,31,0.04))' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={16} style={{ color: '#00BFFF' }} />
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Mentor Brief</h2>
                </div>
                <CopyButton text={results.mentor_brief} />
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                {results.mentor_brief}
              </p>
            </div>
          )}
        </>
      )}

      {/* Empty state after search */}
      {results && results.aircraft.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Sparkles size={36} style={{ color: 'var(--text-dim)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No listings found</p>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 6, maxWidth: 400, margin: '8px auto 0' }}>
            The search sources may be blocking automated access. Try different search terms or check individual sites directly.
          </p>
          {results.mentor_brief && (
            <div style={{ marginTop: 20, textAlign: 'left', padding: '16px', borderRadius: 10, background: 'rgba(0,191,255,0.06)', border: '1px solid rgba(0,191,255,0.2)' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                {results.mentor_brief}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Idle state */}
      {!results && !anySearching && sources.every(s => s.state === 'idle') && (
        <div className="card" style={{ textAlign: 'center', padding: 60, border: '1px solid rgba(255,95,31,0.12)' }}>
          <Search size={40} style={{ color: 'var(--text-dim)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Ready to search</p>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 6 }}>
            Enter an aircraft type and budget above, select your priorities, and hit Search Markets
          </p>
        </div>
      )}
    </div>
  )
}

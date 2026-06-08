'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Aircraft, DiligenceItem } from '@/lib/types'
import { CheckSquare, Plus, Check, Clock, AlertCircle, XCircle, Loader2 } from 'lucide-react'

const CATEGORIES: DiligenceItem['category'][] = ['Records','Maintenance','Legal/Title','Inspections','Seller','Deal Risk']
const STATUSES: DiligenceItem['status'][] = ['Pending','In Progress','Complete','Blocked']

const DEFAULT_ITEMS: Partial<DiligenceItem>[] = [
  { category: 'Records', item: 'Engine logbooks (all entries)' },
  { category: 'Records', item: 'Airframe logbooks (all entries)' },
  { category: 'Records', item: 'Prop logbooks' },
  { category: 'Records', item: 'Avionics STCs and 337s' },
  { category: 'Maintenance', item: 'Last annual inspection signed off' },
  { category: 'Maintenance', item: 'AD compliance list' },
  { category: 'Maintenance', item: 'Engine program enrollment verified' },
  { category: 'Legal/Title', item: 'FAA title search (no liens)' },
  { category: 'Legal/Title', item: 'Escrow arrangement confirmed' },
  { category: 'Inspections', item: 'Pre-buy inspection scheduled' },
  { category: 'Inspections', item: 'Borescope of engine cylinders' },
  { category: 'Seller', item: 'Seller / broker verified' },
  { category: 'Seller', item: 'Reason for sale documented' },
  { category: 'Deal Risk', item: 'Damage history cross-checked (FAA accident database)' },
  { category: 'Deal Risk', item: 'Insurance quote obtained' },
]

const statusIcon: Record<DiligenceItem['status'], React.ReactNode> = {
  'Pending':     <Clock size={13} style={{ color: '#7fa8cc' }} />,
  'In Progress': <Loader2 size={13} style={{ color: '#f59e0b' }} />,
  'Complete':    <Check size={13} style={{ color: '#22c55e' }} />,
  'Blocked':     <XCircle size={13} style={{ color: '#ef4444' }} />,
}

const statusColor: Record<DiligenceItem['status'], string> = {
  'Pending':     '#7fa8cc',
  'In Progress': '#f59e0b',
  'Complete':    '#22c55e',
  'Blocked':     '#ef4444',
}

export default function DiligencePage() {
  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  const [selectedAircraft, setSelectedAircraft] = useState<string>('')
  const [items, setItems] = useState<DiligenceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [addingCategory, setAddingCategory] = useState<string | null>(null)
  const [newItem, setNewItem] = useState('')

  useEffect(() => {
    supabase.from('aircraft').select('id,make,model,year,registration').order('updated_at', { ascending: false }).then(({ data }) => {
      setAircraft((data as any) || [])
      if (data?.[0]) setSelectedAircraft(data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedAircraft) return
    setLoading(true)
    supabase.from('diligence').select('*').eq('aircraft_id', selectedAircraft).order('created_at').then(({ data }) => {
      setItems(data || [])
      setLoading(false)
    })
  }, [selectedAircraft])

  async function addDefaultItems() {
    const toInsert = DEFAULT_ITEMS.map(d => ({
      ...d, aircraft_id: selectedAircraft, status: 'Pending' as const,
      created_at: new Date().toISOString()
    }))
    const { data } = await supabase.from('diligence').insert(toInsert).select()
    setItems(i => [...i, ...(data || [])])
  }

  async function updateStatus(id: string, status: DiligenceItem['status']) {
    await supabase.from('diligence').update({ status }).eq('id', id)
    setItems(items.map(i => i.id === id ? { ...i, status } : i))
  }

  async function addItem(category: string) {
    if (!newItem.trim()) return
    const { data } = await supabase.from('diligence').insert([{
      aircraft_id: selectedAircraft, category, item: newItem.trim(),
      status: 'Pending', created_at: new Date().toISOString()
    }]).select().single()
    if (data) setItems(i => [...i, data])
    setNewItem('')
    setAddingCategory(null)
  }

  async function deleteItem(id: string) {
    await supabase.from('diligence').delete().eq('id', id)
    setItems(items.filter(i => i.id !== id))
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat)
    return acc
  }, {} as Record<string, DiligenceItem[]>)

  const complete = items.filter(i => i.status === 'Complete').length
  const total = items.length

  const sel = aircraft.find(a => a.id === selectedAircraft)

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="page-title">Diligence Tracker</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            Due diligence checklist per aircraft
          </p>
        </div>
        {total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: complete === total ? '#22c55e' : 'var(--text-primary)' }}>
              {complete}/{total}
            </div>
            <div style={{ width: 80, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: complete === total ? '#22c55e' : '#38bdf8', width: `${(complete/total)*100}%`, transition: 'width 0.3s ease', borderRadius: 3 }} />
            </div>
          </div>
        )}
      </div>

      {/* Aircraft selector */}
      {aircraft.length > 0 && (
        <div className="card mb-6">
          <label className="label">Aircraft</label>
          <select className="input" value={selectedAircraft} onChange={e => setSelectedAircraft(e.target.value)}>
            {aircraft.map(a => (
              <option key={a.id} value={a.id}>
                {(a as any).year} {(a as any).make} {(a as any).model} {(a as any).registration ? `· ${(a as any).registration}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && selectedAircraft && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <CheckSquare size={36} style={{ color: 'var(--text-dim)', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No checklist yet</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={addDefaultItems}>
            <Plus size={14} /> Load default checklist
          </button>
        </div>
      )}

      {/* Categories */}
      {CATEGORIES.map(cat => {
        const catItems = grouped[cat] || []
        if (catItems.length === 0 && items.length === 0) return null
        return (
          <div key={cat} className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="section-title" style={{ margin: 0 }}>{cat}</div>
              <button onClick={() => setAddingCategory(cat)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                <Plus size={12} /> Add
              </button>
            </div>

            {catItems.length === 0 && (
              <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '8px 0' }}>No items</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {catItems.map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  background: item.status === 'Complete' ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${item.status === 'Complete' ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`,
                }}>
                  {statusIcon[item.status]}
                  <span style={{
                    flex: 1, fontSize: 13,
                    color: item.status === 'Complete' ? 'var(--text-dim)' : 'var(--text-primary)',
                    textDecoration: item.status === 'Complete' ? 'line-through' : 'none',
                  }}>
                    {item.item}
                  </span>
                  <select
                    value={item.status}
                    onChange={e => updateStatus(item.id, e.target.value as DiligenceItem['status'])}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: statusColor[item.status], fontSize: 11, fontWeight: 700,
                    }}>
                    {STATUSES.map(s => <option key={s} value={s} style={{ background: '#0d1a35' }}>{s}</option>)}
                  </select>
                  <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 2 }}>
                    ×
                  </button>
                </div>
              ))}
            </div>

            {addingCategory === cat && (
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <input
                  className="input" autoFocus
                  placeholder="New checklist item..."
                  value={newItem}
                  onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addItem(cat); if (e.key === 'Escape') setAddingCategory(null) }}
                />
                <button className="btn-primary" onClick={() => addItem(cat)}>Add</button>
                <button className="btn-secondary" onClick={() => setAddingCategory(null)}>Cancel</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

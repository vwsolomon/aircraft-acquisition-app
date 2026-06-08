export type AircraftStatus =
  | 'New Lead'
  | 'Contacted'
  | 'Records Requested'
  | 'Records Received'
  | 'Under Review'
  | 'Pre-Buy'
  | 'Offer'
  | 'Closed Won'
  | 'Closed Lost'

export interface Aircraft {
  id: string
  created_at: string
  updated_at: string
  // Identity
  make: string
  model: string
  year: number | null
  serial_number: string
  registration: string
  // Deal
  status: AircraftStatus
  asking_price: number | null
  source_url: string
  source_site: string
  location: string
  seller_name: string
  seller_contact: string
  // Airframe
  airframe_hours: number | null
  cycles: number | null
  // Engine
  engine_model: string
  engine_serial: string
  engine_time: number | null
  engine_program: string
  // Prop
  prop_model: string
  prop_time: number | null
  // Avionics
  avionics_notes: string
  autopilot: string
  gps_nav: string
  ads_b: string
  taws: string
  traffic_system: string
  weather_system: string
  engine_monitor: string
  // Condition
  interior_notes: string
  exterior_notes: string
  damage_history: string
  prop_strike_history: string
  accident_history: string
  // Inspections
  annual_due: string
  inspection_notes: string
  // Import meta
  raw_snapshot: string
  import_confidence: Record<string, 'high' | 'medium' | 'low' | 'missing'>
  // Notes
  notes: string
  next_action: string
  next_action_date: string
}

export interface DiligenceItem {
  id: string
  aircraft_id: string
  category: 'Records' | 'Maintenance' | 'Legal/Title' | 'Inspections' | 'Seller' | 'Deal Risk'
  item: string
  status: 'Pending' | 'In Progress' | 'Complete' | 'Blocked'
  owner: string
  due_date: string
  evidence_url: string
  notes: string
  created_at: string
}

export interface ComparisonScore {
  id: string
  aircraft_id: string
  price_score: number
  hours_score: number
  avionics_score: number
  condition_score: number
  maintenance_score: number
  notes: string
}

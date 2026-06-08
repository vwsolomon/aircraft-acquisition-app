import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

function extractNumber(text: string, patterns: RegExp[]): number | null {
  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      const n = parseFloat(m[1].replace(/,/g, ''))
      if (!isNaN(n)) return n
    }
  }
  return null
}

function extractText(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m[1].trim()
  }
  return null
}

function confidence(value: any): 'high' | 'medium' | 'low' | 'missing' {
  if (value === null || value === undefined || value === '') return 'missing'
  return 'medium'
}

function parseAircraftFromText(text: string, url: string) {
  const t = text.replace(/\s+/g, ' ')

  // Price
  const asking_price = extractNumber(t, [
    /(?:asking|list|sale)\s*(?:price)?[:\s]*\$?([\d,]+)/i,
    /\$\s*([\d,]+)\s*(?:USD|usd)?(?:\s|$)/,
    /price[:\s]+\$?([\d,]+)/i,
  ])

  // Year/Make/Model from page title or heading patterns
  const year = extractNumber(t, [
    /\b(19[5-9]\d|20[0-2]\d)\b(?=.*(?:TBM|Cessna|Piper|Beechcraft|Cirrus|Mooney|Commander|King Air|Citation|Pilatus|Socata|Diamond|Eclipse))/i,
    /^(\d{4})\s+(?:TBM|Cessna|Piper)/im,
  ])

  const make = extractText(t, [
    /(Cessna|Piper|Beechcraft|Cirrus|Mooney|Socata|TBM|Daher|Pilatus|Diamond|Eclipse|Commander|Hawker|Learjet|Gulfstream|Dassault|Bombardier|Embraer)/i,
  ])

  const model = extractText(t, [
    /(?:TBM|Cessna|Piper|Beechcraft|Cirrus|Pilatus|Diamond)\s+([\w\d\-\/]+(?:\s[\w\d\-]+)?)/i,
    /model[:\s]+([\w\d\s\-]+?)(?:\n|,|\.)/i,
  ])

  const serial_number = extractText(t, [
    /(?:serial|s\/n|sn)[:\s#]*([A-Z0-9\-]{4,12})/i,
    /serial\s*number[:\s]*([A-Z0-9\-]{4,12})/i,
  ])

  const registration = extractText(t, [
    /(?:reg(?:istration)?|tail)[:\s#]*([A-Z0-9\-]{4,8})/i,
    /\b(N\d{1,5}[A-Z]{0,2})\b/,
  ])

  const airframe_hours = extractNumber(t, [
    /(?:total\s+time|TTSN|TT|airframe\s+hours?|total\s+airframe)[:\s]*([\d,]+)/i,
    /(\d{1,5})\s*(?:hrs?|hours?)(?:\s+total|\s+TT)/i,
  ])

  const engine_model = extractText(t, [
    /(?:engine\s+model|powerplant)[:\s]*([\w\d\s\-]+?)(?:\n|,|Serial)/i,
    /(PT6[A-Z\-\d]+|IO-[\d]+|TIO-[\d]+|TSIO-[\d]+|Continental\s[\w\d]+|Lycoming\s[\w\d]+)/i,
  ])

  const engine_time = extractNumber(t, [
    /(?:engine\s+time|SMOH|time\s+since\s+overhaul|TSN)[:\s]*([\d,]+)/i,
    /SMOH[:\s]*([\d,]+)/i,
  ])

  const engine_program = extractText(t, [
    /(?:engine\s+program|maintenance\s+program|ESP|MSP|TAP|JSSI)[:\s]*([\w\s\-]+?)(?:\n|,|\.)/i,
    /(ESP Gold|MSP Gold|TAP Blue|JSSI|Pratt.*program)/i,
  ])

  const prop_model = extractText(t, [
    /(?:propeller|prop)\s+(?:model)?[:\s]*([\w\d\s\-]+?)(?:\n|,|Serial)/i,
  ])

  const prop_time = extractNumber(t, [
    /(?:prop|propeller)\s+(?:time|hours?)[:\s]*([\d,]+)/i,
  ])

  const location = extractText(t, [
    /(?:location|based\s+at|airport)[:\s]*([A-Za-z\s,]+?)(?:\n|,\s*\d)/i,
    /located\s+(?:in|at)\s+([A-Za-z\s,]+?)(?:\.|,|\n)/i,
  ])

  const seller_name = extractText(t, [
    /(?:contact|seller|broker|dealer)[:\s]*([A-Za-z\s]+?)(?:\n|phone|email|\d)/i,
    /(?:listed\s+by|offered\s+by)[:\s]*([A-Za-z\s]+?)(?:\n|\.)/i,
  ])

  const damage_history = extractText(t, [
    /(?:damage\s+history|accident\s+history)[:\s]*([\w\s,\.]+?)(?:\n|\.|;)/i,
    /(no\s+known\s+damage|no\s+accidents?|clean\s+history|damage\s+free)/i,
  ])

  const annual_due = extractText(t, [
    /(?:annual\s+due|next\s+annual|inspection\s+due)[:\s]*([\w\s\d\/\-]+?)(?:\n|,|\.)/i,
  ])

  const avionics_notes = extractText(t, [
    /(?:avionics|panel|glass\s+cockpit)[:\s]*([\w\s,\.\-]+?)(?:\n\n|\.(?:\s|$))/i,
  ])

  return {
    make:           { value: make,          confidence: confidence(make) },
    model:          { value: model,         confidence: confidence(model) },
    year:           { value: year,          confidence: confidence(year) },
    serial_number:  { value: serial_number, confidence: confidence(serial_number) },
    registration:   { value: registration,  confidence: confidence(registration) },
    asking_price:   { value: asking_price,  confidence: confidence(asking_price) },
    location:       { value: location,      confidence: confidence(location) },
    airframe_hours: { value: airframe_hours,confidence: confidence(airframe_hours) },
    engine_model:   { value: engine_model,  confidence: confidence(engine_model) },
    engine_time:    { value: engine_time,   confidence: confidence(engine_time) },
    engine_program: { value: engine_program,confidence: confidence(engine_program) },
    prop_model:     { value: prop_model,    confidence: confidence(prop_model) },
    prop_time:      { value: prop_time,     confidence: confidence(prop_time) },
    damage_history: { value: damage_history,confidence: confidence(damage_history) },
    annual_due:     { value: annual_due,    confidence: confidence(annual_due) },
    seller_name:    { value: seller_name,   confidence: confidence(seller_name) },
    avionics_notes: { value: avionics_notes,confidence: confidence(avionics_notes) },
    source_url:     { value: url,           confidence: 'high' as const },
    source_site:    { value: new URL(url).hostname.replace('www.',''), confidence: 'high' as const },
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    // Fetch the listing page
    let html = ''
    let snapshot = ''
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
      })
      html = await res.text()
      // Strip HTML to get readable text
      snapshot = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .slice(0, 8000) // Store first 8k chars
    } catch (fetchErr) {
      // If we can't fetch, return empty parse with error hint
      return NextResponse.json({
        parsed: parseAircraftFromText('', url),
        snapshot: '',
        warning: 'Could not fetch listing page — some sites block automated access. Enter fields manually.',
      })
    }

    const parsed = parseAircraftFromText(snapshot, url)

    return NextResponse.json({ parsed, snapshot })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

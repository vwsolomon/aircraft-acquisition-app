import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// Multiple fetch strategies to bypass bot detection
async function fetchWithStrategies(url: string): Promise<string> {
  const strategies = [
    // Strategy 1: Direct fetch with realistic browser headers
    async () => {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"macOS"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.text()
    },
    // Strategy 2: Via AllOrigins proxy
    async () => {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) })
      if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`)
      const data = await res.json()
      return data.contents || ''
    },
    // Strategy 3: Via corsproxy.io
    async () => {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`
      const res = await fetch(proxyUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) throw new Error(`Proxy2 HTTP ${res.status}`)
      return res.text()
    },
  ]

  for (const strategy of strategies) {
    try {
      const html = await strategy()
      if (html && html.length > 500) return html
    } catch (e) {
      continue
    }
  }
  throw new Error('All fetch strategies failed')
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

async function parseWithClaude(text: string, url: string) {
  const prompt = `You are an expert aircraft acquisition analyst. Extract structured data from this aircraft listing page text.

Return ONLY a valid JSON object with exactly these fields (use null for any field not found):
{
  "make": "manufacturer name e.g. Daher, Cessna, Piper",
  "model": "model designation e.g. TBM 700C2, 172S, PA-46",
  "year": 2006,
  "serial_number": "serial number string",
  "registration": "N-number e.g. N123AB",
  "asking_price": 1500000,
  "location": "city, state or airport",
  "airframe_hours": 2450,
  "engine_model": "engine model e.g. PT6A-64",
  "engine_time": 1200,
  "engine_program": "maintenance program e.g. ESP Gold, MSP Gold",
  "prop_model": "propeller model",
  "prop_time": 800,
  "damage_history": "description or 'None reported'",
  "annual_due": "date or description",
  "seller_name": "seller or broker name",
  "avionics_notes": "avionics equipment list"
}

Rules:
- asking_price, airframe_hours, engine_time, prop_time, year must be numbers (integers), not strings
- If a field is truly not mentioned, use null
- Do not guess or invent data
- For damage_history, if listing says no damage or clean history, write "None reported"
- Return ONLY the JSON, no explanation, no markdown

Listing URL: ${url}

Listing text:
${text.slice(0, 12000)}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error('Claude API error')
  const data = await res.json()
  const raw = data.content?.[0]?.text || '{}'
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

function confidence(value: any): 'high' | 'medium' | 'low' | 'missing' {
  if (value === null || value === undefined || value === '') return 'missing'
  return 'high'
}

function buildParsed(fields: Record<string, any>, url: string) {
  const keys = [
    'make','model','year','serial_number','registration','asking_price',
    'location','airframe_hours','engine_model','engine_time','engine_program',
    'prop_model','prop_time','damage_history','annual_due','seller_name','avionics_notes'
  ]
  const result: Record<string, any> = {
    source_url:  { value: url, confidence: 'high' },
    source_site: { value: new URL(url).hostname.replace('www.',''), confidence: 'high' },
  }
  for (const k of keys) {
    result[k] = { value: fields[k] ?? null, confidence: confidence(fields[k]) }
  }
  return result
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    // Step 1: Fetch the page
    let html = ''
    let snapshot = ''
    let fetchWarning = ''

    try {
      html = await fetchWithStrategies(url)
      snapshot = htmlToText(html).slice(0, 15000)
    } catch (e) {
      fetchWarning = 'Could not fetch listing page automatically. Fields extracted from URL only.'
    }

    // Step 2: Parse with Claude if we have content
    let parsed: Record<string, any>
    if (snapshot.length > 200 && process.env.ANTHROPIC_API_KEY) {
      try {
        const fields = await parseWithClaude(snapshot, url)
        parsed = buildParsed(fields, url)
      } catch (e) {
        // Fall back to empty parse
        parsed = buildParsed({}, url)
      }
    } else {
      parsed = buildParsed({}, url)
    }

    return NextResponse.json({
      parsed,
      snapshot: snapshot.slice(0, 8000),
      ...(fetchWarning ? { warning: fetchWarning } : {}),
    })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

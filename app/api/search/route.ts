import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 120

const SOURCES = [
  {
    key: 'controller',
    label: 'Controller.com',
    buildUrl: (q: string) => `https://www.controller.com/listings/aircraft/for-sale/list/category/BIZJETS?TextSearch=${encodeURIComponent(q)}`,
    baseUrl: 'https://www.controller.com',
    listingPattern: /href="(\/listings\/aircraft\/for-sale\/detail\/[^"?#]+)"/g,
  },
  {
    key: 'avbuyer',
    label: 'AvBuyer',
    buildUrl: (q: string) => `https://www.avbuyer.com/aircraft?q=${encodeURIComponent(q)}&type=for-sale`,
    baseUrl: 'https://www.avbuyer.com',
    listingPattern: /href="(https?:\/\/www\.avbuyer\.com\/aircraft\/[^"?#]+\/\d+[^"?#]*)"/g,
  },
  {
    key: 'aircraftexchange',
    label: 'AircraftExchange',
    buildUrl: (q: string) => `https://www.aircraftexchange.com/search?q=${encodeURIComponent(q)}&type=for-sale`,
    baseUrl: 'https://www.aircraftexchange.com',
    listingPattern: /href="(https?:\/\/www\.aircraftexchange\.com\/(?:listings|aircraft)\/[^"?#]+)"/g,
  },
  {
    key: 'trade-a-plane',
    label: 'Trade-A-Plane',
    buildUrl: (q: string) => `https://www.trade-a-plane.com/search?q=${encodeURIComponent(q)}&category_level1=Aircraft`,
    baseUrl: 'https://www.trade-a-plane.com',
    listingPattern: /href="([^"]*listing_id=\d+[^"]*)"/g,
  },
  {
    key: 'jetaviva',
    label: 'JetAVIVA',
    buildUrl: (q: string) => `https://www.jetaviva.com/inventory/?search=${encodeURIComponent(q)}`,
    baseUrl: 'https://www.jetaviva.com',
    listingPattern: /href="((?:https?:\/\/www\.jetaviva\.com)?\/inventory\/[^"?#]{3,})"/g,
  },
]

async function fetchWithStrategies(url: string): Promise<string> {
  const strategies = [
    async () => {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: AbortSignal.timeout(18000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.text()
    },
    async () => {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(18000) })
      if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`)
      const data = await res.json()
      return data.contents || ''
    },
    async () => {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`
      const res = await fetch(proxyUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(18000),
      })
      if (!res.ok) throw new Error(`Proxy2 HTTP ${res.status}`)
      return res.text()
    },
  ]

  for (const strategy of strategies) {
    try {
      const html = await strategy()
      if (html && html.length > 300) return html
    } catch {
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

function extractListingUrls(html: string, source: typeof SOURCES[0]): string[] {
  const urls: string[] = []
  const seen = new Set<string>()

  const regex = new RegExp(source.listingPattern.source, source.listingPattern.flags)
  let match
  while ((match = regex.exec(html)) !== null) {
    let url = match[1]
    if (!url.startsWith('http')) url = source.baseUrl + url
    if (!seen.has(url)) {
      seen.add(url)
      urls.push(url)
    }
    if (urls.length >= 4) break
  }

  return urls
}

async function analyzeWithClaude(
  allContent: { source: string; url: string; text: string }[],
  params: {
    aircraft_type: string
    budget: string
    max_hours: string
    location: string
    priorities: string[]
  }
): Promise<any> {
  const budgetNum = parseFloat(params.budget.replace(/[^0-9.]/g, '')) *
    (params.budget.toLowerCase().includes('m') ? 1000000 : params.budget.toLowerCase().includes('k') ? 1000 : 1)

  const listingBlocks = allContent.map((c, i) =>
    `--- LISTING ${i + 1} (${c.source}) ---\nURL: ${c.url}\n${c.text.slice(0, 2500)}`
  ).join('\n\n')

  const prompt = `You are an expert aircraft acquisition analyst for Positive Rate (positiverateclimb.com), working with advisor Vernon Solomon.

SEARCH PARAMETERS:
- Aircraft Type: ${params.aircraft_type}
- Budget: ${params.budget} (${budgetNum > 0 ? '$' + budgetNum.toLocaleString() : 'see text'})
- Max Hours: ${params.max_hours || 'none specified'}
- Location Preference: ${params.location || 'none specified'}
- Active Priority Chips: ${params.priorities.join(', ') || 'none'}

SCORING RULES — apply ONLY for active priorities, max 100 pts total:
${params.priorities.includes('Low Engine Time') ? '- Low Engine Time: <1000 engine hrs=20pts, <2500=15, <4000=10, >4000=5' : ''}
${params.priorities.includes('Nice Interior') ? '- Nice Interior: confirmed new/refurb=15, unknown=5, poor=0' : ''}
${params.priorities.includes('TAP Blue') ? '- TAP Blue/Programs: confirmed=15, unknown=5' : ''}
${params.priorities.includes('Recent Paint') ? '- Recent Paint: 2024 or newer=10, 2022 or newer=7, older=3' : ''}
${params.priorities.includes('Fresh Inspection') ? '- Fresh Inspection: <6mo old=15, <12mo=10, >12mo=5' : ''}
${params.priorities.includes('Low Cycles') ? '- Low Cycles: <1000=10, <2500=7, <4000=5, >4000=2' : ''}
${params.priorities.includes('US Based') ? '- US Based: US registration=5, Canada=3, International=0' : ''}
${params.priorities.includes('One Owner') ? '- One Owner: confirmed single=10, 2 owners=7, unknown=3' : ''}
Score each aircraft 0-100. If no priorities active, score based on overall deal quality vs budget.

BUDGET FIT TAGS:
- "fit" = asking price at or under budget
- "close" = within 15% over budget
- "over" = more than 15% over budget

AUTO-DETECT THESE FLAGS (include only if applicable):
- "damage_history" — any reported structural damage
- "bird_strike" — bird strike history
- "aoc_operation" — commercial/AOC operation history
- "high_cycles" — cycles appear unusually high for type
- "no_engine_program" — no maintenance program documented
- "old_paint" — paint appears 8+ years old

EMAIL TEMPLATE (generate one per distinct aircraft found):
Subject: Inquiry – [Tail or SN] [Year] [Aircraft Type]
Body: Hi [broker first name or "there" if unknown], I am reaching out regarding your listing for [tail/SN], the [year] [type] with [AFTT] TT. I have a client actively searching and this one caught our attention. Could you please send over the following: [list only fields that are null/missing from the listing]. We are ready to move quickly for the right aircraft.
Vernon / Positive Rate / positiverateclimb.com

MENTOR BRIEF: Write one paragraph (4-6 sentences) summarizing the market, the best candidates found, notable flags or risks, and a recommended action.

RAW LISTING DATA:
${listingBlocks.length > 200 ? listingBlocks : 'No listing pages could be fetched from the search sources. Generate a realistic market assessment based on your knowledge of the ${params.aircraft_type} market, noting that live listing data was unavailable.'}

Return ONLY a valid JSON object — no markdown, no explanation:
{
  "aircraft": [
    {
      "id": "unique_id_string",
      "source": "controller.com",
      "tail": "N-number or null",
      "sn": "serial number or null",
      "year": 2015,
      "aftt": 2400,
      "asking_price": 2200000,
      "engine_program": "program name or null",
      "last_inspection": "date or description or null",
      "interior": "description or null",
      "paint_year": 2022,
      "broker_name": "full name or null",
      "broker_contact": "email or phone or null",
      "url": "full listing URL or null",
      "score": 82,
      "budget_fit": "fit",
      "flags": [],
      "location": "city, state or null"
    }
  ],
  "emails": [
    {
      "id": "same unique_id as aircraft entry",
      "tail": "N-number or SN",
      "subject": "full subject line",
      "body": "full email body"
    }
  ],
  "mentor_brief": "one paragraph market summary and recommendations"
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error: ${err}`)
  }
  const data = await res.json()
  const raw = data.content?.[0]?.text || '{}'
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

export async function POST(req: NextRequest) {
  const { aircraft_type, budget, max_hours, location, priorities } = await req.json()

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }

      try {
        const allContent: { source: string; url: string; text: string }[] = []
        const query = aircraft_type

        // Search each source
        for (const source of SOURCES) {
          send({ type: 'status', source: source.key, label: source.label, state: 'searching' })

          let count = 0
          try {
            const searchUrl = source.buildUrl(query)
            const html = await fetchWithStrategies(searchUrl)

            // Extract listing URLs from search results
            const listingUrls = extractListingUrls(html, source)

            // Also add search page text as context if no listings found
            if (listingUrls.length === 0) {
              const pageText = htmlToText(html)
              if (pageText.length > 300) {
                allContent.push({ source: source.label, url: searchUrl, text: pageText.slice(0, 3000) })
                count = 1
              }
            }

            // Fetch each listing page
            for (const listingUrl of listingUrls.slice(0, 3)) {
              try {
                const listingHtml = await fetchWithStrategies(listingUrl)
                const text = htmlToText(listingHtml)
                if (text.length > 200) {
                  allContent.push({ source: source.label, url: listingUrl, text: text.slice(0, 3000) })
                  count++
                }
              } catch {
                // continue with other listings
              }
            }
          } catch {
            // source unreachable
          }

          send({ type: 'status', source: source.key, label: source.label, state: 'done', count })
        }

        // Claude analysis
        send({ type: 'analyzing' })

        if (!process.env.ANTHROPIC_API_KEY) {
          send({ type: 'error', message: 'ANTHROPIC_API_KEY not configured' })
          controller.close()
          return
        }

        const results = await analyzeWithClaude(allContent, { aircraft_type, budget, max_hours, location, priorities })
        send({ type: 'results', data: results })
      } catch (e: any) {
        send({ type: 'error', message: e.message })
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

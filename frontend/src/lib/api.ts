const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  health: () => apiFetch('/health'),
  stats:  () => apiFetch('/api/stats'),

  searchPolymarket: (limit = 20, min_win_rate = 0.55) =>
    apiFetch('/api/agents/polymarket/search', {
      method: 'POST',
      body: JSON.stringify({ limit, min_win_rate }),
    }),

  searchKalshi: (limit = 20, min_win_rate = 0.55) =>
    apiFetch('/api/agents/kalshi/search', {
      method: 'POST',
      body: JSON.stringify({ limit, min_win_rate }),
    }),

  mapNiches: (traders: any[]) =>
    apiFetch('/api/agents/niche/map', {
      method: 'POST',
      body: JSON.stringify({ traders }),
    }),

  enrichEvent: (event_title: string, event_id?: string) =>
    apiFetch('/api/agents/apify/enrich', {
      method: 'POST',
      body: JSON.stringify({ event_title, event_id }),
    }),

  chat: (message: string, context?: any, history?: any[]) =>
    apiFetch('/api/agents/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context, history }),
    }),

  getLearningInsights: () => apiFetch('/api/agents/learning/insights'),

  runPipeline: () =>
    apiFetch('/api/pipeline/run', { method: 'POST' }),
}

export async function* streamChat(message: string, context?: any, history?: any[]) {
  const res = await fetch(`${BASE}/api/agents/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context, history }),
  })
  if (!res.ok || !res.body) throw new Error('Stream failed')
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = dec.decode(value)
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6)
        if (payload === '[DONE]') return
        try {
          const parsed = JSON.parse(payload)
          if (parsed.chunk) yield parsed.chunk
        } catch {}
      }
    }
  }
}

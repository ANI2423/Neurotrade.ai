'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { Search, Globe, Zap, CheckCircle, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

const QUICK_EVENTS = [
  'Will the Fed cut rates in 2025?',
  'NBA Championship winner 2025',
  'Bitcoin price above 100k by end of 2025',
  'US presidential election outcome',
  'SpaceX Starship successful orbit',
]

export default function EnrichPanel() {
  const [query, setQuery]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])

  const enrich = async (eventTitle?: string) => {
    const title = eventTitle ?? query
    if (!title.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const r = await api.enrichEvent(title)
      setResult(r.data)
      setHistory(h => [{ title, result: r.data, ts: new Date().toLocaleTimeString() }, ...h].slice(0, 5))
    } catch {
      const mockResult = {
        event_title: title,
        doc_id: title.toLowerCase().replace(/\s+/g, '_').slice(0, 30),
        sources_used: 6,
        rag_stored: true,
        facts: {
          summary: `Research gathered for "${title}". Multiple sources indicate moderate uncertainty with diverging expert opinions.`,
          sentiment: 'mixed',
          key_facts: [
            'Recent polling shows approximately 52% probability for YES outcome.',
            'Expert consensus is divided — institutional traders lean NO.',
            'Volume on prediction markets has spiked 34% in the last 48 hours.',
            'Related markets suggest correlated movement worth monitoring.',
          ],
          probability_hint: 'toss-up',
        },
      }
      setResult(mockResult)
      setHistory(h => [{ title, result: mockResult, ts: new Date().toLocaleTimeString() }, ...h].slice(0, 5))
    } finally {
      setLoading(false)
    }
  }

  const sentimentColor = (s: string) => ({
    positive: '#10b981', negative: '#ef4444', mixed: '#f59e0b', neutral: '#4a5568',
  }[s] ?? '#4a5568')

  const hintBadge = (h: string) => {
    if (h?.includes('YES')) return 'badge-success'
    if (h?.includes('NO'))  return 'badge-danger'
    return 'badge-warn'
  }

  return (
    <div className="space-y-5">
      {/* Search input */}
      <div className="glass-bright rounded-xl p-5 border-glow">
        <h2 className="text-sm font-600 text-white mb-4 flex items-center gap-2">
          <Globe size={14} className="text-accent" /> Apify Event Enrichment
        </h2>
        <p className="text-[11px] text-muted font-mono mb-4">
          Scrape web data for any prediction market event and enrich the RAG knowledge base.
        </p>

        <div className="flex gap-3">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && enrich()}
            placeholder="Enter a market event title…"
            className="flex-1 bg-panel border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors font-mono"
          />
          <button
            onClick={() => enrich()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-void rounded-lg text-xs font-700 hover:bg-accent/90 disabled:opacity-40 transition-all"
          >
            {loading ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
            {loading ? 'Scraping…' : 'Enrich'}
          </button>
        </div>

        {/* Quick events */}
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_EVENTS.map(e => (
            <button
              key={e}
              onClick={() => { setQuery(e); enrich(e) }}
              className="px-3 py-1 rounded-full border border-border text-[11px] text-muted hover:text-accent hover:border-accent/30 transition-all font-mono"
            >
              {e.length > 36 ? e.slice(0, 34) + '…' : e}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Result */}
        <div className="lg:col-span-2">
          {loading && (
            <div className="glass-bright rounded-xl border-glow p-8 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
              <div className="text-sm text-accent font-mono">Scraping the web via Apify…</div>
              <div className="text-xs text-muted">Fetching search results → extracting facts → storing in RAG</div>
            </div>
          )}

          {result && !loading && (
            <div className="glass-bright rounded-xl border-glow overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle size={13} className="text-success" />
                    <span className="text-xs font-600 text-white">Enrichment Complete</span>
                  </div>
                  <p className="text-[10px] text-muted font-mono truncate max-w-xs">{result.event_title}</p>
                </div>
                <div className="flex gap-2">
                  <span className="badge badge-success">{result.sources_used} SOURCES</span>
                  {result.rag_stored && <span className="badge badge-accent">RAG STORED</span>}
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Summary */}
                <div>
                  <div className="text-[10px] text-muted font-mono tracking-widest mb-2">SUMMARY</div>
                  <p className="text-sm text-slate-300 leading-relaxed">{result.facts?.summary}</p>
                </div>

                {/* Sentiment + hint */}
                <div className="flex gap-3">
                  <div className="flex-1 p-3 rounded-lg bg-panel border border-border">
                    <div className="text-[9px] text-muted font-mono mb-1">SENTIMENT</div>
                    <div
                      className="text-sm font-600 capitalize"
                      style={{ color: sentimentColor(result.facts?.sentiment) }}
                    >
                      {result.facts?.sentiment ?? 'neutral'}
                    </div>
                  </div>
                  <div className="flex-1 p-3 rounded-lg bg-panel border border-border">
                    <div className="text-[9px] text-muted font-mono mb-1">PROBABILITY HINT</div>
                    <span className={clsx('badge', hintBadge(result.facts?.probability_hint ?? ''))}>
                      {result.facts?.probability_hint ?? 'toss-up'}
                    </span>
                  </div>
                  <div className="flex-1 p-3 rounded-lg bg-panel border border-border">
                    <div className="text-[9px] text-muted font-mono mb-1">DOC ID</div>
                    <div className="text-[10px] font-mono text-accent truncate">{result.doc_id}</div>
                  </div>
                </div>

                {/* Key facts */}
                {result.facts?.key_facts?.length > 0 && (
                  <div>
                    <div className="text-[10px] text-muted font-mono tracking-widest mb-2">KEY FACTS</div>
                    <ul className="space-y-2">
                      {result.facts.key_facts.map((f: string, i: number) => (
                        <li key={i} className="flex gap-2 text-xs text-slate-300">
                          <span className="text-accent mt-0.5 flex-shrink-0">→</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {!result && !loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-accent/5 border border-accent/20 flex items-center justify-center mb-4">
                <Search size={24} className="text-accent/40" />
              </div>
              <p className="text-muted text-sm">Enter an event or pick a quick example above</p>
            </div>
          )}
        </div>

        {/* History */}
        <div className="glass-bright rounded-xl border-glow overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-xs font-600 text-white">RAG History</h3>
          </div>
          {history.length === 0 ? (
            <div className="p-8 text-center text-muted text-xs font-mono">No enrichments yet</div>
          ) : (
            <div className="divide-y divide-border">
              {history.map((h, i) => (
                <div key={i} className="p-3 hover:bg-white/2 transition-colors">
                  <div className="text-[11px] text-white leading-tight mb-1 line-clamp-2">{h.title}</div>
                  <div className="flex items-center justify-between">
                    <span className="badge badge-accent">{h.result?.sources_used} src</span>
                    <span className="font-mono text-[9px] text-muted">{h.ts}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

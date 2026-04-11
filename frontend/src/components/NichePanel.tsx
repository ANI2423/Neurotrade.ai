'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { Tag, RefreshCw, TrendingUp } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import clsx from 'clsx'

const NICHE_COLORS: Record<string, string> = {
  'Politics':      '#00d4ff',
  'Sports/NBA':    '#f59e0b',
  'Sports/NFL':    '#f59e0b',
  'Sports/Soccer': '#f59e0b',
  'Crypto':        '#7c3aed',
  'Economics':     '#10b981',
  'Weather':       '#06b6d4',
  'Entertainment': '#ec4899',
  'Tech':          '#8b5cf6',
  'Science':       '#14b8a6',
  'World Events':  '#ef4444',
  'Finance':       '#22c55e',
}

const MOCK_TRADERS = Array.from({ length: 30 }, (_, i) => ({
  address:       `0x${Math.random().toString(16).slice(2, 18)}`,
  win_rate:      0.55 + Math.random() * 0.3,
  total_trades:  Math.floor(Math.random() * 200 + 10),
  total_volume:  Math.floor(Math.random() * 50000 + 1000),
  estimated_profit: Math.floor(Math.random() * 2000),
  platform:      Math.random() > 0.5 ? 'polymarket' : 'kalshi',
  score:         Math.random() * 120,
}))

export default function NichePanel() {
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<any>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const run = async () => {
    setLoading(true)
    try {
      const r = await api.mapNiches(MOCK_TRADERS)
      setResult(r.data)
      setSelected(Object.keys(r.data.niches ?? {})[0] ?? null)
    } catch {
      // fallback mock
      const niches: Record<string, any[]> = {
        'Politics':      MOCK_TRADERS.slice(0, 8),
        'Crypto':        MOCK_TRADERS.slice(8, 14),
        'Sports/NBA':    MOCK_TRADERS.slice(14, 19),
        'Economics':     MOCK_TRADERS.slice(19, 24),
        'World Events':  MOCK_TRADERS.slice(24, 27),
        'Weather':       MOCK_TRADERS.slice(27, 30),
      }
      setResult({
        niches: niches,
        niche_counts: Object.fromEntries(Object.entries(niches).map(([k,v]) => [k, v.length])),
        summary: 'Politics and Crypto show the strongest copy-trading signals with the highest concentration of consistent traders.',
      })
      setSelected('Politics')
    } finally {
      setLoading(false)
    }
  }

  const radarData = result?.niche_counts
    ? Object.entries(result.niche_counts).map(([niche, count]) => ({
        niche: niche.split('/')[0],
        count,
      }))
    : []

  return (
    <div className="space-y-5">
      {/* Header action */}
      <div className="glass-bright rounded-xl p-5 border-glow flex items-center justify-between">
        <div>
          <h2 className="text-sm font-600 text-white flex items-center gap-2">
            <Tag size={14} className="text-accent" /> Niche Classification
          </h2>
          <p className="text-[11px] text-muted font-mono mt-1">
            LLM classifies each trader into NBA / Politics / Crypto / Weather etc.
          </p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 bg-accent text-void rounded-lg text-xs font-700 hover:bg-accent/90 disabled:opacity-50 transition-all"
        >
          {loading
            ? <><RefreshCw size={12} className="animate-spin" /> Mapping…</>
            : <><Tag size={12} /> Run Niche Mapper</>}
        </button>
      </div>

      {result && (
        <>
          {/* Summary */}
          {result.summary && (
            <div className="glass-bright rounded-xl p-4 border border-accent/15">
              <span className="badge badge-accent mb-2">AI INSIGHT</span>
              <p className="text-sm text-slate-300 leading-relaxed mt-2">{result.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Niche list */}
            <div className="glass-bright rounded-xl border-glow overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="text-xs font-600 text-white">Niches Found</h3>
              </div>
              <div className="p-2 space-y-1">
                {Object.entries(result.niche_counts ?? {}).map(([niche, count]) => {
                  const color = NICHE_COLORS[niche] ?? '#4a5568'
                  const pct   = Math.round((count as number) / MOCK_TRADERS.length * 100)
                  return (
                    <button
                      key={niche}
                      onClick={() => setSelected(niche)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left',
                        selected === niche
                          ? 'bg-white/5 border border-white/10'
                          : 'hover:bg-white/3 border border-transparent',
                      )}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-xs text-white flex-1">{niche}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <span className="font-mono text-[10px] text-muted w-4 text-right">{count as number}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Radar chart */}
            <div className="glass-bright rounded-xl border-glow p-5 flex flex-col">
              <h3 className="text-xs font-600 text-white mb-4">Distribution Radar</h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.05)" />
                    <PolarAngleAxis
                      dataKey="niche"
                      tick={{ fill: '#4a5568', fontSize: 9 }}
                    />
                    <Radar
                      dataKey="count"
                      stroke="#00d4ff"
                      fill="#00d4ff"
                      fillOpacity={0.15}
                      strokeWidth={1.5}
                    />
                    <Tooltip
                      contentStyle={{ background: '#080d14', border: '1px solid #0d1a2a', borderRadius: 8, fontSize: 11 }}
                      itemStyle={{ color: '#00d4ff' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Selected niche traders */}
            <div className="glass-bright rounded-xl border-glow overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-xs font-600 text-white">
                  {selected ?? 'Select a niche'}
                </h3>
                {selected && (
                  <span className="font-mono text-[10px] text-muted">
                    {result.niches?.[selected]?.length ?? 0} traders
                  </span>
                )}
              </div>
              <div className="overflow-y-auto max-h-56">
                {(result.niches?.[selected ?? ''] ?? []).slice(0, 10).map((t: any, i: number) => {
                  const id = t.address || t.user_id || `t${i}`
                  return (
                    <div key={id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 trader-row">
                      <span className="font-mono text-[9px] text-muted w-4">{i+1}</span>
                      <span className="font-mono text-[11px] text-slate-300 flex-1 truncate">
                        {id.length > 14 ? id.slice(0, 8) + '…' : id}
                      </span>
                      <span className="font-mono text-[10px] text-success">
                        {((t.win_rate ?? 0.5) * 100).toFixed(0)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {!result && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-accent/5 border border-accent/20 flex items-center justify-center mb-4">
            <TrendingUp size={24} className="text-accent/40" />
          </div>
          <p className="text-muted text-sm">Click <span className="text-accent">Run Niche Mapper</span> to classify traders</p>
        </div>
      )}
    </div>
  )
}

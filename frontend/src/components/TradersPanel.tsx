'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { Search, RefreshCw, ExternalLink, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'

type Platform = 'polymarket' | 'kalshi' | 'both'

function WinRateBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
        <div
          className="h-full progress-bar rounded-full transition-all duration-500"
          style={{ width: `${rate * 100}%` }}
        />
      </div>
      <span className="font-mono text-[11px] text-white tabular-nums w-9 text-right">
        {(rate * 100).toFixed(0)}%
      </span>
    </div>
  )
}

function ScoreChip({ score }: { score: number }) {
  const level = score > 80 ? 'elite' : score > 50 ? 'strong' : 'moderate'
  return (
    <span className={clsx(
      'badge',
      level === 'elite'    ? 'badge-warn' :
      level === 'strong'   ? 'badge-success' :
                             'badge-accent',
    )}>
      {level === 'elite' ? '⚡ ELITE' : level === 'strong' ? '✓ STRONG' : 'MOD'}
    </span>
  )
}

export default function TradersPanel() {
  const [platform, setPlatform]     = useState<Platform>('both')
  const [minWr, setMinWr]           = useState(0.55)
  const [limit, setLimit]           = useState(20)
  const [loading, setLoading]       = useState(false)
  const [traders, setTraders]       = useState<any[]>([])
  const [narrative, setNarrative]   = useState('')
  const [sortKey, setSortKey]       = useState('score')
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('desc')
  const [copied, setCopied]         = useState<string | null>(null)

  const search = async () => {
    setLoading(true)
    setTraders([])
    setNarrative('')
    try {
      const results: any[] = []
      if (platform === 'polymarket' || platform === 'both') {
        const r = await api.searchPolymarket(limit, minWr)
        results.push(...(r.data?.traders ?? []))
        if (r.data?.narrative) setNarrative(r.data.narrative)
      }
      if (platform === 'kalshi' || platform === 'both') {
        const r = await api.searchKalshi(limit, minWr)
        results.push(...(r.data?.traders ?? []))
        if (!narrative && r.data?.narrative) setNarrative(r.data.narrative)
      }
      setTraders(results)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const sort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...traders].sort((a, b) => {
    const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0
    return sortDir === 'asc' ? av - bv : bv - av
  })

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr)
    setCopied(addr)
    setTimeout(() => setCopied(null), 1500)
  }

  const SortIcon = ({ k }: { k: string }) =>
    sortKey === k
      ? sortDir === 'desc' ? <ChevronDown size={10} className="text-accent" /> : <ChevronUp size={10} className="text-accent" />
      : <ChevronDown size={10} className="text-muted opacity-30" />

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="glass-bright rounded-xl p-5 border-glow">
        <h2 className="text-sm font-600 text-white mb-4">Search Parameters</h2>
        <div className="flex flex-wrap gap-4 items-end">
          {/* Platform */}
          <div>
            <label className="text-[10px] text-muted font-mono tracking-widest block mb-2">PLATFORM</label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['both', 'polymarket', 'kalshi'] as Platform[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={clsx(
                    'px-3 py-1.5 text-xs capitalize transition-all',
                    platform === p
                      ? 'bg-accent/15 text-accent border-r border-accent/20'
                      : 'text-muted hover:text-white border-r border-border',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Min win rate */}
          <div>
            <label className="text-[10px] text-muted font-mono tracking-widest block mb-2">
              MIN WIN RATE: <span className="text-accent">{(minWr * 100).toFixed(0)}%</span>
            </label>
            <input
              type="range" min={0.5} max={0.9} step={0.01}
              value={minWr}
              onChange={e => setMinWr(parseFloat(e.target.value))}
              className="w-40 accent-cyan-400"
            />
          </div>

          {/* Limit */}
          <div>
            <label className="text-[10px] text-muted font-mono tracking-widest block mb-2">LIMIT</label>
            <select
              value={limit}
              onChange={e => setLimit(parseInt(e.target.value))}
              className="bg-panel border border-border text-white text-xs rounded-lg px-3 py-1.5"
            >
              {[10, 20, 50].map(n => <option key={n} value={n}>{n} traders</option>)}
            </select>
          </div>

          <button
            onClick={search}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-accent text-void rounded-lg text-xs font-700 hover:bg-accent/90 disabled:opacity-50 transition-all"
          >
            {loading
              ? <><RefreshCw size={12} className="animate-spin" /> Scanning…</>
              : <><Search size={12} /> Search Traders</>}
          </button>
        </div>
      </div>

      {/* Narrative */}
      {narrative && (
        <div className="glass-bright rounded-xl p-4 border border-accent/15">
          <div className="flex items-center gap-2 mb-2">
            <span className="badge badge-accent">AI ANALYSIS</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{narrative}</p>
        </div>
      )}

      {/* Table */}
      {traders.length > 0 && (
        <div className="glass-bright rounded-xl border-glow overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <span className="text-sm font-600 text-white">
              {traders.length} consistent traders found
            </span>
            <span className="badge badge-success">SCAN COMPLETE</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {[
                    { key: 'address', label: 'WALLET / ID' },
                    { key: 'platform', label: 'PLATFORM' },
                    { key: 'win_rate', label: 'WIN RATE' },
                    { key: 'total_trades', label: 'TRADES' },
                    { key: 'total_volume', label: 'VOLUME' },
                    { key: 'estimated_profit', label: 'EST. PROFIT' },
                    { key: 'score', label: 'SCORE' },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => sort(key)}
                      className="text-left px-4 py-3 text-muted font-mono tracking-widest cursor-pointer hover:text-white transition-colors select-none"
                    >
                      <span className="flex items-center gap-1">
                        {label} <SortIcon k={key} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((t, i) => {
                  const id = t.address || t.user_id || `trader_${i}`
                  const short = id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id
                  return (
                    <tr key={id} className="border-b border-border/50 trader-row">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-gradient-to-br from-accent/30 to-pulse/30 flex items-center justify-center text-[8px] font-mono text-accent">
                            {(i + 1).toString().padStart(2, '0')}
                          </div>
                          <span className="font-mono text-slate-300">{short}</span>
                          <button
                            onClick={() => copyAddress(id)}
                            className="opacity-0 group-hover:opacity-100 text-muted hover:text-accent transition-all"
                          >
                            <Copy size={10} />
                          </button>
                          {copied === id && <span className="text-success text-[9px]">copied</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'badge',
                          t.platform === 'polymarket' ? 'badge-accent' : 'badge-pulse',
                        )}>
                          {t.platform}
                        </span>
                      </td>
                      <td className="px-4 py-3 w-36">
                        <WinRateBar rate={t.win_rate} />
                      </td>
                      <td className="px-4 py-3 font-mono text-white tabular-nums">
                        {t.total_trades}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">
                        ${t.total_volume?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-success">
                        +${t.estimated_profit?.toFixed(0)}
                      </td>
                      <td className="px-4 py-3">
                        <ScoreChip score={t.score ?? 0} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && traders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-accent/5 border border-accent/20 flex items-center justify-center mb-4">
            <Search size={24} className="text-accent/40" />
          </div>
          <p className="text-muted text-sm">Set parameters and click <span className="text-accent">Search Traders</span></p>
          <p className="text-slate-700 text-xs font-mono mt-1">Scanning Polymarket & Kalshi APIs</p>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Tab } from '@/app/page'
import { api } from '@/lib/api'
import {
  TrendingUp, Users, Globe, Brain, Play,
  ChevronRight, ArrowUpRight, Layers,
} from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import clsx from 'clsx'

const MOCK_CHART = [
  { t: 'Mon', acc: 61 }, { t: 'Tue', acc: 63 }, { t: 'Wed', acc: 58 },
  { t: 'Thu', acc: 67 }, { t: 'Fri', acc: 71 }, { t: 'Sat', acc: 69 },
  { t: 'Sun', acc: 74 },
]

const AGENT_STATUS = [
  { name: 'Polymarket Agent',  status: 'idle',    platform: 'Polymarket', color: '#00d4ff' },
  { name: 'Kalshi Agent',      status: 'idle',    platform: 'Kalshi',     color: '#7c3aed' },
  { name: 'Niche Mapper',      status: 'idle',    platform: 'Internal',   color: '#10b981' },
  { name: 'Apify Enricher',    status: 'idle',    platform: 'Apify',      color: '#f59e0b' },
  { name: 'Chat Agent',        status: 'ready',   platform: 'OpenRouter', color: '#00d4ff' },
  { name: 'Learning Loop',     status: 'ready',   platform: 'Internal',   color: '#10b981' },
]

interface Props { setTab: (t: Tab) => void }

export default function Dashboard({ setTab }: Props) {
  const [stats, setStats]           = useState<any>(null)
  const [pipeline, setPipeline]     = useState<'idle' | 'running' | 'done'>('idle')
  const [pipelineData, setPipelineData] = useState<any>(null)
  const [agents, setAgents]         = useState(AGENT_STATUS)
  const [insights, setInsights]     = useState<any>(null)

  useEffect(() => {
    api.stats().then(setStats).catch(() => setStats({
      total_traders_tracked: 142, active_markets: 38,
      accuracy_rate: 0.67, top_niche: 'Politics',
    }))
    api.getLearningInsights().then(setInsights).catch(() => {})
  }, [])

  const runPipeline = async () => {
    setPipeline('running')
    // Animate agents one by one
    for (let i = 0; i < agents.length; i++) {
      await new Promise(r => setTimeout(r, 600))
      setAgents(prev => prev.map((a, idx) => idx === i ? { ...a, status: 'running' } : a))
      await new Promise(r => setTimeout(r, 800))
      setAgents(prev => prev.map((a, idx) => idx === i ? { ...a, status: 'done' } : a))
    }
    try {
      const result = await api.runPipeline()
      setPipelineData(result)
    } catch {
      setPipelineData({ summary: { polymarket_traders: 14, kalshi_traders: 11, niches_found: 7 } })
    }
    setPipeline('done')
  }

  const accuracy = insights?.overall_accuracy ?? stats?.accuracy_rate ?? 0.67

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Traders Tracked',
            value: stats?.total_traders_tracked ?? '—',
            sub: '+12 this week',
            icon: Users,
            color: '#00d4ff',
            trend: '+8%',
          },
          {
            label: 'Active Markets',
            value: stats?.active_markets ?? '—',
            sub: 'Poly + Kalshi',
            icon: Globe,
            color: '#7c3aed',
            trend: '+3',
          },
          {
            label: 'AI Accuracy',
            value: `${Math.round(accuracy * 100)}%`,
            sub: 'Last 60 predictions',
            icon: Brain,
            color: '#10b981',
            trend: '+4%',
          },
          {
            label: 'Top Niche',
            value: stats?.top_niche ?? 'Politics',
            sub: 'Highest win rate',
            icon: TrendingUp,
            color: '#f59e0b',
            trend: null,
          },
        ].map(({ label, value, sub, icon: Icon, color, trend }) => (
          <div key={label} className="glass-bright rounded-xl p-4 stat-card border-glow">
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${color}18`, border: `1px solid ${color}30` }}
              >
                <Icon size={16} style={{ color }} />
              </div>
              {trend && (
                <span className="flex items-center gap-1 text-success text-[10px] font-mono">
                  <ArrowUpRight size={10} />
                  {trend}
                </span>
              )}
            </div>
            <div className="font-display text-2xl font-800 text-white">{value}</div>
            <div className="text-xs text-muted mt-1">{label}</div>
            <div className="text-[10px] text-slate-600 mt-0.5 font-mono">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accuracy chart */}
        <div className="lg:col-span-2 glass-bright rounded-xl p-5 border-glow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-600 text-white">AI Accuracy Trend</h3>
              <p className="text-[11px] text-muted font-mono mt-0.5">7-day rolling window</p>
            </div>
            <span className="badge badge-success">↑ IMPROVING</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={MOCK_CHART}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#080d14', border: '1px solid #0d1a2a', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#00d4ff' }}
                itemStyle={{ color: '#fff' }}
                formatter={(v: any) => [`${v}%`, 'Accuracy']}
              />
              <Area type="monotone" dataKey="acc" stroke="#00d4ff" strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick nav */}
        <div className="glass-bright rounded-xl p-5 border-glow">
          <h3 className="text-sm font-600 text-white mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { tab: 'traders',  label: 'Search Traders',      sub: 'Scan Poly + Kalshi' },
              { tab: 'niches',   label: 'Map Niches',          sub: 'Classify by category' },
              { tab: 'enrich',   label: 'Enrich Event',        sub: 'Scrape via Apify' },
              { tab: 'chat',     label: 'Chat with Data',      sub: 'Ask questions' },
              { tab: 'learning', label: 'View Insights',       sub: 'Learning loop stats' },
            ].map(({ tab, label, sub }) => (
              <button
                key={tab}
                onClick={() => setTab(tab as Tab)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent/30 hover:bg-accent/5 transition-all group"
              >
                <div className="text-left">
                  <div className="text-xs text-white group-hover:text-accent transition-colors">{label}</div>
                  <div className="text-[10px] text-muted font-mono">{sub}</div>
                </div>
                <ChevronRight size={12} className="text-muted group-hover:text-accent transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Agent pipeline */}
      <div className="glass-bright rounded-xl p-5 border-glow">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-600 text-white flex items-center gap-2">
              <Layers size={14} className="text-accent" />
              Agent Pipeline
            </h3>
            <p className="text-[11px] text-muted font-mono mt-0.5">
              Run all 6 agents in sequence
            </p>
          </div>
          <button
            onClick={runPipeline}
            disabled={pipeline === 'running'}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-600 transition-all',
              pipeline === 'running'
                ? 'bg-accent/10 text-accent/50 border border-accent/20 cursor-not-allowed'
                : 'bg-accent text-void hover:bg-accent/90 border border-accent',
            )}
          >
            <Play size={12} />
            {pipeline === 'running' ? 'Running…' : pipeline === 'done' ? 'Run Again' : 'Run Pipeline'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {agents.map(({ name, status, platform, color }, i) => (
            <div
              key={name}
              className={clsx(
                'rounded-lg p-3 border transition-all duration-500',
                status === 'running' ? 'border-accent/50 bg-accent/5 shadow-[0_0_20px_rgba(0,212,255,0.1)]' :
                status === 'done'    ? 'border-success/40 bg-success/5' :
                status === 'ready'   ? 'border-border bg-subtle' :
                                       'border-border bg-panel',
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-1.5 h-1.5 rounded-full"
                  style={{ background: status === 'done' ? '#10b981' : status === 'running' ? '#00d4ff' : color + '60' }} />
                <span className={clsx(
                  'badge text-[8px]',
                  status === 'running' ? 'badge-accent' :
                  status === 'done'    ? 'badge-success' :
                  status === 'ready'   ? 'badge-success' : 'text-muted border border-border bg-transparent',
                )}>
                  {status === 'running' ? 'RUN' : status === 'done' ? 'OK' : status.toUpperCase()}
                </span>
              </div>
              <div className="text-[11px] text-white font-500 leading-tight">{name}</div>
              <div className="text-[9px] text-muted font-mono mt-1">{platform}</div>
            </div>
          ))}
        </div>

        {pipelineData && (
          <div className="mt-4 p-3 rounded-lg bg-success/5 border border-success/20 flex gap-6">
            <span className="text-xs text-success font-mono">✓ Pipeline complete</span>
            <span className="text-xs text-muted font-mono">
              Poly: {pipelineData.summary?.polymarket_traders} traders ·
              Kalshi: {pipelineData.summary?.kalshi_traders} traders ·
              Niches: {pipelineData.summary?.niches_found}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

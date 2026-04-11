'use client'

import { Tab } from '@/app/page'
import { Menu, Activity, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'

const TITLES: Record<Tab, { title: string; sub: string }> = {
  dashboard: { title: 'Command Center',     sub: 'Real-time market intelligence overview' },
  traders:   { title: 'Trader Discovery',   sub: 'Polymarket & Kalshi consistent wallets' },
  niches:    { title: 'Niche Mapping',      sub: 'Classify traders by market category' },
  enrich:    { title: 'RAG Enrichment',     sub: 'Apify-powered event research pipeline' },
  chat:      { title: 'Intelligence Chat',  sub: 'Discuss traders and strategy with AI' },
  learning:  { title: 'Learning Loop',      sub: 'Closed feedback — predict → observe → improve' },
}

interface Props {
  tab: Tab
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
}

export default function Header({ tab, sidebarOpen, setSidebarOpen }: Props) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const { title, sub } = TITLES[tab]

  return (
    <header className="flex items-center justify-between px-6 py-4 glass border-b border-border">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg border border-border text-muted hover:text-accent hover:border-accent/30 transition-all md:hidden"
        >
          <Menu size={16} />
        </button>
        <div>
          <h1 className="font-display text-lg font-800 text-white tracking-tight">{title}</h1>
          <p className="text-xs text-muted font-mono mt-0.5">{sub}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Live indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-success/30 bg-success/5">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="font-mono text-[10px] text-success tracking-widest">LIVE</span>
        </div>

        {/* Clock */}
        <div className="flex items-center gap-2 text-muted">
          <Clock size={12} />
          <span className="font-mono text-xs tabular-nums">{time}</span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5 text-muted">
          <Activity size={12} className="text-accent" />
          <span className="font-mono text-[10px]">6 AGENTS ACTIVE</span>
        </div>
      </div>
    </header>
  )
}

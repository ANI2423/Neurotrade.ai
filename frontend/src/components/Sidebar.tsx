'use client'

import { Tab } from '@/app/page'
import {
  LayoutDashboard, Users, Tag, Search,
  MessageSquare, Brain, ChevronLeft, ChevronRight,
  Zap,
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { id: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard, badge: null },
  { id: 'traders',   label: 'Traders',      icon: Users,           badge: 'LIVE' },
  { id: 'niches',    label: 'Niche Map',    icon: Tag,             badge: null },
  { id: 'enrich',    label: 'Enrich RAG',   icon: Search,          badge: null },
  { id: 'chat',      label: 'Chat',         icon: MessageSquare,   badge: null },
  { id: 'learning',  label: 'Learning Loop',icon: Brain,           badge: 'NEW' },
] as const

interface Props {
  active: Tab
  setTab: (t: Tab) => void
  open: boolean
  setOpen: (v: boolean) => void
}

export default function Sidebar({ active, setTab, open, setOpen }: Props) {
  return (
    <aside
      className={clsx(
        'relative flex flex-col glass border-r border-border transition-all duration-300 z-20',
        open ? 'w-56' : 'w-16',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-pulse flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-success rounded-full border-2 border-void" />
        </div>
        {open && (
          <div>
            <div className="font-display text-sm font-800 text-white tracking-tight">NEUROTRADE</div>
            <div className="font-mono text-[9px] text-accent/70 tracking-widest">AI INTEL PLATFORM</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV.map(({ id, label, icon: Icon, badge }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => setTab(id as Tab)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative',
                isActive
                  ? 'bg-accent/10 text-accent border border-accent/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent',
              )}
            >
              <Icon size={16} className={clsx('flex-shrink-0', isActive && 'drop-shadow-[0_0_6px_rgba(0,212,255,0.8)]')} />
              {open && (
                <>
                  <span className="font-medium text-xs tracking-wide">{label}</span>
                  {badge && (
                    <span className={clsx(
                      'ml-auto badge text-[8px]',
                      badge === 'LIVE' ? 'badge-success' : 'badge-pulse',
                    )}>
                      {badge}
                    </span>
                  )}
                </>
              )}
              {/* Tooltip when collapsed */}
              {!open && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-panel border border-border rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {label}
                </div>
              )}
            </button>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center m-3 p-2 rounded-lg border border-border text-muted hover:text-accent hover:border-accent/30 transition-all"
      >
        {open ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
    </aside>
  )
}

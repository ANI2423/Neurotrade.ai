'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import Dashboard from '@/components/Dashboard'
import TradersPanel from '@/components/TradersPanel'
import NichePanel from '@/components/NichePanel'
import EnrichPanel from '@/components/EnrichPanel'
import ChatPanel from '@/components/ChatPanel'
import LearningPanel from '@/components/LearningPanel'

export type Tab = 'dashboard' | 'traders' | 'niches' | 'enrich' | 'chat' | 'learning'

export default function Home() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden bg-void">
      {/* Scanline effect */}
      <div className="scanline" />

      {/* Sidebar */}
      <Sidebar active={tab} setTab={setTab} open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header tab={tab} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 overflow-y-auto p-6">
          {tab === 'dashboard' && <Dashboard setTab={setTab} />}
          {tab === 'traders'   && <TradersPanel />}
          {tab === 'niches'    && <NichePanel />}
          {tab === 'enrich'    && <EnrichPanel />}
          {tab === 'chat'      && <ChatPanel />}
          {tab === 'learning'  && <LearningPanel />}
        </main>
      </div>
    </div>
  )
}

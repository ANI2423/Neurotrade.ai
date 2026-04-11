'use client'

import { useState, useRef, useEffect } from 'react'
import { api, streamChat } from '@/lib/api'
import { Send, Bot, User, Trash2, Sparkles } from 'lucide-react'
import clsx from 'clsx'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: string
}

const STARTER_QUESTIONS = [
  'Which traders should I copy on Polymarket right now?',
  'Compare top Kalshi traders by niche',
  'What is the best niche for copy trading?',
  'Explain the learning loop performance',
]

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm NeuroTrade AI. I have access to Polymarket & Kalshi trader data, niche classifications, and enriched market research. Ask me anything about traders, markets, or copy-trading strategy.",
      ts: new Date().toLocaleTimeString(),
    },
  ])
  const [input, setInput]       = useState('')
  const [streaming, setStreaming] = useState(false)
  const endRef                  = useRef<HTMLDivElement>(null)
  const textareaRef             = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text?: string) => {
    const msg = text ?? input.trim()
    if (!msg || streaming) return

    setInput('')
    const ts = new Date().toLocaleTimeString()
    setMessages(prev => [...prev, { role: 'user', content: msg, ts }])

    // Add placeholder assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '', ts: new Date().toLocaleTimeString() }])
    setStreaming(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      let full = ''

      try {
        // Try streaming first
        for await (const chunk of streamChat(msg, undefined, history)) {
          full += chunk
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { ...updated[updated.length - 1], content: full }
            return updated
          })
        }
      } catch {
        // Fallback to non-streaming
        const r = await api.chat(msg, undefined, history)
        full = r.data?.response ?? 'Sorry, I encountered an error.'
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: full }
          return updated
        })
      }
    } catch (e) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Connection error. Please check the backend is running.',
        }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  const clear = () => setMessages([{
    role: 'assistant',
    content: "Chat cleared. How can I help with your prediction market strategy?",
    ts: new Date().toLocaleTimeString(),
  }])

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] glass-bright rounded-xl border-glow overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/30 to-pulse/30 flex items-center justify-center">
            <Bot size={14} className="text-accent" />
          </div>
          <div>
            <div className="text-xs font-600 text-white">NeuroTrade AI</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[9px] font-mono text-success">ONLINE</span>
            </div>
          </div>
        </div>
        <button
          onClick={clear}
          className="p-2 rounded-lg border border-border text-muted hover:text-danger hover:border-danger/30 transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={clsx('flex gap-3', m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
          >
            {/* Avatar */}
            <div className={clsx(
              'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
              m.role === 'user'
                ? 'bg-gradient-to-br from-pulse/40 to-accent/20'
                : 'bg-gradient-to-br from-accent/20 to-pulse/20',
            )}>
              {m.role === 'user'
                ? <User size={12} className="text-white" />
                : <Bot size={12} className="text-accent" />}
            </div>

            {/* Bubble */}
            <div className={clsx(
              'max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed',
              m.role === 'user' ? 'chat-user' : 'chat-ai',
            )}>
              {m.content === '' && streaming ? (
                <span className="flex gap-1 py-1">
                  <span className="dot-1 w-1.5 h-1.5 rounded-full bg-accent/60" />
                  <span className="dot-2 w-1.5 h-1.5 rounded-full bg-accent/60" />
                  <span className="dot-3 w-1.5 h-1.5 rounded-full bg-accent/60" />
                </span>
              ) : (
                <p className="whitespace-pre-wrap text-slate-200">{m.content}</p>
              )}
              <div className="text-[9px] text-muted font-mono mt-1.5 text-right">{m.ts}</div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Starter questions */}
      {messages.length <= 1 && (
        <div className="px-5 pb-3 flex flex-wrap gap-2">
          {STARTER_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => send(q)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-[11px] text-muted hover:text-accent hover:border-accent/30 transition-all font-mono"
            >
              <Sparkles size={9} />
              {q.length > 42 ? q.slice(0, 40) + '…' : q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-5 py-4 border-t border-border">
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder="Ask about traders, copy strategies, market events…"
            rows={1}
            className="flex-1 bg-panel border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-muted focus:outline-none focus:border-accent/40 resize-none font-body transition-colors"
            style={{ minHeight: 44, maxHeight: 120 }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || streaming}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent disabled:opacity-30 flex items-center justify-center hover:bg-accent/90 transition-all"
          >
            <Send size={14} className="text-void" />
          </button>
        </div>
        <div className="text-[9px] text-slate-700 font-mono mt-2 text-center">
          Powered by OpenRouter · Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}

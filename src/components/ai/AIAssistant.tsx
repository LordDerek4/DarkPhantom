import React, { useState, useRef, useEffect } from 'react'
import { Bot, Send, Loader, ThumbsUp, ThumbsDown, X, Sparkles, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/helpers'
import { runAICommand } from '@/services/ai.service'
import { useAuth } from '@/hooks/useAuth'
import type { AICommandType } from '@/types/extended'
import toast from 'react-hot-toast'

// Inline simple markdown renderer since we might not have react-markdown
function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1 text-sm text-pulse-text-normal leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) return <h1 key={i} className="font-bold text-base">{line.slice(2)}</h1>
        if (line.startsWith('## ')) return <h2 key={i} className="font-semibold">{line.slice(3)}</h2>
        if (line.startsWith('- ')) return <div key={i} className="flex gap-2"><span className="text-pulse-brand">•</span><span>{line.slice(2)}</span></div>
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold">{line.slice(2, -2)}</p>
        if (line.trim() === '') return <br key={i} />
        return <p key={i}>{line}</p>
      })}
    </div>
  )
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  command?: AICommandType
  timestamp: Date
}

interface AIAssistantProps {
  channelId: string
  serverId: string
  onClose: () => void
}

const COMMANDS: { cmd: AICommandType; label: string; desc: string; placeholder: string }[] = [
  { cmd: 'ask', label: '/ask', desc: 'Ask anything', placeholder: 'Ask a question about this server...' },
  { cmd: 'summarize', label: '/summarize', desc: 'Summarize conversation', placeholder: 'Focus on... (or leave blank for general)' },
  { cmd: 'notes', label: '/notes', desc: 'Create meeting notes', placeholder: 'Additional context (optional)...' },
  { cmd: 'explain', label: '/explain', desc: 'Explain a topic', placeholder: 'What should I explain?' },
  { cmd: 'faq', label: '/faq', desc: 'Generate FAQ', placeholder: 'Generate FAQ from recent messages' },
  { cmd: 'announce', label: '/announce', desc: 'Draft announcement', placeholder: 'What to announce?' },
]

export function AIAssistant({ channelId, serverId, onClose }: AIAssistantProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeCommand, setActiveCommand] = useState<AICommandType>('ask')
  const [showCommands, setShowCommands] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading || !user) return

    const userMsg: Message = {
      id: Date.now().toString(), role: 'user', content: input, command: activeCommand, timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    const inputCopy = input
    setInput('')
    setLoading(true)

    try {
      const response = await runAICommand(activeCommand, inputCopy, channelId, serverId, user.uid)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant', content: response, timestamp: new Date(),
      }])
    } catch (err) {
      toast.error('AI unavailable — add VITE_ANTHROPIC_API_KEY to .env')
      setMessages(prev => prev.filter(m => m.id !== userMsg.id))
    } finally {
      setLoading(false)
    }
  }

  const activeCmd = COMMANDS.find(c => c.cmd === activeCommand)!

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-80 flex flex-col bg-pulse-bg-secondary border-l border-black/20 h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-black/20 shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pulse-brand to-red-500 flex items-center justify-center">
          <Sparkles size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-pulse-text-normal">AI Assistant</p>
          <p className="text-xs text-pulse-text-muted">Powered by Claude</p>
        </div>
        <button onClick={onClose} className="text-pulse-text-muted hover:text-pulse-text-normal">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pulse-brand/20 to-red-500/20 flex items-center justify-center mx-auto mb-3">
              <Bot size={24} className="text-pulse-brand" />
            </div>
            <p className="text-sm font-medium text-pulse-text-normal">AevixChat AI</p>
            <p className="text-xs text-pulse-text-muted mt-1">Ask me anything about this server</p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {COMMANDS.map(c => (
                <button
                  key={c.cmd}
                  onClick={() => { setActiveCommand(c.cmd); setInput('') }}
                  className="p-2 rounded-lg bg-pulse-bg-primary text-xs text-left hover:bg-white/5 transition-colors"
                >
                  <span className="font-mono text-pulse-brand">{c.label}</span>
                  <p className="text-pulse-text-muted mt-0.5">{c.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pulse-brand to-red-500 flex items-center justify-center shrink-0 mt-1">
                <Sparkles size={10} className="text-white" />
              </div>
            )}
            <div className={cn(
              'max-w-[85%] rounded-xl px-3 py-2',
              msg.role === 'user'
                ? 'bg-pulse-brand text-white rounded-tr-sm'
                : 'bg-pulse-bg-primary text-pulse-text-normal rounded-tl-sm'
            )}>
              {msg.role === 'assistant'
                ? <SimpleMarkdown text={msg.content} />
                : <p className="text-sm">{msg.content}</p>
              }
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pulse-brand to-red-500 flex items-center justify-center shrink-0">
              <Sparkles size={10} className="text-white" />
            </div>
            <div className="px-3 py-2 rounded-xl bg-pulse-bg-primary flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-pulse-brand animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Command selector + Input */}
      <div className="p-3 border-t border-black/20 space-y-2 shrink-0">
        {/* Command picker */}
        <div className="relative">
          <button
            onClick={() => setShowCommands(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pulse-bg-primary text-xs font-mono text-pulse-brand hover:bg-white/5 w-full"
          >
            <span>{activeCmd.label}</span>
            <span className="text-pulse-text-muted font-sans">{activeCmd.desc}</span>
            <ChevronDown size={12} className={cn('ml-auto transition-transform', showCommands && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {showCommands && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute bottom-full mb-1 left-0 right-0 bg-pulse-bg-elevated border border-white/10 rounded-lg overflow-hidden z-10"
              >
                {COMMANDS.map(c => (
                  <button
                    key={c.cmd}
                    onClick={() => { setActiveCommand(c.cmd); setShowCommands(false) }}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-white/5',
                      c.cmd === activeCommand && 'bg-pulse-brand/10'
                    )}
                  >
                    <span className="font-mono text-pulse-brand w-20 shrink-0">{c.label}</span>
                    <span className="text-pulse-text-muted">{c.desc}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={activeCmd.placeholder}
            className="flex-1 bg-pulse-bg-primary rounded-lg px-3 py-2 text-sm text-pulse-text-normal placeholder:text-pulse-text-muted outline-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-2 rounded-lg bg-pulse-brand text-white hover:bg-pulse-brand-hover disabled:opacity-40 transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

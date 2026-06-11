import React, { useEffect, useRef, useState } from 'react'
import { MessageSquare, Check, X, ChevronRight, Hash } from 'lucide-react'
import { cn } from '@/utils/helpers'
import {
  subscribeToChannelThreads,
  subscribeToThreadMessages,
  replyToThread,
  resolveThread,
  createThread,
} from '@/services/threads.service'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { Avatar } from '@/components/ui/Avatar'
import type { Thread, ThreadMessage } from '@/types/extended'

interface ThreadPanelProps {
  channelId: string
  serverId: string
  onClose: () => void
}

function ThreadView({ thread, onBack }: { thread: Thread; onBack: () => void }) {
  const { user } = useAuth()
  const users = useAppStore(s => s.users)
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return subscribeToThreadMessages(thread.id, setMessages)
  }, [thread.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || !user || sending) return
    setSending(true)
    try {
      await replyToThread(thread.id, thread.channelId, thread.serverId, user.uid, input.trim())
      setInput('')
    } finally {
      setSending(false)
    }
  }

  const isOwner = user?.uid === thread.createdBy

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-black/20 shrink-0">
        <button onClick={onBack} className="text-pulse-text-muted hover:text-pulse-text-normal">
          <ChevronRight size={16} className="rotate-180" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-pulse-text-normal truncate">{thread.title}</p>
          <p className="text-xs text-pulse-text-muted">{thread.replyCount} replies</p>
        </div>
        {!thread.isResolved && isOwner && (
          <button
            onClick={() => resolveThread(thread.id, user.uid)}
            className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300"
          >
            <Check size={12} />Resolve
          </button>
        )}
        {thread.isResolved && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <Check size={12} />Resolved
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {messages.map(msg => {
          const author = users[msg.authorId]
          return (
            <div key={msg.id} className="flex items-start gap-2">
              <Avatar src={author?.avatarUrl} name={author?.displayName ?? '?'} userId={msg.authorId} size="sm" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-pulse-text-normal">{author?.displayName ?? 'Unknown'}</span>
                  <span className="text-xs text-pulse-text-muted">
                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <p className="text-sm text-pulse-text-normal mt-0.5">{msg.content}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {!thread.isResolved && (
        <div className="p-3 border-t border-black/20 shrink-0">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Reply to thread..."
              className="flex-1 bg-pulse-bg-primary rounded-lg px-3 py-2 text-sm text-pulse-text-normal placeholder:text-pulse-text-muted outline-none"
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className="px-3 py-2 bg-pulse-brand text-white text-xs rounded-lg disabled:opacity-50 hover:bg-pulse-brand-hover transition-colors"
            >
              Reply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function ThreadPanel({ channelId, serverId, onClose }: ThreadPanelProps) {
  const { user } = useAuth()
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeThread, setActiveThread] = useState<Thread | null>(null)

  useEffect(() => {
    return subscribeToChannelThreads(channelId, setThreads)
  }, [channelId])

  if (activeThread) {
    return (
      <div className="w-80 flex flex-col bg-pulse-bg-secondary border-l border-black/20 h-full">
        <ThreadView thread={activeThread} onBack={() => setActiveThread(null)} />
      </div>
    )
  }

  return (
    <div className="w-80 flex flex-col bg-pulse-bg-secondary border-l border-black/20 h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/20 shrink-0">
        <h3 className="font-semibold text-pulse-text-normal flex items-center gap-2">
          <MessageSquare size={14} />
          Threads
        </h3>
        <button onClick={onClose} className="text-pulse-text-muted hover:text-pulse-text-normal">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {threads.length === 0 && (
          <div className="text-center py-8 text-pulse-text-muted">
            <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No threads yet</p>
            <p className="text-xs mt-1">Reply to a message to start a thread</p>
          </div>
        )}

        {threads.map(thread => (
          <button
            key={thread.id}
            onClick={() => setActiveThread(thread)}
            className="w-full text-left p-3 rounded-xl bg-pulse-bg-primary hover:bg-white/5 transition-colors space-y-1"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-pulse-text-normal truncate">{thread.title}</p>
              {thread.isResolved && (
                <span className="flex items-center gap-0.5 text-xs text-green-400 shrink-0 ml-2">
                  <Check size={10} />Done
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-pulse-text-muted">
              <MessageSquare size={10} />
              <span>{thread.replyCount} replies</span>
              <span>•</span>
              <span>{thread.participantIds.length} participants</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

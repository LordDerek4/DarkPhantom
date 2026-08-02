import React, { useEffect, useState } from 'react'
import { Pin, X, PinOff } from 'lucide-react'
import { subscribeToPinnedMessages, unpinMessage } from '@/services/message.service'
import { useAppStore } from '@/store/useAppStore'
import { Avatar } from '@/components/ui/Avatar'
import type { Message } from '@/types'

interface PinnedMessagesPanelProps {
  channelId: string
  onClose: () => void
}

export function PinnedMessagesPanel({ channelId, onClose }: PinnedMessagesPanelProps) {
  const users = useAppStore(s => s.users)
  const [messages, setMessages] = useState<Message[]>([])
  const [unpinningId, setUnpinningId] = useState<string | null>(null)

  useEffect(() => {
    return subscribeToPinnedMessages(channelId, setMessages)
  }, [channelId])

  const handleUnpin = async (messageId: string) => {
    setUnpinningId(messageId)
    try {
      await unpinMessage(messageId)
    } finally {
      setUnpinningId(null)
    }
  }

  return (
    <div className="w-80 flex flex-col bg-pulse-bg-secondary border-l border-black/20 h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/20 shrink-0">
        <h3 className="font-semibold text-pulse-text-normal flex items-center gap-2">
          <Pin size={14} />
          Pinned Messages
        </h3>
        <button onClick={onClose} className="text-pulse-text-muted hover:text-pulse-text-normal">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {messages.length === 0 && (
          <div className="text-center py-8 text-pulse-text-muted">
            <Pin size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No pinned messages</p>
            <p className="text-xs mt-1">Pin a message to see it here</p>
          </div>
        )}

        {messages.map(msg => {
          const author = users[msg.authorId]
          return (
            <div key={msg.id} className="group p-3 rounded-xl bg-pulse-bg-primary space-y-1.5">
              <div className="flex items-start gap-2">
                <Avatar src={author?.avatarUrl} name={author?.displayName ?? '?'} userId={msg.authorId} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-pulse-text-normal">{author?.displayName ?? 'Unknown'}</span>
                    <span className="text-xs text-pulse-text-muted">
                      {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-sm text-pulse-text-normal mt-0.5 break-words">{msg.content}</p>
                </div>
                <button
                  onClick={() => handleUnpin(msg.id)}
                  disabled={unpinningId === msg.id}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-pulse-text-muted hover:text-pulse-text-normal transition-opacity disabled:opacity-50 shrink-0"
                  title="Unpin message"
                >
                  <PinOff size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

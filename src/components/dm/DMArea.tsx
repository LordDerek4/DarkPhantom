import React, { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useDMMessages } from '@/hooks/useDirectMessages'
import { useUser } from '@/hooks/useUserCache'
import { useAuth } from '@/hooks/useAuth'
import { MessageInput } from '@/components/chat/MessageInput'
import { Avatar } from '@/components/ui/Avatar'
import { MessageSkeleton } from '@/components/ui/LoadingSkeleton'
import { formatMessageTime, formatMessageDate, cn } from '@/utils/helpers'
import { isSameDay } from 'date-fns'
import type { DirectMessage } from '@/types'

export function DMArea() {
  const { activeDMChannelId, dmChannels } = useAppStore()
  const { user } = useAuth()
  const bottomRef = useRef<HTMLDivElement>(null)

  const activeChannel = dmChannels.find(c => c.id === activeDMChannelId)
  const partnerId = activeChannel?.participantIds.find(id => id !== user?.uid)
  const partner = useUser(partnerId ?? null)

  const { messages, loading, send, edit, remove } = useDMMessages(activeDMChannelId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (!activeChannel || !partner) {
    return (
      <div className="flex-1 flex items-center justify-center text-pulse-text-muted">
        Select a conversation
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-1">
        {/* Conversation header */}
        {!loading && (
          <div className="flex flex-col items-start pb-6">
            <Avatar src={partner.avatarUrl} name={partner.displayName} userId={partner.uid} size="xl" showStatus />
            <h2 className="mt-3 text-2xl font-bold text-white">{partner.displayName}</h2>
            <p className="text-pulse-text-muted text-sm">@{partner.username}</p>
            <p className="text-pulse-text-muted text-sm mt-2">
              This is the beginning of your direct message history with{' '}
              <strong className="text-white">{partner.displayName}</strong>.
            </p>
          </div>
        )}

        {loading && (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => <MessageSkeleton key={i} />)}
          </div>
        )}

        {messages.map((msg, idx) => {
          const prev = messages[idx - 1]
          const showDate = !prev || !isSameDay(
            msg.createdAt?.toDate?.() ?? new Date(),
            prev.createdAt?.toDate?.() ?? new Date()
          )
          const isGrouped = !showDate && prev?.authorId === msg.authorId &&
            msg.createdAt?.toMillis?.() - prev.createdAt?.toMillis?.() < 5 * 60 * 1000

          return (
            <React.Fragment key={msg.id}>
              {showDate && (
                <div className="flex items-center gap-4 my-4">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs font-semibold text-pulse-text-muted">
                    {formatMessageDate(msg.createdAt)}
                  </span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
              )}
              <DMMessageItem
                message={msg}
                isOwn={msg.authorId === user?.uid}
                isGrouped={!!isGrouped}
                onEdit={edit}
                onDelete={remove}
                authorName={msg.authorId === user?.uid ? user?.displayName ?? '' : partner.displayName}
                authorAvatar={msg.authorId === user?.uid ? user?.avatarUrl ?? null : partner.avatarUrl}
              />
            </React.Fragment>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-4 pt-2 shrink-0">
        <MessageInput
          channelName={partner.displayName}
          onSend={async (content, options) => {
            if (partnerId) await send(content, partnerId, options?.replyToId)
          }}
          onTypingStart={() => {}}
          onTypingStop={() => {}}
          members={[]}
          users={{}}
        />
      </div>
    </div>
  )
}

function DMMessageItem({
  message,
  isOwn,
  isGrouped,
  onEdit,
  onDelete,
  authorName,
  authorAvatar,
}: {
  message: DirectMessage
  isOwn: boolean
  isGrouped: boolean
  onEdit: (id: string, content: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  authorName: string
  authorAvatar: string | null
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="flex items-start gap-3 group px-2 py-0.5 hover:bg-white/[0.02] rounded"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!isGrouped ? (
        <Avatar src={authorAvatar} name={authorName} size="sm" className="mt-0.5 shrink-0" />
      ) : (
        <div className="w-8 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        {!isGrouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-semibold text-white">{authorName}</span>
            <span className="text-[11px] text-pulse-text-muted">
              {message.createdAt ? formatMessageTime(message.createdAt) : ''}
            </span>
          </div>
        )}
        <p className={cn(
          'text-sm leading-relaxed break-words',
          isOwn ? 'text-pulse-text-normal' : 'text-pulse-text-normal'
        )}>
          {message.content}
        </p>
        {message.isEdited && <span className="text-[10px] text-pulse-text-muted">(edited)</span>}
      </div>
    </div>
  )
}

// eslint-disable-next-line
function useState<T>(initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  return React.useState(initial)
}

import React, { useState, useMemo } from 'react'
import { isSameDay } from 'date-fns'
import { MessageItem } from './MessageItem'
import { formatMessageDate } from '@/utils/helpers'
import type { Message, ServerMember, Role, User } from '@/types'

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  onEdit: (messageId: string, content: string) => Promise<void>
  onDelete: (messageId: string) => Promise<void>
  onReact: (messageId: string, emoji: string, emojiName: string) => Promise<void>
  onPin: (messageId: string) => Promise<void>
  onReply: (message: Message) => void
  members: ServerMember[]
  roles: Role[]
  serverId: string
}

export function MessageList({
  messages,
  currentUserId,
  onEdit,
  onDelete,
  onReact,
  onPin,
  onReply,
  members,
  roles,
  serverId,
}: MessageListProps) {
  // Group consecutive messages from the same author within 5 minutes
  const groups = useMemo(() => {
    const result: { messages: Message[]; isGrouped: boolean }[] = []
    let lastDate: Date | null = null
    let lastGroup: typeof result[0] | null = null

    for (const msg of messages) {
      const msgDate = msg.createdAt?.toDate?.() ?? new Date()

      if (lastDate && !isSameDay(lastDate, msgDate)) {
        result.push({ messages: [{ ...msg, type: 'system' as never }], isGrouped: false })
        lastDate = msgDate
        lastGroup = null
        continue
      }

      const prev = lastGroup?.messages[lastGroup.messages.length - 1]
      const shouldGroup =
        prev &&
        prev.authorId === msg.authorId &&
        prev.type === 'default' &&
        msg.type === 'default' &&
        msg.createdAt?.toMillis() - prev.createdAt?.toMillis() < 5 * 60 * 1000

      if (shouldGroup && lastGroup) {
        lastGroup.messages.push(msg)
      } else {
        lastGroup = { messages: [msg], isGrouped: false }
        result.push(lastGroup)
      }

      lastDate = msgDate
    }

    return result
  }, [messages])

  return (
    <div className="flex flex-col gap-0.5 py-2">
      {messages.map((msg, idx) => {
        const prev = messages[idx - 1]
        const isGrouped =
          prev &&
          prev.authorId === msg.authorId &&
          prev.type === 'default' &&
          msg.type === 'default' &&
          msg.createdAt?.toMillis?.() - prev.createdAt?.toMillis?.() < 5 * 60 * 1000

        // Date divider
        const showDateDivider =
          !prev || !isSameDay(
            msg.createdAt?.toDate?.() ?? new Date(),
            prev.createdAt?.toDate?.() ?? new Date()
          )

        return (
          <React.Fragment key={msg.id}>
            {showDateDivider && (
              <DateDivider date={msg.createdAt ? formatMessageDate(msg.createdAt) : ''} />
            )}
            <MessageItem
              message={msg}
              isGrouped={!!isGrouped}
              currentUserId={currentUserId}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={onReact}
              onPin={onPin}
              onReply={onReply}
              members={members}
              roles={roles}
            />
          </React.Fragment>
        )
      })}
    </div>
  )
}

function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-4 px-4 my-4">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-xs font-semibold text-pulse-text-muted">{date}</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  )
}

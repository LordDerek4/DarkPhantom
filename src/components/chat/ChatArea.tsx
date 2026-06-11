import React, { useEffect, useRef } from 'react'
import { Hash, Megaphone, WifiOff } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useServerDetails } from '@/hooks/useServer'
import { useMessages } from '@/hooks/useMessages'
import { useTypingIndicator } from '@/hooks/usePresence'
import { useAuth } from '@/hooks/useAuth'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { TypingIndicator } from './TypingIndicator'
import { MessageSkeleton } from '@/components/ui/LoadingSkeleton'
import { markChannelAsRead } from '@/services/channel.service'

export function ChatArea() {
  const { activeChannelId, activeServerId, markRead } = useAppStore()
  const { user } = useAuth()
  const { channels, members, roles, currentMember } = useServerDetails(activeServerId)
  const { messages, loading, loadingMore, hasMore, loadMore, send, edit, remove, react, pin, unpin, startTyping, stopTyping } = useMessages(activeChannelId)
  const typingUsers = useTypingIndicator(activeChannelId, user?.uid ?? '')
  const bottomRef = useRef<HTMLDivElement>(null)
  const isFirstLoad = useRef(true)

  const activeChannel = channels.find(c => c.id === activeChannelId)

  // Auto-scroll on new messages
  useEffect(() => {
    if (!loading && messages.length > 0) {
      if (isFirstLoad.current) {
        bottomRef.current?.scrollIntoView()
        isFirstLoad.current = false
      } else {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [messages.length, loading])

  // Reset on channel change
  useEffect(() => {
    isFirstLoad.current = true
  }, [activeChannelId])

  // Mark channel as read when entering
  useEffect(() => {
    if (activeChannelId && messages.length > 0 && user) {
      const lastMsg = messages[messages.length - 1]
      markChannelAsRead(activeChannelId, user.uid, lastMsg.id)
      markRead(activeChannelId)
    }
  }, [activeChannelId, messages.length, user?.uid])

  if (!activeChannel) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-pulse-text-muted">
          <WifiOff size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">Select a channel to start chatting</p>
        </div>
      </div>
    )
  }

  const canSend = currentMember
    ? true // simplified - would check real permissions
    : false

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col">
        {/* Channel welcome header */}
        {!hasMore && !loadingMore && (
          <div className="px-4 pt-8 pb-4">
            <div className="w-16 h-16 rounded-full bg-pulse-bg-elevated flex items-center justify-center mb-4">
              {activeChannel.type === 'announcement'
                ? <Megaphone size={32} className="text-pulse-text-muted" />
                : <Hash size={32} className="text-pulse-text-muted" />
              }
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">
              Welcome to #{activeChannel.name}!
            </h2>
            {activeChannel.topic && (
              <p className="text-pulse-text-muted">{activeChannel.topic}</p>
            )}
            <p className="text-pulse-text-muted text-sm mt-1">
              This is the start of the #{activeChannel.name} channel.
            </p>
          </div>
        )}

        {/* Load more button */}
        {hasMore && (
          <div className="flex justify-center py-2">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="text-xs text-pulse-brand hover:underline disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, i) => <MessageSkeleton key={i} />)}
          </div>
        ) : (
          <MessageList
            messages={messages}
            onEdit={edit}
            onDelete={remove}
            onReact={react}
            onPin={pin}
            onReply={() => {}}
            currentUserId={user?.uid ?? ''}
            members={members}
            roles={roles}
            serverId={activeServerId ?? ''}
          />
        )}

        {/* Typing indicator */}
        <TypingIndicator typingUsers={typingUsers} />

        <div ref={bottomRef} />
      </div>

      {/* Message input */}
      <div className="px-4 pb-4 pt-2 shrink-0">
        <MessageInput
          channelName={activeChannel.name}
          disabled={!canSend}
          onSend={send}
          onTypingStart={startTyping}
          onTypingStop={stopTyping}
          members={members}
          users={useAppStore.getState().users}
        />
      </div>
    </div>
  )
}

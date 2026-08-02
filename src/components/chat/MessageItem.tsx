import React, { useState, useRef } from 'react'
import { Edit2, Trash2, Pin, PinOff, Reply, MoreHorizontal, Check, X, SmilePlus, Crown } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, formatMessageTime, formatFullDateTime } from '@/utils/helpers'
import { Avatar } from '@/components/ui/Avatar'
import { Tooltip } from '@/components/ui/Tooltip'
import { useUser } from '@/hooks/useUserCache'
import { useAppStore } from '@/store/useAppStore'
import type { Message, ServerMember, Role } from '@/types'
import EmojiPicker from 'emoji-picker-react'

interface MessageItemProps {
  message: Message
  isGrouped: boolean
  currentUserId: string
  onEdit: (messageId: string, content: string) => Promise<void>
  onDelete: (messageId: string) => Promise<void>
  onReact: (messageId: string, emoji: string, emojiName: string) => Promise<void>
  onPin: (messageId: string) => Promise<void>
  onUnpin: (messageId: string) => Promise<void>
  onReply: (message: Message) => void
  members: ServerMember[]
  roles: Role[]
}

export function MessageItem({
  message,
  isGrouped,
  currentUserId,
  onEdit,
  onDelete,
  onReact,
  onPin,
  onUnpin,
  onReply,
  members,
  roles,
}: MessageItemProps) {
  const author = useUser(message.authorId)
  const replyAuthor = useUser(message.replyToAuthorId ?? null)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [hovered, setHovered] = useState(false)
  const { setUserProfileId } = useAppStore()

  const isOwn = message.authorId === currentUserId
  const member = members.find(m => m.userId === message.authorId)

  const handleEdit = async () => {
    if (editContent.trim() && editContent !== message.content) {
      await onEdit(message.id, editContent.trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEdit()
    }
    if (e.key === 'Escape') {
      setEditContent(message.content)
      setIsEditing(false)
    }
  }

  const renderContent = (content: string) => {
    // Highlight @mentions
    return content.replace(/@(\w+)/g, '<span class="bg-pulse-brand/20 text-pulse-brand rounded px-0.5">@$1</span>')
  }

  if (message.type === 'system') {
    return (
      <div className="flex items-center gap-2 px-4 py-0.5">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-pulse-text-muted">{message.content}</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative flex items-start gap-4 px-4 py-0.5 group',
        'hover:bg-white/[0.02] rounded-sm transition-colors',
        message.isPinned && 'bg-yellow-500/5 border-l-2 border-yellow-500/50'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowEmojiPicker(false) }}
    >
      {/* Avatar or spacer */}
      {!isGrouped ? (
        <button
          onClick={() => setUserProfileId(message.authorId)}
          className="shrink-0 mt-0.5"
        >
          <Avatar
            src={author?.avatarUrl}
            name={author?.displayName ?? message.authorId.slice(0, 2)}
            userId={message.authorId}
            size="sm"
          />
        </button>
      ) : (
        <div className="w-8 shrink-0 flex items-center justify-end">
          {hovered && (
            <span className="text-[10px] text-pulse-text-muted opacity-0 group-hover:opacity-100">
              {message.createdAt ? formatMessageTime(message.createdAt) : ''}
            </span>
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Reply context */}
        {message.replyToId && (
          <div className="flex items-center gap-1 mb-1 text-xs text-pulse-text-muted">
            <Reply size={12} />
            <span className="font-medium text-pulse-text-muted truncate">
              @{replyAuthor?.username ?? 'unknown'}: {message.replyToContent?.slice(0, 60)}
            </span>
          </div>
        )}

        {/* Author + timestamp (only for non-grouped) */}
        {!isGrouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <button
              onClick={() => setUserProfileId(message.authorId)}
              className="text-sm font-semibold hover:underline"
              style={
                author?.isPremium && author.usernameGradient
                  ? {
                      background: `linear-gradient(${author.usernameGradient})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }
                  : { color: getMemberColor(member, roles) || 'white' }
              }
            >
              {member?.nickname ?? author?.displayName ?? 'Unknown'}
            </button>
            {author?.isPremium && (
              <span title="Premium member" className="inline-flex items-center">
                <Crown size={11} className="text-yellow-400" />
              </span>
            )}
            <Tooltip content={message.createdAt ? formatFullDateTime(message.createdAt) : ''} side="top">
              <span className="text-[11px] text-pulse-text-muted cursor-default">
                {message.createdAt ? formatMessageTime(message.createdAt) : ''}
              </span>
            </Tooltip>
            {message.isPinned && (
              <span className="text-[10px] text-yellow-500 font-medium">📌 Pinned</span>
            )}
          </div>
        )}

        {/* Content */}
        {isEditing ? (
          <div>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 rounded bg-pulse-bg-elevated text-pulse-text-normal text-sm outline-none border border-pulse-brand resize-none"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2 mt-1 text-xs text-pulse-text-muted">
              <span>Press <kbd className="bg-pulse-bg-elevated px-1 rounded">Enter</kbd> to save •</span>
              <button onClick={() => setIsEditing(false)} className="text-pulse-brand hover:underline">
                Escape to cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p
              className="text-sm text-pulse-text-normal leading-relaxed break-words"
              dangerouslySetInnerHTML={{ __html: renderContent(message.content) }}
            />
            {message.isEdited && (
              <span className="text-[10px] text-pulse-text-muted">(edited)</span>
            )}
          </div>
        )}

        {/* Attachments */}
        {message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map(att => (
              att.contentType.startsWith('image/') ? (
                <img
                  key={att.id}
                  src={att.url}
                  alt={att.filename}
                  className="max-w-sm max-h-72 rounded-lg object-contain"
                />
              ) : (
                <a
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-pulse-bg-elevated hover:bg-pulse-bg-modifier text-sm text-pulse-brand"
                >
                  📎 {att.filename}
                </a>
              )
            ))}
          </div>
        )}

        {/* Reactions */}
        {Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.values(message.reactions).map(reaction => (
              <button
                key={reaction.emoji}
                onClick={() => onReact(message.id, reaction.emoji, reaction.emojiName)}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors',
                  reaction.userIds.includes(currentUserId)
                    ? 'border-pulse-brand bg-pulse-brand/20 text-pulse-brand'
                    : 'border-white/10 bg-white/5 hover:border-pulse-brand hover:bg-pulse-brand/10 text-pulse-text-muted'
                )}
              >
                <span>{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message actions toolbar */}
      {hovered && !isEditing && (
        <div className="absolute right-4 -top-4 flex items-center gap-0.5 bg-pulse-bg-secondary border border-white/10 rounded-lg p-0.5 shadow-elevation-medium">
          <Tooltip content="Add Reaction" side="top">
            <button
              onClick={() => setShowEmojiPicker(v => !v)}
              className="p-1.5 rounded hover:bg-white/10 text-pulse-text-muted hover:text-pulse-text-normal"
            >
              <SmilePlus size={16} />
            </button>
          </Tooltip>
          <Tooltip content="Reply" side="top">
            <button
              onClick={() => onReply(message)}
              className="p-1.5 rounded hover:bg-white/10 text-pulse-text-muted hover:text-pulse-text-normal"
            >
              <Reply size={16} />
            </button>
          </Tooltip>
          {isOwn && (
            <Tooltip content="Edit" side="top">
              <button
                onClick={() => { setIsEditing(true); setEditContent(message.content) }}
                className="p-1.5 rounded hover:bg-white/10 text-pulse-text-muted hover:text-pulse-text-normal"
              >
                <Edit2 size={16} />
              </button>
            </Tooltip>
          )}
          <Tooltip content={message.isPinned ? 'Unpin Message' : 'Pin Message'} side="top">
            <button
              onClick={() => (message.isPinned ? onUnpin(message.id) : onPin(message.id))}
              className="p-1.5 rounded hover:bg-white/10 text-pulse-text-muted hover:text-pulse-text-normal"
            >
              {message.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
            </button>
          </Tooltip>
          {isOwn && (
            <Tooltip content="Delete" side="top">
              <button
                onClick={() => onDelete(message.id)}
                className="p-1.5 rounded hover:bg-white/10 text-pulse-text-muted hover:text-pulse-text-danger"
              >
                <Trash2 size={16} />
              </button>
            </Tooltip>
          )}
        </div>
      )}

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div className="absolute right-4 top-8 z-50">
          <EmojiPicker
            onEmojiClick={emojiData => {
              onReact(message.id, emojiData.emoji, emojiData.names[0] ?? emojiData.emoji)
              setShowEmojiPicker(false)
            }}
            theme={'dark' as never}
            width={300}
            height={350}
          />
        </div>
      )}
    </div>
  )
}

function getMemberColor(member: ServerMember | undefined, roles: Role[]): string | undefined {
  if (!member) return undefined
  const memberRoles = roles.filter(r => member.roles.includes(r.id) && r.color !== '#99aab5')
  const highestRole = memberRoles.sort((a, b) => b.position - a.position)[0]
  return highestRole?.color
}

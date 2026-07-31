import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Plus, Smile, Send, X, BarChart2, Calendar, Sparkles, Loader } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import EmojiPicker from 'emoji-picker-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/utils/helpers'
import { uploadMessageAttachment, validateAttachmentFile } from '@/services/storage.service'
import { useAuth } from '@/hooks/useAuth'
import type { ServerMember, User, Attachment } from '@/types'
import toast from 'react-hot-toast'
import { getSmartReplies } from '@/services/ai.service'

const SLASH_COMMANDS = [
  { cmd: '/ask', desc: 'Ask AI a question' },
  { cmd: '/summarize', desc: 'Summarize conversation' },
  { cmd: '/notes', desc: 'Create meeting notes' },
  { cmd: '/explain', desc: 'Explain a topic' },
  { cmd: '/faq', desc: 'Generate FAQ' },
  { cmd: '/announce', desc: 'Draft an announcement' },
  { cmd: '/poll', desc: 'Create a poll' },
  { cmd: '/event', desc: 'Create an event' },
]

interface MessageInputProps {
  channelId?: string
  serverId?: string | null
  channelName: string
  disabled?: boolean
  onSend: (content: string, options?: {
    replyToId?: string
    replyToContent?: string
    replyToAuthorId?: string
    attachments?: Attachment[]
    mentions?: string[]
  }) => Promise<void>
  onTypingStart: () => void
  onTypingStop: () => void
  members: ServerMember[]
  users: Record<string, User>
  replyTo?: { id: string; content: string; authorId: string; authorName: string } | null
  onCancelReply?: () => void
}

export function MessageInput({
  channelId = '',
  serverId = null,
  channelName,
  disabled,
  onSend,
  onTypingStart,
  onTypingStop,
  members,
  users,
  replyTo,
  onCancelReply,
}: MessageInputProps) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)
  const [showSlash, setShowSlash] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [slashIndex, setSlashIndex] = useState(0)
  const [smartReplies, setSmartReplies] = useState<string[]>([])
  const [loadingReplies, setLoadingReplies] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSmartReply = async () => {
    if (!channelId || loadingReplies || !user?.isPremium) return
    setLoadingReplies(true)
    try {
      const replies = await getSmartReplies(channelId)
      setSmartReplies(replies)
    } catch {
      toast.error('Could not generate suggestions')
    } finally {
      setLoadingReplies(false)
    }
  }
  const typingRef = useRef<ReturnType<typeof setTimeout>>()

  const filteredSlash = SLASH_COMMANDS.filter(c => c.cmd.includes(slashQuery.toLowerCase())).slice(0, 6)

  const filteredMembers = members.filter(m => {
    const u = users[m.userId]
    return u && (
      u.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(mentionQuery.toLowerCase())
    )
  }).slice(0, 6)

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setContent(val)

    // Typing indicator
    clearTimeout(typingRef.current)
    if (val.trim()) {
      onTypingStart()
      typingRef.current = setTimeout(onTypingStop, 3000)
    } else {
      onTypingStop()
    }

    // @mention detection
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = val.slice(0, cursorPos)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1])
      setShowMentions(true)
      setShowSlash(false)
      setMentionIndex(0)
    } else {
      setShowMentions(false)
      setMentionQuery('')
    }

    // slash command detection
    const slashMatch = textBeforeCursor.match(/^(\/\w*)$/)
    if (slashMatch) {
      setSlashQuery(slashMatch[1])
      setShowSlash(true)
      setShowMentions(false)
      setSlashIndex(0)
    } else {
      setShowSlash(false)
    }

    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 240) + 'px'
    }
  }

  const insertMention = (memberId: string) => {
    const u = users[memberId]
    if (!u) return
    const cursorPos = textareaRef.current?.selectionStart ?? content.length
    const textBefore = content.slice(0, cursorPos)
    const replaced = textBefore.replace(/@\w*$/, `@${u.username} `)
    setContent(replaced + content.slice(cursorPos))
    setShowMentions(false)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlash && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      setSlashIndex(i => e.key === 'ArrowUp' ? (i - 1 + filteredSlash.length) % filteredSlash.length : (i + 1) % filteredSlash.length)
      return
    }
    if (showSlash && e.key === 'Enter') {
      e.preventDefault()
      if (filteredSlash[slashIndex]) {
        setContent(filteredSlash[slashIndex].cmd + ' ')
        setShowSlash(false)
        setTimeout(() => textareaRef.current?.focus(), 0)
      }
      return
    }
    if (showSlash && e.key === 'Escape') { setShowSlash(false); return }

    if (showMentions && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      setMentionIndex(i =>
        e.key === 'ArrowUp'
          ? (i - 1 + filteredMembers.length) % filteredMembers.length
          : (i + 1) % filteredMembers.length
      )
      return
    }

    if (showMentions && e.key === 'Enter') {
      e.preventDefault()
      if (filteredMembers[mentionIndex]) {
        insertMention(filteredMembers[mentionIndex].userId)
      }
      return
    }

    if (showMentions && e.key === 'Escape') {
      setShowMentions(false)
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = async () => {
    if ((!content.trim() && pendingFiles.length === 0) || sending || disabled) return
    setSending(true)
    try {
      const attachments: Attachment[] = []

      for (const file of pendingFiles) {
        const result = await uploadMessageAttachment(
          'channel_id',
          file,
          (p) => setUploadProgress(prev => ({ ...prev, [file.name]: p }))
        )
        attachments.push({
          id: result.url,
          url: result.url,
          filename: result.filename,
          size: result.size,
          contentType: result.contentType,
          width: null,
          height: null,
        })
      }

      const mentions = (content.match(/@(\w+)/g) ?? []).map(m => m.slice(1))
      await onSend(content.trim(), {
        replyToId: replyTo?.id,
        replyToContent: replyTo?.content,
        replyToAuthorId: replyTo?.authorId,
        attachments,
        mentions,
      })
      setContent('')
      setPendingFiles([])
      setUploadProgress({})
      onCancelReply?.()
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch (err) {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const onDrop = useCallback((files: File[]) => {
    const valid = files.filter(f => {
      const err = validateAttachmentFile(f)
      if (err) toast.error(err)
      return !err
    })
    setPendingFiles(prev => [...prev, ...valid])
  }, [])

  const { getRootProps, getInputProps, open: openFilePicker } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  })

  return (
    <div className="relative">
      {/* Smart reply chips */}
      <AnimatePresence>
        {smartReplies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-center gap-2 px-3 pb-2 flex-wrap"
          >
            <Sparkles size={12} className="text-yellow-400 shrink-0" />
            {smartReplies.map((r, i) => (
              <button
                key={i}
                onClick={() => { setContent(r); setSmartReplies([]); textareaRef.current?.focus() }}
                className="px-2.5 py-1 text-xs bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 rounded-full hover:bg-yellow-500/20 transition-colors"
              >
                {r}
              </button>
            ))}
            <button onClick={() => setSmartReplies([])} className="p-0.5 text-pulse-text-muted hover:text-white ml-auto">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply bar */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-t-lg bg-pulse-bg-elevated border border-b-0 border-white/5 text-sm">
          <span className="text-pulse-text-muted">Replying to</span>
          <span className="font-medium text-white">@{replyTo.authorName}</span>
          <span className="text-pulse-text-muted truncate">: {replyTo.content.slice(0, 60)}</span>
          <button
            onClick={onCancelReply}
            className="ml-auto text-pulse-text-muted hover:text-pulse-text-normal"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* File previews */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2 bg-pulse-bg-elevated rounded-t-lg border border-b-0 border-white/5">
          {pendingFiles.map((file, i) => (
            <div key={i} className="relative group">
              <div className="px-3 py-2 rounded bg-pulse-bg-modifier text-sm text-pulse-text-muted flex items-center gap-2">
                <span>📎</span>
                <span className="max-w-[120px] truncate">{file.name}</span>
                {uploadProgress[file.name] !== undefined && (
                  <span>{Math.round(uploadProgress[file.name])}%</span>
                )}
              </div>
              <button
                onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-pulse-text-danger text-white text-xs hidden group-hover:flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main input */}
      <div
        {...getRootProps()}
        className={cn(
          'flex items-end gap-2 px-4 py-3 rounded-lg bg-pulse-bg-modifier',
          replyTo || pendingFiles.length > 0 ? 'rounded-t-none' : ''
        )}
      >
        <input {...getInputProps()} />

        <button
          onClick={openFilePicker}
          className="p-1 rounded-full text-pulse-text-muted hover:text-pulse-text-normal mb-0.5 shrink-0"
        >
          <Plus size={20} />
        </button>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'You do not have permission to send messages' : `Message #${channelName}`}
          disabled={disabled || sending}
          rows={1}
          className="flex-1 bg-transparent text-pulse-text-normal placeholder:text-pulse-text-muted text-sm outline-none resize-none max-h-60 leading-relaxed"
        />

        <div className="flex items-center gap-1 shrink-0 mb-0.5">
          {user?.isPremium && channelId && (
            <button
              onClick={handleSmartReply}
              disabled={loadingReplies}
              title="AI smart replies (Premium)"
              className="p-1 rounded-full text-yellow-400/70 hover:text-yellow-400 transition-colors disabled:opacity-50"
            >
              {loadingReplies ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
            </button>
          )}
          <button
            onClick={() => setShowEmoji(v => !v)}
            className="p-1 rounded-full text-pulse-text-muted hover:text-pulse-text-normal"
          >
            <Smile size={20} />
          </button>

          <button
            onClick={handleSend}
            disabled={sending || (!content.trim() && pendingFiles.length === 0)}
            className="p-1.5 rounded-full bg-pulse-brand text-white hover:bg-pulse-brand-hover disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute bottom-full right-0 mb-2 z-50">
          <EmojiPicker
            onEmojiClick={e => {
              setContent(prev => prev + e.emoji)
              setShowEmoji(false)
              textareaRef.current?.focus()
            }}
            theme={'dark' as never}
            width={300}
            height={350}
          />
        </div>
      )}

      {/* Slash command suggestions */}
      {showSlash && filteredSlash.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-pulse-bg-secondary border border-white/10 rounded-lg shadow-elevation-high overflow-hidden z-50">
          <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-pulse-text-muted">Commands</p>
          {filteredSlash.map((cmd, idx) => (
            <button
              key={cmd.cmd}
              onClick={() => { setContent(cmd.cmd + ' '); setShowSlash(false); textareaRef.current?.focus() }}
              className={cn('w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/5', idx === slashIndex && 'bg-pulse-brand/20')}
            >
              <span className="font-mono text-pulse-brand">{cmd.cmd}</span>
              <span className="text-pulse-text-muted text-xs">{cmd.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* @mention suggestions */}
      {showMentions && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-pulse-bg-secondary border border-white/10 rounded-lg shadow-elevation-high overflow-hidden z-50">
          <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-pulse-text-muted">
            Members matching @{mentionQuery}
          </p>
          {filteredMembers.map((member, idx) => {
            const u = users[member.userId]
            return u ? (
              <button
                key={member.userId}
                onClick={() => insertMention(member.userId)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/5',
                  idx === mentionIndex && 'bg-pulse-brand/20'
                )}
              >
                <span className="font-medium text-pulse-text-normal">{u.displayName}</span>
                <span className="text-pulse-text-muted text-xs">@{u.username}</span>
              </button>
            ) : null
          })}
        </div>
      )}
    </div>
  )
}

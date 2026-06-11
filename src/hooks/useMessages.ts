import { useState, useEffect, useCallback, useRef } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db, COLLECTIONS } from '@/services/firebase'
import { sendMessage, editMessage, deleteMessage, addReaction, removeReaction, pinMessage, unpinMessage, getMessages } from '@/services/message.service'
import { setTyping } from '@/services/presence.service'
import { useAppStore } from '@/store/useAppStore'
import type { Message, Attachment } from '@/types'
import { useAuth } from './useAuth'

export function useMessages(channelId: string | null) {
  const { user } = useAuth()
  const { addMessage, updateMessage, removeMessage, setMessages, prependMessages, incrementUnread, setTypingUsers } = useAppStore()
  const messages = useAppStore(s => channelId ? (s.messages[channelId] ?? []) : [])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const lastDocRef = useRef<QueryDocumentSnapshot | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Real-time subscription to latest messages
  useEffect(() => {
    if (!channelId) return
    setLoading(true)
    setHasMore(true)

    // Fetch most recent 50 messages DESC (matches the (channelId, createdAt DESC) index),
    // then reverse so they display oldest-first in the UI.
    const q = query(
      collection(db, COLLECTIONS.MESSAGES),
      where('channelId', '==', channelId),
      orderBy('createdAt', 'desc'),
      limit(50)
    )

    const unsub = onSnapshot(
      q,
      snap => {
        const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Message).reverse()
        setMessages(channelId, msgs)
        // If fewer than 50 came back there's nothing older to load; this also
        // makes the "Welcome to #channel" header visible on empty channels.
        if (msgs.length < 50) setHasMore(false)
        setLoading(false)

        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const msg = { id: change.doc.id, ...change.doc.data() } as Message
            if (msg.authorId !== user?.uid) {
              const hasMention = msg.mentions.includes(user?.uid ?? '') || msg.mentionEveryone
              incrementUnread(channelId, hasMention)
            }
          }
        })
      },
      () => {
        // Firestore denied or network error — stop loading so the UI isn't stuck
        setMessages(channelId, [])
        setHasMore(false)
        setLoading(false)
      }
    )

    return () => unsub()
  }, [channelId, user?.uid])

  const loadMore = useCallback(async () => {
    if (!channelId || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const { messages: older, lastDoc } = await getMessages(channelId, lastDocRef.current ?? undefined)
      if (older.length < 50) setHasMore(false)
      if (older.length > 0) {
        lastDocRef.current = lastDoc
        prependMessages(channelId, older)
      }
    } finally {
      setLoadingMore(false)
    }
  }, [channelId, loadingMore, hasMore])

  const send = useCallback(async (
    content: string,
    options?: {
      replyToId?: string
      replyToContent?: string
      replyToAuthorId?: string
      attachments?: Attachment[]
      mentions?: string[]
    }
  ) => {
    if (!channelId || !user) return
    await sendMessage(channelId, null, user.uid, content, options)
    stopTyping()
  }, [channelId, user])

  const edit = useCallback(async (messageId: string, content: string) => {
    await editMessage(messageId, content)
  }, [])

  const remove = useCallback(async (messageId: string) => {
    await deleteMessage(messageId)
  }, [])

  const react = useCallback(async (messageId: string, emoji: string, emojiName: string) => {
    if (!user) return
    const existing = messages.find(m => m.id === messageId)
    const reaction = existing?.reactions[emoji]
    if (reaction?.userIds.includes(user.uid)) {
      await removeReaction(messageId, user.uid, emoji)
    } else {
      await addReaction(messageId, user.uid, emoji, emojiName)
    }
  }, [user, messages])

  const pin = useCallback(async (messageId: string) => {
    await pinMessage(messageId)
  }, [])

  const unpin = useCallback(async (messageId: string) => {
    await unpinMessage(messageId)
  }, [])

  const startTyping = useCallback(() => {
    if (!channelId || !user) return
    setTyping(channelId, user.uid, user.username, true)
    clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => stopTyping(), 5000)
  }, [channelId, user])

  const stopTyping = useCallback(() => {
    if (!channelId || !user) return
    clearTimeout(typingTimerRef.current)
    setTyping(channelId, user.uid, user.username, false)
  }, [channelId, user])

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    send,
    edit,
    remove,
    react,
    pin,
    unpin,
    startTyping,
    stopTyping,
  }
}

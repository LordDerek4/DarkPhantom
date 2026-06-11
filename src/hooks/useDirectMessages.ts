import { useState, useEffect, useCallback } from 'react'
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db, COLLECTIONS } from '@/services/firebase'
import {
  getOrCreateDMChannel,
  sendDirectMessage,
  editDMMessage,
  deleteDMMessage,
  markDMRead,
  getDMMessages,
} from '@/services/dm.service'
import { useAppStore } from '@/store/useAppStore'
import type { DirectMessageChannel, DirectMessage } from '@/types'
import { useAuth } from './useAuth'

export function useDMChannels() {
  const { user } = useAuth()
  const { setDMChannels, upsertDMChannel, dmChannels } = useAppStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, COLLECTIONS.DIRECT_MESSAGE_CHANNELS),
      where('participantIds', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc'),
      limit(30)
    )

    const unsub = onSnapshot(q, snap => {
      const channels = snap.docs.map(d => ({ id: d.id, ...d.data() }) as DirectMessageChannel)
      setDMChannels(channels)
      setLoading(false)
    })

    return () => unsub()
  }, [user?.uid])

  const openDM = useCallback(async (targetUserId: string) => {
    if (!user) throw new Error('Not authenticated')
    const channel = await getOrCreateDMChannel(user.uid, targetUserId)
    upsertDMChannel(channel)
    return channel
  }, [user])

  return { dmChannels, loading, openDM }
}

export function useDMMessages(dmChannelId: string | null) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (!dmChannelId) return
    setLoading(true)

    const q = query(
      collection(db, COLLECTIONS.DIRECT_MESSAGES),
      where('dmChannelId', '==', dmChannelId),
      orderBy('createdAt', 'asc'),
      limit(50)
    )

    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }) as DirectMessage))
      setLoading(false)
    })

    // Mark as read
    if (user) markDMRead(dmChannelId, user.uid)

    return () => unsub()
  }, [dmChannelId, user?.uid])

  const loadMore = useCallback(async () => {
    if (!dmChannelId || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const { messages: older } = await getDMMessages(dmChannelId)
      if (older.length < 50) setHasMore(false)
      setMessages(prev => [...older, ...prev])
    } finally {
      setLoadingMore(false)
    }
  }, [dmChannelId, loadingMore, hasMore])

  const send = useCallback(async (content: string, recipientId: string, replyToId?: string) => {
    if (!dmChannelId || !user) return
    await sendDirectMessage(dmChannelId, user.uid, recipientId, content, [], replyToId)
  }, [dmChannelId, user])

  const edit = useCallback(async (messageId: string, content: string) => {
    await editDMMessage(messageId, content)
  }, [])

  const remove = useCallback(async (messageId: string) => {
    await deleteDMMessage(messageId)
  }, [])

  return { messages, loading, loadingMore, hasMore, loadMore, send, edit, remove }
}

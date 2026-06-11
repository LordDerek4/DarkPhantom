import { useEffect } from 'react'
import { subscribeToPresence, subscribeToTyping } from '@/services/presence.service'
import { useAppStore } from '@/store/useAppStore'
import type { UserStatus } from '@/types'

export function usePresenceSubscription(userIds: string[]) {
  const { setPresences } = useAppStore()

  useEffect(() => {
    if (userIds.length === 0) return
    const unsub = subscribeToPresence(userIds, presences => {
      setPresences(presences as Record<string, UserStatus>)
    })
    return () => unsub()
  }, [JSON.stringify(userIds.sort())])
}

export function useTypingIndicator(channelId: string | null, currentUserId: string) {
  const { setTypingUsers } = useAppStore()
  const typingUsers = useAppStore(s => channelId ? (s.typingUsers[channelId] ?? []) : [])

  useEffect(() => {
    if (!channelId) return
    const unsub = subscribeToTyping(channelId, currentUserId, users => {
      setTypingUsers(channelId, users)
    })
    return () => unsub()
  }, [channelId, currentUserId])

  return typingUsers
}

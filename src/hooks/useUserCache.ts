import { useEffect, useCallback } from 'react'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { db, COLLECTIONS } from '@/services/firebase'
import { useAppStore } from '@/store/useAppStore'
import type { User } from '@/types'

export function useUser(userId: string | null) {
  const { users, setUser } = useAppStore()
  const user = userId ? users[userId] : null

  useEffect(() => {
    if (!userId || users[userId]) return

    const unsub = onSnapshot(
      doc(db, COLLECTIONS.USERS, userId),
      snap => {
        if (snap.exists()) {
          setUser({ uid: snap.id, ...snap.data() } as User)
        }
      },
      err => console.error(`[useUser] Failed to load user ${userId}:`, err)
    )

    return () => unsub()
  }, [userId])

  return user
}

export function useUsers(userIds: string[]) {
  const { users, setUser } = useAppStore()

  useEffect(() => {
    const missing = userIds.filter(id => !users[id])
    if (missing.length === 0) return

    const unsubscribers = missing.map(userId =>
      onSnapshot(
        doc(db, COLLECTIONS.USERS, userId),
        snap => {
          if (snap.exists()) {
            setUser({ uid: snap.id, ...snap.data() } as User)
          }
        },
        err => console.error(`[useUsers] Failed to load user ${userId}:`, err)
      )
    )

    return () => unsubscribers.forEach(u => u())
  }, [JSON.stringify(userIds.sort())])

  return userIds.reduce<Record<string, User>>((acc, id) => {
    if (users[id]) acc[id] = users[id]
    return acc
  }, {})
}

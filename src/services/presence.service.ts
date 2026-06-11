import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { db } from './firebase'
import type { UserStatus } from '@/types'

const TYPING_TIMEOUT = 5000 // 5 seconds

export function updatePresence(userId: string, status: UserStatus): Promise<void> {
  return setDoc(
    doc(db, 'presence', userId),
    { status, lastSeen: serverTimestamp() },
    { merge: true }
  )
}

export function subscribeToPresence(
  userIds: string[],
  callback: (presences: Record<string, UserStatus>) => void
) {
  if (userIds.length === 0) return () => {}

  const presences: Record<string, UserStatus> = {}
  const unsubscribers: (() => void)[] = []

  for (const userId of userIds) {
    const unsub = onSnapshot(doc(db, 'presence', userId), snap => {
      if (snap.exists()) {
        presences[userId] = snap.data().status as UserStatus
      } else {
        presences[userId] = 'offline'
      }
      callback({ ...presences })
    })
    unsubscribers.push(unsub)
  }

  return () => unsubscribers.forEach(u => u())
}

export function setTyping(
  channelId: string,
  userId: string,
  username: string,
  isTyping: boolean
): Promise<void> {
  const typingRef = doc(db, 'typing', `${channelId}_${userId}`)
  if (isTyping) {
    return setDoc(typingRef, {
      channelId,
      userId,
      username,
      startedAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + TYPING_TIMEOUT),
    })
  } else {
    return setDoc(typingRef, { channelId, userId, username, startedAt: null, expiresAt: null })
  }
}

export function subscribeToTyping(
  channelId: string,
  currentUserId: string,
  callback: (typingUsers: { userId: string; username: string }[]) => void
) {
  const q = query(
    collection(db, 'typing'),
    where('channelId', '==', channelId)
  )

  return onSnapshot(q, snap => {
    const now = Date.now()
    const typingUsers = snap.docs
      .map(d => d.data())
      .filter(
        d =>
          d.userId !== currentUserId &&
          d.startedAt !== null &&
          d.expiresAt?.toDate?.()?.getTime() > now
      )
      .map(d => ({ userId: d.userId as string, username: d.username as string }))

    callback(typingUsers)
  })
}

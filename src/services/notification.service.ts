import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore'
import { db, COLLECTIONS } from './firebase'
import type { Notification, NotificationType } from '@/types'
import { getMessagingInstance } from './firebase'
import { getToken } from 'firebase/messaging'

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  options: {
    iconUrl?: string
    channelId?: string
    serverId?: string
    messageId?: string
    fromUserId?: string
  } = {}
): Promise<void> {
  await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
    userId,
    type,
    title,
    body,
    iconUrl: options.iconUrl ?? null,
    channelId: options.channelId ?? null,
    serverId: options.serverId ?? null,
    messageId: options.messageId ?? null,
    fromUserId: options.fromUserId ?? null,
    isRead: false,
    createdAt: serverTimestamp(),
  })
  // Browser notifications are shown by the recipient via subscribeToNotifications,
  // NOT here — showing them here would pop up on the SENDER's browser.
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
): () => void {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50),
  )
  let initialized = false
  return onSnapshot(q, snap => {
    const notifications = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Notification)
    callback(notifications)

    // Show browser notification for newly added unread notifications (not on initial load)
    if (initialized && Notification.permission === 'granted') {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const n = change.doc.data() as Notification
          if (!n.isRead) {
            new Notification(n.title, {
              body: n.body,
              icon: n.iconUrl ?? '/pulse-icon.svg',
              tag: change.doc.id,
            })
          }
        }
      })
    }
    initialized = true
  })
}

export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Notification)
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), { isRead: true })
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId))
}

export async function clearAllNotifications(userId: string): Promise<void> {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
  )
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    where('isRead', '==', false)
  )
  const snap = await getDocs(q)
  const updates = snap.docs.map(d => updateDoc(d.ref, { isRead: true }))
  await Promise.all(updates)
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export async function getFCMToken(): Promise<string | null> {
  try {
    const messaging = await getMessagingInstance()
    if (!messaging) return null

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
    const token = await getToken(messaging, { vapidKey })
    return token
  } catch {
    return null
  }
}

export async function saveUserFCMToken(userId: string, token: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
    fcmTokens: token,
  })
}

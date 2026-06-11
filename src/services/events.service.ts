import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, orderBy, getDocs, onSnapshot,
  serverTimestamp, arrayUnion, arrayRemove, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { CommunityEvent } from '@/types/extended'

const EVENTS = 'events'

export async function createEvent(data: Omit<CommunityEvent, 'id' | 'attendeeIds' | 'interestedIds' | 'createdAt' | 'updatedAt' | 'reminderSent'>): Promise<CommunityEvent> {
  const ref = await addDoc(collection(db, EVENTS), {
    ...data,
    attendeeIds: [],
    interestedIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    reminderSent: false,
  })
  return { id: ref.id, ...data, attendeeIds: [], interestedIds: [], createdAt: Timestamp.now(), updatedAt: Timestamp.now(), reminderSent: false }
}

export async function updateEvent(eventId: string, updates: Partial<CommunityEvent>): Promise<void> {
  await updateDoc(doc(db, EVENTS, eventId), { ...updates, updatedAt: serverTimestamp() })
}

export async function deleteEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db, EVENTS, eventId))
}

export async function rsvpEvent(eventId: string, userId: string, type: 'attend' | 'interest' | 'remove'): Promise<void> {
  const ref = doc(db, EVENTS, eventId)
  if (type === 'attend') {
    await updateDoc(ref, {
      attendeeIds: arrayUnion(userId),
      interestedIds: arrayRemove(userId),
    })
  } else if (type === 'interest') {
    await updateDoc(ref, {
      interestedIds: arrayUnion(userId),
      attendeeIds: arrayRemove(userId),
    })
  } else {
    await updateDoc(ref, {
      attendeeIds: arrayRemove(userId),
      interestedIds: arrayRemove(userId),
    })
  }
}

export function subscribeToServerEvents(serverId: string, cb: (events: CommunityEvent[]) => void) {
  const q = query(
    collection(db, EVENTS),
    where('serverId', '==', serverId),
    orderBy('startTime', 'asc')
  )
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityEvent)))
  })
}

export async function getUpcomingEvents(serverId: string): Promise<CommunityEvent[]> {
  const now = Timestamp.now()
  const q = query(
    collection(db, EVENTS),
    where('serverId', '==', serverId),
    where('startTime', '>=', now),
    orderBy('startTime', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityEvent))
}

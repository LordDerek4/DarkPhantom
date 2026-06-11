import {
  collection, doc, setDoc, updateDoc, onSnapshot,
  addDoc, query, where, orderBy, serverTimestamp,
  arrayUnion, arrayRemove, getDoc,
} from 'firebase/firestore'
import { db } from './firebase'

export type CallType = 'voice' | 'video'
export type CallStatus = 'ringing' | 'active' | 'ended'

export interface CallDoc {
  id: string
  type: CallType
  status: CallStatus
  initiatorId: string
  participants: string[]
  invitedIds: string[]
  dmChannelId?: string
  createdAt: unknown
}

export interface SignalDoc {
  id: string
  from: string
  to: string
  type: 'offer' | 'answer' | 'ice-candidate'
  payload: string
  createdAt: unknown
}

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

export async function createCall(
  initiatorId: string,
  invitedIds: string[],
  type: CallType,
  dmChannelId?: string,
): Promise<string> {
  const ref = doc(collection(db, 'calls'))
  await setDoc(ref, {
    type,
    status: 'ringing' as CallStatus,
    initiatorId,
    participants: [initiatorId],
    invitedIds,
    dmChannelId: dmChannelId ?? null,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function joinCall(callId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, 'calls', callId), {
    participants: arrayUnion(userId),
    invitedIds: arrayRemove(userId),
    status: 'active' as CallStatus,
  })
}

export async function leaveCall(callId: string, userId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'calls', callId))
  if (!snap.exists()) return
  const data = snap.data() as Omit<CallDoc, 'id'>
  const remaining = data.participants.filter(id => id !== userId)
  if (remaining.length === 0) {
    await updateDoc(doc(db, 'calls', callId), {
      participants: [],
      status: 'ended' as CallStatus,
    })
  } else {
    await updateDoc(doc(db, 'calls', callId), {
      participants: arrayRemove(userId),
    })
  }
}

export async function declineCall(callId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, 'calls', callId), {
    invitedIds: arrayRemove(userId),
  })
}

export function subscribeToCall(
  callId: string,
  callback: (call: CallDoc | null) => void,
): () => void {
  return onSnapshot(doc(db, 'calls', callId), snap => {
    if (!snap.exists()) { callback(null); return }
    callback({ id: snap.id, ...snap.data() } as CallDoc)
  })
}

export function subscribeToIncomingCalls(
  userId: string,
  callback: (call: CallDoc | null) => void,
): () => void {
  const q = query(
    collection(db, 'calls'),
    where('invitedIds', 'array-contains', userId),
    where('status', '==', 'ringing'),
  )
  return onSnapshot(q, snap => {
    if (snap.empty) { callback(null); return }
    const d = snap.docs[0]
    callback({ id: d.id, ...d.data() } as CallDoc)
  })
}

export async function sendSignal(
  callId: string,
  from: string,
  to: string,
  type: SignalDoc['type'],
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit,
): Promise<void> {
  await addDoc(collection(db, 'calls', callId, 'signals'), {
    from,
    to,
    type,
    payload: JSON.stringify(payload),
    createdAt: serverTimestamp(),
  })
}

export function subscribeToSignals(
  callId: string,
  forUserId: string,
  callback: (signal: SignalDoc) => void,
): () => void {
  const q = query(
    collection(db, 'calls', callId, 'signals'),
    where('to', '==', forUserId),
    orderBy('createdAt', 'asc'),
  )
  return onSnapshot(q, snap => {
    snap.docChanges().forEach(change => {
      if (change.type === 'added') {
        callback({ id: change.doc.id, ...change.doc.data() } as SignalDoc)
      }
    })
  })
}

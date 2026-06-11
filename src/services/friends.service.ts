import {
  collection, addDoc, updateDoc, deleteDoc, doc, query,
  where, getDocs, onSnapshot, serverTimestamp, getDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import { searchUsers } from './user.service'
import type { Friendship } from '@/types/extended'
import type { User } from '@/types'

const FRIENDSHIPS = 'friendships'

export async function sendFriendRequest(requesterId: string, receiverId: string): Promise<void> {
  if (requesterId === receiverId) throw new Error("You can't add yourself")
  const existing = await getFriendship(requesterId, receiverId)
  if (existing) {
    if (existing.status === 'accepted') throw new Error('Already friends')
    if (existing.status === 'pending') throw new Error('Friend request already sent')
  }

  await addDoc(collection(db, FRIENDSHIPS), {
    requesterId,
    receiverId,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    mutualServerIds: [],
  })
}

export async function sendFriendRequestByUsername(
  requesterId: string,
  username: string
): Promise<void> {
  const users = await searchUsers(username, requesterId)
  const target = users.find(u => u.username.toLowerCase() === username.toLowerCase().trim())
  if (!target) throw new Error(`No user found with username "${username}"`)
  await sendFriendRequest(requesterId, target.uid)
}

export async function respondToFriendRequest(friendshipId: string, accept: boolean): Promise<void> {
  if (accept) {
    await updateDoc(doc(db, FRIENDSHIPS, friendshipId), {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    })
  } else {
    await deleteDoc(doc(db, FRIENDSHIPS, friendshipId))
  }
}

export async function cancelFriendRequest(friendshipId: string): Promise<void> {
  await deleteDoc(doc(db, FRIENDSHIPS, friendshipId))
}

export async function unfriend(friendshipId: string): Promise<void> {
  await deleteDoc(doc(db, FRIENDSHIPS, friendshipId))
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const existing = await getFriendship(blockerId, blockedId)
  if (existing) {
    await updateDoc(doc(db, FRIENDSHIPS, existing.id), {
      status: 'blocked',
      blockedBy: blockerId,
      updatedAt: serverTimestamp(),
    })
  } else {
    await addDoc(collection(db, FRIENDSHIPS), {
      requesterId: blockerId,
      receiverId: blockedId,
      status: 'blocked',
      blockedBy: blockerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      mutualServerIds: [],
    })
  }
}

export async function unblockUser(friendshipId: string): Promise<void> {
  await deleteDoc(doc(db, FRIENDSHIPS, friendshipId))
}

export async function getFriendship(userId1: string, userId2: string): Promise<Friendship | null> {
  const q1 = query(collection(db, FRIENDSHIPS), where('requesterId', '==', userId1), where('receiverId', '==', userId2))
  const q2 = query(collection(db, FRIENDSHIPS), where('requesterId', '==', userId2), where('receiverId', '==', userId1))
  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)])
  const all = [...snap1.docs, ...snap2.docs]
  if (all.length === 0) return null
  return { id: all[0].id, ...all[0].data() } as Friendship
}

export function subscribeToFriendships(userId: string, cb: (friendships: Friendship[]) => void) {
  const q1 = query(collection(db, FRIENDSHIPS), where('requesterId', '==', userId))
  const q2 = query(collection(db, FRIENDSHIPS), where('receiverId', '==', userId))
  const results: Record<string, Friendship> = {}
  let unsub2: (() => void) | null = null

  const unsub1 = onSnapshot(q1, snap => {
    snap.docs.forEach(d => { results[d.id] = { id: d.id, ...d.data() } as Friendship })
    snap.docChanges().forEach(change => {
      if (change.type === 'removed') delete results[change.doc.id]
    })
    cb(Object.values(results))
  })
  unsub2 = onSnapshot(q2, snap => {
    snap.docs.forEach(d => { results[d.id] = { id: d.id, ...d.data() } as Friendship })
    snap.docChanges().forEach(change => {
      if (change.type === 'removed') delete results[change.doc.id]
    })
    cb(Object.values(results))
  })

  return () => { unsub1(); unsub2?.() }
}

export async function getFriends(userId: string): Promise<Friendship[]> {
  const [s1, s2] = await Promise.all([
    getDocs(query(collection(db, FRIENDSHIPS), where('requesterId', '==', userId), where('status', '==', 'accepted'))),
    getDocs(query(collection(db, FRIENDSHIPS), where('receiverId', '==', userId), where('status', '==', 'accepted'))),
  ])
  return [...s1.docs, ...s2.docs].map(d => ({ id: d.id, ...d.data() } as Friendship))
}

export async function getPendingRequests(userId: string): Promise<Friendship[]> {
  const q = query(
    collection(db, FRIENDSHIPS),
    where('receiverId', '==', userId),
    where('status', '==', 'pending')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Friendship))
}

export async function getMutualFriends(userId1: string, userId2: string): Promise<string[]> {
  const [f1, f2] = await Promise.all([getFriends(userId1), getFriends(userId2)])
  const ids1 = new Set(f1.map(f => getFriendUserId(f, userId1)))
  return f2.map(f => getFriendUserId(f, userId2)).filter(id => ids1.has(id))
}

export function getFriendUserId(friendship: Friendship, currentUserId: string): string {
  return friendship.requesterId === currentUserId ? friendship.receiverId : friendship.requesterId
}

export function getFriendshipStatus(
  friendship: Friendship | null,
  currentUserId: string
): 'none' | 'friends' | 'pending_sent' | 'pending_received' | 'blocked' {
  if (!friendship) return 'none'
  if (friendship.status === 'accepted') return 'friends'
  if (friendship.status === 'blocked') return 'blocked'
  if (friendship.status === 'pending') {
    return friendship.requesterId === currentUserId ? 'pending_sent' : 'pending_received'
  }
  return 'none'
}

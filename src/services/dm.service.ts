import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  arrayUnion,
  setDoc,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db, COLLECTIONS } from './firebase'
import type { DirectMessageChannel, DirectMessage, Attachment } from '@/types'
import { generateId } from '@/utils/helpers'

const PAGE_SIZE = 50

export async function getOrCreateDMChannel(
  userId1: string,
  userId2: string
): Promise<DirectMessageChannel> {
  const sortedIds = [userId1, userId2].sort()
  const channelId = `dm_${sortedIds[0]}_${sortedIds[1]}`
  const ref = doc(db, COLLECTIONS.DIRECT_MESSAGE_CHANNELS, channelId)

  try {
    const snap = await getDoc(ref)
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as DirectMessageChannel
    }
  } catch {
    // Doc doesn't exist yet — proceed to create it below
  }

  const channelData = {
    participantIds: sortedIds,
    isGroup: false,
    name: null,
    iconUrl: null,
    ownerId: null,
    lastMessageId: null,
    lastMessageAt: null,
    lastMessageContent: null,
    createdAt: serverTimestamp(),
    unreadCounts: { [userId1]: 0, [userId2]: 0 },
  }

  await setDoc(ref, channelData)
  return { id: channelId, ...channelData } as DirectMessageChannel
}

export async function createGroupDMChannel(
  creatorId: string,
  participantIds: string[],
  name: string
): Promise<DirectMessageChannel> {
  const allIds = Array.from(new Set([creatorId, ...participantIds]))
  const unreadCounts: Record<string, number> = {}
  allIds.forEach(id => { unreadCounts[id] = 0 })

  const channelData = {
    participantIds: allIds,
    isGroup: true,
    name: name.trim() || null,
    iconUrl: null,
    ownerId: creatorId,
    lastMessageId: null,
    lastMessageAt: null,
    lastMessageContent: null,
    createdAt: serverTimestamp(),
    unreadCounts,
  }

  const ref = await addDoc(collection(db, COLLECTIONS.DIRECT_MESSAGE_CHANNELS), channelData)
  return { id: ref.id, ...channelData } as DirectMessageChannel
}

export async function updateGroupDMChannel(
  channelId: string,
  updates: { name?: string; iconUrl?: string }
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.DIRECT_MESSAGE_CHANNELS, channelId), updates)
}

export async function leaveGroupDM(channelId: string, userId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.DIRECT_MESSAGE_CHANNELS, channelId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const data = snap.data() as DirectMessageChannel
  const newParticipants = data.participantIds.filter(id => id !== userId)
  const { [userId]: _, ...newUnread } = data.unreadCounts
  await updateDoc(ref, {
    participantIds: newParticipants,
    unreadCounts: newUnread,
  })
}

export async function getUserDMChannels(userId: string): Promise<DirectMessageChannel[]> {
  const q = query(
    collection(db, COLLECTIONS.DIRECT_MESSAGE_CHANNELS),
    where('participantIds', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc'),
    limit(30)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as DirectMessageChannel)
}

export async function sendDirectMessage(
  dmChannelId: string,
  authorId: string,
  recipientId: string,
  content: string,
  attachments: Attachment[] = [],
  replyToId?: string
): Promise<DirectMessage> {
  const messageData = {
    dmChannelId,
    authorId,
    content,
    attachments,
    replyToId: replyToId ?? null,
    isEdited: false,
    editedAt: null,
    createdAt: serverTimestamp(),
    reactions: {},
    readBy: [authorId],
  }

  const ref = await addDoc(collection(db, COLLECTIONS.DIRECT_MESSAGES), messageData)

  // Update DM channel meta
  await updateDoc(doc(db, COLLECTIONS.DIRECT_MESSAGE_CHANNELS, dmChannelId), {
    lastMessageId: ref.id,
    lastMessageAt: serverTimestamp(),
    lastMessageContent: content.slice(0, 100),
    [`unreadCounts.${recipientId}`]: (await getUnreadCount(dmChannelId, recipientId)) + 1,
  })

  return { id: ref.id, ...messageData } as unknown as DirectMessage
}

async function getUnreadCount(channelId: string, userId: string): Promise<number> {
  const snap = await getDoc(doc(db, COLLECTIONS.DIRECT_MESSAGE_CHANNELS, channelId))
  if (!snap.exists()) return 0
  const data = snap.data() as DirectMessageChannel
  return data.unreadCounts[userId] ?? 0
}

export async function getDMMessages(
  dmChannelId: string,
  cursor?: QueryDocumentSnapshot
): Promise<{ messages: DirectMessage[]; lastDoc: QueryDocumentSnapshot | null }> {
  let q = query(
    collection(db, COLLECTIONS.DIRECT_MESSAGES),
    where('dmChannelId', '==', dmChannelId),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE)
  )

  if (cursor) {
    q = query(
      collection(db, COLLECTIONS.DIRECT_MESSAGES),
      where('dmChannelId', '==', dmChannelId),
      orderBy('createdAt', 'desc'),
      startAfter(cursor),
      limit(PAGE_SIZE)
    )
  }

  const snap = await getDocs(q)
  return {
    messages: snap.docs.map(d => ({ id: d.id, ...d.data() }) as DirectMessage).reverse(),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
  }
}

export async function editDMMessage(messageId: string, content: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.DIRECT_MESSAGES, messageId), {
    content,
    isEdited: true,
    editedAt: serverTimestamp(),
  })
}

export async function deleteDMMessage(messageId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.DIRECT_MESSAGES, messageId))
}

export async function markDMRead(dmChannelId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.DIRECT_MESSAGE_CHANNELS, dmChannelId), {
    [`unreadCounts.${userId}`]: 0,
  })
}

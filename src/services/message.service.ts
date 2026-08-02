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
  arrayRemove,
  onSnapshot,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db, COLLECTIONS } from './firebase'
import type { Message, Attachment, ReactionData } from '@/types'
import { generateId } from '@/utils/helpers'

const PAGE_SIZE = 50

export async function sendMessage(
  channelId: string,
  serverId: string | null,
  authorId: string,
  content: string,
  options: {
    replyToId?: string
    replyToContent?: string
    replyToAuthorId?: string
    attachments?: Attachment[]
    mentions?: string[]
    mentionEveryone?: boolean
  } = {}
): Promise<Message> {
  const messageData = {
    channelId,
    serverId,
    authorId,
    content,
    type: options.replyToId ? 'reply' : 'default',
    replyToId: options.replyToId ?? null,
    replyToContent: options.replyToContent ?? null,
    replyToAuthorId: options.replyToAuthorId ?? null,
    attachments: options.attachments ?? [],
    embeds: [],
    mentions: options.mentions ?? [],
    roleMentions: [],
    mentionEveryone: options.mentionEveryone ?? false,
    isPinned: false,
    isEdited: false,
    editedAt: null,
    createdAt: serverTimestamp(),
    reactions: {},
    readBy: [authorId],
  }

  const ref = await addDoc(collection(db, COLLECTIONS.MESSAGES), messageData)

  // Update channel last message info
  await updateDoc(doc(db, COLLECTIONS.CHANNELS, channelId), {
    lastMessageId: ref.id,
    lastMessageAt: serverTimestamp(),
  })

  return { id: ref.id, ...messageData } as unknown as Message
}

export async function editMessage(messageId: string, content: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.MESSAGES, messageId), {
    content,
    isEdited: true,
    editedAt: serverTimestamp(),
  })
}

export async function deleteMessage(messageId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.MESSAGES, messageId))
}

export async function pinMessage(messageId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.MESSAGES, messageId), { isPinned: true })
}

export async function unpinMessage(messageId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.MESSAGES, messageId), { isPinned: false })
}

export async function getPinnedMessages(channelId: string): Promise<Message[]> {
  const q = query(
    collection(db, COLLECTIONS.MESSAGES),
    where('channelId', '==', channelId),
    where('isPinned', '==', true),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Message)
}

export function subscribeToPinnedMessages(channelId: string, callback: (messages: Message[]) => void): () => void {
  const q = query(
    collection(db, COLLECTIONS.MESSAGES),
    where('channelId', '==', channelId),
    where('isPinned', '==', true),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Message))
  })
}

export async function getMessages(
  channelId: string,
  cursor?: QueryDocumentSnapshot
): Promise<{ messages: Message[]; lastDoc: QueryDocumentSnapshot | null }> {
  let q = query(
    collection(db, COLLECTIONS.MESSAGES),
    where('channelId', '==', channelId),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE)
  )

  if (cursor) {
    q = query(
      collection(db, COLLECTIONS.MESSAGES),
      where('channelId', '==', channelId),
      orderBy('createdAt', 'desc'),
      startAfter(cursor),
      limit(PAGE_SIZE)
    )
  }

  const snap = await getDocs(q)
  const messages = snap.docs
    .map(d => ({ id: d.id, ...d.data() }) as Message)
    .reverse()

  return {
    messages,
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
  }
}

export async function addReaction(
  messageId: string,
  userId: string,
  emoji: string,
  emojiName: string
): Promise<void> {
  const msgRef = doc(db, COLLECTIONS.MESSAGES, messageId)
  const msgSnap = await getDoc(msgRef)
  if (!msgSnap.exists()) return

  const data = msgSnap.data() as Message
  const existing = data.reactions[emoji]

  if (existing) {
    if (existing.userIds.includes(userId)) return // Already reacted
    await updateDoc(msgRef, {
      [`reactions.${emoji}.count`]: existing.count + 1,
      [`reactions.${emoji}.userIds`]: arrayUnion(userId),
    })
  } else {
    await updateDoc(msgRef, {
      [`reactions.${emoji}`]: {
        emoji,
        emojiName,
        count: 1,
        userIds: [userId],
      } as ReactionData,
    })
  }
}

export async function removeReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> {
  const msgRef = doc(db, COLLECTIONS.MESSAGES, messageId)
  const msgSnap = await getDoc(msgRef)
  if (!msgSnap.exists()) return

  const data = msgSnap.data() as Message
  const existing = data.reactions[emoji]
  if (!existing) return

  if (existing.count <= 1) {
    // Remove the reaction entry entirely
    const update: Record<string, unknown> = {}
    update[`reactions.${emoji}`] = null
    // Firestore doesn't support deleting nested keys directly - use a workaround
    const reactions = { ...data.reactions }
    delete reactions[emoji]
    await updateDoc(msgRef, { reactions })
  } else {
    await updateDoc(msgRef, {
      [`reactions.${emoji}.count`]: existing.count - 1,
      [`reactions.${emoji}.userIds`]: arrayRemove(userId),
    })
  }
}

export async function markMessageRead(messageId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.MESSAGES, messageId), {
    readBy: arrayUnion(userId),
  })
}

export async function searchMessages(
  serverId: string,
  searchTerm: string,
  channelId?: string
): Promise<Message[]> {
  // Firestore doesn't support full-text search natively.
  // In production, use Algolia, Typesense, or Firebase Extensions.
  // This is a simple prefix-match fallback for MVP.
  const constraints = [
    where('serverId', '==', serverId),
    orderBy('createdAt', 'desc'),
    limit(50),
  ]
  if (channelId) constraints.splice(1, 0, where('channelId', '==', channelId))

  const q = query(collection(db, COLLECTIONS.MESSAGES), ...constraints)
  const snap = await getDocs(q)
  const term = searchTerm.toLowerCase()
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }) as Message)
    .filter(m => m.content.toLowerCase().includes(term))
}

import {
  collection, addDoc, updateDoc, doc, query,
  where, orderBy, getDocs, onSnapshot, serverTimestamp,
  increment,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Thread, ThreadMessage } from '@/types/extended'

const THREADS = 'threads'
const THREAD_MESSAGES = 'threadMessages'

export async function createThread(
  channelId: string,
  serverId: string,
  parentMessageId: string,
  title: string,
  createdBy: string
): Promise<Thread> {
  const ref = await addDoc(collection(db, THREADS), {
    channelId,
    serverId,
    parentMessageId,
    title,
    createdBy,
    createdAt: serverTimestamp(),
    lastReplyAt: null,
    replyCount: 0,
    participantIds: [createdBy],
    isResolved: false,
    resolvedBy: null,
    resolvedAt: null,
    summary: null,
    tags: [],
  })
  return {
    id: ref.id, channelId, serverId, parentMessageId, title, createdBy,
    createdAt: serverTimestamp() as never, lastReplyAt: null, replyCount: 0,
    participantIds: [createdBy], isResolved: false, resolvedBy: null,
    resolvedAt: null, summary: null, tags: [],
  }
}

export async function replyToThread(
  threadId: string,
  channelId: string,
  serverId: string,
  authorId: string,
  content: string,
  parentId: string | null = null,
  depth = 0
): Promise<ThreadMessage> {
  const ref = await addDoc(collection(db, THREAD_MESSAGES), {
    threadId, channelId, serverId, authorId, content,
    parentId, depth, replyCount: 0,
    createdAt: serverTimestamp(), editedAt: null, isEdited: false,
    reactions: {},
  })

  await updateDoc(doc(db, THREADS, threadId), {
    replyCount: increment(1),
    lastReplyAt: serverTimestamp(),
    participantIds: [authorId],
  })

  if (parentId) {
    await updateDoc(doc(db, THREAD_MESSAGES, parentId), { replyCount: increment(1) })
  }

  return {
    id: ref.id, threadId, channelId, serverId, authorId, content,
    parentId, depth, replyCount: 0, createdAt: serverTimestamp() as never,
    editedAt: null, isEdited: false, reactions: {},
  }
}

export async function resolveThread(threadId: string, resolvedBy: string): Promise<void> {
  await updateDoc(doc(db, THREADS, threadId), {
    isResolved: true,
    resolvedBy,
    resolvedAt: serverTimestamp(),
  })
}

export function subscribeToChannelThreads(channelId: string, cb: (threads: Thread[]) => void) {
  const q = query(
    collection(db, THREADS),
    where('channelId', '==', channelId),
    orderBy('lastReplyAt', 'desc')
  )
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Thread)))
  })
}

export function subscribeToThreadMessages(threadId: string, cb: (messages: ThreadMessage[]) => void) {
  const q = query(
    collection(db, THREAD_MESSAGES),
    where('threadId', '==', threadId),
    orderBy('createdAt', 'asc')
  )
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as ThreadMessage)))
  })
}

export async function getMessageThreads(channelId: string, messageId: string): Promise<Thread[]> {
  const q = query(
    collection(db, THREADS),
    where('channelId', '==', channelId),
    where('parentMessageId', '==', messageId)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Thread))
}

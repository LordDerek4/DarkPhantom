import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db, COLLECTIONS } from './firebase'
import type { Channel, ChannelType, PermissionOverwrite } from '@/types'
import { generateId } from '@/utils/helpers'

export async function getServerChannels(serverId: string): Promise<Channel[]> {
  const q = query(
    collection(db, COLLECTIONS.CHANNELS),
    where('serverId', '==', serverId),
    orderBy('position', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Channel)
}

export async function getChannel(channelId: string): Promise<Channel | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.CHANNELS, channelId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Channel
}

export async function createChannel(
  serverId: string,
  name: string,
  type: ChannelType,
  categoryId: string | null,
  position: number
): Promise<Channel> {
  const channelId = generateId()
  const channelData: Omit<Channel, 'id'> = {
    serverId,
    name: name.toLowerCase().replace(/\s+/g, '-'),
    type,
    topic: '',
    position,
    categoryId,
    isNSFW: false,
    slowModeDelay: 0,
    lastMessageId: null,
    lastMessageAt: null,
    permissionOverwrites: [],
    createdAt: serverTimestamp() as never,
    updatedAt: serverTimestamp() as never,
  }
  await setDoc(doc(db, COLLECTIONS.CHANNELS, channelId), channelData)
  return { id: channelId, ...channelData }
}

export async function createCategory(serverId: string, name: string, position: number): Promise<Channel> {
  return createChannel(serverId, name, 'category', null, position)
}

export async function updateChannel(
  channelId: string,
  updates: Partial<Pick<Channel, 'name' | 'topic' | 'isNSFW' | 'slowModeDelay' | 'permissionOverwrites' | 'position'>>
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.CHANNELS, channelId), {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteChannel(channelId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.CHANNELS, channelId))
}

export async function reorderChannels(
  updates: { channelId: string; position: number }[]
): Promise<void> {
  const batch = writeBatch(db)
  for (const { channelId, position } of updates) {
    batch.update(doc(db, COLLECTIONS.CHANNELS, channelId), { position })
  }
  await batch.commit()
}

export async function updateChannelPermissions(
  channelId: string,
  overwrites: PermissionOverwrite[]
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.CHANNELS, channelId), {
    permissionOverwrites: overwrites,
    updatedAt: serverTimestamp(),
  })
}

export async function markChannelAsRead(
  channelId: string,
  userId: string,
  lastMessageId: string
): Promise<void> {
  await setDoc(
    doc(db, 'channelReads', `${channelId}_${userId}`),
    { channelId, userId, lastMessageId, readAt: serverTimestamp() },
    { merge: true }
  )
}

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db, COLLECTIONS } from './firebase'
import type { ModerationLog, ModerationActionType } from '@/types'

async function logAction(
  serverId: string,
  action: ModerationActionType,
  targetUserId: string,
  moderatorId: string,
  reason: string,
  extra: { duration?: number; messageId?: string; channelId?: string } = {}
): Promise<void> {
  await addDoc(collection(db, COLLECTIONS.MODERATION_LOGS), {
    serverId,
    action,
    targetUserId,
    moderatorId,
    reason,
    duration: extra.duration ?? null,
    messageId: extra.messageId ?? null,
    channelId: extra.channelId ?? null,
    createdAt: serverTimestamp(),
  })
}

export async function muteMember(
  serverId: string,
  targetUserId: string,
  moderatorId: string,
  durationMinutes: number,
  reason = ''
): Promise<void> {
  const mutedUntil = Timestamp.fromDate(
    new Date(Date.now() + durationMinutes * 60 * 1000)
  )
  await updateDoc(doc(db, COLLECTIONS.SERVER_MEMBERS, `${serverId}_${targetUserId}`), {
    isMuted: true,
    mutedUntil,
  })
  await logAction(serverId, 'mute', targetUserId, moderatorId, reason, {
    duration: durationMinutes,
  })
}

export async function unmuteMember(
  serverId: string,
  targetUserId: string,
  moderatorId: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.SERVER_MEMBERS, `${serverId}_${targetUserId}`), {
    isMuted: false,
    mutedUntil: null,
  })
  await logAction(serverId, 'unmute', targetUserId, moderatorId, '')
}

export async function kickMember(
  serverId: string,
  targetUserId: string,
  moderatorId: string,
  reason = ''
): Promise<void> {
  const memberRef = doc(db, COLLECTIONS.SERVER_MEMBERS, `${serverId}_${targetUserId}`)
  // Delete the member doc (kick = remove from server)
  await updateDoc(memberRef, { isBanned: false })
  // Remove from userServers
  await updateDoc(doc(db, 'userServers', `${targetUserId}_${serverId}`), {
    kicked: true,
  })
  await logAction(serverId, 'kick', targetUserId, moderatorId, reason)
}

export async function banMember(
  serverId: string,
  targetUserId: string,
  moderatorId: string,
  reason = ''
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.SERVER_MEMBERS, `${serverId}_${targetUserId}`), {
    isBanned: true,
  })
  await logAction(serverId, 'ban', targetUserId, moderatorId, reason)
}

export async function unbanMember(
  serverId: string,
  targetUserId: string,
  moderatorId: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.SERVER_MEMBERS, `${serverId}_${targetUserId}`), {
    isBanned: false,
  })
  await logAction(serverId, 'unban', targetUserId, moderatorId, '')
}

export async function warnMember(
  serverId: string,
  targetUserId: string,
  moderatorId: string,
  reason: string
): Promise<void> {
  await logAction(serverId, 'warn', targetUserId, moderatorId, reason)
}

export async function getModerationLogs(
  serverId: string,
  pageSize = 50
): Promise<ModerationLog[]> {
  const q = query(
    collection(db, COLLECTIONS.MODERATION_LOGS),
    where('serverId', '==', serverId),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ModerationLog)
}

export async function getBannedMembers(serverId: string): Promise<string[]> {
  const q = query(
    collection(db, COLLECTIONS.SERVER_MEMBERS),
    where('serverId', '==', serverId),
    where('isBanned', '==', true)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data().userId as string)
}

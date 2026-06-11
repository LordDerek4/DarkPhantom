import {
  doc, setDoc, updateDoc, getDoc, collection,
  query, where, orderBy, limit, getDocs, increment,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { UserXP, Badge, Achievement } from '@/types/extended'

const XP_COLLECTION = 'userXP'
const BADGES = 'badges'
const ACHIEVEMENTS = 'achievements'

export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

export function levelFromXP(xp: number): number {
  let level = 1
  let required = 100
  while (xp >= required) {
    xp -= required
    level++
    required = Math.floor(100 * Math.pow(1.5, level - 1))
  }
  return level
}

export function xpProgressToNextLevel(totalXp: number): { current: number; required: number; level: number } {
  let xp = totalXp
  let level = 1
  let required = 100
  while (xp >= required) {
    xp -= required
    level++
    required = Math.floor(100 * Math.pow(1.5, level - 1))
  }
  return { current: xp, required, level }
}

export async function awardXP(userId: string, serverId: string, amount: number, action: 'message' | 'reaction' | 'voice' | 'thread'): Promise<void> {
  const xpRef = doc(db, XP_COLLECTION, `${serverId}_${userId}`)
  const snap = await getDoc(xpRef)

  if (!snap.exists()) {
    await setDoc(xpRef, {
      userId,
      serverId,
      xp: amount,
      level: 1,
      totalMessages: action === 'message' ? 1 : 0,
      totalReactions: action === 'reaction' ? 1 : 0,
      totalVoiceMinutes: action === 'voice' ? amount : 0,
      streak: 1,
      lastActiveAt: serverTimestamp(),
      badges: [],
      rank: null,
    })
  } else {
    const data = snap.data() as UserXP
    const newXP = data.xp + amount
    const newLevel = levelFromXP(newXP)
    await updateDoc(xpRef, {
      xp: increment(amount),
      level: newLevel,
      [`total${action === 'message' ? 'Messages' : action === 'reaction' ? 'Reactions' : 'VoiceMinutes'}`]: increment(1),
      lastActiveAt: serverTimestamp(),
    })
  }
}

export async function getServerLeaderboard(serverId: string, top = 20): Promise<UserXP[]> {
  const q = query(
    collection(db, XP_COLLECTION),
    where('serverId', '==', serverId),
    orderBy('xp', 'desc'),
    limit(top)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d, i) => ({ ...d.data(), rank: i + 1 } as UserXP))
}

export async function getUserXP(userId: string, serverId: string): Promise<UserXP | null> {
  const snap = await getDoc(doc(db, XP_COLLECTION, `${serverId}_${userId}`))
  if (!snap.exists()) return null
  return snap.data() as UserXP
}

export async function getServerBadges(serverId: string): Promise<Badge[]> {
  const q = query(collection(db, BADGES), where('serverId', '==', serverId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Badge))
}

export async function awardBadge(userId: string, serverId: string, badgeId: string): Promise<void> {
  const achievementId = `${userId}_${serverId}_${badgeId}`
  const ref = doc(db, ACHIEVEMENTS, achievementId)
  const snap = await getDoc(ref)
  if (snap.exists()) return

  await setDoc(ref, {
    userId,
    serverId,
    badgeId,
    unlockedAt: serverTimestamp(),
    progress: 1,
    goal: 1,
  })

  await updateDoc(doc(db, XP_COLLECTION, `${serverId}_${userId}`), {
    badges: [badgeId],
  })
}

export async function getUserAchievements(userId: string, serverId: string): Promise<Achievement[]> {
  const q = query(
    collection(db, ACHIEVEMENTS),
    where('userId', '==', userId),
    where('serverId', '==', serverId)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Achievement))
}

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Newcomer',
  5: 'Regular',
  10: 'Member',
  20: 'Veteran',
  30: 'Elder',
  50: 'Legend',
}

export function getLevelTitle(level: number): string {
  const thresholds = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a)
  for (const t of thresholds) {
    if (level >= t) return LEVEL_TITLES[t]
  }
  return 'Newcomer'
}

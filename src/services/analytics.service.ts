import {
  collection, addDoc, query, where, orderBy, limit,
  getDocs, doc, setDoc, getDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { ServerAnalytics, CommunityHealth } from '@/types/extended'

const ANALYTICS = 'analytics'
const COMMUNITY_HEALTH = 'communityHealth'

function dateIdDaysAgo(days: number): { id: string; ts: Timestamp } {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - days)
  return { id: d.toISOString().split('T')[0], ts: Timestamp.fromDate(d) }
}

async function retentionAgainst(serverId: string, daysAgo: number, todayActiveIds: Set<string>): Promise<number> {
  const { id: dateStr } = dateIdDaysAgo(daysAgo)
  const snap = await getDoc(doc(db, ANALYTICS, `${serverId}_${dateStr}`))
  if (!snap.exists()) return 0
  const priorActiveIds: string[] = (snap.data().activeUserIds as string[]) ?? []
  if (priorActiveIds.length === 0) return 0
  const stillActive = priorActiveIds.filter(id => todayActiveIds.has(id)).length
  return Math.round((stillActive / priorActiveIds.length) * 100)
}

export async function computeServerAnalytics(serverId: string): Promise<ServerAnalytics> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTs = Timestamp.fromDate(today)

  // Count messages today
  const msgQuery = query(
    collection(db, 'messages'),
    where('serverId', '==', serverId),
    where('createdAt', '>=', todayTs)
  )
  const msgSnap = await getDocs(msgQuery)
  const messages = msgSnap.docs.map(d => d.data())
  const authorIds = [...new Set(messages.map(m => m.authorId as string))]

  // New members who joined today
  const newMemberSnap = await getDocs(query(
    collection(db, 'serverMembers'),
    where('serverId', '==', serverId),
    where('joinedAt', '>=', todayTs)
  ))
  const newMembers = newMemberSnap.size

  // Channel breakdown
  const channelBreakdown: Record<string, number> = {}
  messages.forEach(m => {
    channelBreakdown[m.channelId] = (channelBreakdown[m.channelId] ?? 0) + 1
  })

  // Top contributors
  const contributorMap: Record<string, number> = {}
  messages.forEach(m => {
    contributorMap[m.authorId] = (contributorMap[m.authorId] ?? 0) + 1
  })
  const topContributors = Object.entries(contributorMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([userId, messageCount]) => ({ userId, messageCount }))

  // Busiest hour of day, by message createdAt
  const hourCounts = new Array(24).fill(0)
  messages.forEach(m => {
    const createdAt = m.createdAt as Timestamp | undefined
    if (createdAt?.toDate) hourCounts[createdAt.toDate().getHours()]++
  })
  const peakHour = hourCounts.every(c => c === 0) ? 12 : hourCounts.indexOf(Math.max(...hourCounts))

  const todayActiveIds = new Set(authorIds)
  const retention7d = await retentionAgainst(serverId, 7, todayActiveIds)
  const retention30d = await retentionAgainst(serverId, 30, todayActiveIds)

  const analytics: Omit<ServerAnalytics, 'id'> = {
    serverId,
    date: todayTs,
    dau: authorIds.length,
    mau: authorIds.length,
    newMembers,
    activeUserIds: authorIds,
    totalMessages: messages.length,
    activeChannels: Object.keys(channelBreakdown),
    topContributors,
    retention7d,
    retention30d,
    messageVelocity: messages.length / 24,
    peakHour,
    channelBreakdown,
  }

  const id = `${serverId}_${today.toISOString().split('T')[0]}`
  await setDoc(doc(db, ANALYTICS, id), { id, ...analytics })
  return { id, ...analytics }
}

export async function getServerAnalyticsHistory(serverId: string, days = 30): Promise<ServerAnalytics[]> {
  const q = query(
    collection(db, ANALYTICS),
    where('serverId', '==', serverId),
    orderBy('date', 'desc'),
    limit(days)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as ServerAnalytics).reverse()
}

const INCIDENT_SEVERITY: Partial<Record<string, number>> = {
  ban: 5, kick: 4, timeout: 3, mute: 2, warn: 1, delete_message: 1,
}

export async function computeCommunityHealth(serverId: string): Promise<CommunityHealth> {
  const analytics = await getServerAnalyticsHistory(serverId, 7)

  const avgMessages = analytics.reduce((s, a) => s + a.totalMessages, 0) / (analytics.length || 1)
  const avgDAU = analytics.reduce((s, a) => s + a.dau, 0) / (analytics.length || 1)
  const totalMessages7d = analytics.reduce((s, a) => s + a.totalMessages, 0)

  const participationScore = Math.min(100, (avgDAU / 10) * 100)
  const growthScore = analytics.length >= 2
    ? Math.min(100, ((analytics[analytics.length - 1].dau - analytics[0].dau) / (analytics[0].dau || 1)) * 100 + 50)
    : 50

  const { ts: sevenDaysAgoTs } = dateIdDaysAgo(7)
  const modLogSnap = await getDocs(query(
    collection(db, 'moderationLogs'),
    where('serverId', '==', serverId),
    where('createdAt', '>=', sevenDaysAgoTs)
  ))
  const modActions = modLogSnap.docs.map(d => d.data().action as string)

  const moderationScore = Math.max(0, Math.min(100, 100 - (modActions.length / Math.max(avgDAU, 1)) * 50))

  const weightedIncidents = modActions.reduce((s, action) => s + (INCIDENT_SEVERITY[action] ?? 0), 0)
  const toxicityScore = Math.max(0, Math.min(100, 100 - (weightedIncidents / Math.max(totalMessages7d, 1)) * 1000))

  const retentionScore = analytics.length > 0 ? analytics[analytics.length - 1].retention7d : 0

  const score = Math.round(
    participationScore * 0.25 +
    growthScore * 0.2 +
    moderationScore * 0.2 +
    toxicityScore * 0.2 +
    retentionScore * 0.15
  )

  const recommendations: string[] = []
  if (participationScore < 40) recommendations.push('Encourage more members to participate in conversations')
  if (growthScore < 40) recommendations.push('Consider promoting your server to attract new members')
  if (avgMessages < 10) recommendations.push('Post regular content to keep the community engaged')
  if (score > 70) recommendations.push('Your community is thriving! Consider hosting events to maintain momentum')

  const health: Omit<CommunityHealth, 'id'> = {
    serverId,
    score,
    toxicityScore,
    participationScore,
    retentionScore,
    growthScore,
    moderationScore,
    recommendations,
    calculatedAt: Timestamp.now(),
    trend: growthScore > 55 ? 'improving' : growthScore < 45 ? 'declining' : 'stable',
  }

  const id = `health_${serverId}`
  await setDoc(doc(db, COMMUNITY_HEALTH, id), { id, ...health })
  return { id, ...health }
}

export async function getCommunityHealth(serverId: string): Promise<CommunityHealth | null> {
  const snap = await getDoc(doc(db, COMMUNITY_HEALTH, `health_${serverId}`))
  if (!snap.exists()) return null
  return snap.data() as CommunityHealth
}

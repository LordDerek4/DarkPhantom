import {
  collection, addDoc, query, where, orderBy, limit,
  getDocs, doc, setDoc, getDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { ServerAnalytics, CommunityHealth } from '@/types/extended'

const ANALYTICS = 'analytics'
const COMMUNITY_HEALTH = 'communityHealth'

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

  const analytics: Omit<ServerAnalytics, 'id'> = {
    serverId,
    date: todayTs,
    dau: authorIds.length,
    mau: authorIds.length,
    newMembers: 0,
    totalMessages: messages.length,
    activeChannels: Object.keys(channelBreakdown),
    topContributors,
    retention7d: 0,
    retention30d: 0,
    messageVelocity: messages.length / 24,
    peakHour: 12,
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

export async function computeCommunityHealth(serverId: string): Promise<CommunityHealth> {
  const analytics = await getServerAnalyticsHistory(serverId, 7)

  const avgMessages = analytics.reduce((s, a) => s + a.totalMessages, 0) / (analytics.length || 1)
  const avgDAU = analytics.reduce((s, a) => s + a.dau, 0) / (analytics.length || 1)

  const participationScore = Math.min(100, (avgDAU / 10) * 100)
  const growthScore = analytics.length >= 2
    ? Math.min(100, ((analytics[analytics.length - 1].dau - analytics[0].dau) / (analytics[0].dau || 1)) * 100 + 50)
    : 50
  const moderationScore = 80
  const toxicityScore = 85
  const retentionScore = 70

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

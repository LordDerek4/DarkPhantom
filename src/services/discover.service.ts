import {
  collection, query, where, orderBy, limit,
  getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore'
import { db, COLLECTIONS } from './firebase'
import type { ServerListing } from '@/types/extended'

const LISTINGS = 'serverListings'

function serverToListing(data: Record<string, unknown>, id: string): ServerListing {
  return {
    id,
    serverId: id,
    name: (data.name as string) ?? 'Unknown',
    description: (data.description as string) ?? '',
    iconUrl: (data.iconUrl as string | null) ?? null,
    bannerUrl: (data.bannerUrl as string | null) ?? null,
    memberCount: (data.memberCount as number) ?? 1,
    onlineCount: 0,
    weeklyGrowth: 0,
    engagementScore: 0,
    boostLevel: (data.boostLevel as number) ?? 0,
    category: 'social',
    tags: [],
    language: 'en',
    inviteCode: '',
    isFeatured: false,
    isVerified: false,
    createdAt: data.createdAt as never,
    updatedAt: data.updatedAt as never,
  }
}

export async function publishServerListing(
  serverId: string,
  data: Omit<ServerListing, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  await setDoc(doc(db, LISTINGS, serverId), {
    ...data,
    id: serverId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateServerListing(serverId: string, updates: Partial<ServerListing>): Promise<void> {
  await updateDoc(doc(db, LISTINGS, serverId), { ...updates, updatedAt: serverTimestamp() })
}

// Keeps the Discover listing in sync when a server's privacy is toggled.
// A server created private never gets a listing at all (see createServer()),
// so flipping it public later has nothing to update — this creates one from
// scratch. Flipping to private removes the listing so it actually disappears
// from Discover (the read side doesn't otherwise filter by isPublic once a
// listing exists).
export async function syncDiscoverListing(
  serverId: string,
  isPublic: boolean,
  data: {
    name: string
    description: string
    iconUrl: string | null
    bannerUrl: string | null
    memberCount: number
    boostLevel: number
  }
): Promise<void> {
  if (!isPublic) {
    await deleteDoc(doc(db, LISTINGS, serverId)).catch(() => {})
    return
  }

  // Category is set at creation time (communitySettings.category) regardless
  // of privacy, so it survives even though a private server never got a
  // listing to store it in.
  const settingsSnap = await getDoc(doc(db, 'communitySettings', serverId))
  const category = (settingsSnap.exists() && (settingsSnap.data().category as string)) || 'social'

  const invitesSnap = await getDocs(
    query(collection(db, COLLECTIONS.INVITES), where('serverId', '==', serverId), limit(1))
  )
  const inviteCode = (invitesSnap.docs[0]?.data().code as string | undefined) ?? ''

  await publishServerListing(serverId, {
    serverId,
    name: data.name,
    description: data.description,
    iconUrl: data.iconUrl,
    bannerUrl: data.bannerUrl,
    memberCount: data.memberCount,
    onlineCount: 0,
    weeklyGrowth: 0,
    engagementScore: 0,
    boostLevel: data.boostLevel,
    category,
    tags: [],
    language: 'en',
    inviteCode,
    isFeatured: false,
    isVerified: false,
  })
}

export async function getFeaturedServers(count = 12): Promise<ServerListing[]> {
  try {
    const q = query(
      collection(db, LISTINGS),
      where('isFeatured', '==', true),
      orderBy('memberCount', 'desc'),
      limit(count)
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => d.data() as ServerListing)
  } catch {
    return []
  }
}

export async function getTrendingServers(count = 20): Promise<ServerListing[]> {
  try {
    const q = query(collection(db, LISTINGS), orderBy('memberCount', 'desc'), limit(count))
    const snap = await getDocs(q)
    if (snap.docs.length > 0) return snap.docs.map(d => d.data() as ServerListing)
  } catch {
    // fall through
  }

  // Fall back: query the servers collection directly for public servers
  try {
    const q = query(
      collection(db, COLLECTIONS.SERVERS),
      where('isPublic', '==', true),
      limit(count)
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => serverToListing(d.data(), d.id))
  } catch {
    return []
  }
}

export async function searchServers(searchQuery: string, category?: string): Promise<ServerListing[]> {
  let q = query(collection(db, LISTINGS), orderBy('memberCount', 'desc'), limit(50))

  if (category) {
    q = query(collection(db, LISTINGS), where('category', '==', category), orderBy('memberCount', 'desc'), limit(50))
  }

  const snap = await getDocs(q)
  const all = snap.docs.map(d => d.data() as ServerListing)

  if (!searchQuery.trim()) return all

  const lower = searchQuery.toLowerCase()
  return all.filter(s =>
    s.name.toLowerCase().includes(lower) ||
    s.description.toLowerCase().includes(lower) ||
    s.tags.some(t => t.toLowerCase().includes(lower))
  )
}

export async function getServersByCategory(category: string, count = 20): Promise<ServerListing[]> {
  const q = query(
    collection(db, LISTINGS),
    where('category', '==', category),
    orderBy('engagementScore', 'desc'),
    limit(count)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as ServerListing)
}

export const SERVER_CATEGORIES = [
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'technology', label: 'Technology', emoji: '💻' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
  { id: 'education', label: 'Education', emoji: '📚' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'social', label: 'Social', emoji: '💬' },
  { id: 'business', label: 'Business', emoji: '💼' },
  { id: 'science', label: 'Science', emoji: '🔬' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { id: 'debates', label: 'Debates', emoji: '🗣️' },
  { id: 'politics', label: 'Politics', emoji: '🏛️' },
  { id: 'custom', label: 'Custom', emoji: '✨' },
]

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore'
import { db, COLLECTIONS } from './firebase'
import type { User, UserStatus } from '@/types'

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, 'displayName' | 'bio' | 'avatarUrl' | 'bannerUrl' | 'customStatus' | 'themePreference' | 'notificationSettings' | 'usernameGradient' | 'profileAccentColor' | 'premiumTheme' | 'referralCode'>>
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

export async function updateUserStatus(userId: string, status: UserStatus): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), { status })
}

export async function searchUsers(searchTerm: string, excludeUserId?: string): Promise<User[]> {
  // Search by username prefix
  const usernameQuery = query(
    collection(db, COLLECTIONS.USERS),
    where('username', '>=', searchTerm.toLowerCase()),
    where('username', '<=', searchTerm.toLowerCase() + ''),
    limit(10)
  )

  const displayNameQuery = query(
    collection(db, COLLECTIONS.USERS),
    where('displayName', '>=', searchTerm),
    where('displayName', '<=', searchTerm + ''),
    limit(10)
  )

  const [usernameSnap, displayNameSnap] = await Promise.all([
    getDocs(usernameQuery),
    getDocs(displayNameQuery),
  ])

  const users = new Map<string, User>()
  const allDocs = [...usernameSnap.docs, ...displayNameSnap.docs]

  for (const d of allDocs) {
    const user = { uid: d.id, ...d.data() } as User
    if (user.uid !== excludeUserId) {
      users.set(user.uid, user)
    }
  }

  return Array.from(users.values())
}

export async function getMultipleUsers(uids: string[]): Promise<Map<string, User>> {
  if (uids.length === 0) return new Map()
  const users = new Map<string, User>()
  // Firestore 'in' query supports max 30 items, batch accordingly
  const chunks: string[][] = []
  for (let i = 0; i < uids.length; i += 30) {
    chunks.push(uids.slice(i, i + 30))
  }
  for (const chunk of chunks) {
    const q = query(collection(db, COLLECTIONS.USERS), where('uid', 'in', chunk))
    const snap = await getDocs(q)
    for (const d of snap.docs) {
      users.set(d.id, { uid: d.id, ...d.data() } as User)
    }
  }
  return users
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const q = query(
    collection(db, COLLECTIONS.USERS),
    where('username', '==', username.toLowerCase()),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { uid: d.id, ...d.data() } as User
}

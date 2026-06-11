import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  writeBatch,
  Timestamp,
} from 'firebase/firestore'
import { db, COLLECTIONS } from './firebase'
import type { Server, ServerMember, Role, Invite } from '@/types'
import { generateId, generateInviteCode } from '@/utils/helpers'
import { DEFAULT_PERMISSIONS, ADMIN_PERMISSIONS, OWNER_PERMISSIONS } from '@/utils/permissions'

export async function createServer(
  ownerId: string,
  name: string,
  iconUrl: string | null = null,
  isPublic = true
): Promise<Server> {
  const serverId = generateId()

  const serverData: Omit<Server, 'id'> = {
    name,
    description: '',
    iconUrl,
    bannerUrl: null,
    ownerId,
    region: 'eu-west',
    boostLevel: 0,
    memberCount: 1,
    isPublic,
    vanityUrl: null,
    rulesChannelId: null,
    systemChannelId: null,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    features: [],
  }

  // ── Batch 1: server + member + userServers ─────────────────────────────────
  // These writes have no get() calls in their rules so they work atomically.
  const everyoneRoleId = `${serverId}_everyone`
  const adminRoleId = generateId()
  const modRoleId = generateId()

  const batch1 = writeBatch(db)
  batch1.set(doc(db, COLLECTIONS.SERVERS, serverId), serverData)
  batch1.set(doc(db, COLLECTIONS.SERVER_MEMBERS, `${serverId}_${ownerId}`), {
    userId: ownerId,
    serverId,
    roles: [everyoneRoleId, adminRoleId],
    nickname: null,
    joinedAt: serverTimestamp(),
    mutedUntil: null,
    isBanned: false,
    isMuted: false,
    isDeafened: false,
  })
  batch1.set(doc(db, 'userServers', `${ownerId}_${serverId}`), {
    userId: ownerId,
    serverId,
    joinedAt: serverTimestamp(),
  })
  await batch1.commit()

  // ── Batch 2: roles + channels ──────────────────────────────────────────────
  // Server + member now exist so isOwner()/isMember() work correctly in rules.
  const generalCategoryId = generateId()
  const generalChannelId = generateId()
  const announcementChannelId = generateId()

  const rolesList: Role[] = [
    {
      id: everyoneRoleId, serverId, name: '@everyone', color: '#99aab5',
      position: 0, permissions: DEFAULT_PERMISSIONS, hoist: false,
      mentionable: false, isDefault: true, createdAt: serverTimestamp() as Timestamp,
    },
    {
      id: modRoleId, serverId, name: 'Moderator', color: '#1abc9c',
      position: 1, permissions: ADMIN_PERMISSIONS, hoist: true,
      mentionable: true, isDefault: false, createdAt: serverTimestamp() as Timestamp,
    },
    {
      id: adminRoleId, serverId, name: 'Admin', color: '#e74c3c',
      position: 2, permissions: ADMIN_PERMISSIONS, hoist: true,
      mentionable: true, isDefault: false, createdAt: serverTimestamp() as Timestamp,
    },
  ]

  const batch2 = writeBatch(db)
  for (const role of rolesList) {
    batch2.set(doc(db, COLLECTIONS.ROLES, role.id), role)
  }
  batch2.set(doc(db, COLLECTIONS.CHANNELS, generalCategoryId), {
    id: generalCategoryId, serverId, name: 'Text Channels', type: 'category',
    topic: '', position: 0, categoryId: null, isNSFW: false, slowModeDelay: 0,
    lastMessageId: null, lastMessageAt: null, permissionOverwrites: [],
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  batch2.set(doc(db, COLLECTIONS.CHANNELS, announcementChannelId), {
    id: announcementChannelId, serverId, name: 'announcements', type: 'announcement',
    topic: 'Server announcements', position: 1, categoryId: generalCategoryId,
    isNSFW: false, slowModeDelay: 0, lastMessageId: null, lastMessageAt: null,
    permissionOverwrites: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  batch2.set(doc(db, COLLECTIONS.CHANNELS, generalChannelId), {
    id: generalChannelId, serverId, name: 'general', type: 'text',
    topic: 'General discussion', position: 2, categoryId: generalCategoryId,
    isNSFW: false, slowModeDelay: 0, lastMessageId: null, lastMessageAt: null,
    permissionOverwrites: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  await batch2.commit()

  // ── Default invite + server listing ───────────────────────────────────────
  const inviteCode = generateInviteCode()
  await addDoc(collection(db, COLLECTIONS.INVITES), {
    serverId,
    channelId: generalChannelId,
    code: inviteCode,
    createdBy: ownerId,
    uses: 0,
    maxUses: null,
    expiresAt: null,
    createdAt: serverTimestamp(),
  })
  if (isPublic) {
    await setDoc(doc(db, 'serverListings', serverId), {
      id: serverId,
      serverId,
      name,
      description: '',
      iconUrl,
      bannerUrl: null,
      memberCount: 1,
      onlineCount: 0,
      weeklyGrowth: 0,
      engagementScore: 0,
      boostLevel: 0,
      category: 'social',
      tags: [],
      language: 'en',
      inviteCode,
      isFeatured: false,
      isVerified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  return { id: serverId, ...serverData }
}

export async function joinServer(userId: string, inviteCode: string): Promise<Server> {
  // Lookup invite
  const inviteQuery = query(
    collection(db, COLLECTIONS.INVITES),
    where('code', '==', inviteCode)
  )
  const inviteSnap = await getDocs(inviteQuery)
  if (inviteSnap.empty) throw new Error('Invalid invite code')

  const inviteDoc = inviteSnap.docs[0]
  const invite = { id: inviteDoc.id, ...inviteDoc.data() } as Invite

  // Check expiry
  if (invite.expiresAt && invite.expiresAt.toDate() < new Date()) {
    throw new Error('Invite has expired')
  }
  if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
    throw new Error('Invite has reached its maximum uses')
  }

  // Check if already a member
  const memberRef = doc(db, COLLECTIONS.SERVER_MEMBERS, `${invite.serverId}_${userId}`)
  const memberSnap = await getDoc(memberRef)
  if (memberSnap.exists()) {
    const serverSnap = await getDoc(doc(db, COLLECTIONS.SERVERS, invite.serverId))
    return { id: serverSnap.id, ...serverSnap.data() } as Server
  }

  // Get server
  const serverSnap = await getDoc(doc(db, COLLECTIONS.SERVERS, invite.serverId))
  if (!serverSnap.exists()) throw new Error('Server not found')

  // Get everyone role
  const rolesSnap = await getDocs(
    query(collection(db, COLLECTIONS.ROLES), where('serverId', '==', invite.serverId), where('isDefault', '==', true))
  )
  const everyoneRoleId = rolesSnap.docs[0]?.id ?? `${invite.serverId}_everyone`

  const batch = writeBatch(db)

  batch.set(memberRef, {
    userId,
    serverId: invite.serverId,
    roles: [everyoneRoleId],
    nickname: null,
    joinedAt: serverTimestamp(),
    mutedUntil: null,
    isBanned: false,
    isMuted: false,
    isDeafened: false,
  })

  batch.update(doc(db, COLLECTIONS.SERVERS, invite.serverId), {
    memberCount: increment(1),
  })

  batch.update(inviteDoc.ref, { uses: increment(1) })

  batch.set(doc(db, 'userServers', `${userId}_${invite.serverId}`), {
    userId,
    serverId: invite.serverId,
    joinedAt: serverTimestamp(),
  })

  await batch.commit()
  return { id: serverSnap.id, ...serverSnap.data() } as Server
}

export async function leaveServer(userId: string, serverId: string): Promise<void> {
  const server = await getDoc(doc(db, COLLECTIONS.SERVERS, serverId))
  if (!server.exists()) throw new Error('Server not found')
  if ((server.data() as Server).ownerId === userId) {
    throw new Error('Owner cannot leave the server. Transfer ownership first.')
  }

  const batch = writeBatch(db)
  batch.delete(doc(db, COLLECTIONS.SERVER_MEMBERS, `${serverId}_${userId}`))
  batch.update(doc(db, COLLECTIONS.SERVERS, serverId), { memberCount: increment(-1) })
  batch.delete(doc(db, 'userServers', `${userId}_${serverId}`))
  await batch.commit()
}

export async function transferOwnership(serverId: string, newOwnerId: string): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(db, COLLECTIONS.SERVERS, serverId), {
    ownerId: newOwnerId,
    updatedAt: serverTimestamp(),
  })
  // Mirror to serverListings if it exists (best-effort, non-blocking)
  batch.update(doc(db, 'serverListings', serverId), { updatedAt: serverTimestamp() })
  try {
    await batch.commit()
  } catch {
    // serverListings might not exist — retry with just the server doc
    await updateDoc(doc(db, COLLECTIONS.SERVERS, serverId), {
      ownerId: newOwnerId,
      updatedAt: serverTimestamp(),
    })
  }
}

export async function updateServer(
  serverId: string,
  updates: Partial<Pick<Server, 'name' | 'description' | 'iconUrl' | 'bannerUrl' | 'isPublic'>>
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.SERVERS, serverId), {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteServer(serverId: string): Promise<void> {
  // ── Phase 1: READ everything while the server + members still exist ──────────
  console.log('[deleteServer] Phase 1: reading sub-collections for', serverId)
  const [channelsSnap, rolesSnap, invitesSnap, membersSnap] = await Promise.all([
    getDocs(query(collection(db, COLLECTIONS.CHANNELS), where('serverId', '==', serverId))).catch(e => { throw Object.assign(new Error(`Phase 1 channels read: ${e.message}`), { cause: e }) }),
    getDocs(query(collection(db, COLLECTIONS.ROLES), where('serverId', '==', serverId))).catch(e => { throw Object.assign(new Error(`Phase 1 roles read: ${e.message}`), { cause: e }) }),
    getDocs(query(collection(db, COLLECTIONS.INVITES), where('serverId', '==', serverId))).catch(e => { throw Object.assign(new Error(`Phase 1 invites read: ${e.message}`), { cause: e }) }),
    getDocs(query(collection(db, COLLECTIONS.SERVER_MEMBERS), where('serverId', '==', serverId))).catch(e => { throw Object.assign(new Error(`Phase 1 members read: ${e.message}`), { cause: e }) }),
  ])
  console.log('[deleteServer] Phase 1 done — channels:', channelsSnap.size, 'roles:', rolesSnap.size, 'invites:', invitesSnap.size, 'members:', membersSnap.size)

  const memberUserIds = membersSnap.docs.map(d => d.data().userId as string)

  // ── Phase 2: DELETE sub-collections ──────────────────────────────────────────
  console.log('[deleteServer] Phase 2: deleting sub-collections')
  const batchDel = (docs: typeof channelsSnap.docs, label: string) => {
    if (docs.length === 0) return Promise.resolve()
    const b = writeBatch(db)
    docs.forEach(d => b.delete(d.ref))
    return b.commit().catch(e => { throw Object.assign(new Error(`Phase 2 ${label} delete: ${e.message}`), { cause: e }) })
  }

  await Promise.all([
    batchDel(channelsSnap.docs, 'channels'),
    batchDel(rolesSnap.docs, 'roles'),
    batchDel(invitesSnap.docs, 'invites'),
    batchDel(membersSnap.docs, 'serverMembers'),
  ])

  // ── Phase 3: DELETE userServers by known doc IDs ──────────────────────────────
  console.log('[deleteServer] Phase 3: deleting userServers for', memberUserIds.length, 'members')
  if (memberUserIds.length > 0) {
    const b = writeBatch(db)
    memberUserIds.forEach(uid => b.delete(doc(db, 'userServers', `${uid}_${serverId}`)))
    await b.commit().catch(e => { throw Object.assign(new Error(`Phase 3 userServers delete: ${e.message}`), { cause: e }) })
  }

  // ── Phase 4a: DELETE community docs (need isOwner — server doc must still exist) ──
  console.log('[deleteServer] Phase 4a: deleting community docs')
  const batchCommunity = writeBatch(db)
  batchCommunity.delete(doc(db, 'communityRules', serverId))
  batchCommunity.delete(doc(db, 'communitySettings', serverId))
  await batchCommunity.commit().catch(e => { throw Object.assign(new Error(`Phase 4a community docs delete: ${e.message}`), { cause: e }) })

  // ── Phase 4b: DELETE serverListings + server doc ──────────────────────────────
  console.log('[deleteServer] Phase 4b: deleting serverListings + server doc')
  const batchFinal = writeBatch(db)
  batchFinal.delete(doc(db, 'serverListings', serverId))
  batchFinal.delete(doc(db, COLLECTIONS.SERVERS, serverId))
  await batchFinal.commit().catch(e => { throw Object.assign(new Error(`Phase 4b server doc delete: ${e.message}`), { cause: e }) })

  console.log('[deleteServer] Done — server', serverId, 'deleted')
}

export async function getUserServers(userId: string): Promise<Server[]> {
  const userServersQuery = query(
    collection(db, 'userServers'),
    where('userId', '==', userId),
    orderBy('joinedAt', 'asc')
  )
  const snap = await getDocs(userServersQuery)

  const serverIds = snap.docs.map(d => d.data().serverId as string)
  if (serverIds.length === 0) return []

  const servers: Server[] = []
  for (const id of serverIds) {
    const serverSnap = await getDoc(doc(db, COLLECTIONS.SERVERS, id))
    if (serverSnap.exists()) {
      servers.push({ id: serverSnap.id, ...serverSnap.data() } as Server)
    }
  }
  return servers
}

export async function getServerMembers(serverId: string): Promise<ServerMember[]> {
  const q = query(
    collection(db, COLLECTIONS.SERVER_MEMBERS),
    where('serverId', '==', serverId),
    where('isBanned', '==', false)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as ServerMember)
}

export async function getServerRoles(serverId: string): Promise<Role[]> {
  const q = query(
    collection(db, COLLECTIONS.ROLES),
    where('serverId', '==', serverId),
    orderBy('position', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Role)
}

export async function createInvite(
  serverId: string,
  channelId: string,
  createdBy: string,
  options: { expiresInHours?: number; maxUses?: number; isTemporary?: boolean } = {}
): Promise<Invite> {
  const code = generateInviteCode()
  const inviteId = generateId()
  const expiresAt = options.expiresInHours
    ? Timestamp.fromDate(new Date(Date.now() + options.expiresInHours * 3600 * 1000))
    : null

  const invite: Omit<Invite, 'id'> = {
    code,
    serverId,
    channelId,
    createdBy,
    createdAt: serverTimestamp() as Timestamp,
    expiresAt,
    maxUses: options.maxUses ?? null,
    uses: 0,
    isTemporary: options.isTemporary ?? false,
  }

  await setDoc(doc(db, COLLECTIONS.INVITES, inviteId), invite)
  return { id: inviteId, ...invite }
}

export async function getServerInvites(serverId: string): Promise<Invite[]> {
  const q = query(collection(db, COLLECTIONS.INVITES), where('serverId', '==', serverId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Invite)
}

export async function deleteInvite(inviteId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.INVITES, inviteId))
}

export async function updateMemberRole(
  serverId: string,
  userId: string,
  roles: string[]
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.SERVER_MEMBERS, `${serverId}_${userId}`), { roles })
}

export async function updateMemberNickname(
  serverId: string,
  userId: string,
  nickname: string | null
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.SERVER_MEMBERS, `${serverId}_${userId}`), { nickname })
}

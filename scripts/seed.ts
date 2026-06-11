/**
 * Seed script — run with: npx tsx scripts/seed.ts
 * Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account key.
 */
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? require(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : null

if (!serviceAccount) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path')
  process.exit(1)
}

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()
const adminAuth = getAuth()

async function seed() {
  console.log('🌱 Seeding PulseChat database...')

  // Create demo users
  const users = [
    { email: 'alice@demo.com', password: 'demo1234', username: 'alice', displayName: 'Alice Chen' },
    { email: 'bob@demo.com', password: 'demo1234', username: 'bob_dev', displayName: 'Bob Dev' },
    { email: 'charlie@demo.com', password: 'demo1234', username: 'charlie', displayName: 'Charlie G' },
  ]

  const createdUsers: { uid: string; username: string; displayName: string }[] = []

  for (const u of users) {
    try {
      let record = await adminAuth.getUserByEmail(u.email).catch(() => null)
      if (!record) {
        record = await adminAuth.createUser({ email: u.email, password: u.password, displayName: u.displayName })
      }

      await db.doc(`users/${record.uid}`).set({
        email: u.email,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: null,
        bannerUrl: null,
        bio: `Hi, I'm ${u.displayName}!`,
        status: 'offline',
        customStatus: '',
        createdAt: Timestamp.now(),
        lastSeen: Timestamp.now(),
        friendIds: [],
        blockedIds: [],
        notificationSettings: {
          desktopNotifications: true,
          soundEnabled: true,
          mentionsOnly: false,
          suppressEveryone: false,
          suppressRoles: false,
        },
        themePreference: 'dark',
      }, { merge: true })

      await db.doc(`usernames/${u.username}`).set({ uid: record.uid })
      createdUsers.push({ uid: record.uid, username: u.username, displayName: u.displayName })
      console.log(`  ✅ Created user: ${u.displayName} (${record.uid})`)
    } catch (err) {
      console.warn(`  ⚠️ Skipped user ${u.email}:`, err)
    }
  }

  if (createdUsers.length === 0) {
    console.log('No users created, aborting server seed.')
    return
  }

  const owner = createdUsers[0]

  // Create a demo server
  const serverId = 'demo-server-001'
  const everyoneRoleId = `${serverId}_everyone`
  const adminRoleId = `${serverId}_admin`

  await db.doc(`servers/${serverId}`).set({
    name: 'PulseChat HQ',
    description: 'The official PulseChat community server!',
    iconUrl: null,
    bannerUrl: null,
    ownerId: owner.uid,
    region: 'us-east',
    boostLevel: 0,
    memberCount: createdUsers.length,
    isPublic: true,
    vanityUrl: null,
    rulesChannelId: null,
    systemChannelId: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    features: [],
  })
  console.log(`  ✅ Created server: PulseChat HQ`)

  // Roles
  await db.doc(`roles/${everyoneRoleId}`).set({
    id: everyoneRoleId,
    serverId,
    name: '@everyone',
    color: '#99aab5',
    position: 0,
    permissions: ['READ_MESSAGES', 'SEND_MESSAGES', 'ADD_REACTIONS', 'EMBED_LINKS', 'ATTACH_FILES'],
    hoist: false,
    mentionable: false,
    isDefault: true,
    createdAt: Timestamp.now(),
  })

  await db.doc(`roles/${adminRoleId}`).set({
    id: adminRoleId,
    serverId,
    name: 'Admin',
    color: '#e74c3c',
    position: 2,
    permissions: ['ADMINISTRATOR', 'MANAGE_SERVER', 'MANAGE_CHANNELS', 'KICK_MEMBERS', 'BAN_MEMBERS'],
    hoist: true,
    mentionable: true,
    isDefault: false,
    createdAt: Timestamp.now(),
  })

  // Channels
  const catId = 'cat-general-001'
  const generalId = 'ch-general-001'
  const announcementsId = 'ch-announcements-001'
  const offTopicId = 'ch-offtopic-001'

  await db.doc(`channels/${catId}`).set({
    id: catId, serverId, name: 'Text Channels', type: 'category',
    topic: '', position: 0, categoryId: null, isNSFW: false, slowModeDelay: 0,
    lastMessageId: null, lastMessageAt: null, permissionOverwrites: [],
    createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
  })

  await db.doc(`channels/${announcementsId}`).set({
    id: announcementsId, serverId, name: 'announcements', type: 'announcement',
    topic: 'Important server announcements', position: 1, categoryId: catId,
    isNSFW: false, slowModeDelay: 0, lastMessageId: null, lastMessageAt: null,
    permissionOverwrites: [], createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
  })

  await db.doc(`channels/${generalId}`).set({
    id: generalId, serverId, name: 'general', type: 'text',
    topic: 'General discussion about everything', position: 2, categoryId: catId,
    isNSFW: false, slowModeDelay: 0, lastMessageId: null, lastMessageAt: null,
    permissionOverwrites: [], createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
  })

  await db.doc(`channels/${offTopicId}`).set({
    id: offTopicId, serverId, name: 'off-topic', type: 'text',
    topic: 'Everything else', position: 3, categoryId: catId,
    isNSFW: false, slowModeDelay: 0, lastMessageId: null, lastMessageAt: null,
    permissionOverwrites: [], createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
  })

  // Members
  for (const u of createdUsers) {
    const roles = [everyoneRoleId]
    if (u.uid === owner.uid) roles.push(adminRoleId)

    await db.doc(`serverMembers/${serverId}_${u.uid}`).set({
      userId: u.uid,
      serverId,
      roles,
      nickname: null,
      joinedAt: Timestamp.now(),
      mutedUntil: null,
      isBanned: false,
      isMuted: false,
      isDeafened: false,
    })

    await db.doc(`userServers/${u.uid}_${serverId}`).set({
      userId: u.uid,
      serverId,
      joinedAt: Timestamp.now(),
    })
  }

  // Seed messages
  const seedMessages = [
    { authorId: owner.uid, content: '👋 Welcome to PulseChat HQ! This is the #general channel.' },
    { authorId: createdUsers[1]?.uid ?? owner.uid, content: 'Hey everyone! Excited to be here 🎉' },
    { authorId: createdUsers[2]?.uid ?? owner.uid, content: 'This platform looks amazing! Love the Discord-like feel.' },
    { authorId: owner.uid, content: 'Thanks! Feel free to explore and give feedback. We\'re building something special here 🚀' },
  ]

  for (const msg of seedMessages) {
    const msgRef = db.collection('messages').doc()
    await msgRef.set({
      channelId: generalId,
      serverId,
      authorId: msg.authorId,
      content: msg.content,
      type: 'default',
      replyToId: null,
      replyToContent: null,
      replyToAuthorId: null,
      attachments: [],
      embeds: [],
      mentions: [],
      roleMentions: [],
      mentionEveryone: false,
      isPinned: false,
      isEdited: false,
      editedAt: null,
      createdAt: Timestamp.now(),
      reactions: {},
      readBy: [],
    })
  }

  // Invite
  await db.collection('invites').doc('demo-invite').set({
    code: 'DEMO1234',
    serverId,
    channelId: generalId,
    createdBy: owner.uid,
    createdAt: Timestamp.now(),
    expiresAt: null,
    maxUses: null,
    uses: 0,
    isTemporary: false,
  })

  console.log('✅ Seed complete!')
  console.log(`\n📋 Demo credentials:`)
  users.forEach(u => console.log(`  ${u.email} / ${u.password}`))
  console.log(`\n🔗 Demo invite: /invite/DEMO1234`)
}

seed().catch(console.error)

import { Timestamp } from 'firebase/firestore'

// ─── User ────────────────────────────────────────────────────────────────────

export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline'

export interface User {
  uid: string
  email: string
  username: string
  displayName: string
  avatarUrl: string | null
  bannerUrl: string | null
  bio: string
  status: UserStatus
  customStatus: string
  createdAt: Timestamp
  lastSeen: Timestamp
  friendIds: string[]
  blockedIds: string[]
  notificationSettings: NotificationSettings
  themePreference: 'dark' | 'light' | 'system'
  isPremium?: boolean
  premiumSince?: import('firebase/firestore').Timestamp | null
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  usernameGradient?: string | null
  profileAccentColor?: string | null
  premiumTheme?: string | null
  loginStreak?: number
  referralCode?: string | null
}

export interface NotificationSettings {
  desktopNotifications: boolean
  soundEnabled: boolean
  mentionsOnly: boolean
  suppressEveryone: boolean
  suppressRoles: boolean
}

// ─── Server ──────────────────────────────────────────────────────────────────

export type ServerBoostLevel = 0 | 1 | 2 | 3

export interface Server {
  id: string
  name: string
  description: string
  iconUrl: string | null
  bannerUrl: string | null
  ownerId: string
  region: string
  boostLevel: ServerBoostLevel
  memberCount: number
  isPublic: boolean
  accentColor?: string | null
  vanityUrl: string | null
  rulesChannelId: string | null
  systemChannelId: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
  features: string[]
}

export type RolePermission =
  | 'ADMINISTRATOR'
  | 'MANAGE_SERVER'
  | 'MANAGE_ROLES'
  | 'MANAGE_CHANNELS'
  | 'KICK_MEMBERS'
  | 'BAN_MEMBERS'
  | 'CREATE_INVITES'
  | 'CHANGE_NICKNAME'
  | 'MANAGE_NICKNAMES'
  | 'MANAGE_MESSAGES'
  | 'MENTION_EVERYONE'
  | 'SEND_MESSAGES'
  | 'READ_MESSAGES'
  | 'EMBED_LINKS'
  | 'ATTACH_FILES'
  | 'ADD_REACTIONS'
  | 'USE_SLASH_COMMANDS'
  | 'MUTE_MEMBERS'
  | 'DEAFEN_MEMBERS'
  | 'MOVE_MEMBERS'
  | 'PIN_MESSAGES'

export interface Role {
  id: string
  serverId: string
  name: string
  color: string
  position: number
  permissions: RolePermission[]
  hoist: boolean
  mentionable: boolean
  isDefault: boolean
  createdAt: Timestamp
}

export interface ServerMember {
  userId: string
  serverId: string
  roles: string[]
  nickname: string | null
  joinedAt: Timestamp
  mutedUntil: Timestamp | null
  isBanned: boolean
  isMuted: boolean
  isDeafened: boolean
}

export interface Invite {
  id: string
  code: string
  serverId: string
  channelId: string | null
  createdBy: string
  createdAt: Timestamp
  expiresAt: Timestamp | null
  maxUses: number | null
  uses: number
  isTemporary: boolean
}

// ─── Channel ─────────────────────────────────────────────────────────────────

export type ChannelType = 'text' | 'announcement' | 'category' | 'voice'

export interface Channel {
  id: string
  serverId: string
  name: string
  type: ChannelType
  topic: string
  position: number
  categoryId: string | null
  isNSFW: boolean
  slowModeDelay: number
  lastMessageId: string | null
  lastMessageAt: Timestamp | null
  permissionOverwrites: PermissionOverwrite[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface PermissionOverwrite {
  id: string
  type: 'role' | 'member'
  allow: RolePermission[]
  deny: RolePermission[]
}

// ─── Message ─────────────────────────────────────────────────────────────────

export type MessageType = 'default' | 'system' | 'reply' | 'pin' | 'join' | 'leave'

export interface Message {
  id: string
  channelId: string
  serverId: string | null
  authorId: string
  content: string
  type: MessageType
  replyToId: string | null
  replyToContent: string | null
  replyToAuthorId: string | null
  attachments: Attachment[]
  embeds: Embed[]
  mentions: string[]
  roleMentions: string[]
  mentionEveryone: boolean
  isPinned: boolean
  isEdited: boolean
  editedAt: Timestamp | null
  createdAt: Timestamp
  reactions: Record<string, ReactionData>
  readBy: string[]
}

export interface Attachment {
  id: string
  url: string
  filename: string
  size: number
  contentType: string
  width: number | null
  height: number | null
}

export interface Embed {
  title: string | null
  description: string | null
  url: string | null
  color: number | null
  timestamp: Timestamp | null
  footer: { text: string; iconUrl?: string } | null
  image: { url: string; width?: number; height?: number } | null
  thumbnail: { url: string } | null
  author: { name: string; url?: string; iconUrl?: string } | null
  fields: { name: string; value: string; inline?: boolean }[]
}

export interface ReactionData {
  emoji: string
  emojiName: string
  count: number
  userIds: string[]
}

// ─── Direct Messages ─────────────────────────────────────────────────────────

export interface DirectMessageChannel {
  id: string
  participantIds: string[]
  lastMessageId: string | null
  lastMessageAt: Timestamp | null
  lastMessageContent: string | null
  createdAt: Timestamp
  unreadCounts: Record<string, number>
}

export interface DirectMessage {
  id: string
  dmChannelId: string
  authorId: string
  content: string
  attachments: Attachment[]
  replyToId: string | null
  isEdited: boolean
  editedAt: Timestamp | null
  createdAt: Timestamp
  reactions: Record<string, ReactionData>
  readBy: string[]
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType =
  | 'mention'
  | 'reply'
  | 'dm'
  | 'server_invite'
  | 'friend_request'
  | 'announcement'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  iconUrl: string | null
  channelId: string | null
  serverId: string | null
  messageId: string | null
  fromUserId: string | null
  isRead: boolean
  createdAt: Timestamp
}

// ─── Moderation ──────────────────────────────────────────────────────────────

export type ModerationActionType =
  | 'mute'
  | 'unmute'
  | 'kick'
  | 'ban'
  | 'unban'
  | 'warn'
  | 'delete_message'
  | 'timeout'

export interface ModerationLog {
  id: string
  serverId: string
  action: ModerationActionType
  targetUserId: string
  moderatorId: string
  reason: string
  duration: number | null
  messageId: string | null
  channelId: string | null
  createdAt: Timestamp
}

// ─── UI State ────────────────────────────────────────────────────────────────

export interface TypingUser {
  userId: string
  username: string
  startedAt: number
}

export interface UnreadInfo {
  channelId: string
  count: number
  hasMention: boolean
  lastReadMessageId: string | null
}

export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  targetType: 'message' | 'channel' | 'member' | 'server' | null
  targetId: string | null
  extra?: Record<string, unknown>
}

export interface SearchResult {
  type: 'message' | 'user' | 'server' | 'channel'
  id: string
  title: string
  subtitle: string
  iconUrl: string | null
  meta?: Record<string, unknown>
}
